import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import prisma from "../lib/prisma";

function makeToken(userId = "user-1") {
  return jwt.sign({ userId }, "test-secret-key", { expiresIn: "7d" });
}

const AUTH = () => ({ Authorization: `Bearer ${makeToken()}` });

const mockUser = {
  id: "user-1",
  name: "Stéfani",
  email: "stefani@teste.com",
  studioName: "Tefscript Studio",
  whatsapp: "47999990000",
  password: "hashed",
};

beforeEach(() => vi.clearAllMocks());

describe("PUT /api/profile", () => {
  it("atualiza nome do perfil", async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({ ...mockUser, name: "Stéfani S." } as any);

    const res = await request(app)
      .put("/api/profile")
      .set(AUTH())
      .send({ name: "Stéfani S." });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Stéfani S.");
  });

  it("atualiza nome do estúdio", async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({ ...mockUser, studioName: "Novo Studio" } as any);

    const res = await request(app)
      .put("/api/profile")
      .set(AUTH())
      .send({ studio_name: "Novo Studio" });

    expect(res.status).toBe(200);
  });

  it("atualiza whatsapp", async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({ ...mockUser, whatsapp: "47988887777" } as any);

    const res = await request(app)
      .put("/api/profile")
      .set(AUTH())
      .send({ whatsapp: "47988887777" });

    expect(res.status).toBe(200);
  });

  it("atualiza senha com hash (não retorna a senha no body)", async () => {
    vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any);

    const res = await request(app)
      .put("/api/profile")
      .set(AUTH())
      .send({ password: "novasenha123" });

    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty("password");
  });

  it("retorna 400 com e-mail inválido", async () => {
    const res = await request(app)
      .put("/api/profile")
      .set(AUTH())
      .send({ email: "naoeumemail" });

    expect(res.status).toBe(400);
  });

  it("retorna 400 com senha muito curta", async () => {
    const res = await request(app)
      .put("/api/profile")
      .set(AUTH())
      .send({ password: "123" });

    expect(res.status).toBe(400);
  });

  it("retorna 401 sem autenticação", async () => {
    const res = await request(app).put("/api/profile").send({ name: "Teste" });
    expect(res.status).toBe(401);
  });

  it("retorna estrutura correta no body", async () => {
    vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any);

    const res = await request(app)
      .put("/api/profile")
      .set(AUTH())
      .send({ name: "Stéfani" });

    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("name");
    expect(res.body).toHaveProperty("email");
    expect(res.body).toHaveProperty("studio_name");
    expect(res.body).toHaveProperty("whatsapp");
  });
});
