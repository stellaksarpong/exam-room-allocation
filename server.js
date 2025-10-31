/**
 * Main Server Entry Point
 * This file sets up the Express server and connects all routes
 */

// Import required packages
const express = require("express"); // Web framework for Node.js
const cors = require("cors"); // Enables Cross-Origin Resource Sharing
const bodyParser = require("body-parser"); // Parses incoming request bodies
require("dotenv").config(); // Loads environment variables from .env file

// Import database configuration (this initializes the database connection)
require("./config/database.js");

// Import route modules - each handles a specific resource (rooms, students, allocations, stats)
const roomRoutes = require("./routes/roomRoutes.js");
const studentRoutes = require("./routes/studentRoutes.js");
const allocationRoutes = require("./routes/allocationRoutes.js");
const statsRoutes = require("./routes/statsRoutes.js");

// Create Express application instance
const app = express();
// Get port from environment variable or default to 3000
const PORT = process.env.PORT || 3000;

// ==================== MIDDLEWARE ====================
// Middleware functions execute before routes and can modify request/response

// Enable CORS - allows frontend from different origins to access the API
app.use(cors());

// Parse JSON request bodies - converts JSON data in requests to JavaScript objects
app.use(bodyParser.json());

// Serve static files from 'public' directory - serves HTML, CSS, JS files
app.use(express.static("public"));

// ==================== API ROUTES ====================
// Mount route handlers to specific URL paths
// All routes under /api/rooms will be handled by roomRoutes
app.use("/api/rooms", roomRoutes);
// All routes under /api/students will be handled by studentRoutes
app.use("/api/students", studentRoutes);
// All routes under /api/allocations will be handled by allocationRoutes
app.use("/api/allocations", allocationRoutes);
// All routes under /api/stats will be handled by statsRoutes
app.use("/api/stats", statsRoutes);

// Start the server and listen on the specified port
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
