const express = require('express');
const categoryController = require('./categoryController');
const authMiddleware = require('../shared/authMiddleware');
const validateRequest = require('../shared/validateRequest');
const {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
} = require('./categoryValidator');

const router = express.Router();

router.get('/public/:restaurantId', categoryController.getPublicCategories);

router.use(authMiddleware);

router.get('/', categoryController.getCategories);

router.post(
  '/',
  validateRequest(createCategorySchema),
  categoryController.createCategory
);

router.put(
  '/:categoryId',
  validateRequest(categoryIdParamSchema, 'params'),
  validateRequest(updateCategorySchema),
  categoryController.updateCategory
);

router.delete(
  '/:categoryId',
  validateRequest(categoryIdParamSchema, 'params'),
  categoryController.deleteCategory
);

module.exports = router;
