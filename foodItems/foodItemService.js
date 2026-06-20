const pool = require('../db');
const AppError = require('../shared/AppError');
const { deleteImage } = require('../shared/uploadService');
const cacheService = require('../shared/cacheService');

async function verifyCategoryExists(restaurantId, categoryName) {
  const result = await pool.query(
    'SELECT 1 FROM categories WHERE restaurant_id = $1 AND category_name = $2',
    [restaurantId, categoryName]
  );

  if (result.rowCount === 0) {
    throw new AppError('Request could not be completed', 400);
  }
}

async function createFoodItem(restaurantId, data) {
  await verifyCategoryExists(restaurantId, data.category_name);

  const result = await pool.query(
    `INSERT INTO food_items (food_name, price, description, img_url, category_name, restaurant_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING food_id, food_name, price, description, img_url, category_name, restaurant_id`,
    [
      data.food_name,
      data.price,
      data.description || null,
      data.img_url || null,
      data.category_name,
      restaurantId,
    ]
  );

  const newFoodItem = result.rows[0];
  cacheService.addFoodItem(restaurantId, newFoodItem);

  return newFoodItem;
}

async function updateFoodItem(restaurantId, foodId, data) {
  const existing = await pool.query(
    'SELECT food_id, img_url FROM food_items WHERE food_id = $1 AND restaurant_id = $2',
    [foodId, restaurantId]
  );

  if (existing.rowCount === 0) {
    throw new AppError('Resource not found', 404);
  }

  const oldImgUrl = existing.rows[0].img_url;

  await verifyCategoryExists(restaurantId, data.category_name);

  const result = await pool.query(
    `UPDATE food_items
     SET food_name = $1, price = $2, description = $3, img_url = $4, category_name = $5
     WHERE food_id = $6 AND restaurant_id = $7
     RETURNING food_id, food_name, price, description, img_url, category_name, restaurant_id`,
    [
      data.food_name,
      data.price,
      data.description || null,
      data.img_url || null,
      data.category_name,
      foodId,
      restaurantId,
    ]
  );

  if (oldImgUrl && oldImgUrl !== data.img_url) {
    deleteImage(oldImgUrl).catch(console.error);
  }

  const updatedFoodItem = result.rows[0];
  cacheService.updateFoodItem(restaurantId, updatedFoodItem);

  return updatedFoodItem;
}

async function deleteFoodItem(restaurantId, foodId) {
  const result = await pool.query(
    'DELETE FROM food_items WHERE food_id = $1 AND restaurant_id = $2 RETURNING food_id, img_url',
    [foodId, restaurantId]
  );

  if (result.rowCount === 0) {
    throw new AppError('Resource not found', 404);
  }

  if (result.rows[0].img_url) {
    deleteImage(result.rows[0].img_url).catch(console.error);
  }

  cacheService.deleteFoodItem(restaurantId, foodId);
}

async function getFoodItems(restaurantId) {
  const cacheData = await cacheService.getRestaurantCache(restaurantId);
  return cacheData.foodItems;
}

async function getFoodItemsByRestaurantName(restaurantName) {
  const cacheData = await cacheService.getCacheByName(restaurantName);

  if (!cacheData) {
    throw new AppError('Resource not found', 404);
  }

  const profileRes = await pool.query(
    'SELECT is_paid, subscription_expires_at FROM restaurants WHERE restaurant_name = $1',
    [restaurantName]
  );

  if (profileRes.rowCount === 0) {
    throw new AppError('Resource not found', 404);
  }

  const { is_paid, subscription_expires_at } = profileRes.rows[0];
  const isExpired = !subscription_expires_at || new Date(subscription_expires_at) < new Date();
  
  if (!is_paid || isExpired) {
    throw new AppError('Menu currently unavailable due to inactive subscription.', 403);
  }

  return {
    restaurant_name: cacheData.profile.restaurant_name,
    location: cacheData.profile.location,
    primary_color: cacheData.profile.primary_color,
    categories: cacheData.categories,
    food_items: cacheData.foodItems,
  };
}

module.exports = {
  createFoodItem,
  updateFoodItem,
  deleteFoodItem,
  getFoodItems,
  getFoodItemsByRestaurantName,
};
