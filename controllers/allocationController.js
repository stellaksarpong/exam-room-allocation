/**
 * Allocation Controller
 * Handles all business logic related to student-room allocations
 * Manages automatic allocation, filtering, and deletion of allocations
 */

const db = require("../config/database"); // Import database connection

/**
 * Get all allocations
 * Fetches all allocations with joined student and room information
 * @route GET /api/allocations
 */
const getAllocations = (req, res) => {
  // SQL query to join allocations with students and rooms tables
  const query = `
    SELECT 
      a.id,                    -- Allocation ID
      a.exam_date,             -- Exam date
      a.exam_time,             -- Exam time
      s.student_id,            -- Student ID
      s.name AS student_name,  -- Student name
      s.course,                -- Student course
      s.year,                  -- Student year
      r.room_number,           -- Room number
      r.capacity,              -- Room capacity
      r.floor,                 -- Room floor
      r.building               -- Building name
    FROM allocations a
    JOIN students s ON a.student_id = s.id      -- Join with students table
    JOIN rooms r ON a.room_id = r.id            -- Join with rooms table
    ORDER BY a.exam_date, r.room_number         -- Sort by date then room number
  `;

  // Execute query
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Error fetching allocations" });
    }
    // Return all allocations as JSON
    res.json(results);
  });
};

/**
 * Automatically allocate students to rooms
 * Intelligently distributes unallocated students across available rooms
 * @route POST /api/allocate
 * @body {string} exam_date - Date of examination (required, format: YYYY-MM-DD)
 * @body {string} exam_time - Time of examination (optional, format: HH:MM:SS)
 */
const allocateStudents = async (req, res) => {
  // Extract exam date and time from request body
  const { exam_date, exam_time } = req.body;

  // Validate required field
  if (!exam_date) {
    return res.status(400).json({ error: "Exam date is required" });
  }

  try {
    // Determine if time-based allocation is being used
    const useTime = Boolean(exam_time);

    // Get all students who are NOT yet allocated for this exam date/time
    const unallocatedQuery = useTime
      ? `SELECT * FROM students WHERE id NOT IN (
           SELECT student_id FROM allocations WHERE exam_date = ? AND exam_time = ?
         )`
      : `SELECT * FROM students WHERE id NOT IN (
           SELECT student_id FROM allocations WHERE exam_date = ?
         )`;
    const unallocatedParams = useTime ? [exam_date, exam_time] : [exam_date];

    // Execute query to get unallocated students
    const [students] = await db
      .promise()
      .query(unallocatedQuery, unallocatedParams);

    // If all students are already allocated, return early
    if (students.length === 0) {
      return res.json({
        message: "All students are already allocated",
        allocations: [],
      });
    }

    // Get all available rooms, ordered by room number
    const [rooms] = await db
      .promise()
      .query("SELECT * FROM rooms ORDER BY room_number");

    // Array to store new allocations to be created
    let allocations = [];
    let studentIndex = 0; // Track which student we're currently allocating

    // Loop through each room
    for (const room of rooms) {
      // Check how many students are already allocated to this room for this date/time
      const countQuery = useTime
        ? "SELECT COUNT(*) as count FROM allocations WHERE room_id = ? AND exam_date = ? AND exam_time = ?"
        : "SELECT COUNT(*) as count FROM allocations WHERE room_id = ? AND exam_date = ?";
      const countParams = useTime
        ? [room.id, exam_date, exam_time]
        : [room.id, exam_date];
      const [result] = await db.promise().query(countQuery, countParams);

      // Calculate available slots in this room
      const currentCount = result[0].count;
      const availableSlots = room.capacity - currentCount;

      // Allocate students to fill available slots
      for (
        let i = 0;
        i < availableSlots && studentIndex < students.length;
        i++
      ) {
        const student = students[studentIndex];
        // Add allocation to our list
        allocations.push({
          student_id: student.id,
          room_id: room.id,
          exam_date,
          exam_time: useTime ? exam_time : null,
        });
        studentIndex++; // Move to next student
      }

      // If all students are allocated, stop processing rooms
      if (studentIndex >= students.length) break;
    }

    // If no allocations could be made (no room capacity), return error
    if (allocations.length === 0) {
      return res.json({ message: "No available rooms", allocations: [] });
    }

    // Insert all allocations into database
    for (const allocation of allocations) {
      await db
        .promise()
        .query(
          "INSERT INTO allocations  (student_id, room_id, exam_date, exam_time) VALUES (?, ?, ?, ?)",
          [
            allocation.student_id,
            allocation.room_id,
            allocation.exam_date,
            allocation.exam_time,
          ]
        );
    }

    // Return success message with allocation count
    res.json({
      message: `${allocations.length} students allocated successfully`,
      allocations,
    });
  } catch (error) {
    res.status(500).json({ error: "Error creating allocations" });
  }
};

/**
 * Delete a single allocation
 * Removes a specific student-room allocation
 * @route DELETE /api/allocations/:id
 * @param {number} id - Allocation ID from URL
 */
const deleteAllocation = (req, res) => {
  // Get allocation ID from URL parameters
  const id = req.params.id;

  // Delete allocation from database
  db.query("DELETE FROM allocations WHERE id = ?", [id], (err) => {
    if (err) {
      return res.status(500).json({ error: "Error deleting allocation" });
    }
    res.json({ message: "Allocation deleted successfully" });
  });
};

/**
 * Filter allocations by date and/or time
 * Returns allocations matching the specified criteria
 * @route GET /api/allocations/filter
 * @query {string} exam_date - Filter by exam date (optional)
 * @query {string} exam_time - Filter by exam time (optional)
 */
const filterAllocations = async (req, res) => {
  // Get filter parameters from query string
  const { exam_date, exam_time } = req.query;

  try {
    // Start building SQL query
    let query = `
      SELECT a.id, a.exam_date, a.exam_time, s.student_id, s.name AS student_name, s.course, s.year, r.room_number
      FROM allocations a
      JOIN students s ON a.student_id = s.id
      JOIN rooms r ON a.room_id = r.id`;

    const params = [];
    const where = [];

    // Add date filter if provided
    if (exam_date) {
      where.push("a.exam_date = ?");
      params.push(exam_date);
    }

    // Add time filter if provided
    if (exam_time) {
      where.push("a.exam_time = ?");
      params.push(exam_time);
    }

    // Add WHERE clause if any filters were specified
    if (where.length) query += " WHERE " + where.join(" AND ");

    // Add ordering
    query += " ORDER BY a.exam_date, a.exam_time, r.room_number, s.student_id";

    // Execute query
    const [rows] = await db.promise().query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to filter allocations" });
  }
};

/**
 * Reset allocations for a specific date/time
 * Bulk deletes all allocations matching the criteria
 * @route DELETE /api/allocations/reset
 * @query {string} exam_date - Date to reset (required)
 * @query {string} exam_time - Time to reset (optional)
 */
const resetAllocations = async (req, res) => {
  // Get reset parameters from query string
  const { exam_date, exam_time } = req.query;

  // Validate required parameter
  if (!exam_date)
    return res.status(400).json({ error: "exam_date is required" });

  try {
    // Build DELETE query
    let query = "DELETE FROM allocations WHERE exam_date = ?";
    const params = [exam_date];

    // Add time filter if provided
    if (exam_time) {
      query += " AND exam_time = ?";
      params.push(exam_time);
    }

    // Execute delete query
    const [result] = await db.promise().query(query, params);

    // Return success with number of affected rows
    res.json({ message: "Allocations reset", affected: result.affectedRows });
  } catch (error) {
    res.status(500).json({ error: "Failed to reset allocations" });
  }
};

// Export all controller functions
module.exports = {
  getAllocations,
  allocateStudents,
  deleteAllocation,
  filterAllocations,
  resetAllocations,
};
