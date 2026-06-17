const Joi = require('joi');

const signupSchema = Joi.object({
  restaurant_name: Joi.string().trim().min(2).max(255).required(),
  location: Joi.string().trim().min(2).max(255).required(),
  password: Joi.string().min(8).max(128).required(),
  primary_color: Joi.string().trim().max(7).allow(null, '').optional(),
});

const signinSchema = Joi.object({
  restaurant_name: Joi.string().trim().min(2).max(255).required(),
  password: Joi.string().min(8).max(128).required(),
});

const updateProfileSchema = Joi.object({
  primary_color: Joi.string().trim().length(7).pattern(/^#[0-9a-fA-F]{6}$/).required(),
});
const resetPasswordSchema = Joi.object({
  restaurant_name: Joi.string().trim().min(2).max(255).required(),
  new_password: Joi.string().min(8).max(128).required(),
});

module.exports = { signupSchema, signinSchema, updateProfileSchema, resetPasswordSchema };
