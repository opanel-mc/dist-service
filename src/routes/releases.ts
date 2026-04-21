import { Router, Request, Response, NextFunction } from "express";
import { githubService } from "../services/github";

export const releasesRouter = Router();

releasesRouter.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const releases = await githubService.fetchReleases();
    res.json(releases);
  } catch (err) {
    next(err);
  }
});
