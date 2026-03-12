const { getChannel } = require('../config/rabbitmq');

function publishProductEvent(action, product) {
  console.log(`🔔 [Publisher] Preparing to publish "${action}" event for Product ID: ${product.id}`);
  
  try {
    const channel = getChannel();
    if (channel) {
      const message = {
        action,
        timestamp: new Date().toISOString(),
        product,
      };

      const buffer = Buffer.from(JSON.stringify(message));
      const sent = channel.sendToQueue('product_events', buffer);

      if (sent) {
        console.log(`📤 [Publisher] Event published: "${action}" | Product ID: ${product.id}`);
      } else {
        console.warn(`⚠️ [Publisher] Message not sent to queue for Product ID: ${product.id}`);
      }
    } else {
      console.error("❌ [Publisher] Channel not available. Event not published.");
    }
  } catch (error) {
    console.error(`🚨 [Publisher] Error publishing event: ${error.message}`);
  }
}

module.exports = publishProductEvent;
