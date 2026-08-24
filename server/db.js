const {
    Pool
} = require("pg");

const pool =
    new Pool({
        host:
            process.env.DB_HOST,

        port:
            process.env.DB_PORT,

        user:
            process.env.DB_USER,

        password:
            process.env.DB_PASSWORD,

        database:
            process.env.DB_NAME,

        ssl: process.env.DB_SSL === "false"
            ? false
            : {
                rejectUnauthorized: false
            }
    });

pool.on(
    "error",
    (error) => {
        console.error(
            "PostgreSQL error:",
            error
        );
    }
);

module.exports = pool;