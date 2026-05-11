"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statsAuth = statsAuth;
const STATS_KEY = process.env.STATS_KEY;
function statsAuth(req, res, next) {
    if (!STATS_KEY) {
        res.status(500).json({ error: "STATS_KEY not configured" });
        return;
    }
    const key = req.headers["x-api-key"]
        ?? req.query["key"];
    if (key !== STATS_KEY) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    next();
}
