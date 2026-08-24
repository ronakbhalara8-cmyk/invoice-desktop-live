require("dotenv").config({
    path: ".env.server"
});

const express = require("express");
const cors = require("cors");

const authRoutes =
    require("./routes/auth");

const invoiceRoutes =
    require("./routes/invoices");

const app = express();

app.use(
    cors({
        origin: "*"
    })
);

app.use(
    express.json()
);

app.get(
    "/api/health",
    (req, res) => {
        res.json({
            success: true,
            message:
                "Server is running"
        });
    }
);

app.use(
    "/api/auth",
    authRoutes
);

app.use(
    "/api/invoices",
    invoiceRoutes
);

const PORT =
    process.env.PORT || 5000;

app.listen(
    PORT,
    () => {
        console.log(
            `API running on port ${PORT}`
        );
    }
);