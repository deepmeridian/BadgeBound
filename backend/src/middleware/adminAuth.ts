import { Request, Response, NextFunction } from "express";
import { config } from "../config/env";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.header("x-api-key");

  if (!config.adminApiKey || apiKey !== config.adminApiKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}