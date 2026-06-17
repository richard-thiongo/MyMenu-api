const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pool = require('./db');
const errorHandler = require('./shared/errorHandler');
const restaurantRoutes = require('./restaurants/restaurantRoutes');
const categoryRoutes = require('./categories/categoryRoutes');
const foodItemRoutes = require('./foodItems/foodItemRoutes');
const uploadRoutes = require('./upload/uploadRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests' },
  })
);

app.get('/', (req, res) => {
  res.json({ message: 'Service is available' });
});

app.use('/api/restaurants', restaurantRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/food-items', foodItemRoutes);
app.use('/api/upload', uploadRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Resource not found' });
});

app.use(errorHandler);

let server;

async function startServer() {
  try {
    await pool.query('SELECT 1');
    console.log('Project connected to the database successfully.');

    server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Stop the other process or set a different PORT in .env`);
      } else {
        console.error('Server failed to start.');
      }
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to connect to the database.');
    process.exit(1);
  }
}

function shutdown() {
  if (!server) {
    process.exit(0);
    return;
  }

  server.close(() => {
    pool.end().then(() => process.exit(0));
  });
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
process.once('SIGUSR2', () => {
  shutdown();
  process.once('SIGUSR2', () => process.kill(process.pid, 'SIGUSR2'));
});

startServer();
