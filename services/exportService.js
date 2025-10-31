/**
 * Export Service
 * Handles exporting allocation data to different formats (CSV, PDF)
 * Provides reusable export functionality
 */

const db = require("../config/database"); // Import database connection
const PDFDocument = require("pdfkit"); // PDF generation library

/**
 * Export allocations as CSV file
 * Generates a CSV file with all allocation data
 * @route GET /api/allocations/export
 */
const exportCSV = async (req, res) => {
  try {
    // Query database for all allocations with student and room details
    const [rows] = await db.promise().query(`
      SELECT s.student_id, s.name, s.course, r.room_number, a.exam_date, a.exam_time
      FROM allocations a
      JOIN students s ON a.student_id = s.id
      JOIN rooms r ON a.room_id = r.id
      ORDER BY a.exam_date, r.room_number, s.student_id
    `);

    // Create CSV header row
    const header = "student_id,name,course,room_number,exam_date,exam_time\n";

    // Convert each row to CSV format
    const body = rows
      .map((r) =>
        [
          r.student_id,
          r.name,
          r.course || "", // Handle null values
          r.room_number,
          r.exam_date?.toISOString?.().slice(0, 10) || r.exam_date, // Format date
          r.exam_time || "", // Handle null values
        ].join(",")
      )
      .join("\n");

    // Combine header and body
    const csv = header + body + "\n";

    // Set response headers for file download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="allocations.csv"' // Browser will download as this filename
    );

    // Send CSV content
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: "Failed to export CSV" });
  }
};

/**
 * Export allocations as PDF file
 * Generates a professionally formatted PDF report
 * @route GET /api/allocations/export-pdf
 */
const exportPDF = async (req, res) => {
  try {
    // Query database for all allocations with student and room details
    const [rows] = await db.promise().query(`
      SELECT s.student_id, s.name, s.course, r.room_number, a.exam_date, a.exam_time
      FROM allocations a
      JOIN students s ON a.student_id = s.id
      JOIN rooms r ON a.room_id = r.id
      ORDER BY a.exam_date, a.exam_time, r.room_number, s.student_id
    `);

    // Set response headers for PDF display/download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="allocations.pdf"'); // 'inline' opens in browser

    // PDF configuration
    const margin = 40; // Page margins in points
    const doc = new PDFDocument({ margin, size: "A4" }); // Create PDF document
    doc.pipe(res); // Pipe PDF directly to response

    // Calculate usable page width (total width minus margins)
    const pageWidth = doc.page.width - margin * 2;

    // ==================== PDF HEADER ====================
    // Title
    doc.fontSize(18).text("Exam Room Allocation Report", { align: "center" });
    doc.moveDown(0.25);

    // Generation timestamp
    const dateStr = new Date().toLocaleString();
    doc
      .fontSize(10)
      .fillColor("#666")
      .text(`Generated: ${dateStr}`, { align: "center" });
    doc.fillColor("#000"); // Reset color to black
    doc.moveDown(0.75);

    // ==================== TABLE COLUMN DEFINITIONS ====================
    // Define column widths and labels
    const columns = [
      { key: "student_id", label: "Student ID", width: 75 },
      { key: "name", label: "Name", width: 150 },
      { key: "course", label: "Course", width: 100 },
      { key: "room_number", label: "Room", width: 55 },
      { key: "exam_date", label: "Date", width: 65 },
      { key: "exam_time", label: "Time", width: 55 },
    ];

    // Adjust last column width to fill remaining space (handles rounding errors)
    const totalWidth = columns.reduce((s, c) => s + c.width, 0);
    if (totalWidth < pageWidth) {
      columns[columns.length - 1].width += pageWidth - totalWidth;
    }

    // Table row dimensions
    const headerHeight = 22; // Height of header row
    const rowHeight = 18; // Height of data rows
    let y = doc.y; // Current Y position on page

    /**
     * Draw table header
     * Creates the header row with column labels
     */
    function drawHeader() {
      let x = margin; // Start at left margin

      // Draw header background (light gray)
      doc.save();
      doc.rect(margin, y, pageWidth, headerHeight).fill("#f0f0f0");
      doc.restore();

      // Draw column labels
      doc.fontSize(11).fillColor("#000");
      columns.forEach((col) => {
        doc.text(col.label, x + 4, y + 6, {
          width: col.width - 8,
          align: "left",
        });
        x += col.width; // Move to next column
      });

      // Draw bottom border line
      doc
        .moveTo(margin, y + headerHeight)
        .lineTo(margin + pageWidth, y + headerHeight)
        .stroke();

      y += headerHeight; // Move Y position down
    }

    /**
     * Ensure there's enough space on current page
     * Adds new page if needed and redraws header
     */
    function ensurePageSpace() {
      const bottom = doc.page.height - margin; // Bottom margin
      if (y + rowHeight > bottom) {
        doc.addPage(); // Add new page
        y = margin; // Reset Y position
        drawHeader(); // Redraw header on new page
      }
    }

    // Event handler: when new page is added, add small header
    doc.on("pageAdded", () => {
      // Small title on subsequent pages
      doc
        .fontSize(10)
        .fillColor("#666")
        .text("Exam Room Allocation Report", margin, margin - 20, {
          width: pageWidth,
          align: "right",
        });
    });

    // Draw initial header
    drawHeader();

    /**
     * Format values for display
     * Converts database values to display-friendly strings
     */
    function fmt(row, key) {
      // Format dates
      if (key === "exam_date") {
        return row.exam_date instanceof Date
          ? row.exam_date.toISOString().slice(0, 10) // Format: YYYY-MM-DD
          : String(row.exam_date || "");
      }
      // Format times
      if (key === "exam_time") {
        return row.exam_time ? String(row.exam_time).substring(0, 5) : ""; // Format: HH:MM
      }
      // Handle null values
      const v = row[key];
      return v == null ? "" : String(v);
    }

    // ==================== DRAW TABLE ROWS ====================
    // Draw each data row with zebra striping (alternating row colors)
    rows.forEach((r, idx) => {
      ensurePageSpace(); // Check if new page needed

      // Zebra striping: alternate row background colors
      if (idx % 2 === 1) {
        doc.save();
        doc.rect(margin, y, pageWidth, rowHeight).fill("#fafafa"); // Light gray background
        doc.restore();
      }

      // Draw cell content
      let x = margin;
      columns.forEach((col) => {
        const text = fmt(r, col.key); // Format the value
        doc
          .fillColor("#000")
          .fontSize(10)
          .text(text, x + 4, y + 4, { width: col.width - 8, ellipsis: true }); // ellipsis truncates long text
        x += col.width; // Move to next column
      });
      y += rowHeight; // Move to next row
    });

    // ==================== PDF FOOTER ====================
    ensurePageSpace(); // Ensure space for footer
    doc.moveDown(0.5);
    // Display total record count
    doc
      .fontSize(10)
      .fillColor("#333")
      .text(`Total records: ${rows.length}`, { align: "right" });

    // Finalize PDF document
    doc.end();
  } catch (error) {
    res.status(500).json({ error: "Failed to export PDF" });
  }
};

// Export service functions
module.exports = { exportCSV, exportPDF };
