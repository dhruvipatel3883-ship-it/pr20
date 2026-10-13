
import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "https://jsonplaceholder.typicode.com/users";

const emptyForm = {
  name: "",
  email: "",
  department: "",
  salary: "",
};

function EmployeeForm({ form, editingId, onChange, onSubmit, onCancel }) {
  return (
    <form className="employee-form" onSubmit={onSubmit}>
      <h2>{editingId ? "Update Employee" : "Add Employee"}</h2>

      <label htmlFor="name">Full Name</label>
      <input
        id="name"
        name="name"
        value={form.name}
        onChange={onChange}
        placeholder="Enter employee name"
        required
      />

      <label htmlFor="email">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        value={form.email}
        onChange={onChange}
        placeholder="Enter email address"
        required
      />

      <label htmlFor="department">Department</label>
      <select
        id="department"
        name="department"
        value={form.department}
        onChange={onChange}
        required
      >
        <option value="">Select department</option>
        <option value="IT">IT</option>
        <option value="HR">HR</option>
        <option value="Finance">Finance</option>
        <option value="Marketing">Marketing</option>
        <option value="Sales">Sales</option>
      </select>

      <label htmlFor="salary">Monthly Salary (₹)</label>
      <input
        id="salary"
        name="salary"
        type="number"
        min="0"
        value={form.salary}
        onChange={onChange}
        placeholder="Enter salary"
        required
      />

      <div className="form-actions">
        <button className="primary-btn" type="submit">
          {editingId ? "Save Changes" : "Add Employee"}
        </button>

        {editingId && (
          <button
            className="secondary-btn"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function EmployeeTable({ employees, onEdit, onDelete }) {
  if (employees.length === 0) {
    return (
      <div className="empty-state">
        <h3>No employees found</h3>
        <p>Add an employee using the form to get started.</p>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Employee</th>
            <th>Email</th>
            <th>Department</th>
            <th>Salary</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {employees.map((employee) => (
            <tr key={employee.id}>
              <td>{employee.id}</td>
              <td>{employee.name}</td>
              <td>{employee.email}</td>
              <td>
                <span className="department">
                  {employee.department}
                </span>
              </td>
              <td>
                ₹{Number(employee.salary).toLocaleString("en-IN")}
              </td>
              <td>
                <div className="row-actions">
                  <button
                    className="edit-btn"
                    type="button"
                    onClick={() => onEdit(employee)}
                  >
                    Edit
                  </button>
                  <button
                    className="delete-btn"
                    type="button"
                    onClick={() => onDelete(employee)}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [apiMode, setApiMode] = useState("api");

  // READ: Fetch employees from the API.
  useEffect(() => {
    const controller = new AbortController();

    async function loadEmployees() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(API_URL, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Could not load employees.");
        }

        const data = await response.json();

        const loadedEmployees = data.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          department: ["IT", "HR", "Finance", "Marketing", "Sales"][
            (user.id - 1) % 5
          ],
          salary: 25000 + user.id * 5000,
        }));

        setEmployees(loadedEmployees);
        setApiMode("api");
      } catch (err) {
        if (err.name !== "AbortError") {
          setError("Could not connect to the API. You can use demo mode.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadEmployees();
    return () => controller.abort();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  // CREATE and UPDATE.
  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    const employeeData = {
      name: form.name.trim(),
      email: form.email.trim(),
      department: form.department,
      salary: Number(form.salary),
    };

    if (!employeeData.name || !employeeData.email ||
        !employeeData.department || employeeData.salary < 0) {
      setError("Please enter valid employee details.");
      return;
    }

    const duplicate = employees.some(
      (employee) =>
        employee.email.toLowerCase() === employeeData.email.toLowerCase() &&
        employee.id !== editingId
    );

    if (duplicate) {
      setError("An employee with this email already exists.");
      return;
    }

    setSaving(true);

    try {
      if (editingId !== null) {
        // UPDATE: PUT request.
        const response = await fetch(`${API_URL}/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...employeeData, id: editingId }),
        });

        if (!response.ok) {
          throw new Error("Update request failed.");
        }

        // Update React state using the submitted values.
        setEmployees((previous) =>
          previous.map((employee) =>
            employee.id === editingId
              ? { ...employee, ...employeeData }
              : employee
          )
        );

        setMessage("Employee updated successfully!");
      } else {
        // CREATE: POST request.
        const response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(employeeData),
        });

        if (!response.ok) {
          throw new Error("Create request failed.");
        }

        const created = await response.json();

        // Give the new employee a unique local ID.
        const localId = Math.max(0, ...employees.map((e) => e.id)) + 1;

        setEmployees((previous) => [
          ...previous,
          { ...employeeData, id: localId || created.id },
        ]);

        setMessage("Employee added successfully!");
      }

      setApiMode("api");
      resetForm();
    } catch {
      setError(
        "The API request failed. Please check your internet connection and try again."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(employee) {
    setEditingId(employee.id);
    setForm({
      name: employee.name,
      email: employee.email,
      department: employee.department,
      salary: String(employee.salary),
    });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // DELETE: Send a DELETE request, then update the displayed list.
  async function handleDelete(employee) {
    if (!window.confirm(`Delete ${employee.name}?`)) return;

    setMessage("");
    setError("");

    try {
      const response = await fetch(`${API_URL}/${employee.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Delete request failed.");
      }

      setEmployees((previous) =>
        previous.filter((item) => item.id !== employee.id)
      );

      if (editingId === employee.id) resetForm();

      setMessage(`${employee.name} deleted successfully!`);
    } catch {
      setError("Could not delete the employee. Please try again.");
    }
  }

  const filteredEmployees = employees.filter((employee) =>
    `${employee.name} ${employee.email} ${employee.department}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Employee Management</h1>
          <p>Manage your team in one place</p>
        </div>
        <span className="header-tag">React CRUD</span>
      </header>

      <main className="container">
        <div className="summary">
          <div className="summary-card">
            <span>Total Employees</span>
            <strong>{employees.length}</strong>
          </div>
          <div className="summary-card">
            <span>Departments</span>
            <strong>
              {new Set(employees.map((e) => e.department)).size}
            </strong>
          </div>
        </div>

        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}

        <div className="layout">
          <EmployeeForm
            form={form}
            editingId={editingId}
            onChange={handleChange}
            onSubmit={handleSubmit}
            onCancel={resetForm}
          />

          <section className="list-card">
            <div className="list-heading">
              <div>
                <h2>Employee Directory</h2>
                <p>View, edit, or delete employee records</p>
              </div>
              <input
                className="search"
                type="search"
                placeholder="Search employees..."
                aria-label="Search employees"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            {loading ? (
              <p className="notice">Loading employees...</p>
            ) : (
              <EmployeeTable
                employees={filteredEmployees}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}

            {!loading && (
              <p className="footer-note">
                Showing {filteredEmployees.length} of {employees.length} employees
                · Data source: {apiMode === "api" ? "REST API" : "Demo"}
              </p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}