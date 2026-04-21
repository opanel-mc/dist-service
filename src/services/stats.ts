import fs from "fs";
import path from "path";
import { ParsedAsset } from "../types";

interface TodayStats {
  date: string;
  count: number;
  assets: {
    opanelVersion: Record<string, number>;
    server: Record<string, number>;
    gameVersion: Record<string, number>;
  };
}

interface StatsData {
  totalDownloads: number;
  today: TodayStats;
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyToday(): TodayStats {
  return {
    date: todayDate(),
    count: 0,
    assets: { opanelVersion: {}, server: {}, gameVersion: {} },
  };
}

class StatsService {
  private statsFile: string;
  private data: StatsData;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(statsFile: string) {
    this.statsFile = path.resolve(statsFile);
    const dir = path.dirname(this.statsFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.data = this.load();
  }

  private load(): StatsData {
    try {
      const raw = fs.readFileSync(this.statsFile, "utf-8");
      return JSON.parse(raw) as StatsData;
    } catch {
      return { totalDownloads: 0, today: emptyToday() };
    }
  }

  private rolloverIfNeeded(): void {
    if (this.data.today.date !== todayDate()) {
      this.data.today = emptyToday();
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

  recordDownload(asset: ParsedAsset): void {
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

  getSnapshot(): StatsData {
    this.rolloverIfNeeded();
    return JSON.parse(JSON.stringify(this.data)) as StatsData;
  }
}

export const statsService = new StatsService(
  process.env.STATS_FILE ?? "./data/stats.json"
);
