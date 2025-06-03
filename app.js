// ======================= db.js =======================
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default pool;


// ======================= middleware/auth.js =======================
import jwt from "jsonwebtoken";
const SECRET_KEY = process.env.JWT_SECRET;

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access denied, token missing" });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
}


// ======================= routes/auth.routes.js =======================
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import validator from "validator";

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET;

router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "All fields required" });
  if (!validator.isEmail(email))
    return res.status(400).json({ error: "Invalid email" });

  try {
    const existing = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0)
      return res.status(409).json({ error: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query("INSERT INTO users (name, email, password) VALUES ($1, $2, $3)", [name, email, hashedPassword]);

    res.status(201).json({ message: "User registered" });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Missing credentials" });

  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (rows.length === 0)
      return res.status(401).json({ error: "User not found" });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Wrong password" });

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, SECRET_KEY, { expiresIn: "1h" });
    res.json({ message: "Login successful", token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;


// ======================= routes/users.routes.js =======================
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


// ======================= app.js =======================
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/users.routes.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: [
    "https://crud-api-frontend-react-kx8p.vercel.app",
    "https://crud-api-frontend-react-kx8p-cm9skpxvn-eswark2005s-projects.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

app.options("*", cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/users", userRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
