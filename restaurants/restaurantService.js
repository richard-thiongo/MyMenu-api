const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const AppError = require('../shared/AppError');
const cacheService = require('../shared/cacheService');

async function signup({ restaurant_name, location, password, primary_color }) {
  const existing = await pool.query(
    'SELECT 1 FROM restaurants WHERE restaurant_name = $1',
    [restaurant_name]
  );

  if (existing.rowCount > 0) {
    throw new AppError('Registration could not be completed', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const result = await pool.query(
    `INSERT INTO restaurants (restaurant_name, location, password, primary_color)
     VALUES ($1, $2, $3, $4)
     RETURNING restaurant_id, restaurant_name, location, primary_color`,
    [restaurant_name, location, hashedPassword, primary_color]
  );

  return result.rows[0];
}

async function signin({ restaurant_name, password }) {
  const result = await pool.query(
    'SELECT restaurant_id, restaurant_name, location, password, primary_color FROM restaurants WHERE restaurant_name = $1',
    [restaurant_name]
  );

  if (result.rowCount === 0) {
    throw new AppError('Invalid credentials', 401);
  }

  const restaurant = result.rows[0];
  const passwordMatch = await bcrypt.compare(password, restaurant.password);

  if (!passwordMatch) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = jwt.sign(
    { restaurantId: restaurant.restaurant_id },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    { restaurantId: restaurant.restaurant_id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
    { expiresIn: '7d' }
  );

  return {
    token,
    refreshToken,
    restaurant: {
      restaurant_id: restaurant.restaurant_id,
      restaurant_name: restaurant.restaurant_name,
      location: restaurant.location,
      primary_color: restaurant.primary_color,
    },
  };
}

async function getProfile(restaurantId) {
  const cacheData = await cacheService.getRestaurantCache(restaurantId);
  if (!cacheData || !cacheData.profile) {
    throw new AppError('Resource not found', 404);
  }
  return cacheData.profile;
}

async function updateProfile(restaurantId, { primary_color }) {
  const result = await pool.query(
    `UPDATE restaurants
     SET primary_color = $1
     WHERE restaurant_id = $2
     RETURNING restaurant_id, restaurant_name, location, primary_color`,
    [primary_color, restaurantId]
  );
  if (result.rowCount === 0) {
    throw new AppError('Resource not found', 404);
  }
  const updatedProfile = result.rows[0];
  cacheService.updateProfile(restaurantId, updatedProfile);
  
  return updatedProfile;
}
async function resetPassword({ restaurant_name, new_password }) {
  const hashedPassword = await bcrypt.hash(new_password, 12);
  const result = await pool.query(
    'UPDATE restaurants SET password = $1 WHERE restaurant_name = $2 RETURNING restaurant_id',
    [hashedPassword, restaurant_name]
  );
  if (result.rowCount === 0) {
    throw new AppError('Restaurant not found', 404);
  }
}
async function refreshAccessToken(refreshTokenStr) {
  try {
    const payload = jwt.verify(
      refreshTokenStr,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh'
    );
    
    const restaurantId = payload.restaurantId;
    const result = await pool.query(
      'SELECT restaurant_id FROM restaurants WHERE restaurant_id = $1',
      [restaurantId]
    );
    
    if (result.rowCount === 0) {
      throw new AppError('Invalid token', 401);
    }
    
    const newToken = jwt.sign(
      { restaurantId },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    const newRefreshToken = jwt.sign(
      { restaurantId },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
      { expiresIn: '7d' }
    );
    
    return { token: newToken, refreshToken: newRefreshToken };
  } catch (err) {
    throw new AppError('Invalid or expired refresh token', 401);
  }
}

module.exports = { signup, signin, getProfile, updateProfile, resetPassword, refreshAccessToken };
