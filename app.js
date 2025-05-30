import express from "express";
import pool from "./db.js"; // PostgreSQL connection
import cors from "cors";
import validator from "validator";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration to allow frontend on Vercel
app.use(cors({
  origin: "https://crud-api-frontend-react-kx8p.vercel.app",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

app.use(express.json());

// =================== ROUTES ===================

// Get all users
app.get("/users", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// Create new user (used for management, not signup)
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

// Update user
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

// Delete user
app.delete("/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// SIGNUP route
app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3)",
      [name, email, password]
    );

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// LOGIN route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password" });
  }

  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (rows.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = rows[0];

    if (password !== user.password) {
      return res.status(401).json({ error: "Wrong password" });
    }

    res.json({ message: "Login successful" });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =================== START SERVER ===================

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
