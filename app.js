const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const validator = require("validator");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Loaded" : "Missing");

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

db.connect()
  .then(() => console.log("✅ Connected to PostgreSQL"))
  .catch((err) => console.error("❌ DB connection error:", err));

// Routes

app.get("/users", async (req, res) => {
  try {
    const results = await db.query("SELECT * FROM users");
    res.json(results.rows);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/users", async (req, res) => {
  const { name, email } = req.body;

  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    const exists = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: "Email already in use" });
    }
    await db.query("INSERT INTO users (name, email) VALUES ($1, $2)", [name, email]);
    res.status(201).json({ message: "User added successfully" });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.put("/users/:id", async (req, res) => {
  const { name, email } = req.body;
  const { id } = req.params;

  try {
    await db.query("UPDATE users SET name = $1, email = $2 WHERE id = $3", [name, email, id]);
    res.json({ message: "User updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.delete("/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await db.query("DELETE FROM users WHERE id = $1", [id]);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
