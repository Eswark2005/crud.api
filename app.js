const express = require('express');
const mysql = require('mysql2');
const cors = require("cors");
const validator = require("validator");

const app = express(); // ✅ Only declare this ONCE
const PORT = 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// MySQL Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Veda@2011",
  database: "crud_db"
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("Connected to MySQL Database");
  }
});

// Routes

// GET all users
app.get("/users", (req, res) => {
  db.query("SELECT * FROM users", (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

// ✅ POST user with email validation
app.post("/users", (req, res) => {
  const { name, email } = req.body;

  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error while checking email" });

    if (results.length > 0) {
      return res.status(409).json({ error: "Email already in use" });
    }

    db.query("INSERT INTO users (name, email) VALUES (?, ?)", [name, email], (err, result) => {
      if (err) return res.status(500).json({ error: "Error saving user" });
      res.status(201).json({ message: "User added successfully" });
    });
  });
});

// PUT user
app.put("/users/:id", (req, res) => {
  const { name, email } = req.body;
  const { id } = req.params;
  db.query("UPDATE users SET name = ?, email = ? WHERE id = ?", [name, email, id], (err, result) => {
    if (err) return res.status(500).send(err);
    res.send("User updated successfully");
  });
});

// DELETE user
app.delete("/users/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM users WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).send(err);
    res.send("User deleted successfully");
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

