const pool = require('../db');

// In-memory data store
// Key: restaurantId
// Value: { profile: {}, categories: [], foodItems: [] }
const cache = new Map();

// Lookup map for public URLs
// Key: username
// Value: restaurantId
const usernameToIdMap = new Map();

/**
 * Initializes the cache for a specific restaurant by querying the database.
 */
async function initCacheForRestaurant(restaurantId) {
  if (cache.has(restaurantId)) return;

  // 1. Fetch Profile
  const profileRes = await pool.query(
    'SELECT restaurant_id, restaurant_name, username, restaurant_email, location, primary_color, is_paid, subscription_expires_at, orders_enabled, whatsappnumber FROM restaurants WHERE restaurant_id = $1',
    [restaurantId]
  );
  if (profileRes.rowCount === 0) return null; // Doesn't exist
  const profile = profileRes.rows[0];

  // 2. Fetch Categories
  const catRes = await pool.query(
    'SELECT * FROM categories WHERE restaurant_id = $1 ORDER BY category_id DESC',
    [restaurantId]
  );
  const categories = catRes.rows;

  // 3. Fetch Food Items
  const foodRes = await pool.query(
    'SELECT * FROM food_items WHERE restaurant_id = $1 ORDER BY food_id DESC',
    [restaurantId]
  );
  const foodItems = foodRes.rows;

  // Set Cache
  cache.set(restaurantId, {
    profile,
    categories,
    foodItems
  });
  
  // Set Lookup Map
  usernameToIdMap.set(profile.username, restaurantId);
}

/**
 * Get the full cached data for a restaurant ID. Initializes if empty.
 */
async function getRestaurantCache(restaurantId) {
  if (!cache.has(restaurantId)) {
    await initCacheForRestaurant(restaurantId);
  }
  return cache.get(restaurantId);
}

/**
 * Get the full cached data using the restaurant's username. Initializes if empty.
 */
async function getCacheByName(username) {
  if (usernameToIdMap.has(username)) {
    const id = usernameToIdMap.get(username);
    return getRestaurantCache(id);
  } else {
    // If not in the lookup map, we must query the DB to find the ID.
    const res = await pool.query(
      'SELECT restaurant_id FROM restaurants WHERE username = $1',
      [username]
    );
    if (res.rowCount === 0) return null;
    
    const id = res.rows[0].restaurant_id;
    return getRestaurantCache(id);
  }
}

// ==========================================
// Cache Mutation Methods (In-Place Updates)
// ==========================================

function updateProfile(restaurantId, updatedProfile) {
  const data = cache.get(restaurantId);
  if (data) {
    // Update the lookup map if the username was changed
    if (data.profile.username !== updatedProfile.username) {
      usernameToIdMap.delete(data.profile.username);
      usernameToIdMap.set(updatedProfile.username, restaurantId);
    }
    data.profile = updatedProfile;
  }
}

function addCategory(restaurantId, category) {
  const data = cache.get(restaurantId);
  if (data) {
    data.categories.unshift(category); // Add to top to match ORDER BY category_id DESC
  }
}

function updateCategory(restaurantId, updatedCategory) {
  const data = cache.get(restaurantId);
  if (data) {
    const idx = data.categories.findIndex(c => c.category_id === updatedCategory.category_id);
    if (idx !== -1) {
      const oldName = data.categories[idx].category_name;
      data.categories[idx] = updatedCategory;
      // Propagate category name changes to food items
      if (oldName !== updatedCategory.category_name) {
        data.foodItems.forEach(item => {
          if (item.category_name === oldName) {
            item.category_name = updatedCategory.category_name;
          }
        });
      }
    }
  }
}

function deleteCategory(restaurantId, categoryId) {
  const data = cache.get(restaurantId);
  if (data) {
    const category = data.categories.find(c => c.category_id === parseInt(categoryId));
    if (category) {
      data.categories = data.categories.filter(c => c.category_id !== parseInt(categoryId));
      // Removing a category cascades in the DB (or is blocked), so we reflect that here by removing related items
      data.foodItems = data.foodItems.filter(f => f.category_name !== category.category_name);
    }
  }
}

function addFoodItem(restaurantId, foodItem) {
  const data = cache.get(restaurantId);
  if (data) {
    data.foodItems.unshift(foodItem);
  }
}

function updateFoodItem(restaurantId, updatedFoodItem) {
  const data = cache.get(restaurantId);
  if (data) {
    const idx = data.foodItems.findIndex(f => f.food_id === updatedFoodItem.food_id);
    if (idx !== -1) {
      data.foodItems[idx] = updatedFoodItem;
    }
  }
}

function deleteFoodItem(restaurantId, foodId) {
  const data = cache.get(restaurantId);
  if (data) {
    data.foodItems = data.foodItems.filter(f => f.food_id !== parseInt(foodId));
  }
}

module.exports = {
  getRestaurantCache,
  getCacheByName,
  updateProfile,
  addCategory,
  updateCategory,
  deleteCategory,
  addFoodItem,
  updateFoodItem,
  deleteFoodItem
};
