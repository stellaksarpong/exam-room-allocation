/**
 * Database Configuration and Initialization
 * This file handles MySQL database connection and table creation
 */

const mysql = require("mysql2"); // MySQL database driver
require("dotenv").config(); // Load environment variables

// ==================== DATABASE CONNECTION ====================
// Create a connection to the MySQL database using credentials from .env file
const db = mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1", // Database server address (127.0.0.1 forces IPv4)
  user: process.env.DB_USER || "root", // Database username
  password: process.env.DB_PASSWORD || "", // Database password
  database: process.env.DB_NAME || "exam_room_allocation", // Database name
});

// Attempt to connect to the database
db.connect((err) => {
  if (err) {
    // If connection fails, log the error
    console.error("Database connection error:", err);
  } else {
    // If connection succeeds, log success message
    console.log("Connected to MySQL database");
  }
});

// ==================== DATABASE INITIALIZATION ====================
/**
 * Initialize database tables
 * Creates all required tables if they don't exist
 * This runs automatically when the server starts
 */
const initDatabase = () => {
  // Array of SQL CREATE TABLE queries
  const queries = [
    // Create rooms table - stores examination room information
    `CREATE TABLE IF NOT EXISTS rooms (
      id INT PRIMARY KEY AUTO_INCREMENT,              -- Unique identifier, auto-increments
      room_number VARCHAR(50) UNIQUE NOT NULL,        -- Room number (must be unique)
      capacity INT NOT NULL,                          -- Maximum number of students
      floor INT,                                      -- Floor number (optional)
      building VARCHAR(100),                          -- Building name (optional)
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Automatic timestamp when created
    )`,

    // Create students table - stores student information
    `CREATE TABLE IF NOT EXISTS students (
      id INT PRIMARY KEY AUTO_INCREMENT,              -- Unique identifier, auto-increments
      student_id VARCHAR(50) UNIQUE NOT NULL,         -- Student ID (must be unique)
      name VARCHAR(100) NOT NULL,                       -- Student full name
      course VARCHAR(100),                             -- Course/Program name (optional)
      year INT,                                        -- Year of study (optional)
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Automatic timestamp when created
    )`,

    // Create allocations table - stores room-student assignments
    `CREATE TABLE IF NOT EXISTS allocations (
      id INT PRIMARY KEY AUTO_INCREMENT,                              -- Unique identifier
      student_id INT NOT NULL,                                        -- Reference to students table
      room_id INT NOT NULL,                                           -- Reference to rooms table
      exam_date DATE NOT NULL,                                        -- Date of the examination
      exam_time TIME,                                                 -- Time of examination (optional)
      allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,              -- When allocation was made
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,  -- If student deleted, allocation deleted
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,       -- If room deleted, allocation deleted
      UNIQUE KEY unique_student_exam (student_id, exam_date)          -- Prevents duplicate allocations
    )`,
  ];

  // Execute each CREATE TABLE query
  queries.forEach((query) => {
    db.query(query, (err) => {
      if (err) console.error("Error creating table:", err);
    });
  });

  // ==================== DATABASE MIGRATION ====================
  /**
   * Migrate unique constraint to include exam_time
   * This allows the same student to have multiple allocations on the same date
   * but at different times (e.g., morning and afternoon exams)
   */
  db.query(
    'SHOW INDEX FROM allocations WHERE Key_name = "unique_student_exam"',
    (err, indexes) => {
      // If old constraint exists, remove it and add new one
      if (!err && indexes && indexes.length) {
        db.query(
          "ALTER TABLE allocations DROP INDEX unique_student_exam",
          () => {
            // Add new constraint that includes exam_time
            db.query(
              "ALTER TABLE allocations ADD UNIQUE KEY unique_student_exam_time (student_id, exam_date, exam_time)",
              () => {}
            );
          }
        );
      } else {
        // If old constraint doesn't exist, check if new one exists
        db.query(
          'SHOW INDEX FROM allocations WHERE Key_name = "unique_student_exam_time"',
          (e2, idx2) => {
            // If new constraint doesn't exist, create it
            if (!e2 && (!idx2 || !idx2.length)) {
              db.query(
                "ALTER TABLE allocations ADD UNIQUE KEY unique_student_exam_time (student_id, exam_date, exam_time)",
                () => {}
              );
            }
          }
        );
      }
    }
  );
};

// Run database initialization when this module is loaded
initDatabase();

// Export the database connection so other files can use it
module.exports = db;
