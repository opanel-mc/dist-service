import { Router, Request, Response, NextFunction } from "express";
import fs from "fs";
import { githubService } from "../services/github";
import { fileCache } from "../services/fileCache";
import { statsService } from "../services/stats";

export const downloadRouter = Router();

downloadRouter.get("/:assetId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assetId = parseInt(req.params["assetId"] as string, 10);
    if (isNaN(assetId)) {
      res.status(400).json({ error: "Invalid asset ID" });
      return;
    }

    const asset = await githubService.resolveAsset(assetId);
    if (!asset) {
      res.status(404).json({ error: "Asset not found" });
      return;
    }

    let localPath: string;
    if (fileCache.has(asset.name)) {
      localPath = fileCache.getPath(asset.name);
    } else {
      localPath = await fileCache.download(asset.name, asset.githubUrl, githubService.getToken());
    }

    const stat = fs.statSync(localPath);
    res.setHeader("Content-Type", "application/java-archive");
    res.setHeader("Content-Disposition", `attachment; filename="${asset.name}"`);
    res.setHeader("Content-Length", stat.size);

    statsService.recordDownload(asset, req.ip ?? "unknown");
    fs.createReadStream(localPath).pipe(res);
  } catch (err) {
    next(err);
  }
});
