"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.statsService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const MAX_RECORDS = 10000;
const MAX_HISTORY_DAYS = 30;
function todayDate() {
    return new Date().toISOString().slice(0, 10);
}
function emptyDay(date) {
    return {
        date: date ?? todayDate(),
        count: 0,
        breakdown: { opanelVersion: {}, server: {}, gameVersion: {} },
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
        this.prune();
    }
    load() {
        try {
            const raw = fs_1.default.readFileSync(this.statsFile, "utf-8");
            const parsed = JSON.parse(raw);
            return {
                totalDownloads: parsed.totalDownloads ?? 0,
                today: parsed.today ?? emptyDay(),
                history: parsed.history ?? [],
                records: parsed.records ?? [],
            };
        }
        catch {
            return { totalDownloads: 0, today: emptyDay(), history: [], records: [] };
        }
    }
    rolloverIfNeeded() {
        if (this.data.today.date === todayDate())
            return;
        this.data.history.push(this.data.today);
        if (this.data.history.length > MAX_HISTORY_DAYS) {
            this.data.history = this.data.history.slice(-MAX_HISTORY_DAYS);
        }
        this.data.today = emptyDay();
    }
    prune() {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - MAX_HISTORY_DAYS);
        const cutoffStr = cutoff.toISOString().slice(0, 10);
        this.data.history = this.data.history.filter((d) => d.date >= cutoffStr);
        this.data.records = this.data.records.filter((r) => r.timestamp.slice(0, 10) >= cutoffStr);
        if (this.data.records.length > MAX_RECORDS) {
            this.data.records = this.data.records.slice(-MAX_RECORDS);
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
    recordDownload(asset, ip) {
        this.rolloverIfNeeded();
        this.data.totalDownloads++;
        const today = this.data.today;
        today.count++;
        const b = today.breakdown;
        b.opanelVersion[asset.opanelVersion] = (b.opanelVersion[asset.opanelVersion] ?? 0) + 1;
        b.server[asset.server] = (b.server[asset.server] ?? 0) + 1;
        b.gameVersion[asset.gameVersion] = (b.gameVersion[asset.gameVersion] ?? 0) + 1;
        const record = {
            timestamp: new Date().toISOString(),
            ip,
            assetId: asset.id,
            assetName: asset.name,
            server: asset.server,
            gameVersion: asset.gameVersion,
            opanelVersion: asset.opanelVersion,
        };
        this.data.records.push(record);
        if (this.data.records.length > MAX_RECORDS * 1.5) {
            this.data.records = this.data.records.slice(-MAX_RECORDS);
        }
        this.scheduleFlush();
    }
    getSnapshot() {
        this.rolloverIfNeeded();
        return {
            totalDownloads: this.data.totalDownloads,
            today: JSON.parse(JSON.stringify(this.data.today)),
            history: JSON.parse(JSON.stringify(this.data.history)),
            records: JSON.parse(JSON.stringify(this.data.records)),
        };
    }
}
exports.statsService = new StatsService(process.env.STATS_FILE ?? "./data/stats.json");
