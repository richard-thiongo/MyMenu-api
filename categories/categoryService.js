const pool = require('../db');
const AppError = require('../shared/AppError');
const { deleteImage } = require('../shared/uploadService');
const cacheService = require('../shared/cacheService');

async function getCategories(restaurantId) {
  const cacheData = await cacheService.getRestaurantCache(restaurantId);
  return cacheData.categories;
}

async function createCategory(restaurantId, categoryName, imageUrl) {
  const existing = await pool.query(
    'SELECT 1 FROM categories WHERE restaurant_id = $1 AND category_name = $2',
    [restaurantId, categoryName]
  );

  if (existing.rowCount > 0) {
    throw new AppError('Request could not be completed', 400);
  }

  const result = await pool.query(
    `INSERT INTO categories (category_name, image_url, restaurant_id)
     VALUES ($1, $2, $3)
     RETURNING category_id, category_name, image_url, restaurant_id`,
    [categoryName, imageUrl, restaurantId]
  );

  const newCategory = result.rows[0];
  cacheService.addCategory(restaurantId, newCategory);

  return newCategory;
}

async function updateCategory(restaurantId, categoryId, categoryName, imageUrl) {
  const category = await pool.query(
    'SELECT category_id, category_name, image_url FROM categories WHERE category_id = $1 AND restaurant_id = $2',
    [categoryId, restaurantId]
  );

  if (category.rowCount === 0) {
    throw new AppError('Resource not found', 404);
  }

  const oldName = category.rows[0].category_name;
  const oldImageUrl = category.rows[0].image_url;

  if (oldName !== categoryName) {
    const duplicate = await pool.query(
      'SELECT 1 FROM categories WHERE restaurant_id = $1 AND category_name = $2',
      [restaurantId, categoryName]
    );

    if (duplicate.rowCount > 0) {
      throw new AppError('Request could not be completed', 400);
    }
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const updated = await client.query(
      `UPDATE categories SET category_name = $1, image_url = $2
       WHERE category_id = $3 AND restaurant_id = $4
       RETURNING category_id, category_name, image_url, restaurant_id`,
      [categoryName, imageUrl, categoryId, restaurantId]
    );

    if (oldName !== categoryName) {
      await client.query(
        'UPDATE food_items SET category_name = $1 WHERE restaurant_id = $2 AND category_name = $3',
        [categoryName, restaurantId, oldName]
      );
    }

    await client.query('COMMIT');

    if (oldImageUrl && oldImageUrl !== imageUrl) {
      deleteImage(oldImageUrl).catch(console.error);
    }

    const updatedCategory = updated.rows[0];
    cacheService.updateCategory(restaurantId, updatedCategory);

    return updatedCategory;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function deleteCategory(restaurantId, categoryId) {
  const category = await pool.query(
    'SELECT category_name, image_url FROM categories WHERE category_id = $1 AND restaurant_id = $2',
    [categoryId, restaurantId]
  );

  if (category.rowCount === 0) {
    throw new AppError('Resource not found', 404);
  }

  const categoryName = category.rows[0].category_name;
  const imageUrl = category.rows[0].image_url;

  const foodItems = await pool.query(
    'SELECT 1 FROM food_items WHERE restaurant_id = $1 AND category_name = $2 LIMIT 1',
    [restaurantId, categoryName]
  );

  if (foodItems.rowCount > 0) {
    throw new AppError('This action could not be completed', 400);
  }

  await pool.query(
    'DELETE FROM categories WHERE category_id = $1 AND restaurant_id = $2',
    [categoryId, restaurantId]
  );

  if (imageUrl) {
    deleteImage(imageUrl).catch(console.error);
  }

  cacheService.deleteCategory(restaurantId, categoryId);
}

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
