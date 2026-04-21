import express, { NextFunction, Request, Response } from "express";
import { releasesRouter } from "./routes/releases";
import { downloadRouter } from "./routes/download";

export function createApp() {
  const app = express();

  app.use("/api/releases", releasesRouter);
  app.use("/api/download", downloadRouter);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  });

  return app;
}
