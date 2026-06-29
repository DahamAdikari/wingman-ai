// imageService uses a module-level singleton for the OpenAI client.
// jest.resetModules() + jest.doMock() is required between tests so each test
// gets a fresh module with the mock it sets up.

describe('generateImage', () => {
  let generateImage;

  afterEach(() => {
    jest.resetModules();
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_IMAGE_API_URL;
    delete process.env.AI_IMAGE_API_KEY;
  });

  it('returns DALL-E image URL when OPENAI_API_KEY is set', async () => {
    process.env.OPENAI_API_KEY = 'test-key';

    jest.doMock('openai', () =>
      jest.fn(() => ({
        images: {
          generate: jest.fn().mockResolvedValue({
            data: [{ url: 'https://dalle.example.com/image.png' }],
          }),
        },
      }))
    );

    ({ generateImage } = require('../../src/services/imageService'));
    const url = await generateImage('summer beach campaign');
    expect(url).toBe('https://dalle.example.com/image.png');
  });

  it('falls back to custom API when DALL-E fails', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.AI_IMAGE_API_URL = 'https://custom.api/generate';
    process.env.AI_IMAGE_API_KEY = 'custom-key';

    jest.doMock('openai', () =>
      jest.fn(() => ({
        images: {
          generate: jest.fn().mockRejectedValue(new Error('DALL-E quota exceeded')),
        },
      }))
    );

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ image_url: 'https://custom.example.com/image.png' }),
    });

    ({ generateImage } = require('../../src/services/imageService'));
    const url = await generateImage('autumn leaves');
    expect(url).toBe('https://custom.example.com/image.png');
  });

  it('returns mock placeholder when no API is configured', async () => {
    jest.doMock('openai', () => jest.fn());

    ({ generateImage } = require('../../src/services/imageService'));
    const url = await generateImage('nike summer campaign');
    expect(url).toMatch(/^https:\/\/picsum\.photos\/seed\//);
    expect(url).toContain('nikesummercampaig'); // seed is first 24 chars, alphanumeric only
  });

  it('returns mock placeholder when DALL-E fails and no custom API is configured', async () => {
    process.env.OPENAI_API_KEY = 'test-key';

    jest.doMock('openai', () =>
      jest.fn(() => ({
        images: {
          generate: jest.fn().mockRejectedValue(new Error('network error')),
        },
      }))
    );

    ({ generateImage } = require('../../src/services/imageService'));
    const url = await generateImage('test prompt');
    expect(url).toMatch(/^https:\/\/picsum\.photos\/seed\//);
  });
});
