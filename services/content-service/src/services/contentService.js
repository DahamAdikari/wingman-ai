const { generateCaption } = require('./captionService');
const { generateImage } = require('./imageService');
const {
  createPost,
  createPostVersion,
  updatePostStatus,
  getPostById,
  getLatestVersionNumber,
  setActiveVersion,
  getVersionById,
} = require('../db/queries');
const { publish } = require('../events/publisher');

async function createNewPost({ manager_id, project_id, platform, prompt, image_prompt, skip_client_review }) {
  const caption_text = await generateCaption(prompt);
  const image_url = await generateImage(image_prompt || prompt);

  const post = await createPost({ project_id, manager_id, platform });

  const version = await createPostVersion({
    post_id: post.id,
    manager_id,
    version_number: 1,
    caption_text,
    image_url,
    image_prompt: image_prompt || prompt,
    revision_notes: null,
  });

  await setActiveVersion(post.id, manager_id, version.id);
  await updatePostStatus(post.id, manager_id, 'manager_review');

  await publish('CONTENT_CREATED', {
    post_id: post.id,
    post_version_id: version.id,
    project_id,
    manager_id,
    platform,
    caption_text,
    image_url,
    skip_client_review: skip_client_review || false,
    new_status: 'manager_review',
  });

  return { post: { ...post, status: 'manager_review' }, version };
}

async function regenerateContent({ post_id, manager_id, revision_notes }) {
  const rows = await getPostById(post_id, manager_id);
  if (!rows.length) throw new Error(`Post ${post_id} not found for manager ${manager_id}`);

  const latestVersion = rows[0]; // newest version is first (ORDER BY version_number DESC)

  const revisedPrompt = revision_notes
    ? `Revise this caption based on feedback.\n\nFeedback: ${revision_notes}\nOriginal: ${latestVersion.caption_text}`
    : latestVersion.caption_text;

  const caption_text = await generateCaption(revisedPrompt);
  const image_url = await generateImage(latestVersion.image_prompt);
  const next_version = (await getLatestVersionNumber(post_id)) + 1;

  const version = await createPostVersion({
    post_id,
    manager_id,
    version_number: next_version,
    caption_text,
    image_url,
    image_prompt: latestVersion.image_prompt,
    revision_notes,
  });

  await setActiveVersion(post_id, manager_id, version.id);
  await updatePostStatus(post_id, manager_id, 'manager_review');

  await publish('CONTENT_CREATED', {
    post_id,
    post_version_id: version.id,
    project_id: latestVersion.project_id,
    manager_id,
    platform: latestVersion.platform,
    caption_text,
    image_url,
    new_status: 'manager_review',
  });

  return version;
}

// Called from POST /content/:postId/refine — manager refines prompt after client feedback.
// If base_version_id is provided, the AI gets the selected version as context instead
// of always using the newest generated version.
async function refineAndRegenerate({ post_id, manager_id, refined_prompt, base_version_id, caption_version_id, image_version_id, target_parts }) {
  const rows = await getPostById(post_id, manager_id);
  if (!rows.length) throw new Error(`Post ${post_id} not found`);

  const latestVersion = rows[0];
  const targets = Array.isArray(target_parts) && target_parts.length
    ? target_parts
    : ['caption', 'image'];

  if (!targets.every((part) => ['caption', 'image'].includes(part))) {
    throw new Error('target_parts must contain caption and/or image');
  }

  let baseVersion = latestVersion;
  if (base_version_id) {
    const selectedVersion = await getVersionById(base_version_id, manager_id);
    if (!selectedVersion) throw new Error(`Version ${base_version_id} not found`);
    if (selectedVersion.post_id !== post_id) throw new Error('Version does not belong to this post');
    baseVersion = {
      ...selectedVersion,
      version_id: selectedVersion.id,
      version_number: selectedVersion.version_number,
      project_id: selectedVersion.project_id,
      platform: selectedVersion.platform,
    };
  }

  let captionBaseVersion = baseVersion;
  if (caption_version_id && caption_version_id !== baseVersion.version_id) {
    const selectedVersion = await getVersionById(caption_version_id, manager_id);
    if (!selectedVersion) throw new Error(`Caption version ${caption_version_id} not found`);
    if (selectedVersion.post_id !== post_id) throw new Error('Caption version does not belong to this post');
    captionBaseVersion = { ...selectedVersion, version_id: selectedVersion.id };
  }

  let imageBaseVersion = baseVersion;
  if (image_version_id && image_version_id !== baseVersion.version_id) {
    const selectedVersion = await getVersionById(image_version_id, manager_id);
    if (!selectedVersion) throw new Error(`Image version ${image_version_id} not found`);
    if (selectedVersion.post_id !== post_id) throw new Error('Image version does not belong to this post');
    imageBaseVersion = { ...selectedVersion, version_id: selectedVersion.id };
  }

  const captionPrompt = captionBaseVersion.caption_text
    ? `Revise this post using the selected version as context.\n\nSelected version caption:\n${captionBaseVersion.caption_text}\n\nManager prompt:\n${refined_prompt}`
    : refined_prompt;

  const imagePrompt = imageBaseVersion.image_prompt
    ? `${refined_prompt}\n\nKeep visual continuity with this selected version prompt:\n${imageBaseVersion.image_prompt}`
    : refined_prompt;

  const [caption_text, image_url] = await Promise.all([
    targets.includes('caption') ? generateCaption(captionPrompt) : Promise.resolve(captionBaseVersion.caption_text),
    targets.includes('image') ? generateImage(imagePrompt) : Promise.resolve(imageBaseVersion.image_url),
  ]);
  const next_version = (await getLatestVersionNumber(post_id)) + 1;
  const changedLabel = targets.length === 2 ? 'caption and image' : targets[0];

  const version = await createPostVersion({
    post_id,
    manager_id,
    version_number: next_version,
    caption_text,
    image_url,
    image_prompt: targets.includes('image') ? imagePrompt : imageBaseVersion.image_prompt,
    revision_notes: `Manager refinement of ${changedLabel} from v${baseVersion.version_number || 'selected'} (v${next_version})`,
  });

  await setActiveVersion(post_id, manager_id, version.id);
  await updatePostStatus(post_id, manager_id, 'manager_review');

  await publish('CONTENT_CREATED', {
    post_id,
    post_version_id: version.id,
    project_id: latestVersion.project_id,
    manager_id,
    platform: latestVersion.platform,
    caption_text,
    image_url,
    new_status: 'manager_review',
  });

  return version;
}

// Called from PUT /content/:postId/versions/:versionId/restore
async function restoreVersion({ post_id, version_id, manager_id }) {
  const version = await getVersionById(version_id, manager_id);
  if (!version) throw new Error(`Version ${version_id} not found`);
  if (version.post_id !== post_id) throw new Error('Version does not belong to this post');

  await setActiveVersion(post_id, manager_id, version_id);
  return version;
}

module.exports = { createNewPost, regenerateContent, refineAndRegenerate, restoreVersion };
