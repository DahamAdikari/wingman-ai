const request = require('supertest');

jest.mock('../../src/services/contentService');
jest.mock('../../src/db/queries');

const app = require('../../src/index');
const { createNewPost } = require('../../src/services/contentService');
const { getPostById, getPostsByProject } = require('../../src/db/queries');

const MANAGER_ID = 'manager-uuid';
const PROJECT_ID = 'project-uuid';
const POST_ID = 'post-uuid';

beforeEach(() => jest.clearAllMocks());

// ─── POST /content ────────────────────────────────────────────────────────────

describe('POST /content', () => {
  it('returns 401 when manager_id is missing', async () => {
    const res = await request(app)
      .post('/content')
      .send({ project_id: PROJECT_ID, platform: 'instagram', prompt: 'test' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when project_id is missing', async () => {
    const res = await request(app)
      .post('/content')
      .set('x-manager-id', MANAGER_ID)
      .send({ platform: 'instagram', prompt: 'test' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when platform is missing', async () => {
    const res = await request(app)
      .post('/content')
      .set('x-manager-id', MANAGER_ID)
      .send({ project_id: PROJECT_ID, prompt: 'test' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when prompt is missing', async () => {
    const res = await request(app)
      .post('/content')
      .set('x-manager-id', MANAGER_ID)
      .send({ project_id: PROJECT_ID, platform: 'instagram' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when platform is not a valid value', async () => {
    const res = await request(app)
      .post('/content')
      .set('x-manager-id', MANAGER_ID)
      .send({ project_id: PROJECT_ID, platform: 'tiktok', prompt: 'test' });
    expect(res.status).toBe(400);
  });

  it('returns 201 and the created post on success', async () => {
    const mockResult = {
      post: { id: POST_ID, project_id: PROJECT_ID, platform: 'instagram', status: 'manager_review' },
      version: { id: 'version-uuid', version_number: 1, caption_text: 'Summer vibes' },
    };
    createNewPost.mockResolvedValue(mockResult);

    const res = await request(app)
      .post('/content')
      .set('x-manager-id', MANAGER_ID)
      .send({ project_id: PROJECT_ID, platform: 'instagram', prompt: 'Nike summer campaign' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(mockResult);
    expect(createNewPost).toHaveBeenCalledWith({
      manager_id: MANAGER_ID,
      project_id: PROJECT_ID,
      platform: 'instagram',
      prompt: 'Nike summer campaign',
      image_prompt: undefined,
    });
  });

  it('passes image_prompt when provided', async () => {
    createNewPost.mockResolvedValue({ post: {}, version: {} });

    await request(app)
      .post('/content')
      .set('x-manager-id', MANAGER_ID)
      .send({ project_id: PROJECT_ID, platform: 'instagram', prompt: 'test', image_prompt: 'nike shoes on white bg' });

    expect(createNewPost).toHaveBeenCalledWith(expect.objectContaining({
      image_prompt: 'nike shoes on white bg',
    }));
  });

  it('returns 500 when createNewPost throws', async () => {
    createNewPost.mockRejectedValue(new Error('AI generation failed'));

    const res = await request(app)
      .post('/content')
      .set('x-manager-id', MANAGER_ID)
      .send({ project_id: PROJECT_ID, platform: 'instagram', prompt: 'test' });

    expect(res.status).toBe(500);
  });
});

// ─── GET /content/project/:projectId ─────────────────────────────────────────

describe('GET /content/project/:projectId', () => {
  it('returns 401 when manager_id is missing', async () => {
    const res = await request(app).get(`/content/project/${PROJECT_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns posts for the project', async () => {
    const mockPosts = [
      { id: 'post-1', platform: 'instagram', status: 'manager_review' },
      { id: 'post-2', platform: 'linkedin', status: 'approved' },
    ];
    getPostsByProject.mockResolvedValue(mockPosts);

    const res = await request(app)
      .get(`/content/project/${PROJECT_ID}`)
      .set('x-manager-id', MANAGER_ID);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockPosts);
    expect(getPostsByProject).toHaveBeenCalledWith(PROJECT_ID, MANAGER_ID);
  });

  it('returns empty array when project has no posts', async () => {
    getPostsByProject.mockResolvedValue([]);

    const res = await request(app)
      .get(`/content/project/${PROJECT_ID}`)
      .set('x-manager-id', MANAGER_ID);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 500 when query throws', async () => {
    getPostsByProject.mockRejectedValue(new Error('DB error'));

    const res = await request(app)
      .get(`/content/project/${PROJECT_ID}`)
      .set('x-manager-id', MANAGER_ID);

    expect(res.status).toBe(500);
  });
});

// ─── GET /content/:id ─────────────────────────────────────────────────────────

describe('GET /content/:id', () => {
  it('returns 401 when manager_id is missing', async () => {
    const res = await request(app).get(`/content/${POST_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when post does not exist', async () => {
    getPostById.mockResolvedValue([]);

    const res = await request(app)
      .get(`/content/${POST_ID}`)
      .set('x-manager-id', MANAGER_ID);

    expect(res.status).toBe(404);
  });

  it('returns all versions of the post newest first', async () => {
    const mockRows = [
      { id: POST_ID, version_number: 2, caption_text: 'Revised' },
      { id: POST_ID, version_number: 1, caption_text: 'Original' },
    ];
    getPostById.mockResolvedValue(mockRows);

    const res = await request(app)
      .get(`/content/${POST_ID}`)
      .set('x-manager-id', MANAGER_ID);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockRows);
    expect(getPostById).toHaveBeenCalledWith(POST_ID, MANAGER_ID);
  });

  it('returns 500 when query throws', async () => {
    getPostById.mockRejectedValue(new Error('DB error'));

    const res = await request(app)
      .get(`/content/${POST_ID}`)
      .set('x-manager-id', MANAGER_ID);

    expect(res.status).toBe(500);
  });
});

// ─── GET /health ──────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
