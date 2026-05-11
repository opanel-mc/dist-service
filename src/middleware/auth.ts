import { Request, Response, NextFunction } from "express";

const STATS_KEY = process.env.STATS_KEY;

export function statsAuth(req: Request, res: Response, next: NextFunction): void {
  if (!STATS_KEY) {
    res.status(500).json({ error: "STATS_KEY not configured" });
    return;
  }

  const key = req.headers["x-api-key"] as string | undefined
    ?? req.query["key"] as string | undefined;

  if (key !== STATS_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
