const amqp = require('amqplib');
require('dotenv').config();

// Load individual RabbitMQ credentials from .env
const RABBITMQ_USER = process.env.RABBITMQ_DEFAULT_USER || 'guest';
const RABBITMQ_PASS = process.env.RABBITMQ_DEFAULT_PASS || 'guest';
const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'localhost';
const RABBITMQ_PORT = process.env.RABBITMQ_PORT || '5672';

// Construct the connection URL
const RABBITMQ_URL = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`;

const QUEUE_NAME = 'product_events';
const POOL_SIZE = 20;
const RETRY_INTERVAL = 3000; // milliseconds
const MAX_RETRIES = 10;

let connection;
const channelPool = [];
let currentIndex = 0;

async function connectRabbitMQ(retries = MAX_RETRIES) {
  while (retries > 0) {
    try {
      console.log(`🔁 [RabbitMQ] Attempting to connect at ${RABBITMQ_URL}...`);
      connection = await amqp.connect(RABBITMQ_URL);

      for (let i = 0; i < POOL_SIZE; i++) {
        const channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME);
        channelPool.push(channel);
      }

      console.log(`✅ [RabbitMQ] Connected successfully. ${POOL_SIZE} channels initialized.`);
      return;
    } catch (error) {
      console.error(`❌ [RabbitMQ] Connection failed: ${error.message}`);
      retries--;

      if (retries === 0) {
        console.error('❌ [RabbitMQ] All retry attempts failed. Exiting...');
        process.exit(1);
      }

      console.log(`⏳ [RabbitMQ] Retrying in ${RETRY_INTERVAL / 1000}s... (${retries} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
    }
  }
}

function getChannel() {
  if (channelPool.length === 0) {
    throw new Error("❗ [RabbitMQ] Channel pool is empty! Connection not initialized.");
  }
  const channel = channelPool[currentIndex];
  currentIndex = (currentIndex + 1) % channelPool.length;
  return channel;
}

module.exports = {
  connectRabbitMQ,
  getChannel
};
