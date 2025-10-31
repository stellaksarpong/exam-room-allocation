/**
 * File Upload Middleware
 * Configures multer for handling file uploads
 * Used for CSV and Excel import functionality
 */

const multer = require("multer"); // File upload middleware for Express

/**
 * Configure multer for file uploads
 * Stores files in memory (buffer) instead of disk
 * This is efficient for small files like CSV/Excel
 */
const upload = multer({
  storage: multer.memoryStorage(), // Store file in memory as buffer
  limits: { fileSize: 5 * 1024 * 1024 }, // Maximum file size: 5MB
});

// Export configured upload middleware
// Can be used as: upload.single("file") in routes
module.exports = upload;
