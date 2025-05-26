import express from "express";
import pool from "./db.js"; // PostgreSQL connection
import cors from "cors";
import validator from "validator";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Test connection
pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL (Neon)"))
  .catch((err) => console.error("❌ DB connection error:", err));

// Routes

app.get("/users", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users");
    res.json(rows);
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
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (rows.length > 0) {
      return res.status(409).json({ error: "Email already in use" });
    }

    await pool.query("INSERT INTO users (name, email) VALUES ($1, $2)", [name, email]);
    res.status(201).json({ message: "User added successfully" });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.put("/users/:id", async (req, res) => {
  const { name, email } = req.body;
  const { id } = req.params;

  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1 AND id != $2", [email, id]);
    if (rows.length > 0) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const result = await pool.query("UPDATE users SET name = $1, email = $2 WHERE id = $3", [name, email, id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User updated successfully" });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

app.delete("/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
