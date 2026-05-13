require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const authMiddleware = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');
const projectRoutes = require('./routes/projects');
const reviewRoutes = require('./routes/review');
const assetRoutes = require('./routes/assets');
const userRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');
const scheduleRoutes = require('./routes/schedule');

const app = express();
const PORT = process.env.PORT || 4000;

// Swagger UI — mounted before helmet so CSP headers don't block its inline scripts
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health check — no auth required
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Public routes — no auth
app.use('/api/auth', authRoutes);

// Auth middleware applied to all routes below
app.use(authMiddleware);

// Protected routes
app.use('/api/content', contentRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/schedule', scheduleRoutes);

// 404 fallback — log unhandled routes so missing routes are visible in gateway logs
app.use((req, res) => {
  console.warn(`[404] Unhandled route: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
