import { Router, Request, Response } from "express";
import { statsService } from "../services/stats";

export const statsRouter = Router();

statsRouter.get("/", (_req: Request, res: Response) => {
  res.json(statsService.getSnapshot());
});
