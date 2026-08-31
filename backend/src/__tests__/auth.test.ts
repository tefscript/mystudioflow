import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import app from "../app";
import prisma from "../lib/prisma";
import { sendPasswordResetEmail } from "../services/email";

const mockUser = {
  id: "user-1",
  name: "Isabel",
  email: "isabel@teste.com",
  password: bcrypt.hashSync("senha123", 10),
  studioName: "Estúdio Isabel",
  whatsapp: "47999999999",
  resetToken: null,
  resetTokenExpiry: null,
};

function makeToken(userId = "user-1") {
  return jwt.sign({ userId }, "test-secret-key", { expiresIn: "7d" });
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/auth/login", () => {
  it("retorna token com credenciais válidas", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "isabel@teste.com", password: "senha123" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe("isabel@teste.com");
  });

  it("retorna 401 para usuário inexistente", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "naoexiste@teste.com", password: "senha123" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("E-mail ou senha incorretos");
  });

  it("retorna 401 para senha incorreta", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "isabel@teste.com", password: "senhaerrada" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("E-mail ou senha incorretos");
  });

  it("retorna 400 para e-mail inválido", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "naoeumemail", password: "senha123" });

    expect(res.status).toBe(400);
  });

  it("retorna 400 sem senha", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "isabel@teste.com" });

    expect(res.status).toBe(400);
  });

  it("normaliza e-mail para minúsculas", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

    await request(app)
      .post("/api/auth/login")
      .send({ email: "ISABEL@TESTE.COM", password: "senha123" });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "isabel@teste.com" },
    });
  });
});

describe("POST /api/auth/logout", () => {
  it("retorna mensagem de sucesso", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Logout realizado");
  });
});

describe("GET /api/auth/me", () => {
  it("retorna dados do usuário autenticado", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("isabel@teste.com");
  });

  it("retorna 401 sem token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("retorna 401 com token inválido", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer token-invalido");
    expect(res.status).toBe(401);
  });

  it("retorna 404 se usuário não existe mais no banco", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${makeToken()}`);

    expect(res.status).toBe(404);
  });
});

describe("POST /api/auth/forgot-password", () => {
  it("retorna sucesso mesmo para e-mail inexistente (não vaza info)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "naoexiste@teste.com" });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain("instruções");
  });

  it("envia e-mail e retorna sucesso para e-mail cadastrado", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any);

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "isabel@teste.com" });

    expect(res.status).toBe(200);
    expect(sendPasswordResetEmail).toHaveBeenCalled();
  });

  it("retorna 400 sem e-mail", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({});

    expect(res.status).toBe(400);
  });

  it("retorna 500 se envio de e-mail falhar", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any);
    vi.mocked(sendPasswordResetEmail).mockRejectedValue(new Error("SMTP error"));

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "isabel@teste.com" });

    expect(res.status).toBe(500);
  });
});

describe("POST /api/auth/reset-password", () => {
  it("redefine senha com token válido", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any);

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "token-valido", password: "novasenha123" });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain("sucesso");
  });

  it("retorna 400 com token inválido", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "token-invalido", password: "novasenha123" });

    expect(res.status).toBe(400);
  });

  it("retorna 400 se senha tiver menos de 6 caracteres", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "token-qualquer", password: "123" });

    expect(res.status).toBe(400);
  });

  it("retorna 400 sem token ou senha", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({});

    expect(res.status).toBe(400);
  });
});
