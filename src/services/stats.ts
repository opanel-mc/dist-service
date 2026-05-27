import fs from "fs";
import path from "path";
import { ParsedAsset, DownloadRecord, DailyStats, DailyBreakdown, StatsSnapshot } from "../types";

const MAX_RECORDS = 10000;
const MAX_HISTORY_DAYS = 30;

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyDay(date?: string): DailyStats {
  return {
    date: date ?? todayDate(),
    count: 0,
    breakdown: { opanelVersion: {}, server: {}, gameVersion: {} },
  };
}

function normalizeDay(raw: any, fallbackDate?: string): DailyStats {
  const base = emptyDay(fallbackDate);
  if (!raw || typeof raw !== "object") return base;

  const src = raw.breakdown ?? raw.assets ?? {};
  return {
    date: typeof raw.date === "string" ? raw.date : base.date,
    count: typeof raw.count === "number" ? raw.count : 0,
    breakdown: {
      opanelVersion: src.opanelVersion ?? {},
      server: src.server ?? {},
      gameVersion: src.gameVersion ?? {},
    },
  };
}

interface PersistedData {
  totalDownloads: number;
  today: DailyStats;
  history: DailyStats[];
  records: DownloadRecord[];
}

class StatsService {
  private statsFile: string;
  private data: PersistedData;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(statsFile: string) {
    this.statsFile = path.resolve(statsFile);
    const dir = path.dirname(this.statsFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.data = this.load();
    this.prune();
  }

  private load(): PersistedData {
    try {
      const raw = fs.readFileSync(this.statsFile, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        totalDownloads: parsed.totalDownloads ?? 0,
        today: normalizeDay(parsed.today),
        history: Array.isArray(parsed.history) ? parsed.history.map((d: any) => normalizeDay(d)) : [],
        records: Array.isArray(parsed.records) ? parsed.records : [],
      };
    } catch {
      return { totalDownloads: 0, today: emptyDay(), history: [], records: [] };
    }
  }

  private rolloverIfNeeded(): void {
    if (this.data.today.date === todayDate()) return;

    this.data.history.push(this.data.today);
    if (this.data.history.length > MAX_HISTORY_DAYS) {
      this.data.history = this.data.history.slice(-MAX_HISTORY_DAYS);
    }
    this.data.today = emptyDay();
  }

  private prune(): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_HISTORY_DAYS);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    this.data.history = this.data.history.filter((d) => d.date >= cutoffStr);
    this.data.records = this.data.records.filter((r) => r.timestamp.slice(0, 10) >= cutoffStr);
    if (this.data.records.length > MAX_RECORDS) {
      this.data.records = this.data.records.slice(-MAX_RECORDS);
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      try {
        fs.writeFileSync(this.statsFile, JSON.stringify(this.data, null, 2), "utf-8");
      } catch (err) {
        console.error("[stats] Failed to persist stats:", err);
      }
    }, 500);
  }

  recordDownload(asset: ParsedAsset, ip: string): void {
    this.rolloverIfNeeded();
    this.data.totalDownloads++;

    const today = this.data.today;
    today.count++;

    const b = today.breakdown;
    b.opanelVersion[asset.opanelVersion] = (b.opanelVersion[asset.opanelVersion] ?? 0) + 1;
    b.server[asset.server] = (b.server[asset.server] ?? 0) + 1;
    b.gameVersion[asset.gameVersion] = (b.gameVersion[asset.gameVersion] ?? 0) + 1;

    const record: DownloadRecord = {
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

  getSnapshot(): StatsSnapshot {
    this.rolloverIfNeeded();
    return {
      totalDownloads: this.data.totalDownloads,
      today: JSON.parse(JSON.stringify(this.data.today)),
      history: JSON.parse(JSON.stringify(this.data.history)),
      records: JSON.parse(JSON.stringify(this.data.records)),
    };
  }
}

export const statsService = new StatsService(
  process.env.STATS_FILE ?? "./data/stats.json"
);
