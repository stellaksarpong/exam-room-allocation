/**
 * Allocation Routes
 * Defines all API endpoints related to room-student allocations
 * Includes allocation, filtering, export, and reset functionality
 */

const express = require("express");
const router = express.Router(); // Create a new router instance
const allocationController = require("../controllers/allocationController"); // Import allocation controller
const exportService = require("../services/exportService"); // Import export service

// Route: GET /api/allocations
// Description: Get all allocations with student and room details
// Handler: allocationController.getAllocations
router.get("/", allocationController.getAllocations);

// Route: POST /api/allocations/allocate
// Description: Automatically allocate unallocated students to available rooms
// Handler: allocationController.allocateStudents
router.post("/allocate", allocationController.allocateStudents);

// Route: DELETE /api/allocations/:id
// Description: Delete a specific allocation by ID
// Handler: allocationController.deleteAllocation
router.delete("/:id", allocationController.deleteAllocation);

// Route: GET /api/allocations/filter
// Description: Filter allocations by exam_date and/or exam_time
// Query params: ?exam_date=YYYY-MM-DD&exam_time=HH:MM:SS
// Handler: allocationController.filterAllocations
router.get("/filter", allocationController.filterAllocations);

// Route: DELETE /api/allocations/reset
// Description: Bulk delete allocations for a specific date/time
// Query params: ?exam_date=YYYY-MM-DD&exam_time=HH:MM:SS (time optional)
// Handler: allocationController.resetAllocations
router.delete("/reset", allocationController.resetAllocations);

// Route: GET /api/allocations/export
// Description: Export allocations as CSV file
// Handler: exportService.exportCSV
router.get("/export", exportService.exportCSV);

// Route: GET /api/allocations/export-pdf
// Description: Export allocations as PDF file
// Handler: exportService.exportPDF
router.get("/export-pdf", exportService.exportPDF);

// Export the router so it can be used in server.js
module.exports = router;
