// routes/users.js
import express from "express";
import validator from "validator";
import pool from "../db.js";
import { authenticateToken } from "../middleware/auth.js"; // optional

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, name, email FROM users");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/", authenticateToken, async (req, res) => {
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

export default router;
