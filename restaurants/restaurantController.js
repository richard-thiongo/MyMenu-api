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
async function submitPayment(req, res, next) {
  try {
    await restaurantService.submitPayment(req.restaurantId, req.body.paymentMessage);
    res.status(200).json({
      message: 'Payment verification submitted successfully'
    });
  } catch (error) {
    next(error);
  }
}

async function getPaymentDetails(req, res, next) {
  try {
    const { token } = req.query;
    if (!token) throw new (require('../shared/AppError'))('Token is required', 400);
    const details = await restaurantService.getPaymentDetails(token);
    res.status(200).json({ message: 'Payment details retrieved', data: details });
  } catch (error) {
    next(error);
  }
}

async function approvePayment(req, res, next) {
  try {
    const { token } = req.body;
    if (!token) throw new (require('../shared/AppError'))('Token is required', 400);
    const restaurant = await restaurantService.approvePayment(token);
    res.status(200).json({ message: 'Payment approved and subscription activated!', data: restaurant });
  } catch (error) {
    next(error);
  }
}

async function forgotPassword(req, res, next) {
  try {
    await restaurantService.forgotPassword(req.body);
    // Always respond with 200 regardless — prevents email enumeration
    res.status(200).json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (error) {
    next(error);
  }
}

async function resetPasswordWithToken(req, res, next) {
  try {
    await restaurantService.resetPasswordWithToken(req.body);
    res.status(200).json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (error) {
    next(error);
  }
}

module.exports = { signup, signin, getProfile, updateProfile, resetPassword, forgotPassword, resetPasswordWithToken, refreshAccessToken, submitPayment, getPaymentDetails, approvePayment };

