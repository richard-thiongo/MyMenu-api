const restaurantService = require('./restaurantService');

async function signup(req, res, next) {
  try {
    const restaurant = await restaurantService.signup(req.body);
    res.status(201).json({
      message: 'Registration successful',
      data: restaurant,
    });
  } catch (error) {
    next(error);
  }
}

async function signin(req, res, next) {
  try {
    const result = await restaurantService.signin(req.body);
    res.status(200).json({
      message: 'Sign in successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getProfile(req, res, next) {
  try {
    const profile = await restaurantService.getProfile(req.restaurantId);
    res.status(200).json({ message: 'Profile retrieved', data: profile });
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const updated = await restaurantService.updateProfile(req.restaurantId, req.body);
    res.status(200).json({ message: 'Profile updated', data: updated });
  } catch (error) {
    next(error);
  }
}
async function resetPassword(req, res, next) {
  try {
    await restaurantService.resetPassword(req.body);
    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
}
async function refreshAccessToken(req, res, next) {
  try {
    const result = await restaurantService.refreshAccessToken(req.body.refreshToken);
    res.status(200).json({
      message: 'Token refreshed',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { signup, signin, getProfile, updateProfile, resetPassword, refreshAccessToken };
