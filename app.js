// This is my first edit
const express = require('express');
const mysql = require('mysql2');
const app = express();

app.use(express.json());

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Veda@2011',  // <- Put your MySQL root password here
    database: 'testdb'
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to MySQL');
});

// Create User
app.post('/users', (req, res) => {
    const { name, email } = req.body;
    db.query('INSERT INTO users (name, email) VALUES (?, ?)', [name, email], (err, result) => {
        if (err) return res.status(500).send(err);
        res.send('User added successfully');
    });
});

// Get All Users
app.get('/users', (req, res) => {
    db.query('SELECT * FROM users', (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// Update User
app.put('/users/:id', (req, res) => {
    const { name, email } = req.body;
    db.query('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, req.params.id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.send('User updated successfully');
    });
});

// Delete User
app.delete('/users/:id', (req, res) => {
    db.query('DELETE FROM users WHERE id = ?', [req.params.id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.send('User deleted successfully');
    });
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
