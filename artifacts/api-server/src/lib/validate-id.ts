import type { Request, Response } from "express";

export function parseId(req: Request, res: Response): number | null {
  const raw = req.params["id"];
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0 || !Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid ID parameter" });
    return null;
  }
  return id;
}
