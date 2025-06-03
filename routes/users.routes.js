import express from "express";
import validator from "validator";
import pool from "../db.js";
import { authenticateToken } from "../middleware/auth.js";

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
  if (!validator.isEmail(email))
    return res.status(400).json({ error: "Invalid email" });

  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (rows.length > 0)
      return res.status(409).json({ error: "Email in use" });

    await pool.query("INSERT INTO users (name, email) VALUES ($1, $2)", [name, email]);
    res.status(201).json({ message: "User created" });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

router.put("/:id", authenticateToken, async (req, res) => {
  const { name, email } = req.body;
  const { id } = req.params;
  if (!validator.isEmail(email))
    return res.status(400).json({ error: "Invalid email" });

  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1 AND id != $2", [email, id]);
    if (rows.length > 0)
      return res.status(409).json({ error: "Email in use" });

    const result = await pool.query("UPDATE users SET name = $1, email = $2 WHERE id = $3", [name, email, id]);
    if (result.rowCount === 0)
      return res.status(404).json({ error: "User not found" });

    res.json({ message: "User updated" });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
