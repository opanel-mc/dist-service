import { Router, Request, Response } from "express";
import { statsService } from "../services/stats";
import { statsAuth } from "../middleware/auth";

export const statsRouter = Router();

statsRouter.use(statsAuth);

statsRouter.get("/", (_req: Request, res: Response) => {
  res.json(statsService.getSnapshot());
});
