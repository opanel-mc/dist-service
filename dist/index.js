"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = __importDefault(require("https"));
const app_1 = require("./app");
const db_1 = require("./services/db");
const PORT = parseInt(process.env.PORT ?? "3000", 10);
const app = (0, app_1.createApp)();
const ssl = (0, app_1.getSSLConfig)();
if (ssl) {
    https_1.default.createServer(ssl, app).listen(PORT, () => {
        console.log(`dist-service listening on port ${PORT} (SSL)`);
    });
}
else {
    app.listen(PORT, () => {
        console.log(`dist-service listening on port ${PORT}`);
    });
}
async function shutdown() {
    await db_1.prisma.$disconnect();
    process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
