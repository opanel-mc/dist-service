"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
exports.getSSLConfig = getSSLConfig;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const releases_1 = require("./routes/releases");
const download_1 = require("./routes/download");
const stats_1 = require("./routes/stats");
function createApp() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use("/api/releases", releases_1.releasesRouter);
    app.use("/api/download", download_1.downloadRouter);
    app.use("/api/stats", stats_1.statsRouter);
    app.get("/x", (_req, res) => {
        const htmlPath = path_1.default.resolve(__dirname, "../src/views/dashboard.html");
        if (fs_1.default.existsSync(htmlPath)) {
            res.sendFile(htmlPath);
        }
        else {
            res.status(404).send("Dashboard not found");
        }
    });
    app.use((err, _req, res, _next) => {
        console.error(err);
        const message = err instanceof Error ? err.message : "Internal server error";
        res.status(500).json({ error: message });
    });
    return app;
}
function getSSLConfig() {
    if (process.env.SSL !== "true")
        return null;
    const keyPath = process.env.SSL_KEY;
    const certPath = process.env.SSL_CERT;
    if (!keyPath || !certPath)
        return null;
    return {
        key: fs_1.default.readFileSync(keyPath),
        cert: fs_1.default.readFileSync(certPath),
    };
}
