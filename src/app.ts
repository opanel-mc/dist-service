import fs from "fs";
import path from "path";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { releasesRouter } from "./routes/releases";
import { downloadRouter } from "./routes/download";
import { statsRouter } from "./routes/stats";

export function createApp() {
  const app = express();

  app.use(cors());

  app.use("/api/releases", releasesRouter);
  app.use("/api/download", downloadRouter);
  app.use("/api/stats", statsRouter);

  app.get("/x", (_req: Request, res: Response) => {
    const htmlPath = path.resolve(__dirname, "../src/views/dashboard.html");
    if (fs.existsSync(htmlPath)) {
      res.sendFile(htmlPath);
    } else {
      res.status(404).send("Dashboard not found");
    }
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    if (res.headersSent) {
      // mid-stream failure: destroy the socket so the client sees a
      // truncated transfer instead of a hung connection
      res.destroy();
      return;
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  });

  return app;
}

export function getSSLConfig(): { key: Buffer; cert: Buffer } | null {
  if (process.env.SSL !== "true") return null;
  const keyPath = process.env.SSL_KEY;
  const certPath = process.env.SSL_CERT;
  if (!keyPath || !certPath) return null;
  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
}
