"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadRouter = void 0;
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const github_1 = require("../services/github");
const fileCache_1 = require("../services/fileCache");
const stats_1 = require("../services/stats");
exports.downloadRouter = (0, express_1.Router)();
exports.downloadRouter.get("/:assetId", async (req, res, next) => {
    try {
        const assetId = parseInt(req.params["assetId"], 10);
        if (isNaN(assetId)) {
            res.status(400).json({ error: "Invalid asset ID" });
            return;
        }
        const asset = await github_1.githubService.resolveAsset(assetId);
        if (!asset) {
            res.status(404).json({ error: "Asset not found" });
            return;
        }
        let localPath;
        if (fileCache_1.fileCache.has(asset.name)) {
            localPath = fileCache_1.fileCache.getPath(asset.name);
        }
        else {
            localPath = await fileCache_1.fileCache.download(asset.name, asset.githubUrl, github_1.githubService.getToken());
        }
        const stat = fs_1.default.statSync(localPath);
        res.setHeader("Content-Type", "application/java-archive");
        res.setHeader("Content-Disposition", `attachment; filename="${asset.name}"`);
        res.setHeader("Content-Length", stat.size);
        stats_1.statsService.recordDownload(asset);
        fs_1.default.createReadStream(localPath).pipe(res);
    }
    catch (err) {
        next(err);
    }
});
