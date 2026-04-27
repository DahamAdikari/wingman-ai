const { generateCaption } = require('./captionService');
const { generateImage } = require('./imageService');
const {
  createPost,
  createPostVersion,
  updatePostStatus,
  getPostById,
  getLatestVersionNumber,
} = require('../db/queries');
const { publish } = require('../events/publisher');

async function createNewPost({ manager_id, project_id, platform, prompt, image_prompt }) {
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

  await updatePostStatus(post.id, manager_id, 'manager_review');

  await publish('CONTENT_CREATED', {
    post_id: post.id,
    post_version_id: version.id,
    project_id,
    manager_id,
    platform,
    caption_text,
    image_url,
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

  await updatePostStatus(post_id, manager_id, 'manager_review');

  await publish('CONTENT_CREATED', {
    post_id,
    post_version_id: version.id,
    project_id: latestVersion.project_id,
    manager_id,
    platform: latestVersion.platform,
    caption_text,
    image_url,
  });

  return version;
}

module.exports = { createNewPost, regenerateContent };
