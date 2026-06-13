"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statsRouter = void 0;
const express_1 = require("express");
const stats_1 = require("../services/stats");
const auth_1 = require("../middleware/auth");
exports.statsRouter = (0, express_1.Router)();
exports.statsRouter.use(auth_1.statsAuth);
exports.statsRouter.get("/", async (_req, res, next) => {
    try {
        res.json(await stats_1.statsService.getSnapshot());
    }
    catch (err) {
        next(err);
    }
});
