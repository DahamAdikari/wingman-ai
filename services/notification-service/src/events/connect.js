const amqp = require('amqplib');

async function connectWithRetry(url, retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await amqp.connect(url);
      console.log('[notification-service] Connected to RabbitMQ');
      return conn;
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`[notification-service] RabbitMQ not ready, retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

module.exports = { connectWithRetry };
