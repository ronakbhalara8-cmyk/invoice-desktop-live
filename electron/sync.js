const axios = require("axios");

const API_URL =
    process.env.API_URL ||
    "http://localhost:5000/api";

async function isServerAvailable() {
    try {
        await axios.get(`${API_URL}/health`, {
            timeout: 3000
        });

        return true;
    } catch {
        return false;
    }
}

module.exports = {
    isServerAvailable
};
