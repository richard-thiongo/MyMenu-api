const express = require('express');
const foodItemController = require('./foodItemController');
const authMiddleware = require('../shared/authMiddleware');
const validateRequest = require('../shared/validateRequest');
const {
  createFoodItemSchema,
  updateFoodItemSchema,
  foodIdParamSchema,
  restaurantNameParamSchema,
} = require('./foodItemValidator');

const router = express.Router();

router.get(
  '/by-restaurant/:restaurantName',
  validateRequest(restaurantNameParamSchema, 'params'),
  foodItemController.getFoodItemsByRestaurantName
);

router.use(authMiddleware);

router.get('/', foodItemController.getFoodItems);

router.post(
  '/',
  validateRequest(createFoodItemSchema),
  foodItemController.createFoodItem
);

router.put(
  '/:foodId',
  validateRequest(foodIdParamSchema, 'params'),
  validateRequest(updateFoodItemSchema),
  foodItemController.updateFoodItem
);

router.delete(
  '/:foodId',
  validateRequest(foodIdParamSchema, 'params'),
  foodItemController.deleteFoodItem
);

module.exports = router;
