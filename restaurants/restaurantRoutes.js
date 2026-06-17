const express = require('express');
const restaurantController = require('./restaurantController');
const validateRequest = require('../shared/validateRequest');
const authMiddleware = require('../shared/authMiddleware');
const { signupSchema, signinSchema, updateProfileSchema, resetPasswordSchema } = require('./restaurantValidator');

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

module.exports = router;
