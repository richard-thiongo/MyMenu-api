const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pool = require('./db');
const errorHandler = require('./shared/errorHandler');
const restaurantRoutes = require('./restaurants/restaurantRoutes');
const categoryRoutes = require('./categories/categoryRoutes');
const foodItemRoutes = require('./foodItems/foodItemRoutes');
const uploadRoutes = require('./upload/uploadRoutes');
const orderRoutes = require('./orders/orderRoutes');
const app = express();
const PORT = process.env.PORT || 3000;

// Enable 'trust proxy' for reverse proxies (Render, Cloudflare, Nginx)
app.set('trust proxy', 1);

// Configure CORS before Helmet so headers aren't overridden
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    // Allow all origins in dev; in production lock this down via ALLOWED_ORIGINS env var
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
      : ['*'];
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Helmet — disable crossOriginResourcePolicy so it doesn't block cross-origin reads
app.use(helmet({ crossOriginResourcePolicy: false }));
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
app.use('/api/orders', orderRoutes);
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

    const io = new Server(server, {
      cors: corsOptions
    });
    
    // Make io accessible in controllers
    app.set('io', io);

    io.on('connection', (socket) => {
      // Restaurant dashboard joins this room to listen for new orders
      socket.on('join_restaurant_room', (restaurantId) => {
        socket.join(`restaurant_${restaurantId}`);
      });
      
      // Customer menu page joins this room to listen for status updates
      socket.on('join_order_room', (orderId) => {
        socket.join(`order_${orderId}`);
      });
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
