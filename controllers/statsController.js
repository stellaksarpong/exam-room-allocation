/**
 * Statistics Controller
 * Handles retrieval of system statistics
 * Provides overview data for dashboard display
 */

const db = require("../config/database"); // Import database connection

/**
 * Get system statistics
 * Returns counts of rooms, total capacity, students, and allocations
 * Uses nested callbacks to chain queries sequentially
 * @route GET /api/stats
 */
const getStats = (req, res) => {
  // Object to store all statistics
  const stats = {};

  // Query 1: Count total number of rooms
  db.query("SELECT COUNT(*) as count FROM rooms", (err, result) => {
    // If no error, store the count
    if (!err) stats.totalRooms = result[0].count;

    // Query 2: Calculate total capacity (sum of all room capacities)
    db.query("SELECT SUM(capacity) as total FROM rooms", (err, result) => {
      // If no error, store the total capacity
      if (!err) stats.totalCapacity = result[0].total;

      // Query 3: Count total number of students
      db.query("SELECT COUNT(*) as count FROM students", (err, result) => {
        // If no error, store the count
        if (!err) stats.totalStudents = result[0].count;

        // Query 4: Count total number of allocations
        db.query("SELECT COUNT(*) as count FROM allocations", (err, result) => {
          // If no error, store the count
          if (!err) stats.totalAllocations = result[0].count;

          // Return all statistics as JSON
          // This is nested deeply because each query depends on the previous one completing
          res.json(stats);
        });
      });
    });
  });
};

// Export the controller function
module.exports = { getStats };
