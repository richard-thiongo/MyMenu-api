const Joi = require('joi');

const createFoodItemSchema = Joi.object({
  food_name: Joi.string().trim().min(2).max(255).required(),
  price: Joi.alternatives([
    Joi.number().positive().precision(2).max(99999999.99),
    Joi.valid(null)
  ]).optional(),
  description: Joi.string().trim().max(2000).allow('', null).optional(),
  img_url: Joi.string().trim().uri().max(500).allow('', null).optional(),
  category_name: Joi.string().trim().min(2).max(255).required(),
  is_available: Joi.boolean().optional(),
});

const updateFoodItemSchema = Joi.object({
  food_name: Joi.string().trim().min(2).max(255).required(),
  price: Joi.alternatives([
    Joi.number().positive().precision(2).max(99999999.99),
    Joi.valid(null)
  ]).optional(),
  description: Joi.string().trim().max(2000).allow('', null).optional(),
  img_url: Joi.string().trim().uri().max(500).allow('', null).optional(),
  category_name: Joi.string().trim().min(2).max(255).required(),
  is_available: Joi.boolean().optional(),
});

const foodIdParamSchema = Joi.object({
  foodId: Joi.number().integer().positive().required(),
});

const restaurantNameParamSchema = Joi.object({
  restaurantName: Joi.string().trim().min(2).max(255).required(),
});

module.exports = {
  createFoodItemSchema,
  updateFoodItemSchema,
  foodIdParamSchema,
  restaurantNameParamSchema,
};
