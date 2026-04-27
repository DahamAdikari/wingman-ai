const amqp = require('amqplib');

// Retries connecting to RabbitMQ with a fixed delay between attempts.
// RabbitMQ often takes longer to be ready than the service itself in Docker Compose.
async function connectWithRetry(retries = 10, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await amqp.connect(process.env.RABBITMQ_URL);
      console.log('Connected to RabbitMQ');
      return conn;
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`RabbitMQ not ready (attempt ${i + 1}/${retries}), retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

module.exports = { connectWithRetry };
