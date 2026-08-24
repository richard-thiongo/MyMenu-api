const express = require('express');
const restaurantController = require('./restaurantController');
const validateRequest = require('../shared/validateRequest');
const authMiddleware = require('../shared/authMiddleware');
const { signupSchema, signinSchema, updateProfileSchema, resetPasswordSchema, forgotPasswordSchema, resetPasswordWithTokenSchema, refreshTokenSchema, paymentSchema } = require('./restaurantValidator');

const router = express.Router();

router.post(
  '/signup',
  validateRequest(signupSchema),
  restaurantController.signup
);

router.post(
  '/signin',
  validateRequest(signinSchema),
  restaurantController.signin
);

// Protected routes (require JWT)
router.get('/profile', authMiddleware, restaurantController.getProfile);
router.put(
  '/profile',
  authMiddleware,
  validateRequest(updateProfileSchema),
  restaurantController.updateProfile
);
router.post(
  '/reset-password',
  validateRequest(resetPasswordSchema),
  restaurantController.resetPassword
);
router.post(
  '/forgot-password',
  validateRequest(forgotPasswordSchema),
  restaurantController.forgotPassword
);
router.post(
  '/reset-password-token',
  validateRequest(resetPasswordWithTokenSchema),
  restaurantController.resetPasswordWithToken
);
router.post(
  '/refresh',
  validateRequest(refreshTokenSchema),
  restaurantController.refreshAccessToken
);
router.post(
  '/submit-payment',
  authMiddleware,
  validateRequest(paymentSchema),
  restaurantController.submitPayment
);

// Public routes
router.get('/public/all', restaurantController.getPublicRestaurants);
router.get('/public/:id', restaurantController.getPublicProfile);

// Admin routes (secured by the signed token itself — no auth middleware needed)
router.get('/admin/payment-details', restaurantController.getPaymentDetails);
router.post('/admin/reject-payment', restaurantController.rejectPayment);

module.exports = router;
