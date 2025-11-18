import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/adminAuth";
import {
  listProtocols,
  getProtocolByIdOrSlug,
  createProtocol,
  updateProtocol,
  deleteProtocol,
} from "../services/protocolService";

export const adminProtocolsRouter = Router();

// Protect all routes
adminProtocolsRouter.use(requireAdmin);

// Schemas
const createProtocolSchema = z.object({
  slug: z.string().min(2),
  name: z.string().min(2),
  logoUrl: z.string().url().optional().nullable(),
  config: z.record(z.string(), z.any()).optional().nullable(),
});

const updateProtocolSchema = z.object({
  name: z.string().min(2).optional(),
  logoUrl: z.string().url().optional().nullable(),
  config: z.record(z.string(), z.any()).optional().nullable(),
});

// GET /api/admin/protocols  -> list all
adminProtocolsRouter.get("/", async (_req, res, next) => {
  try {
    const protocols = await listProtocols();
    res.json(protocols);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/protocols/:idOrSlug -> get by id or slug
adminProtocolsRouter.get("/:idOrSlug", async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    const protocol = await getProtocolByIdOrSlug(idOrSlug);

    if (!protocol) {
      return res.status(404).json({ error: "Protocol not found" });
    }

    res.json(protocol);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/protocols -> create
adminProtocolsRouter.post("/", async (req, res, next) => {
  try {
    const body = createProtocolSchema.parse(req.body);

    const protocol = await createProtocol({
      slug: body.slug,
      name: body.name,
      logoUrl: body.logoUrl ?? undefined,
      config: body.config ?? undefined,
    });

    res.status(201).json(protocol);
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/protocols/:id -> update
adminProtocolsRouter.put("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const body = updateProtocolSchema.parse(req.body);

    const protocol = await updateProtocol(id, {
      name: body.name,
      logoUrl: body.logoUrl ?? undefined,
      config: body.config ?? undefined,
    });

    res.json(protocol);
  } catch (err: any) {
    if (err.code === "P2025") {
      // Prisma "record not found"
      return res.status(404).json({ error: "Protocol not found" });
    }
    next(err);
  }
});

// DELETE /api/admin/protocols/:id -> delete
adminProtocolsRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    await deleteProtocol(id);
    res.status(204).send();
  } catch (err: any) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Protocol not found" });
    }
    next(err);
  }
});