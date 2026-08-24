const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const pool = require("../db");

const router = express.Router();

router.post("/register", async (req, res) => {
    try {
        const {
            name,
            email,
            password
        } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const existing = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email already exists"
            });
        }

        const passwordHash = await bcrypt.hash(
            password,
            12
        );

        const id = crypto.randomUUID();

        await pool.query(
            `
      INSERT INTO users
      (id, name, email, password_hash)
      VALUES ($1, $2, $3, $4)
      `,
            [
                id,
                name,
                email,
                passwordHash
            ]
        );

        res.json({
            success: true,
            message: "User registered"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Registration failed"
        });
    }
});

router.post("/login", async (req, res) => {
    try {
        const {
            email,
            password
        } = req.body;

        const result = await pool.query(
            `
      SELECT *
      FROM users
      WHERE email = $1
      `,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user = result.rows[0];

        const valid = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!valid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "30d"
            }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Login failed"
        });
    }
});

module.exports = router;