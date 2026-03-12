const express = require('express');
const bodyparser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const { connectRabbitMQ } = require('./config/rabbitmq');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan('dev'));

// Routes
app.use('/', productRoutes);
app.use('/', orderRoutes);

app.get('/health', (req, res) => {
  console.log('Health check endpoint was called');
  res.sendStatus(200);
});

// Start server after RabbitMQ is connected
connectRabbitMQ()
  .then(() => {
    console.log('✅ Connected to RabbitMQ successfully');
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to RabbitMQ:', err);
  });
