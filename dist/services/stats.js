"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.statsService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function todayDate() {
    return new Date().toISOString().slice(0, 10);
}
function emptyToday() {
    return {
        date: todayDate(),
        count: 0,
        assets: { opanelVersion: {}, server: {}, gameVersion: {} },
    };
}
class StatsService {
    constructor(statsFile) {
        this.flushTimer = null;
        this.statsFile = path_1.default.resolve(statsFile);
        const dir = path_1.default.dirname(this.statsFile);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        this.data = this.load();
    }
    load() {
        try {
            const raw = fs_1.default.readFileSync(this.statsFile, "utf-8");
            return JSON.parse(raw);
        }
        catch {
            return { totalDownloads: 0, today: emptyToday() };
        }
    }
    rolloverIfNeeded() {
        if (this.data.today.date !== todayDate()) {
            this.data.today = emptyToday();
        }
    }
    scheduleFlush() {
        if (this.flushTimer)
            return;
        this.flushTimer = setTimeout(() => {
            this.flushTimer = null;
            try {
                fs_1.default.writeFileSync(this.statsFile, JSON.stringify(this.data, null, 2), "utf-8");
            }
            catch (err) {
                console.error("[stats] Failed to persist stats:", err);
            }
        }, 500);
    }
    recordDownload(asset) {
        this.rolloverIfNeeded();
        this.data.totalDownloads++;
        this.data.today.count++;
        const { opanelVersion, server, gameVersion } = asset;
        const a = this.data.today.assets;
        a.opanelVersion[opanelVersion] = (a.opanelVersion[opanelVersion] ?? 0) + 1;
        a.server[server] = (a.server[server] ?? 0) + 1;
        a.gameVersion[gameVersion] = (a.gameVersion[gameVersion] ?? 0) + 1;
        this.scheduleFlush();
    }
    getSnapshot() {
        this.rolloverIfNeeded();
        return JSON.parse(JSON.stringify(this.data));
    }
}
exports.statsService = new StatsService(process.env.STATS_FILE ?? "./data/stats.json");
