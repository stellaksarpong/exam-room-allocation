/**
 * Room Controller
 * Handles all business logic related to examination rooms
 * Contains functions for CRUD operations (Create, Read, Update, Delete)
 */

const db = require("../config/database"); // Import database connection

/**
 * Get all rooms
 * Fetches all rooms from database and returns them sorted by room number
 * @route GET /api/rooms
 */
const getAllRooms = (req, res) => {
  // Query database for all rooms, ordered by room_number
  db.query("SELECT * FROM rooms ORDER BY room_number", (err, results) => {
    if (err) {
      // If error occurs, return 500 status with error message
      return res.status(500).json({ error: "Error fetching rooms" });
    }
    // Return all rooms as JSON
    res.json(results);
  });
};

/**
 * Create a new room
 * Adds a new examination room to the database
 * @route POST /api/rooms
 * @body {string} room_number - Room identifier (required)
 * @body {number} capacity - Maximum number of students (required)
 * @body {number} floor - Floor number (optional)
 * @body {string} building - Building name (optional)
 */
const createRoom = (req, res) => {
  // Extract room data from request body
  const { room_number, capacity, floor, building } = req.body;

  // Validate required fields
  if (!room_number || !capacity) {
    return res
      .status(400)
      .json({ error: "Room number and capacity are required" });
  }

  // Insert new room into database
  db.query(
    "INSERT INTO rooms (room_number, capacity, floor, building) VALUES (?, ?, ?, ?)",
    [room_number, capacity, floor, building],
    (err, result) => {
      if (err) {
        // Check if error is due to duplicate room number
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ error: "Room number already exists" });
        }
        // Other database errors
        return res.status(500).json({ error: "Error adding room" });
      }
      // Return success with the new room's ID
      res.json({ id: result.insertId, message: "Room added successfully" });
    }
  );
};

/**
 * Update an existing room
 * Modifies room information in the database
 * @route PUT /api/rooms/:id
 * @param {number} id - Room ID from URL
 * @body {string} room_number - Updated room number
 * @body {number} capacity - Updated capacity
 * @body {number} floor - Updated floor number
 * @body {string} building - Updated building name
 */
const updateRoom = (req, res) => {
  // Extract updated data from request body
  const { room_number, capacity, floor, building } = req.body;
  // Get room ID from URL parameters
  const id = req.params.id;

  // Update room in database
  db.query(
    "UPDATE rooms SET room_number = ?, capacity = ?, floor = ?, building = ? WHERE id = ?",
    [room_number, capacity, floor, building, id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: "Error updating room" });
      }
      // Return success message
      res.json({ message: "Room updated successfully" });
    }
  );
};

/**
 * Delete a room
 * Removes a room from the database
 * Note: Due to CASCADE, this will also delete all allocations for this room
 * @route DELETE /api/rooms/:id
 * @param {number} id - Room ID from URL
 */
const deleteRoom = (req, res) => {
  // Get room ID from URL parameters
  const id = req.params.id;

  // Delete room from database
  db.query("DELETE FROM rooms WHERE id = ?", [id], (err) => {
    if (err) {
      return res.status(500).json({ error: "Error deleting room" });
    }
    // Return success message
    res.json({ message: "Room deleted successfully" });
  });
};

// Export all controller functions
module.exports = {
  getAllRooms,
  createRoom,
  updateRoom,
  deleteRoom,
};
