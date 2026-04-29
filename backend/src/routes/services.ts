import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const serviceSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  duration: z.number().int().positive("Duração deve ser positiva"),
  price: z.number().nonnegative("Preço não pode ser negativo"),
  category: z.string().optional().default("Outros"),
});

router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const services = await prisma.service.findMany({
    where: { userId: req.userId!, active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  res.json(services);
});

router.get("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const service = await prisma.service.findFirst({
    where: { id, userId: req.userId! },
  });
  if (!service) {
    res.status(404).json({ error: "Serviço não encontrado" });
    return;
  }
  res.json(service);
});

router.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = serviceSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const service = await prisma.service.create({
    data: { ...parse.data, userId: req.userId! },
  });

  res.status(201).json(service);
});

router.put("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const existing = await prisma.service.findFirst({
    where: { id, userId: req.userId! },
  });
  if (!existing) {
    res.status(404).json({ error: "Serviço não encontrado" });
    return;
  }

  const parse = serviceSchema.partial().safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const service = await prisma.service.update({
    where: { id },
    data: parse.data,
  });

  res.json(service);
});

router.delete("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const existing = await prisma.service.findFirst({
    where: { id, userId: req.userId! },
  });
  if (!existing) {
    res.status(404).json({ error: "Serviço não encontrado" });
    return;
  }

  // Soft delete para preservar histórico de agendamentos
  await prisma.service.update({ where: { id }, data: { active: false } });
  res.json({ message: "Serviço removido" });
});

export default router;
