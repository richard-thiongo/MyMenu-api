const Joi = require('joi');

const createCategorySchema = Joi.object({
  category_name: Joi.string().trim().min(2).max(255).required(),
  image_url: Joi.string().trim().max(255).allow(null, '').optional(),
});

const updateCategorySchema = Joi.object({
  category_name: Joi.string().trim().min(2).max(255).required(),
  image_url: Joi.string().trim().max(255).allow(null, '').optional(),
});

const categoryIdParamSchema = Joi.object({
  categoryId: Joi.number().integer().positive().required(),
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
};
