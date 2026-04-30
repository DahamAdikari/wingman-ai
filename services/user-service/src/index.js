require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const initDB = require('./db/init');
const publisher = require('./events/publisher');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/projects', projectRoutes);

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

initDB()
  .then(() => publisher.connect())
  .then(() => {
    app.listen(PORT, () => console.log(`[user-service] Running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('[user-service] Failed to start:', err);
    process.exit(1);
  });
