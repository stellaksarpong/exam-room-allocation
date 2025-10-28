const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();
const multer = require("multer");
const { parse } = require("csv-parse");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});
const XLSX = require("xlsx");
const PDFDocument = require("pdfkit");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// Database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "exam_room_allocation",
});

db.connect((err) => {
  if (err) {
    console.error("Database connection error:", err);
  } else {
    console.log("Connected to MySQL database");
  }
});

// Initialize database tables
const initDatabase = () => {
  const queries = [
    `CREATE TABLE IF NOT EXISTS rooms (
      id INT PRIMARY KEY AUTO_INCREMENT,
      room_number VARCHAR(50) UNIQUE NOT NULL,
      capacity INT NOT NULL,
      floor INT,
      building VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS students (
      id INT PRIMARY KEY AUTO_INCREMENT,
      student_id VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      course VARCHAR(100),
      year INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS allocations (
      id INT PRIMARY KEY AUTO_INCREMENT,
      student_id INT NOT NULL,
      room_id INT NOT NULL,
      exam_date DATE NOT NULL,
      exam_time TIME,
      allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
      UNIQUE KEY unique_student_exam (student_id, exam_date)
    )`,
  ];

  queries.forEach((query) => {
    db.query(query, (err) => {
      if (err) console.error("Error creating table:", err);
    });
  });

  // Try to migrate unique constraint to include time (idempotent)
  db.query(
    'SHOW INDEX FROM allocations WHERE Key_name = "unique_student_exam"',
    (err, indexes) => {
      if (!err && indexes && indexes.length) {
        db.query(
          "ALTER TABLE allocations DROP INDEX unique_student_exam",
          () => {
            db.query(
              "ALTER TABLE allocations ADD UNIQUE KEY unique_student_exam_time (student_id, exam_date, exam_time)",
              () => {}
            );
          }
        );
      } else {
        // Maybe already migrated; ensure the new one exists
        db.query(
          'SHOW INDEX FROM allocations WHERE Key_name = "unique_student_exam_time"',
          (e2, idx2) => {
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

initDatabase();

// ==================== ROOM ROUTES ====================

// Get all rooms
app.get("/api/rooms", (req, res) => {
  db.query("SELECT * FROM rooms ORDER BY room_number", (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Error fetching rooms" });
    }
    res.json(results);
  });
});

// Add a new room
app.post("/api/rooms", (req, res) => {
  const { room_number, capacity, floor, building } = req.body;

  if (!room_number || !capacity) {
    return res
      .status(400)
      .json({ error: "Room number and capacity are required" });
  }

  db.query(
    "INSERT INTO rooms (room_number, capacity, floor, building) VALUES (?, ?, ?, ?)",
    [room_number, capacity, floor, building],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ error: "Room number already exists" });
        }
        return res.status(500).json({ error: "Error adding room" });
      }
      res.json({ id: result.insertId, message: "Room added successfully" });
    }
  );
});

// Update a room
app.put("/api/rooms/:id", (req, res) => {
  const { room_number, capacity, floor, building } = req.body;
  const id = req.params.id;

  db.query(
    "UPDATE rooms SET room_number = ?, capacity = ?, floor = ?, building = ? WHERE id = ?",
    [room_number, capacity, floor, building, id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: "Error updating room" });
      }
      res.json({ message: "Room updated successfully" });
    }
  );
});

// Delete a room
app.delete("/api/rooms/:id", (req, res) => {
  const id = req.params.id;

  db.query("DELETE FROM rooms WHERE id = ?", [id], (err) => {
    if (err) {
      return res.status(500).json({ error: "Error deleting room" });
    }
    res.json({ message: "Room deleted successfully" });
  });
});

// ==================== STUDENT ROUTES ====================

// Get all students
app.get("/api/students", (req, res) => {
  db.query("SELECT * FROM students ORDER BY student_id", (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Error fetching students" });
    }
    res.json(results);
  });
});

// Add a new student
app.post("/api/students", (req, res) => {
  const { student_id, name, course, year } = req.body;

  if (!student_id || !name) {
    return res.status(400).json({ error: "Student ID and name are required" });
  }

  db.query(
    "INSERT INTO students (student_id, name, course, year) VALUES (?, ?, ?, ?)",
    [student_id, name, course, year],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ error: "Student ID already exists" });
        }
        return res.status(500).json({ error: "Error adding student" });
      }
      res.json({ id: result.insertId, message: "Student added successfully" });
    }
  );
});

// Update a student
app.put("/api/students/:id", (req, res) => {
  const { student_id, name, course, year } = req.body;
  const id = req.params.id;

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
});

// Delete a student
app.delete("/api/students/:id", (req, res) => {
  const id = req.params.id;

  db.query("DELETE FROM students WHERE id = ?", [id], (err) => {
    if (err) {
      return res.status(500).json({ error: "Error deleting student" });
    }
    res.json({ message: "Student deleted successfully" });
  });
});

// ==================== ALLOCATION ROUTES ====================

// Get all allocations
app.get("/api/allocations", (req, res) => {
  const query = `
    SELECT 
      a.id,
      a.exam_date,
      a.exam_time,
      s.student_id,
      s.name AS student_name,
      s.course,
      s.year,
      r.room_number,
      r.capacity,
      r.floor,
      r.building
    FROM allocations a
    JOIN students s ON a.student_id = s.id
    JOIN rooms r ON a.room_id = r.id
    ORDER BY a.exam_date, r.room_number
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Error fetching allocations" });
    }
    res.json(results);
  });
});

// Auto-allocate students to rooms
app.post("/api/allocate", async (req, res) => {
  const { exam_date, exam_time } = req.body;

  if (!exam_date) {
    return res.status(400).json({ error: "Exam date is required" });
  }

  try {
    const useTime = Boolean(exam_time);

    // Get all unallocated students for this exam date/time
    const unallocatedQuery = useTime
      ? `SELECT * FROM students WHERE id NOT IN (
           SELECT student_id FROM allocations WHERE exam_date = ? AND exam_time = ?
         )`
      : `SELECT * FROM students WHERE id NOT IN (
           SELECT student_id FROM allocations WHERE exam_date = ?
         )`;
    const unallocatedParams = useTime ? [exam_date, exam_time] : [exam_date];
    const [students] = await db
      .promise()
      .query(unallocatedQuery, unallocatedParams);

    if (students.length === 0) {
      return res.json({
        message: "All students are already allocated",
        allocations: [],
      });
    }

    // Get all rooms
    const [rooms] = await db
      .promise()
      .query("SELECT * FROM rooms ORDER BY room_number");

    let allocations = [];
    let studentIndex = 0;

    for (const room of rooms) {
      // Get current allocation count for this room on this date/time
      const countQuery = useTime
        ? "SELECT COUNT(*) as count FROM allocations WHERE room_id = ? AND exam_date = ? AND exam_time = ?"
        : "SELECT COUNT(*) as count FROM allocations WHERE room_id = ? AND exam_date = ?";
      const countParams = useTime
        ? [room.id, exam_date, exam_time]
        : [room.id, exam_date];
      const [result] = await db.promise().query(countQuery, countParams);

      const currentCount = result[0].count;
      const availableSlots = room.capacity - currentCount;

      for (
        let i = 0;
        i < availableSlots && studentIndex < students.length;
        i++
      ) {
        const student = students[studentIndex];
        allocations.push({
          student_id: student.id,
          room_id: room.id,
          exam_date,
          exam_time: useTime ? exam_time : null,
        });
        studentIndex++;
      }

      if (studentIndex >= students.length) break;
    }

    if (allocations.length === 0) {
      return res.json({ message: "No available rooms", allocations: [] });
    }

    // Insert allocations
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

    res.json({
      message: `${allocations.length} students allocated successfully`,
      allocations,
    });
  } catch (error) {
    res.status(500).json({ error: "Error creating allocations" });
  }
});

// Delete an allocation
app.delete("/api/allocations/:id", (req, res) => {
  const id = req.params.id;

  db.query("DELETE FROM allocations WHERE id = ?", [id], (err) => {
    if (err) {
      return res.status(500).json({ error: "Error deleting allocation" });
    }
    res.json({ message: "Allocation deleted successfully" });
  });
});

// Filter allocations by optional date/time
app.get("/api/allocations/filter", async (req, res) => {
  const { exam_date, exam_time } = req.query;
  try {
    let query = `
      SELECT a.id, a.exam_date, a.exam_time, s.student_id, s.name AS student_name, s.course, s.year, r.room_number
      FROM allocations a
      JOIN students s ON a.student_id = s.id
      JOIN rooms r ON a.room_id = r.id`;
    const params = [];
    const where = [];
    if (exam_date) {
      where.push("a.exam_date = ?");
      params.push(exam_date);
    }
    if (exam_time) {
      where.push("a.exam_time = ?");
      params.push(exam_time);
    }
    if (where.length) query += " WHERE " + where.join(" AND ");
    query += " ORDER BY a.exam_date, a.exam_time, r.room_number, s.student_id";

    const [rows] = await db.promise().query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to filter allocations" });
  }
});

// Bulk reset allocations by date/time
app.delete("/api/allocations/reset", async (req, res) => {
  const { exam_date, exam_time } = req.query;
  if (!exam_date)
    return res.status(400).json({ error: "exam_date is required" });
  try {
    let query = "DELETE FROM allocations WHERE exam_date = ?";
    const params = [exam_date];
    if (exam_time) {
      query += " AND exam_time = ?";
      params.push(exam_time);
    }
    const [result] = await db.promise().query(query, params);
    res.json({ message: "Allocations reset", affected: result.affectedRows });
  } catch (error) {
    res.status(500).json({ error: "Failed to reset allocations" });
  }
});

// Get allocation statistics
app.get("/api/stats", (req, res) => {
  const stats = {};

  // Total rooms
  db.query("SELECT COUNT(*) as count FROM rooms", (err, result) => {
    if (!err) stats.totalRooms = result[0].count;

    // Total capacity
    db.query("SELECT SUM(capacity) as total FROM rooms", (err, result) => {
      if (!err) stats.totalCapacity = result[0].total;

      // Total students
      db.query("SELECT COUNT(*) as count FROM students", (err, result) => {
        if (!err) stats.totalStudents = result[0].count;

        // Total allocations
        db.query("SELECT COUNT(*) as count FROM allocations", (err, result) => {
          if (!err) stats.totalAllocations = result[0].count;

          res.json(stats);
        });
      });
    });
  });
});

// ==================== CSV IMPORT STUDENTS ====================
app.post("/api/students/import", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "CSV file is required" });
  try {
    const csvText = req.file.buffer.toString("utf8");
    const records = [];
    await new Promise((resolve, reject) => {
      parse(
        csvText,
        { columns: true, skip_empty_lines: true, trim: true },
        (err, rows) => {
          if (err) return reject(err);
          rows.forEach((r) => records.push(r));
          resolve();
        }
      );
    });

    let inserted = 0,
      skipped = 0;
    for (const row of records) {
      const studentId =
        row.student_id || row.StudentID || row.Student_Id || row.id;
      const name = row.name || row.Name;
      const course = row.course || row.Course || null;
      const year = row.year
        ? parseInt(row.year)
        : row.Year
        ? parseInt(row.Year)
        : null;
      if (!studentId || !name) {
        skipped++;
        continue;
      }
      try {
        await db
          .promise()
          .query(
            "INSERT INTO students (student_id, name, course, year) VALUES (?, ?, ?, ?)",
            [studentId, name, course, year]
          );
        inserted++;
      } catch (e) {
        // duplicate or other issue
        skipped++;
      }
    }

    res.json({
      message: `Import complete: ${inserted} inserted, ${skipped} skipped`,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to import CSV" });
  }
});

// ==================== CSV EXPORT ALLOCATIONS ====================
app.get("/api/allocations/export", async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT s.student_id, s.name, s.course, r.room_number, a.exam_date, a.exam_time
      FROM allocations a
      JOIN students s ON a.student_id = s.id
      JOIN rooms r ON a.room_id = r.id
      ORDER BY a.exam_date, r.room_number, s.student_id
    `);

    const header = "student_id,name,course,room_number,exam_date,exam_time\n";
    const body = rows
      .map((r) =>
        [
          r.student_id,
          r.name,
          r.course || "",
          r.room_number,
          r.exam_date?.toISOString?.().slice(0, 10) || r.exam_date,
          r.exam_time || "",
        ].join(",")
      )
      .join("\n");
    const csv = header + body + "\n";

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="allocations.csv"'
    );
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: "Failed to export CSV" });
  }
});

// ==================== XLSX IMPORT STUDENTS ====================
app.post(
  "/api/students/import-xlsx",
  upload.single("file"),
  async (req, res) => {
    if (!req.file)
      return res.status(400).json({ error: "Excel file is required" });
    try {
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      let inserted = 0,
        skipped = 0;
      for (const row of rows) {
        const studentId =
          row.student_id ||
          row.StudentID ||
          row.Student_Id ||
          row.ID ||
          row.Id ||
          row.id;
        const name = row.name || row.Name;
        const course = row.course || row.Course || null;
        const year = row.year
          ? parseInt(row.year)
          : row.Year
          ? parseInt(row.Year)
          : null;
        if (!studentId || !name) {
          skipped++;
          continue;
        }
        try {
          await db
            .promise()
            .query(
              "INSERT INTO students (student_id, name, course, year) VALUES (?, ?, ?, ?)",
              [studentId, name, course, year]
            );
          inserted++;
        } catch (e) {
          skipped++;
        }
      }

      res.json({
        message: `Excel import complete: ${inserted} inserted, ${skipped} skipped`,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to import Excel file" });
    }
  }
);

// ==================== PDF EXPORT ALLOCATIONS ====================
app.get("/api/allocations/export-pdf", async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT s.student_id, s.name, s.course, r.room_number, a.exam_date, a.exam_time
      FROM allocations a
      JOIN students s ON a.student_id = s.id
      JOIN rooms r ON a.room_id = r.id
      ORDER BY a.exam_date, a.exam_time, r.room_number, s.student_id
    `);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="allocations.pdf"');

    const margin = 40;
    const doc = new PDFDocument({ margin, size: "A4" });
    doc.pipe(res);

    const pageWidth = doc.page.width - margin * 2;

    // Title
    doc.fontSize(18).text("Exam Room Allocation Report", { align: "center" });
    doc.moveDown(0.25);
    const dateStr = new Date().toLocaleString();
    doc
      .fontSize(10)
      .fillColor("#666")
      .text(`Generated: ${dateStr}`, { align: "center" });
    doc.fillColor("#000");
    doc.moveDown(0.75);

    // Column definitions
    const columns = [
      { key: "student_id", label: "Student ID", width: 75 },
      { key: "name", label: "Name", width: 150 },
      { key: "course", label: "Course", width: 100 },
      { key: "room_number", label: "Room", width: 55 },
      { key: "exam_date", label: "Date", width: 65 },
      { key: "exam_time", label: "Time", width: 55 },
    ];

    // Adjust last column to fit page width if rounding error
    const totalWidth = columns.reduce((s, c) => s + c.width, 0);
    if (totalWidth < pageWidth) {
      columns[columns.length - 1].width += pageWidth - totalWidth;
    }

    const headerHeight = 22;
    const rowHeight = 18;
    let y = doc.y;

    function drawHeader() {
      let x = margin;
      // Header background
      doc.save();
      doc.rect(margin, y, pageWidth, headerHeight).fill("#f0f0f0");
      doc.restore();
      // Header labels
      doc.fontSize(11).fillColor("#000");
      columns.forEach((col) => {
        doc.text(col.label, x + 4, y + 6, {
          width: col.width - 8,
          align: "left",
        });
        x += col.width;
      });
      // Bottom line
      doc
        .moveTo(margin, y + headerHeight)
        .lineTo(margin + pageWidth, y + headerHeight)
        .stroke();
      y += headerHeight;
    }

    function ensurePageSpace() {
      const bottom = doc.page.height - margin;
      if (y + rowHeight > bottom) {
        doc.addPage();
        y = margin;
        drawHeader();
      }
    }

    // Repeat header on each new page
    doc.on("pageAdded", () => {
      // Title on subsequent pages (small)
      doc
        .fontSize(10)
        .fillColor("#666")
        .text("Exam Room Allocation Report", margin, margin - 20, {
          width: pageWidth,
          align: "right",
        });
    });

    drawHeader();

    // Helper to format values
    function fmt(row, key) {
      if (key === "exam_date") {
        return row.exam_date instanceof Date
          ? row.exam_date.toISOString().slice(0, 10)
          : String(row.exam_date || "");
      }
      if (key === "exam_time") {
        return row.exam_time ? String(row.exam_time).substring(0, 5) : "";
      }
      const v = row[key];
      return v == null ? "" : String(v);
    }

    // Draw rows with zebra stripes
    rows.forEach((r, idx) => {
      ensurePageSpace();
      // Zebra background
      if (idx % 2 === 1) {
        doc.save();
        doc.rect(margin, y, pageWidth, rowHeight).fill("#fafafa");
        doc.restore();
      }
      let x = margin;
      columns.forEach((col) => {
        const text = fmt(r, col.key);
        doc
          .fillColor("#000")
          .fontSize(10)
          .text(text, x + 4, y + 4, { width: col.width - 8, ellipsis: true });
        x += col.width;
      });
      y += rowHeight;
    });

    // Footer summary
    ensurePageSpace();
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .fillColor("#333")
      .text(`Total records: ${rows.length}`, { align: "right" });

    doc.end();
  } catch (error) {
    res.status(500).json({ error: "Failed to export PDF" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
