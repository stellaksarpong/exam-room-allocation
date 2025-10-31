/**
 * Statistics Routes
 * Defines API endpoints for system statistics
 */

const express = require("express");
const router = express.Router(); // Create a new router instance
const statsController = require("../controllers/statsController"); // Import stats controller

// Route: GET /api/stats
// Description: Get system statistics (total rooms, capacity, students, allocations)
// Handler: statsController.getStats
router.get("/", statsController.getStats);

// Export the router so it can be used in server.js
module.exports = router;
