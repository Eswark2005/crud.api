import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import validator from "validator";
import axios from "axios";

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

const allowedOrigins = [
  "http://localhost:3000",
  "https://crud-api-frontend-react-kx8p.vercel.app",
];

// ✅ Corrected CORS setup
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log(`❌ Blocked CORS for origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());

// JWT Authentication Middleware
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

// ✅ Chatbot Route
app.post("/api/chat", authenticateToken, async (req, res) => {
  const { userInput } = req.body;

  if (!userInput) return res.status(400).json({ error: "User input required" });

  try {
    const openaiResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: userInput }],
        max_tokens: 150,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const botReply = openaiResponse.data.choices[0].message.content.trim();
    res.json({ reply: botReply });
  } catch (err) {
    console.error("Error contacting OpenAI API:", err?.response?.data || err.message);
    res.status(500).json({ error: "Error with AI service" });
  }
});

// ✅ Users CRUD Routes
app.get("/users", authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, name, email FROM users");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

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
