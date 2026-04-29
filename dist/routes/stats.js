"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statsRouter = void 0;
const express_1 = require("express");
const stats_1 = require("../services/stats");
exports.statsRouter = (0, express_1.Router)();
exports.statsRouter.get("/", (_req, res) => {
    res.json(stats_1.statsService.getSnapshot());
});
