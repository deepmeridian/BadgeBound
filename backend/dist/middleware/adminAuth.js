"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = requireAdmin;
const env_1 = require("../config/env");
function requireAdmin(req, res, next) {
    const apiKey = req.header("x-api-key");
    if (!env_1.config.adminApiKey || apiKey !== env_1.config.adminApiKey) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
}
