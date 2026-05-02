require('dotenv').config();

const express              = require('express');
const { initDB }           = require('./db/init');
const { startConsumer }    = require('./events/consumer');
const { initBot }          = require('./services/telegramService');
const notificationRoutes   = require('./routes/notifications');

const app  = express();
const PORT = process.env.PORT || 5007;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service' });
});

// Notification REST API
app.use('/notifications', notificationRoutes);

async function bootstrap() {
  try {
    // 1. Initialise database schema
    await initDB();

    // 2. Initialise Telegram bot (optional — no-ops if token not set)
    initBot();

    // 3. Start RabbitMQ consumer
    await startConsumer();

    // 4. Start HTTP server
    app.listen(PORT, () => {
      console.log(`[notification-service] HTTP server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('[notification-service] Failed to start:', err);
    process.exit(1);
  }
}

bootstrap();
