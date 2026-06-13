import { ParsedAsset, DownloadRecord, DailyStats, StatsSnapshot } from "../types";
import { prisma } from "./db";

const MAX_RECORDS = 10000;
const MAX_HISTORY_DAYS = 30;

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function cutoffDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - MAX_HISTORY_DAYS);
  return d.toISOString().slice(0, 10);
}

function emptyDay(date: string): DailyStats {
  return {
    date,
    count: 0,
    breakdown: { opanelVersion: {}, server: {}, gameVersion: {} },
  };
}

class StatsService {
  // Fire-and-forget from the download hot path: a stats write must never break
  // a download response, so errors are swallowed (logged) here rather than
  // propagated to the caller.
  async recordDownload(asset: ParsedAsset, ip: string): Promise<void> {
    try {
      await prisma.downloadRecord.create({
        data: {
          day: todayDate(),
          ip,
          assetId: asset.id,
          assetName: asset.name,
          server: asset.server,
          gameVersion: asset.gameVersion,
          opanelVersion: asset.opanelVersion,
        },
      });
    } catch (err) {
      console.error("[stats] Failed to record download:", err);
    }
  }

  async getSnapshot(): Promise<StatsSnapshot> {
    const today = todayDate();
    const where = { day: { gte: cutoffDate() } };

    const [total, recent, perDay, perServer, perGame, perOpanel] = await Promise.all([
      prisma.downloadRecord.count(),
      prisma.downloadRecord.findMany({ orderBy: { createdAt: "desc" }, take: MAX_RECORDS }),
      prisma.downloadRecord.groupBy({ by: ["day"], where, _count: { _all: true } }),
      prisma.downloadRecord.groupBy({ by: ["day", "server"], where, _count: { _all: true } }),
      prisma.downloadRecord.groupBy({ by: ["day", "gameVersion"], where, _count: { _all: true } }),
      prisma.downloadRecord.groupBy({ by: ["day", "opanelVersion"], where, _count: { _all: true } }),
    ]);

    const byDay = new Map<string, DailyStats>();
    const ensure = (day: string): DailyStats => {
      let d = byDay.get(day);
      if (!d) {
        d = emptyDay(day);
        byDay.set(day, d);
      }
      return d;
    };

    for (const row of perDay) ensure(row.day).count = row._count._all;
    for (const row of perServer) ensure(row.day).breakdown.server[row.server] = row._count._all;
    for (const row of perGame) ensure(row.day).breakdown.gameVersion[row.gameVersion] = row._count._all;
    for (const row of perOpanel) ensure(row.day).breakdown.opanelVersion[row.opanelVersion] = row._count._all;

    const todayStats = byDay.get(today) ?? emptyDay(today);
    const history = [...byDay.values()]
      .filter((d) => d.date !== today)
      .sort((a, b) => a.date.localeCompare(b.date));

    // Most recent MAX_RECORDS, reversed to oldest -> newest to preserve the
    // ordering the flat-file implementation exposed.
    const records: DownloadRecord[] = recent.reverse().map((r) => ({
      timestamp: r.createdAt.toISOString(),
      ip: r.ip,
      assetId: r.assetId,
      assetName: r.assetName,
      server: r.server,
      gameVersion: r.gameVersion,
      opanelVersion: r.opanelVersion,
    }));

    return { totalDownloads: total, today: todayStats, history, records };
  }
}

export const statsService = new StatsService();
