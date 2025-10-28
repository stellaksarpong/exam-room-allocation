const API_URL = "/api";

// Tab switching
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const tabId = tab.getAttribute("data-tab");
    switchTab(tabId);
  });
});

function switchTab(tabId) {
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((c) => c.classList.remove("active"));

  document.querySelector(`[data-tab="${tabId}"]`).classList.add("active");
  document.getElementById(tabId).classList.add("active");

  if (tabId === "report") {
    loadAllocations();
  }
}

// Load stats
async function loadStats() {
  try {
    const response = await fetch(`${API_URL}/stats`);
    const stats = await response.json();

    document.getElementById("totalRooms").textContent = stats.totalRooms || 0;
    document.getElementById("totalCapacity").textContent =
      stats.totalCapacity || 0;
    document.getElementById("totalStudents").textContent =
      stats.totalStudents || 0;
    document.getElementById("totalAllocations").textContent =
      stats.totalAllocations || 0;
  } catch (error) {
    console.error("Error loading stats:", error);
  }
}

// Rooms Management
async function loadRooms() {
  try {
    const response = await fetch(`${API_URL}/rooms`);
    const rooms = await response.json();

    const tbody = document.getElementById("roomsTableBody");
    tbody.innerHTML = "";

    rooms.forEach((room) => {
      const row = tbody.insertRow();
      row.innerHTML = `
                <td>${room.room_number}</td>
                <td>${room.capacity}</td>
                <td>${room.floor || "-"}</td>
                <td>${room.building || "-"}</td>
                <td class="actions">
                    <button class="btn btn-warning" onclick="editRoom(${
                      room.id
                    })">Edit</button>
                    <button class="btn btn-danger" onclick="deleteRoom(${
                      room.id
                    })">Delete</button>
                </td>
            `;
    });
  } catch (error) {
    console.error("Error loading rooms:", error);
    alert("Error loading rooms");
  }
}

function openRoomModal(roomId = null) {
  const modal = document.getElementById("roomModal");
  const form = document.getElementById("roomForm");
  const title = document.getElementById("roomModalTitle");

  form.reset();
  document.getElementById("roomId").value = roomId || "";
  title.textContent = roomId ? "Edit Room" : "Add Room";

  if (roomId) {
    fetch(`${API_URL}/rooms`)
      .then((res) => res.json())
      .then((rooms) => {
        const room = rooms.find((r) => r.id === roomId);
        if (room) {
          document.getElementById("roomNumber").value = room.room_number;
          document.getElementById("capacity").value = room.capacity;
          document.getElementById("floor").value = room.floor || "";
          document.getElementById("building").value = room.building || "";
        }
      });
  }

  modal.style.display = "block";
}

function closeRoomModal() {
  document.getElementById("roomModal").style.display = "none";
}

document.getElementById("roomForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const roomId = document.getElementById("roomId").value;
  const roomData = {
    room_number: document.getElementById("roomNumber").value,
    capacity: parseInt(document.getElementById("capacity").value),
    floor: parseInt(document.getElementById("floor").value) || null,
    building: document.getElementById("building").value || null,
  };

  try {
    const url = roomId ? `${API_URL}/rooms/${roomId}` : `${API_URL}/rooms`;
    const method = roomId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(roomData),
    });

    if (response.ok) {
      closeRoomModal();
      loadRooms();
      loadStats();
    } else {
      const error = await response.json();
      alert(error.error || "Error saving room");
    }
  } catch (error) {
    console.error("Error saving room:", error);
    alert("Error saving room");
  }
});

function editRoom(id) {
  openRoomModal(id);
}

async function deleteRoom(id) {
  if (!confirm("Are you sure you want to delete this room?")) return;

  try {
    const response = await fetch(`${API_URL}/rooms/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      loadRooms();
      loadStats();
    } else {
      alert("Error deleting room");
    }
  } catch (error) {
    console.error("Error deleting room:", error);
    alert("Error deleting room");
  }
}

// Students Management
async function loadStudents() {
  try {
    const response = await fetch(`${API_URL}/students`);
    const students = await response.json();

    const tbody = document.getElementById("studentsTableBody");
    tbody.innerHTML = "";

    students.forEach((student) => {
      const row = tbody.insertRow();
      row.innerHTML = `
                <td>${student.student_id}</td>
                <td>${student.name}</td>
                <td>${student.course || "-"}</td>
                <td>${student.year || "-"}</td>
                <td class="actions">
                    <button class="btn btn-warning" onclick="editStudent(${
                      student.id
                    })">Edit</button>
                    <button class="btn btn-danger" onclick="deleteStudent(${
                      student.id
                    })">Delete</button>
                </td>
            `;
    });
  } catch (error) {
    console.error("Error loading students:", error);
    alert("Error loading students");
  }
}

function openStudentModal(studentId = null) {
  const modal = document.getElementById("studentModal");
  const form = document.getElementById("studentForm");
  const title = document.getElementById("studentModalTitle");

  form.reset();
  document.getElementById("studentId").value = studentId || "";
  title.textContent = studentId ? "Edit Student" : "Add Student";

  if (studentId) {
    fetch(`${API_URL}/students`)
      .then((res) => res.json())
      .then((students) => {
        const student = students.find((s) => s.id === studentId);
        if (student) {
          document.getElementById("studentIdInput").value = student.student_id;
          document.getElementById("studentName").value = student.name;
          document.getElementById("course").value = student.course || "";
          document.getElementById("year").value = student.year || "";
        }
      });
  }

  modal.style.display = "block";
}

function closeStudentModal() {
  document.getElementById("studentModal").style.display = "none";
}

document.getElementById("studentForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const studentId = document.getElementById("studentId").value;
  const studentData = {
    student_id: document.getElementById("studentIdInput").value,
    name: document.getElementById("studentName").value,
    course: document.getElementById("course").value || null,
    year: parseInt(document.getElementById("year").value) || null,
  };

  try {
    const url = studentId
      ? `${API_URL}/students/${studentId}`
      : `${API_URL}/students`;
    const method = studentId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(studentData),
    });

    if (response.ok) {
      closeStudentModal();
      loadStudents();
      loadStats();
    } else {
      const error = await response.json();
      alert(error.error || "Error saving student");
    }
  } catch (error) {
    console.error("Error saving student:", error);
    alert("Error saving student");
  }
});

function editStudent(id) {
  openStudentModal(id);
}

async function deleteStudent(id) {
  if (!confirm("Are you sure you want to delete this student?")) return;

  try {
    const response = await fetch(`${API_URL}/students/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      loadStudents();
      loadStats();
    } else {
      alert("Error deleting student");
    }
  } catch (error) {
    console.error("Error deleting student:", error);
    alert("Error deleting student");
  }
}

// Allocation
async function allocateStudents() {
  const examDate = document.getElementById("examDate").value;
  const examTime = document.getElementById("examTime").value;

  if (!examDate) {
    alert("Please select an exam date");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/allocate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exam_date: examDate,
        exam_time: examTime || null,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      alert(result.message);
      loadStats();
      switchTab("report");
    } else {
      alert(result.error || "Error allocating students");
    }
  } catch (error) {
    console.error("Error allocating students:", error);
    alert("Error allocating students");
  }
}

// Load Allocations Report
async function loadAllocations() {
  try {
    const response = await fetch(`${API_URL}/allocations`);
    const allocations = await response.json();

    const tbody = document.getElementById("reportTableBody");
    tbody.innerHTML = "";

    if (allocations.length === 0) {
      const row = tbody.insertRow();
      row.innerHTML =
        '<td colspan="7" style="text-align: center; padding: 20px;">No allocations found</td>';
      return;
    }

    allocations.forEach((allocation) => {
      const row = tbody.insertRow();
      const date = new Date(allocation.exam_date).toLocaleDateString();
      const time = allocation.exam_time
        ? allocation.exam_time.substring(0, 5)
        : "-";

      row.innerHTML = `
                <td>${allocation.student_id}</td>
                <td>${allocation.student_name}</td>
                <td>${allocation.course || "-"}</td>
                <td>${allocation.room_number}</td>
                <td>${date}</td>
                <td>${time}</td>
                <td class="actions">
                    <button class="btn btn-danger" onclick="deleteAllocation(${
                      allocation.id
                    })">Delete</button>
                </td>
            `;
    });
  } catch (error) {
    console.error("Error loading allocations:", error);
    alert("Error loading allocations");
  }
}

async function deleteAllocation(id) {
  if (!confirm("Are you sure you want to delete this allocation?")) return;

  try {
    const response = await fetch(`${API_URL}/allocations/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      loadAllocations();
      loadStats();
    } else {
      alert("Error deleting allocation");
    }
  } catch (error) {
    console.error("Error deleting allocation:", error);
    alert("Error deleting allocation");
  }
}

async function importStudentsCsv(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }
  const form = new FormData();
  form.append("file", file);
  try {
    const res = await fetch(`${API_URL}/students/import`, {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    alert(data.message || data.error);
    if (res.ok) {
      loadStudents();
      loadStats();
    }
  } catch (err) {
    console.error(err);
    alert("Failed to import CSV");
  }
}

async function importStudentsXlsx(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }
  const form = new FormData();
  form.append("file", file);
  try {
    const res = await fetch(`${API_URL}/students/import-xlsx`, {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    alert(data.message || data.error);
    if (res.ok) {
      loadStudents();
      loadStats();
    }
  } catch (err) {
    console.error(err);
    alert("Failed to import Excel");
  }
}

function exportAllocationsCsv() {
  window.location.href = `${API_URL}/allocations/export`;
}

function exportAllocationsPdf() {
  window.open(`${API_URL}/allocations/export-pdf`, "_blank");
}

function filterTable(tableId, query) {
  const q = query.toLowerCase();
  const rows = document.querySelectorAll(`#${tableId} tbody tr`);
  rows.forEach((r) => {
    const text = r.innerText.toLowerCase();
    r.style.display = text.includes(q) ? "" : "none";
  });
}

function filterRooms() {
  filterTable("roomsTable", document.getElementById("searchRooms").value);
}
function filterStudents() {
  filterTable("studentsTable", document.getElementById("searchStudents").value);
}
function filterReport() {
  filterTable("reportTable", document.getElementById("searchReport").value);
}

async function applyReportFilter() {
  const d = document.getElementById("filterDate").value;
  const t = document.getElementById("filterTime").value;
  const params = new URLSearchParams();
  if (d) params.set("exam_date", d);
  if (t) params.set("exam_time", t);
  const url = params.toString()
    ? `${API_URL}/allocations/filter?${params}`
    : `${API_URL}/allocations`;
  try {
    const res = await fetch(url);
    const allocations = await res.json();
    const tbody = document.getElementById("reportTableBody");
    tbody.innerHTML = "";
    if (!allocations.length) {
      const row = tbody.insertRow();
      row.innerHTML =
        '<td colspan="7" style="text-align:center; padding:20px;">No allocations found</td>';
      return;
    }
    allocations.forEach((allocation) => {
      const row = tbody.insertRow();
      const date = new Date(allocation.exam_date).toLocaleDateString();
      const time = allocation.exam_time
        ? allocation.exam_time.substring(0, 5)
        : "-";
      row.innerHTML = `
        <td>${allocation.student_id}</td>
        <td>${allocation.student_name}</td>
        <td>${allocation.course || "-"}</td>
        <td>${allocation.room_number}</td>
        <td>${date}</td>
        <td>${time}</td>
        <td class="actions">
          <button class="btn btn-danger" onclick="deleteAllocation(${
            allocation.id
          })">Delete</button>
        </td>`;
    });
  } catch (err) {
    console.error(err);
    alert("Failed to filter report");
  }
}

async function resetAllocationsForFilter() {
  const d = document.getElementById("filterDate").value;
  const t = document.getElementById("filterTime").value;
  if (!d) {
    alert("Select a date to reset");
    return;
  }
  if (!confirm(`Reset allocations for ${d}${t ? " " + t : ""}?`)) return;
  const params = new URLSearchParams({ exam_date: d });
  if (t) params.set("exam_time", t);
  try {
    const res = await fetch(`${API_URL}/allocations/reset?${params}`, {
      method: "DELETE",
    });
    const data = await res.json();
    alert(data.message || data.error);
    loadAllocations();
    loadStats();
  } catch (err) {
    console.error(err);
    alert("Failed to reset allocations");
  }
}

// Close modals when clicking outside
window.onclick = function (event) {
  const roomModal = document.getElementById("roomModal");
  const studentModal = document.getElementById("studentModal");

  if (event.target === roomModal) {
    closeRoomModal();
  }
  if (event.target === studentModal) {
    closeStudentModal();
  }
};

// Initialize
loadRooms();
loadStudents();
loadStats();
