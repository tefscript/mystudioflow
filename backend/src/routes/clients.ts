import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const clientSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  email: z
    .string()
    .email("E-mail inválido")
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  notes: z.string().optional(),
});

router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const q = (req.query.q as string | undefined)?.trim();

  const clients = await prisma.client.findMany({
    where: {
      userId: req.userId!,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
  });

  res.json(clients);
});

router.get("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const client = await prisma.client.findFirst({
    where: { id, userId: req.userId! },
  });
  if (!client) {
    res.status(404).json({ error: "Cliente não encontrada" });
    return;
  }
  res.json(client);
});

router.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = clientSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  const client = await prisma.client.create({
    data: {
      ...parse.data,
      userId: req.userId!,
      visits: 0,
      lastVisit: today,
    },
  });

  res.status(201).json(client);
});

router.put("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const existing = await prisma.client.findFirst({
    where: { id, userId: req.userId! },
  });
  if (!existing) {
    res.status(404).json({ error: "Cliente não encontrada" });
    return;
  }

  const parse = clientSchema.partial().safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const client = await prisma.client.update({
    where: { id },
    data: parse.data,
  });

  res.json(client);
});

router.delete("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const existing = await prisma.client.findFirst({
    where: { id, userId: req.userId! },
  });
  if (!existing) {
    res.status(404).json({ error: "Cliente não encontrada" });
    return;
  }

  await prisma.client.delete({ where: { id } });
  res.json({ message: "Cliente removida" });
});

export default router;
