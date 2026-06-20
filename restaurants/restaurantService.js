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
    `INSERT INTO restaurants (restaurant_name, location, password, primary_color, is_paid)
     VALUES ($1, $2, $3, $4, false)
     RETURNING restaurant_id, restaurant_name, location, primary_color, is_paid, subscription_expires_at`,
    [restaurant_name, location, hashedPassword, primary_color]
  );

  return result.rows[0];
}

async function signin({ restaurant_name, password }) {
  const result = await pool.query(
    'SELECT restaurant_id, restaurant_name, location, password, primary_color, is_paid, subscription_expires_at FROM restaurants WHERE restaurant_name = $1',
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
      is_paid: restaurant.is_paid,
      subscription_expires_at: restaurant.subscription_expires_at,
    },
  };
}

async function getProfile(restaurantId) {
  const res = await pool.query(
    'SELECT restaurant_id, restaurant_name, location, primary_color, is_paid, subscription_expires_at FROM restaurants WHERE restaurant_id = $1',
    [restaurantId]
  );
  if (res.rowCount === 0) {
    throw new AppError('Resource not found', 404);
  }
  
  const profile = res.rows[0];
  cacheService.updateProfile(restaurantId, profile);
  return profile;
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

async function submitPayment(restaurantId, paymentMessage) {
  const profile = await getProfile(restaurantId);
  
  if (!process.env.RESEND_API_KEY || !process.env.ADMIN_EMAIL) {
    throw new AppError('Email service is not configured properly', 500);
  }

  // Generate a secure, signed admin approval token (expires in 7 days)
  const adminToken = jwt.sign(
    { restaurantId, restaurantName: profile.restaurant_name, paymentMessage },
    process.env.ADMIN_SECRET,
    { expiresIn: '7d' }
  );

  const approvalUrl = `${process.env.FRONTEND_URL}/admin/verify?token=${adminToken}`;

  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: 'MyMenu <onboarding@resend.dev>',
      to: process.env.ADMIN_EMAIL,
      subject: `💳 Payment Verification: ${profile.restaurant_name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 10px;">
          <h2 style="color: #333;">New Payment Submission</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr><td style="padding: 8px; font-weight: bold; color: #555;">Restaurant:</td><td style="padding: 8px;">${profile.restaurant_name}</td></tr>
            <tr style="background:#f0f0f0;"><td style="padding: 8px; font-weight: bold; color: #555;">Restaurant ID:</td><td style="padding: 8px;">${restaurantId}</td></tr>
          </table>
          <h3 style="color: #333;">Payment Message / Code:</h3>
          <pre style="background: #e8e8e8; padding: 15px; border-radius: 8px; white-space: pre-wrap; word-break: break-all;">${paymentMessage}</pre>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${approvalUrl}" style="background: #16a34a; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">
              ✅ Review &amp; Approve Payment
            </a>
          </div>
          <p style="color: #999; font-size: 12px; margin-top: 20px; text-align: center;">This link expires in 7 days.</p>
        </div>
      `
    });
  } catch (error) {
    throw new AppError('Failed to send payment verification email', 500);
  }
}

async function getPaymentDetails(token) {
  try {
    const payload = jwt.verify(token, process.env.ADMIN_SECRET);
    return {
      restaurantId: payload.restaurantId,
      restaurantName: payload.restaurantName,
      paymentMessage: payload.paymentMessage,
    };
  } catch (err) {
    throw new AppError('Invalid or expired approval link', 401);
  }
}

async function approvePayment(token) {
  let payload;
  try {
    payload = jwt.verify(token, process.env.ADMIN_SECRET);
  } catch (err) {
    throw new AppError('Invalid or expired approval link', 401);
  }

  const { restaurantId, restaurantName } = payload;

  const result = await pool.query(
    `UPDATE restaurants
     SET is_paid = true, subscription_expires_at = NOW() + INTERVAL '31 days'
     WHERE restaurant_id = $1
     RETURNING restaurant_id, restaurant_name, location, primary_color, is_paid, subscription_expires_at`,
    [restaurantId]
  );

  if (result.rowCount === 0) {
    throw new AppError('Restaurant not found', 404);
  }

  // Immediately update the cache so the public menu goes live instantly
  cacheService.updateProfile(restaurantId, result.rows[0]);

  return result.rows[0];
}

module.exports = { signup, signin, getProfile, updateProfile, resetPassword, refreshAccessToken, submitPayment, getPaymentDetails, approvePayment };

