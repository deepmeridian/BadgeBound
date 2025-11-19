import { Router } from "express";
import { requireAdmin } from "../middleware/adminAuth";
import {
  getSeasons,
  createSeason,
  updateSeason,
  activateSeason,
} from "../services/seasonService";

export const adminSeasonsRouter = Router();

// Protect all routes
adminSeasonsRouter.use(requireAdmin);

// GET /api/admin/seasons
adminSeasonsRouter.get("/", async (_req, res, next) => {
  try {
    const seasons = await getSeasons();
    res.json(seasons);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/seasons
adminSeasonsRouter.post("/", async (req, res, next) => {
  try {
    const { name, slug, startAt, endAt } = req.body;
    const season = await createSeason({
      name,
      slug,
      startAt: startAt ? new Date(startAt) : undefined,
      endAt: endAt ? new Date(endAt) : undefined,
    });
    res.status(201).json(season);
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/seasons/:id
adminSeasonsRouter.put("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const { name, slug, startAt, endAt, isActive } = req.body;

    const season = await updateSeason(id, {
      name,
      slug,
      startAt: startAt ? new Date(startAt) : undefined,
      endAt: endAt ? new Date(endAt) : undefined,
      isActive,
    });

    res.json(season);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/seasons/:id/activate
adminSeasonsRouter.post(
  "/:id/activate",
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: "Invalid id" });
      }

      const season = await activateSeason(id);
      res.json({ success: true, season });
    } catch (err) {
      next(err);
    }
  }
);