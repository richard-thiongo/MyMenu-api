const express = require('express');
const { uploadFile } = require('./uploadController');
const { upload } = require('../shared/uploadService');
const requireAuth = require('../shared/authMiddleware');

const router = express.Router();

// Require authentication for uploads
router.use(requireAuth);

router.post('/', upload.single('image'), uploadFile);

module.exports = router;
