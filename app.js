import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import validator from "validator";

dotenv.config();

const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

// ✅ CORS Setup: Add all your Vercel URLs here
app.use(
  cors({
    origin: [
      "https://crud-api-frontend-react-kx8p.vercel.app",
      "https://crud-api-frontend-react-kx8p-cm9skpxvn-eswark2005s-projects.vercel.app",
      "https://crud-api-frontend-react-kx8p-qm4imj0qb-eswark2005s-projects.vercel.app",
      "https://crud-api-frontend-react-kx8p-3o8h57ixb-eswark2005s-projects.vercel.app",
      "https://crud-api-frontend-react-kx8p-fom9qab4n-eswark2005s-projects.vercel.app",
      "https://crud-api-frontend-react-kx8p-g2i1b2ozr-eswark2005s-projects.vercel.app",
      "https://crud-api-frontend-react-kx8p-rmf3xs31j-eswark2005s-projects.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());

// ✅ JWT Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token required" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
}

// ✅ Signup Route
app.post("/auth/signup", async (req, res) => {
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
    await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3)",
      [name, email, hashedPassword]
    );

    res.status(201).json({ message: "User registered" });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Login Route
app.post("/auth/login", async (req, res) => {
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

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ message: "Login successful", token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Get All Users (Protected)
app.get("/users", authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, name, email FROM users");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ Create New User (Protected)
app.post("/users", authenticateToken, async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email)
    return res.status(400).json({ error: "Name and email required" });
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

// ✅ Update User (Protected)
app.put("/users/:id", authenticateToken, async (req, res) => {
  const { name, email } = req.body;
  const { id } = req.params;
  if (!name || !email)
    return res.status(400).json({ error: "Name and email required" });
  if (!validator.isEmail(email))
    return res.status(400).json({ error: "Invalid email" });

  try {
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND id != $2",
      [email, id]
    );
    if (rows.length > 0)
      return res.status(409).json({ error: "Email in use" });

    const result = await pool.query(
      "UPDATE users SET name = $1, email = $2 WHERE id = $3",
      [name, email, id]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "User not found" });

    res.json({ message: "User updated" });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ Delete User (Protected)
app.delete("/users/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM users WHERE id = $1", [id]);
    if (result.rowCount === 0)
      return res.status(404).json({ error: "User not found" });

    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
