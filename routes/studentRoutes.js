/**
 * Student Routes
 * Defines all API endpoints related to student management
 * Includes CRUD operations and file import endpoints
 */

const express = require("express");
const router = express.Router(); // Create a new router instance
const studentController = require("../controllers/studentController"); // Import student controller
const upload = require("../middleware/upload"); // Import file upload middleware

// Route: GET /api/students
// Description: Get all students
// Handler: studentController.getAllStudents
router.get("/", studentController.getAllStudents);

// Route: POST /api/students
// Description: Create a new student
// Handler: studentController.createStudent
router.post("/", studentController.createStudent);

// Route: PUT /api/students/:id
// Description: Update an existing student by ID
// Handler: studentController.updateStudent
router.put("/:id", studentController.updateStudent);

// Route: DELETE /api/students/:id
// Description: Delete a student by ID
// Handler: studentController.deleteStudent
router.delete("/:id", studentController.deleteStudent);

// Route: POST /api/students/import
// Description: Import students from CSV file
// Middleware: upload.single("file") - handles file upload, expects field name "file"
// Handler: studentController.importCSV
router.post("/import", upload.single("file"), studentController.importCSV);

// Route: POST /api/students/import-xlsx
// Description: Import students from Excel file (.xlsx or .xls)
// Middleware: upload.single("file") - handles file upload, expects field name "file"
// Handler: studentController.importXLSX
router.post(
  "/import-xlsx",
  upload.single("file"),
  studentController.importXLSX
);

// Export the router so it can be used in server.js
module.exports = router;
