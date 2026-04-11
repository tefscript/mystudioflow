import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { z } from "zod";
import prisma from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { sendPasswordResetEmail } from "../services/email";

const router = Router();

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const { email, password } = parse.data;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    res.status(401).json({ error: "E-mail ou senha incorretos" });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: "E-mail ou senha incorretos" });
    return;
  }

  const secret = process.env.JWT_SECRET!;
  const expiresIn = (process.env.JWT_EXPIRES_IN || "7d") as jwt.SignOptions["expiresIn"];
  const token = jwt.sign({ userId: user.id }, secret, { expiresIn });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      studio_name: user.studioName,
      whatsapp: user.whatsapp,
    },
  });
});

router.post("/logout", (_req: Request, res: Response): void => {
  res.json({ message: "Logout realizado" });
});

router.get("/me", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    studio_name: user.studioName,
    whatsapp: user.whatsapp,
  });
});

router.post("/forgot-password", async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "E-mail obrigatório" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  // Sempre retorna sucesso para não vazar se o e-mail existe
  if (!user) {
    res.json({ message: "Se este e-mail estiver cadastrado, você receberá as instruções em breve." });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpiry: expiry },
  });

  try {
    await sendPasswordResetEmail(user.email, user.name, token);
  } catch (err) {
    console.error("Erro ao enviar e-mail de reset:", err);
    res.status(500).json({ error: "Erro ao enviar e-mail. Tente novamente mais tarde." });
    return;
  }

  res.json({ message: "Se este e-mail estiver cadastrado, você receberá as instruções em breve." });
});

router.post("/reset-password", async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.body;

  if (!token || !password || password.length < 6) {
    res.status(400).json({ error: "Token e nova senha (mínimo 6 caracteres) são obrigatórios" });
    return;
  }

  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    res.status(400).json({ error: "Link inválido ou expirado. Solicite um novo." });
    return;
  }

  const hashed = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed, resetToken: null, resetTokenExpiry: null },
  });

  res.json({ message: "Senha redefinida com sucesso!" });
});

export default router;
