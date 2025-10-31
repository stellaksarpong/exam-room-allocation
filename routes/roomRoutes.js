/**
 * Room Routes
 * Defines all API endpoints related to room management
 * Maps HTTP methods and URLs to controller functions
 */

const express = require("express");
const router = express.Router(); // Create a new router instance
const roomController = require("../controllers/roomController"); // Import room controller

// Route: GET /api/rooms
// Description: Get all rooms
// Handler: roomController.getAllRooms
router.get("/", roomController.getAllRooms);

// Route: POST /api/rooms
// Description: Create a new room
// Handler: roomController.createRoom
router.post("/", roomController.createRoom);

// Route: PUT /api/rooms/:id
// Description: Update an existing room by ID
// Handler: roomController.updateRoom
router.put("/:id", roomController.updateRoom);

// Route: DELETE /api/rooms/:id
// Description: Delete a room by ID
// Handler: roomController.deleteRoom
router.delete("/:id", roomController.deleteRoom);

// Export the router so it can be used in server.js
module.exports = router;
