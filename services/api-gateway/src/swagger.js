const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Wingman AI — API Gateway',
    version: '1.0.0',
    description:
      'All routes exposed by the API Gateway. Protected routes require a Bearer JWT token (obtain one via `POST /api/auth/login`). Click **Authorize** and enter your token as `Bearer <token>`.',
  },
  servers: [{ url: 'http://localhost:4000', description: 'Local dev' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Service unavailable' },
        },
      },
    },
  },
  tags: [
    { name: 'Auth', description: 'Public — login, register, set password' },
    { name: 'Projects', description: 'Project management and channel connections' },
    { name: 'Content', description: 'Posts and AI-generated content versions' },
    { name: 'Review', description: 'Approval loop — manager and client decisions' },
    { name: 'Assets', description: 'Logos, templates, prompts (scoped per project)' },
    { name: 'Users', description: 'User management and invitations' },
    { name: 'Notifications', description: 'In-app notification feed' },
    { name: 'Schedule', description: 'Post publish scheduling' },
  ],
  paths: {

    // ── Auth ──────────────────────────────────────────────────────────────────

    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'manager@example.com' },
                  password: { type: 'string', example: 'secret123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'JWT token returned' },
          401: { description: 'Invalid credentials' },
        },
      },
    },

    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new manager account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  name: { type: 'string', example: 'Jane Manager' },
                  email: { type: 'string', format: 'email', example: 'jane@agency.com' },
                  password: { type: 'string', example: 'secret123' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Manager created' },
          409: { description: 'Email already exists' },
        },
      },
    },

    '/api/auth/set-password': {
      post: {
        tags: ['Auth'],
        summary: 'Set password via invite token (invited clients)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'password'],
                properties: {
                  token: { type: 'string', description: 'Invite token from invite link' },
                  password: { type: 'string', example: 'newpassword123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password set successfully' },
          400: { description: 'Invalid or expired token' },
        },
      },
    },

    // ── Projects ──────────────────────────────────────────────────────────────

    '/api/projects': {
      get: {
        tags: ['Projects'],
        summary: 'List all projects (dashboard view from query_db)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Array of project summaries' },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
      post: {
        tags: ['Projects'],
        summary: 'Create a new project (client company)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', example: 'Nike' },
                  description: { type: 'string', example: 'Nike social media campaign' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Project created' },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
    },

    '/api/projects/{id}': {
      patch: {
        tags: ['Projects'],
        summary: 'Update project name / description / status',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  status: { type: 'string', enum: ['active', 'paused', 'archived'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Project updated' },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
    },

    '/api/projects/{id}/posts': {
      get: {
        tags: ['Projects'],
        summary: 'List all posts for a project',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Array of posts' },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
    },

    '/api/projects/{id}/detail': {
      get: {
        tags: ['Projects'],
        summary: 'API Composition — content + reviews + members in one call',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Composed project detail. Each section carries `available` flag for partial-failure tolerance.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    content: {
                      type: 'object',
                      properties: {
                        available: { type: 'boolean' },
                        data: { type: 'object', nullable: true },
                      },
                    },
                    reviews: {
                      type: 'object',
                      properties: {
                        available: { type: 'boolean' },
                        data: { type: 'object', nullable: true },
                      },
                    },
                    members: {
                      type: 'object',
                      properties: {
                        available: { type: 'boolean' },
                        data: { type: 'object', nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
    },

    '/api/projects/{id}/members': {
      post: {
        tags: ['Projects'],
        summary: 'Enrol a user into a project',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['user_id', 'role'],
                properties: {
                  user_id: { type: 'string' },
                  role: { type: 'string', enum: ['team_member', 'client', 'viewer'] },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Member enrolled' },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
    },

    '/api/projects/{id}/channels': {
      get: {
        tags: ['Projects'],
        summary: 'List connected social channels for a project',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Array of channel connections' },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
      post: {
        tags: ['Projects'],
        summary: 'Connect or update a social channel',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['platform'],
                properties: {
                  platform: { type: 'string', example: 'telegram' },
                  credentials: {
                    type: 'object',
                    description: 'Platform-specific credentials',
                    example: { bot_token: 'abc123', chat_id: '-1001234567890' },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Channel connected / updated' },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
    },

    '/api/projects/{id}/channels/{platform}': {
      delete: {
        tags: ['Projects'],
        summary: 'Disconnect a social channel',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'platform', in: 'path', required: true, schema: { type: 'string', example: 'telegram' } },
        ],
        responses: {
          200: { description: 'Channel disconnected' },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
    },

    '/api/projects/{id}/channels/telegram/test': {
      post: {
        tags: ['Projects'],
        summary: 'Send a test message to verify Telegram connection',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Test message sent' },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
    },

    // ── Content ───────────────────────────────────────────────────────────────

    '/api/content': {
      post: {
        tags: ['Content'],
        summary: 'Create a new post and trigger AI content generation',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['project_id', 'platform'],
                properties: {
                  project_id: { type: 'string' },
                  platform: { type: 'string', example: 'telegram' },
                  prompt_override: { type: 'string', description: 'Optional custom prompt' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Post created, AI generation triggered' },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
    },

    '/api/content/{id}': {
      get: {
        tags: ['Content'],
        summary: 'Fetch a single post with its latest content version',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Post with latest version' },
          404: { description: 'Post not found' },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
    },

    // ── Review ────────────────────────────────────────────────────────────────

    '/api/review/{id}': {
      get: {
        tags: ['Review'],
        summary: 'Full review history for a post',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', description: 'Post ID' } }],
        responses: {
          200: { description: 'Array of review records' },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
      post: {
        tags: ['Review'],
        summary: 'Submit a review decision (approve / reject / request changes)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', description: 'Post ID' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['decision'],
                properties: {
                  decision: {
                    type: 'string',
                    enum: ['approved', 'rejected', 'changes_requested'],
                  },
                  feedback: { type: 'string', description: 'Required when rejecting or requesting changes' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Review submitted' },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
    },

    '/api/review/{id}/state': {
      get: {
        tags: ['Review'],
        summary: 'Current approval stage for a post',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', description: 'Post ID' } }],
        responses: {
          200: {
            description: 'Current state',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    state: {
                      type: 'string',
                      enum: ['draft', 'manager_review', 'client_review', 'approved', 'scheduled', 'published'],
                    },
                  },
                },
              },
            },
          },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
    },

    // ── Assets ────────────────────────────────────────────────────────────────

    '/api/assets': {
      get: {
        tags: ['Assets'],
        summary: 'List assets for the authenticated manager',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'project_id', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'type', in: 'query', required: false, schema: { type: 'string', enum: ['logo', 'template', 'prompt'] } },
        ],
        responses: {
          200: { description: 'Array of assets' },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
      post: {
        tags: ['Assets'],
        summary: 'Upload a new asset (logo, template, prompt)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['project_id', 'type', 'name'],
                properties: {
                  project_id: { type: 'string' },
                  type: { type: 'string', enum: ['logo', 'template', 'prompt'] },
                  name: { type: 'string' },
                  url: { type: 'string', description: 'S3 URL for logo/template files' },
                  content: { type: 'string', description: 'Text content for prompt assets' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Asset created' },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
    },

    '/api/assets/{id}': {
      delete: {
        tags: ['Assets'],
        summary: 'Remove an asset',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Asset deleted' },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
    },

    // ── Users ─────────────────────────────────────────────────────────────────

    '/api/users': {
      get: {
        tags: ['Users'],
        summary: 'List all users under the authenticated manager',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Array of users' },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
      post: {
        tags: ['Users'],
        summary: 'Create a new user (client, team member, or viewer)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'name', 'role'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  name: { type: 'string' },
                  role: { type: 'string', enum: ['team_member', 'client', 'viewer'] },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User created' },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
    },

    '/api/users/my-projects': {
      get: {
        tags: ['Users'],
        summary: "Projects the current user (client/member) is enrolled in",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Array of enrolled projects' },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
    },

    '/api/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get a single user by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'User object' },
          404: { description: 'User not found' },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
    },

    '/api/users/{id}/invite': {
      post: {
        tags: ['Users'],
        summary: 'Generate (or regenerate) invite link for a user',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Invite link returned' },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
    },

    // ── Notifications ─────────────────────────────────────────────────────────

    '/api/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'Fetch notification feed',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 50 } },
        ],
        responses: {
          200: { description: 'Array of notifications' },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
    },

    '/api/notifications/read-all': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark all notifications as read',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'All notifications marked read' },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
    },

    '/api/notifications/{id}/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark a single notification as read',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Notification marked read' },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
    },

    // ── Schedule ──────────────────────────────────────────────────────────────

    '/api/schedule/project/{projectId}': {
      get: {
        tags: ['Schedule'],
        summary: 'List pending schedules for a project',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Array of scheduled posts' },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
    },

    '/api/schedule/{postId}': {
      get: {
        tags: ['Schedule'],
        summary: 'Get schedule for a specific post',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Schedule record' },
          404: { description: 'No schedule found' },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
      patch: {
        tags: ['Schedule'],
        summary: 'Update the scheduled publish time',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['scheduled_at'],
                properties: {
                  scheduled_at: { type: 'string', format: 'date-time', example: '2026-06-01T10:00:00Z' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Schedule updated' },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
      delete: {
        tags: ['Schedule'],
        summary: 'Cancel a scheduled post',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Schedule cancelled' },
          503: { $ref: '#/components/schemas/Error' },
        },
      },
    },
  },
};

module.exports = swaggerSpec;
