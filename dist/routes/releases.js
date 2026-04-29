"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.releasesRouter = void 0;
const express_1 = require("express");
const github_1 = require("../services/github");
exports.releasesRouter = (0, express_1.Router)();
exports.releasesRouter.get("/", async (_req, res, next) => {
    try {
        const releases = await github_1.githubService.fetchReleases();
        res.json(releases);
    }
    catch (err) {
        next(err);
    }
});
