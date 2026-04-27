jest.mock('../../src/db/queries');
jest.mock('../../src/events/publisher');
jest.mock('../../src/services/imageService');
jest.mock('../../src/services/captionService');

const { createNewPost, regenerateContent } = require('../../src/services/contentService');
const queries = require('../../src/db/queries');
const { publish } = require('../../src/events/publisher');
const { generateImage } = require('../../src/services/imageService');
const { generateCaption } = require('../../src/services/captionService');

const MANAGER_ID = 'manager-uuid';
const PROJECT_ID = 'project-uuid';
const POST_ID = 'post-uuid';
const VERSION_ID = 'version-uuid';

beforeEach(() => {
  jest.clearAllMocks();
  generateCaption.mockResolvedValue('Generated caption');
  generateImage.mockResolvedValue('https://s3.example.com/image.jpg');
  publish.mockResolvedValue();
});

// ─── createNewPost ────────────────────────────────────────────────────────────

describe('createNewPost', () => {
  beforeEach(() => {
    queries.createPost.mockResolvedValue({
      id: POST_ID,
      project_id: PROJECT_ID,
      manager_id: MANAGER_ID,
      platform: 'instagram',
    });
    queries.createPostVersion.mockResolvedValue({
      id: VERSION_ID,
      version_number: 1,
      caption_text: 'Generated caption',
      image_url: 'https://s3.example.com/image.jpg',
    });
    queries.updatePostStatus.mockResolvedValue();
  });

  it('calls createPost with correct arguments', async () => {
    await createNewPost({ manager_id: MANAGER_ID, project_id: PROJECT_ID, platform: 'instagram', prompt: 'Nike summer' });

    expect(queries.createPost).toHaveBeenCalledWith({
      project_id: PROJECT_ID,
      manager_id: MANAGER_ID,
      platform: 'instagram',
    });
  });

  it('creates version 1 with generated caption and image', async () => {
    await createNewPost({ manager_id: MANAGER_ID, project_id: PROJECT_ID, platform: 'instagram', prompt: 'Nike summer' });

    expect(queries.createPostVersion).toHaveBeenCalledWith(expect.objectContaining({
      post_id: POST_ID,
      manager_id: MANAGER_ID,
      version_number: 1,
      caption_text: 'Generated caption',
      image_url: 'https://s3.example.com/image.jpg',
      revision_notes: null,
    }));
  });

  it('sets post status to manager_review', async () => {
    await createNewPost({ manager_id: MANAGER_ID, project_id: PROJECT_ID, platform: 'instagram', prompt: 'test' });

    expect(queries.updatePostStatus).toHaveBeenCalledWith(POST_ID, MANAGER_ID, 'manager_review');
  });

  it('emits CONTENT_CREATED with correct payload', async () => {
    await createNewPost({ manager_id: MANAGER_ID, project_id: PROJECT_ID, platform: 'instagram', prompt: 'test' });

    expect(publish).toHaveBeenCalledWith('CONTENT_CREATED', expect.objectContaining({
      post_id: POST_ID,
      post_version_id: VERSION_ID,
      project_id: PROJECT_ID,
      manager_id: MANAGER_ID,
      platform: 'instagram',
    }));
  });

  it('returns post with status manager_review and the version', async () => {
    const result = await createNewPost({ manager_id: MANAGER_ID, project_id: PROJECT_ID, platform: 'instagram', prompt: 'test' });

    expect(result.post.status).toBe('manager_review');
    expect(result.version.id).toBe(VERSION_ID);
  });

  it('uses image_prompt when provided', async () => {
    await createNewPost({ manager_id: MANAGER_ID, project_id: PROJECT_ID, platform: 'instagram', prompt: 'test', image_prompt: 'shoes on white bg' });

    expect(generateImage).toHaveBeenCalledWith('shoes on white bg');
    expect(queries.createPostVersion).toHaveBeenCalledWith(expect.objectContaining({
      image_prompt: 'shoes on white bg',
    }));
  });

  it('falls back to prompt as image_prompt when image_prompt is not provided', async () => {
    await createNewPost({ manager_id: MANAGER_ID, project_id: PROJECT_ID, platform: 'instagram', prompt: 'Nike summer' });

    expect(generateImage).toHaveBeenCalledWith('Nike summer');
  });

  it('still succeeds when image generation returns null', async () => {
    generateImage.mockResolvedValue(null);

    const result = await createNewPost({ manager_id: MANAGER_ID, project_id: PROJECT_ID, platform: 'instagram', prompt: 'test' });

    expect(result).toBeDefined();
    expect(queries.createPostVersion).toHaveBeenCalledWith(expect.objectContaining({
      image_url: null,
    }));
  });
});

// ─── regenerateContent ────────────────────────────────────────────────────────

describe('regenerateContent', () => {
  beforeEach(() => {
    queries.getPostById.mockResolvedValue([{
      id: POST_ID,
      project_id: PROJECT_ID,
      manager_id: MANAGER_ID,
      platform: 'instagram',
      caption_text: 'Original caption',
      image_prompt: 'nike shoes',
      version_number: 1,
    }]);
    queries.getLatestVersionNumber.mockResolvedValue(1);
    queries.createPostVersion.mockResolvedValue({ id: 'v2-uuid', version_number: 2 });
    queries.updatePostStatus.mockResolvedValue();
  });

  it('creates the next version number', async () => {
    await regenerateContent({ post_id: POST_ID, manager_id: MANAGER_ID, revision_notes: 'More energetic' });

    expect(queries.createPostVersion).toHaveBeenCalledWith(expect.objectContaining({
      post_id: POST_ID,
      version_number: 2,
    }));
  });

  it('stores revision_notes on the new version', async () => {
    await regenerateContent({ post_id: POST_ID, manager_id: MANAGER_ID, revision_notes: 'Make it formal' });

    expect(queries.createPostVersion).toHaveBeenCalledWith(expect.objectContaining({
      revision_notes: 'Make it formal',
    }));
  });

  it('resets post status to manager_review', async () => {
    await regenerateContent({ post_id: POST_ID, manager_id: MANAGER_ID, revision_notes: 'test' });

    expect(queries.updatePostStatus).toHaveBeenCalledWith(POST_ID, MANAGER_ID, 'manager_review');
  });

  it('emits CONTENT_CREATED after regeneration', async () => {
    await regenerateContent({ post_id: POST_ID, manager_id: MANAGER_ID, revision_notes: 'test' });

    expect(publish).toHaveBeenCalledWith('CONTENT_CREATED', expect.objectContaining({
      post_id: POST_ID,
    }));
  });

  it('reuses the original image_prompt for image regeneration', async () => {
    await regenerateContent({ post_id: POST_ID, manager_id: MANAGER_ID, revision_notes: 'test' });

    expect(generateImage).toHaveBeenCalledWith('nike shoes');
  });

  it('throws when post is not found', async () => {
    queries.getPostById.mockResolvedValue([]);

    await expect(
      regenerateContent({ post_id: 'bad-id', manager_id: MANAGER_ID, revision_notes: 'test' })
    ).rejects.toThrow(/not found/i);
  });

  it('works correctly for a 3rd revision (version 3)', async () => {
    queries.getLatestVersionNumber.mockResolvedValue(2);
    queries.createPostVersion.mockResolvedValue({ id: 'v3-uuid', version_number: 3 });

    await regenerateContent({ post_id: POST_ID, manager_id: MANAGER_ID, revision_notes: 'Yet another revision' });

    expect(queries.createPostVersion).toHaveBeenCalledWith(expect.objectContaining({
      version_number: 3,
    }));
  });
});
