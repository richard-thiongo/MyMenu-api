# MyMenu API - Backend

This is the **REST API backend** for the MyMenu platform. It handles authentication, restaurant management, category and food item CRUD, image uploads, and serves the public menu data for the frontend.

Built with **Node.js**, **Express**, and **PostgreSQL**.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
  - [Root Files](#root-files)
  - [restaurants/](#restaurants)
  - [categories/](#categories)
  - [foodItems/](#fooditems)
  - [upload/](#upload)
  - [shared/](#shared)

---

## Overview

The API is organized by feature domain. Each domain has its own folder containing a **routes**, **controller**, **service**, and **validator** file. All routes are mounted under `/api/` in `index.js`.

### Key Features

- JWT-based authentication (7-day token expiry)
- Password hashing with bcrypt (12 salt rounds)
- Per-restaurant in-memory caching to reduce database load
- Image uploads stored to Cloudinary via Multer
- Joi-based request validation on all inputs
- Rate limiting (100 requests / 15 min per IP)
- Helmet for security headers
- Graceful shutdown on SIGINT/SIGTERM

---

## Tech Stack

| Layer         | Technology                |
|---------------|---------------------------|
| Runtime       | Node.js                   |
| Framework     | Express.js                |
| Database      | PostgreSQL (via pg pool)  |
| Auth          | JWT (jsonwebtoken)        |
| Hashing       | bcryptjs                  |
| Validation    | Joi                       |
| Image Storage | Cloudinary + Multer       |
| Security      | Helmet, express-rate-limit|

---

## Getting Started

### Prerequisites

- Node.js 18+
- A running PostgreSQL database
- A Cloudinary account (for image uploads)

### Installation

```bash
npm install
```

### Running the Server

```bash
# Development (with auto-restart via nodemon)
npm run dev

# Production
npm start
```

The server starts on `http://localhost:3000` by default.

---

## Environment Variables

Create a `.env` file in the root of this project:

```env
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/mymenu
JWT_SECRET=your_super_secret_key

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## API Reference

### Restaurants

| Method | Endpoint                          | Auth | Description                          |
|--------|-----------------------------------|------|--------------------------------------|
| POST   | /api/restaurants/signup           | No   | Register a new restaurant            |
| POST   | /api/restaurants/signin           | No   | Sign in, returns JWT token           |
| GET    | /api/restaurants/profile          | Yes  | Get the authenticated restaurant's profile |
| PUT    | /api/restaurants/profile          | Yes  | Update brand color                   |
| POST   | /api/restaurants/reset-password   | No   | Reset password by restaurant name    |

### Categories

| Method | Endpoint                | Auth | Description                          |
|--------|-------------------------|------|--------------------------------------|
| GET    | /api/categories         | Yes  | List all categories for restaurant   |
| POST   | /api/categories         | Yes  | Create a new category                |
| PUT    | /api/categories/:id     | Yes  | Update a category                    |
| DELETE | /api/categories/:id     | Yes  | Delete a category and its food items |

### Food Items

| Method | Endpoint                    | Auth | Description                          |
|--------|-----------------------------|------|--------------------------------------|
| GET    | /api/food-items             | Yes  | List all food items for restaurant   |
| POST   | /api/food-items             | Yes  | Create a new food item               |
| PUT    | /api/food-items/:id         | Yes  | Update a food item                   |
| DELETE | /api/food-items/:id         | Yes  | Delete a food item                   |
| GET    | /api/food-items/by-restaurant/:name | No | Get full menu for public page  |

### Upload

| Method | Endpoint     | Auth | Description                        |
|--------|--------------|------|------------------------------------|
| POST   | /api/upload  | Yes  | Upload an image; returns Cloudinary URL |

### Orders

| Method | Endpoint                          | Auth | Description                          |
|--------|-----------------------------------|------|--------------------------------------|
| POST   | /api/orders                       | No   | Create a new order for a restaurant  |
| GET    | /api/orders/:id                   | No   | Get status and details of an order   |
| GET    | /api/orders/restaurant/today      | Yes  | Get today's orders for the restaurant|
| PUT    | /api/orders/:id/status            | Yes  | Update the status of an order        |

---

## Project Structure

```
mymenu-api/
├── index.js              # Server entry point
├── db.js                 # PostgreSQL connection pool
├── nodemon.json          # Nodemon watch config (for dev)
├── package.json
├── .env                  # Environment variables (not committed)
│
├── restaurants/          # Restaurant auth and profile domain
├── categories/           # Category management domain
├── foodItems/            # Food item management domain
├── orders/               # Orders management domain
├── upload/               # Image upload domain
└── shared/               # Cross-cutting utilities and middleware
```

---

## Root Files

### `index.js`
The application entry point. Sets up the Express app with all global middleware (CORS, Helmet, JSON body parser, rate limiter), mounts all route groups under `/api/`, registers the 404 catch-all and centralized error handler, and starts the HTTP server after confirming a successful database connection. Also handles graceful shutdown signals (SIGINT, SIGTERM, SIGUSR2) to close connections cleanly.

### `db.js`
Creates and exports a `pg.Pool` instance that connects to PostgreSQL using the `DATABASE_URL` environment variable. All services import this pool and use `pool.query()` to run SQL.

### `nodemon.json`
Configuration for `nodemon` during development — watches `.js` files and ignores `node_modules`.

---

## restaurants/

Handles all restaurant authentication and profile operations.

```
restaurants/
├── restaurantRoutes.js      # Declares the 5 restaurant endpoints and wires them to
│                            #   validators, auth middleware, and controller functions
│
├── restaurantController.js  # Thin HTTP layer — calls the appropriate service function,
│                            #   forwards the result as a JSON response, and passes
│                            #   errors to the centralized error handler via next()
│
├── restaurantService.js     # Core business logic:
│                            #   - signup: checks for duplicate name, hashes password,
│                            #             inserts new restaurant record
│                            #   - signin: verifies password with bcrypt, signs and
│                            #             returns a JWT
│                            #   - getProfile: reads from the in-memory cache
│                            #   - updateProfile: updates primary_color in the DB and
│                            #                    refreshes the cache entry
│                            #   - resetPassword: hashes new password and updates DB
│
└── restaurantValidator.js   # Joi schemas for each endpoint:
                             #   - signupSchema: restaurant_name, location, password,
                             #                   primary_color
                             #   - signinSchema: restaurant_name, password
                             #   - updateProfileSchema: primary_color (hex only)
                             #   - resetPasswordSchema: restaurant_name, new_password
```

---

## categories/

Handles all CRUD operations for menu categories.

```
categories/
├── categoryRoutes.js        # Declares the 4 category endpoints; all are protected
│                            #   with authMiddleware; uses categoryValidator schemas
│
├── categoryController.js    # Thin HTTP layer — routes each request to the matching
│                            #   service function and returns the JSON response
│
├── categoryService.js       # Business logic:
│                            #   - getCategories: reads from cache (populated on login)
│                            #   - createCategory: inserts into DB, updates cache
│                            #   - updateCategory: updates record in DB, refreshes cache
│                            #   - deleteCategory: cascades to delete associated food
│                            #                    items, removes from DB and cache
│
└── categoryValidator.js     # Joi schemas:
                             #   - createSchema: category_name, image_url (optional)
                             #   - updateSchema: same as create
```

---

## foodItems/

Handles all CRUD operations for food items inside categories.

```
foodItems/
├── foodItemRoutes.js        # Declares the 5 food item endpoints; protected routes
│                            #   use authMiddleware; the public by-restaurant route
│                            #   does not require auth
│
├── foodItemController.js    # Thin HTTP layer — delegates to service functions and
│                            #   returns JSON; passes errors to the error handler
│
├── foodItemService.js       # Business logic:
│                            #   - getFoodItems: reads from cache for the restaurant
│                            #   - createFoodItem: validates category ownership,
│                            #                    inserts into DB, updates cache
│                            #   - updateFoodItem: updates the item, refreshes cache
│                            #   - deleteFoodItem: removes from DB and cache
│                            #   - getPublicMenu: fetches categories and items for a
│                            #                   restaurant by name; used by the
│                            #                   public-facing menu page (no auth)
│
└── foodItemValidator.js     # Joi schemas:
                             #   - createSchema: food_name, price, description, img_url,
                             #                  category_id
                             #   - updateSchema: same fields, all optional
```

---

## upload/

Handles image uploads to Cloudinary.

```
upload/
├── uploadRoutes.js          # Single POST /api/upload endpoint; protected with
│                            #   authMiddleware; uses Multer middleware from uploadService
│
└── uploadController.js      # Receives the uploaded file processed by Multer/Cloudinary
                             #   and returns the secure Cloudinary URL to the frontend
```

---

## orders/

Handles the creation, retrieval, and status updates of customer orders.

```
orders/
├── orderRoutes.js           # Declares 4 endpoints (2 public for customers, 2 protected
│                            #   for restaurants to manage orders)
│
└── orderController.js       # Handles the HTTP layer for order creation, retrieving a 
                             #   specific order, fetching today's orders for the 
                             #   dashboard, and updating an order's status
```

---

## shared/

Cross-cutting utilities and middleware used by all feature domains.

```
shared/
├── AppError.js              # Custom error class that extends Error — accepts a message
│                            #   and an HTTP status code; used throughout services to
│                            #   throw structured errors that the error handler can
│                            #   format correctly
│
├── authMiddleware.js        # JWT verification middleware — reads the Bearer token from
│                            #   the Authorization header, verifies it against JWT_SECRET,
│                            #   and attaches req.restaurantId for downstream use;
│                            #   throws 401 if token is missing or invalid
│
├── cacheService.js          # In-memory per-restaurant cache — stores the full profile,
│                            #   categories list, and food items list for each restaurant
│                            #   after their first load; exposes get, set, and update
│                            #   helpers so services can read from memory instead of
│                            #   hitting the database on every request
│
├── errorHandler.js          # Centralized Express error handler — catches all errors
│                            #   passed via next(err); returns a consistent JSON error
│                            #   response with the appropriate HTTP status code;
│                            #   hides internal details in production
│
├── uploadService.js         # Configures Multer with Cloudinary storage — sets upload
│                            #   constraints (file type, max size) and exports the
│                            #   configured multer middleware instance for use in routes
│
└── validateRequest.js       # Generic Joi validation middleware — takes a Joi schema,
                             #   validates req.body against it, and either calls next()
                             #   or returns a 400 error with the validation message
```
