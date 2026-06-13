import { Router, Request, Response, NextFunction } from "express";
import { statsService } from "../services/stats";
import { statsAuth } from "../middleware/auth";

export const statsRouter = Router();

statsRouter.use(statsAuth);

statsRouter.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await statsService.getSnapshot());
  } catch (err) {
    next(err);
  }
});
