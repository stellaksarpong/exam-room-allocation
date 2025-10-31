/**
 * Student Controller
 * Handles all business logic related to students
 * Includes CRUD operations and file import functionality
 */

const db = require("../config/database"); // Import database connection
const { parse } = require("csv-parse"); // CSV parsing library
const XLSX = require("xlsx"); // Excel file reading library

/**
 * Get all students
 * Fetches all students from database sorted by student_id
 * @route GET /api/students
 */
const getAllStudents = (req, res) => {
  // Query database for all students, ordered by student_id
  db.query("SELECT * FROM students ORDER BY student_id", (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Error fetching students" });
    }
    // Return all students as JSON
    res.json(results);
  });
};

/**
 * Create a new student
 * Adds a new student to the database
 * @route POST /api/students
 * @body {string} student_id - Unique student identifier (required)
 * @body {string} name - Student full name (required)
 * @body {string} course - Course/program name (optional)
 * @body {number} year - Year of study (optional)
 */
const createStudent = (req, res) => {
  // Extract student data from request body
  const { student_id, name, course, year } = req.body;

  // Validate required fields
  if (!student_id || !name) {
    return res.status(400).json({ error: "Student ID and name are required" });
  }

  // Insert new student into database
  db.query(
    "INSERT INTO students (student_id, name, course, year) VALUES (?, ?, ?, ?)",
    [student_id, name, course, year],
    (err, result) => {
      if (err) {
        // Check if error is due to duplicate student ID
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ error: "Student ID already exists" });
        }
        return res.status(500).json({ error: "Error adding student" });
      }
      // Return success with the new student's ID
      res.json({ id: result.insertId, message: "Student added successfully" });
    }
  );
};

/**
 * Update an existing student
 * Modifies student information in the database
 * @route PUT /api/students/:id
 * @param {number} id - Student ID from URL
 * @body {string} student_id - Updated student ID
 * @body {string} name - Updated name
 * @body {string} course - Updated course
 * @body {number} year - Updated year
 */
const updateStudent = (req, res) => {
  // Extract updated data from request body
  const { student_id, name, course, year } = req.body;
  // Get student ID from URL parameters
  const id = req.params.id;

  // Update student in database
  db.query(
    "UPDATE students SET student_id = ?, name = ?, course = ?, year = ? WHERE id = ?",
    [student_id, name, course, year, id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: "Error updating student" });
      }
      res.json({ message: "Student updated successfully" });
    }
  );
};

/**
 * Delete a student
 * Removes a student from the database
 * Note: Due to CASCADE, this will also delete all allocations for this student
 * @route DELETE /api/students/:id
 * @param {number} id - Student ID from URL
 */
const deleteStudent = (req, res) => {
  // Get student ID from URL parameters
  const id = req.params.id;

  // Delete student from database
  db.query("DELETE FROM students WHERE id = ?", [id], (err) => {
    if (err) {
      return res.status(500).json({ error: "Error deleting student" });
    }
    res.json({ message: "Student deleted successfully" });
  });
};

/**
 * Import students from CSV file
 * Reads a CSV file and bulk imports students into the database
 * @route POST /api/students/import
 * @file CSV file with columns: student_id, name, course, year
 */
const importCSV = async (req, res) => {
  // Check if file was uploaded
  if (!req.file) return res.status(400).json({ error: "CSV file is required" });

  try {
    // Convert file buffer to text
    const csvText = req.file.buffer.toString("utf8");
    const records = [];

    // Parse CSV file using csv-parse library
    await new Promise((resolve, reject) => {
      parse(
        csvText,
        { columns: true, skip_empty_lines: true, trim: true }, // Options: use first row as headers, skip empty lines, trim whitespace
        (err, rows) => {
          if (err) return reject(err);
          // Add each row to records array
          rows.forEach((r) => records.push(r));
          resolve();
        }
      );
    });

    let inserted = 0,
      skipped = 0;

    // Process each record from CSV
    for (const row of records) {
      // Try multiple column name variations (case-insensitive)
      const studentId =
        row.student_id || row.StudentID || row.Student_Id || row.id;
      const name = row.name || row.Name;
      const course = row.course || row.Course || null;
      // Parse year as integer, try multiple column names
      const year = row.year
        ? parseInt(row.year)
        : row.Year
        ? parseInt(row.Year)
        : null;

      // Skip rows without required fields
      if (!studentId || !name) {
        skipped++;
        continue;
      }

      // Try to insert student into database
      try {
        await db
          .promise()
          .query(
            "INSERT INTO students (student_id, name, course, year) VALUES (?, ?, ?, ?)",
            [studentId, name, course, year]
          );
        inserted++;
      } catch (e) {
        // If insert fails (duplicate ID, etc.), skip this record
        skipped++;
      }
    }

    // Return import summary
    res.json({
      message: `Import complete: ${inserted} inserted, ${skipped} skipped`,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to import CSV" });
  }
};

/**
 * Import students from Excel file (.xlsx or .xls)
 * Reads an Excel file and bulk imports students into the database
 * @route POST /api/students/import-xlsx
 * @file Excel file with columns: student_id, name, course, year
 */
const importXLSX = async (req, res) => {
  // Check if file was uploaded
  if (!req.file)
    return res.status(400).json({ error: "Excel file is required" });

  try {
    // Read Excel file from buffer
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    // Get the first sheet name
    const firstSheetName = workbook.SheetNames[0];
    // Get the sheet data
    const sheet = workbook.Sheets[firstSheetName];
    // Convert sheet to JSON array (first row becomes keys)
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    let inserted = 0,
      skipped = 0;

    // Process each row from Excel
    for (const row of rows) {
      // Try multiple column name variations
      const studentId =
        row.student_id ||
        row.StudentID ||
        row.Student_Id ||
        row.ID ||
        row.Id ||
        row.id;
      const name = row.name || row.Name;
      const course = row.course || row.Course || null;
      // Parse year as integer
      const year = row.year
        ? parseInt(row.year)
        : row.Year
        ? parseInt(row.Year)
        : null;

      // Skip rows without required fields
      if (!studentId || !name) {
        skipped++;
        continue;
      }

      // Try to insert student into database
      try {
        await db
          .promise()
          .query(
            "INSERT INTO students (student_id, name, course, year) VALUES (?, ?, ?, ?)",
            [studentId, name, course, year]
          );
        inserted++;
      } catch (e) {
        // If insert fails, skip this record
        skipped++;
      }
    }

    // Return import summary
    res.json({
      message: `Excel import complete: ${inserted} inserted, ${skipped} skipped`,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to import Excel file" });
  }
};

// Export all controller functions
module.exports = {
  getAllStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  importCSV,
  importXLSX,
};
