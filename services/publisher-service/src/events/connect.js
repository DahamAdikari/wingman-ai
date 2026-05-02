const amqp = require('amqplib');

async function connectWithRetry(url, retries = 10, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await amqp.connect(url);
      console.log('[publisher-service] Connected to RabbitMQ');
      return conn;
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`[publisher-service] RabbitMQ not ready (attempt ${i+1}/${retries}), retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

module.exports = { connectWithRetry };
