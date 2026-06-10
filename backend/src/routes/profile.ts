import { Router, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const profileSchema = z.object({
  name: z.string().min(1).optional(),
  studio_name: z.string().optional(),
  email: z.string().email("E-mail inválido").optional(),
  whatsapp: z.string().optional(),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres").optional(),
});

router.put("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = profileSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const { name, studio_name, email, whatsapp, password } = parse.data;

  const updateData: Record<string, unknown> = {};
  if (name) updateData.name = name;
  if (studio_name !== undefined) updateData.studioName = studio_name;
  if (email) updateData.email = email;
  if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
  if (password) updateData.password = await bcrypt.hash(password, 10);

  const user = await prisma.user.update({
    where: { id: req.userId },
    data: updateData,
  });

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    studio_name: user.studioName,
    whatsapp: user.whatsapp,
  });
});

export default router;
