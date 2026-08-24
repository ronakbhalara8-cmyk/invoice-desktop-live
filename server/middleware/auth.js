const jwt = require("jsonwebtoken");

const pool = require("../db");

async function authMiddleware(req, res, next) {
    try {
        const header =
            req.headers.authorization;

        if (!header) {
            return res
                .status(401)
                .json({
                    success: false,
                    message:
                        "Authentication required"
                });
        }

        const token =
            header.replace(
                "Bearer ",
                ""
            );

        if (!token) {
            return res
                .status(401)
                .json({
                    success: false,
                    message:
                        "Token missing"
                });
        }

        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const result = await pool.query(
            `
      SELECT id, name, email
      FROM users
      WHERE id = $1
      `,
            [payload.id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        req.user = result.rows[0];
        req.accessToken = token;

        next();

    } catch (error) {
        return res
            .status(401)
            .json({
                success: false,
                message:
                    "Invalid or expired token"
            });
    }
}

module.exports =
    authMiddleware;