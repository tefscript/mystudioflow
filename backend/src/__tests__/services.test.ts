import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import prisma from "../lib/prisma";

function makeToken(userId = "user-1") {
  return jwt.sign({ userId }, "test-secret-key", { expiresIn: "7d" });
}

const AUTH = () => ({ Authorization: `Bearer ${makeToken()}` });

const mockService = {
  id: "svc-1",
  userId: "user-1",
  name: "Corte de cabelo",
  duration: 60,
  price: 80,
  category: "Cabelo",
  active: true,
};

beforeEach(() => vi.clearAllMocks());

describe("GET /api/services", () => {
  it("retorna serviços ativos do usuário", async () => {
    vi.mocked(prisma.service.findMany).mockResolvedValue([mockService] as any);

    const res = await request(app).get("/api/services").set(AUTH());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Corte de cabelo");
  });

  it("retorna 401 sem autenticação", async () => {
    const res = await request(app).get("/api/services");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/services/:id", () => {
  it("retorna serviço pelo id", async () => {
    vi.mocked(prisma.service.findFirst).mockResolvedValue(mockService as any);

    const res = await request(app).get("/api/services/svc-1").set(AUTH());

    expect(res.status).toBe(200);
    expect(res.body.id).toBe("svc-1");
  });

  it("retorna 404 para serviço inexistente", async () => {
    vi.mocked(prisma.service.findFirst).mockResolvedValue(null);

    const res = await request(app).get("/api/services/nao-existe").set(AUTH());

    expect(res.status).toBe(404);
  });
});

describe("POST /api/services", () => {
  it("cria serviço com dados válidos", async () => {
    vi.mocked(prisma.service.create).mockResolvedValue(mockService as any);

    const res = await request(app)
      .post("/api/services")
      .set(AUTH())
      .send({ name: "Corte de cabelo", duration: 60, price: 80, category: "Cabelo" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Corte de cabelo");
  });

  it("usa categoria padrão 'Outros' quando não informada", async () => {
    vi.mocked(prisma.service.create).mockResolvedValue({ ...mockService, category: "Outros" } as any);

    const res = await request(app)
      .post("/api/services")
      .set(AUTH())
      .send({ name: "Manicure", duration: 45, price: 40 });

    expect(res.status).toBe(201);
  });

  it("retorna 400 sem nome", async () => {
    const res = await request(app)
      .post("/api/services")
      .set(AUTH())
      .send({ duration: 60, price: 80 });

    expect(res.status).toBe(400);
  });

  it("retorna 400 com duração negativa", async () => {
    const res = await request(app)
      .post("/api/services")
      .set(AUTH())
      .send({ name: "Corte", duration: -10, price: 80 });

    expect(res.status).toBe(400);
  });

  it("retorna 400 com preço negativo", async () => {
    const res = await request(app)
      .post("/api/services")
      .set(AUTH())
      .send({ name: "Corte", duration: 60, price: -5 });

    expect(res.status).toBe(400);
  });

  it("aceita preço zero (serviço gratuito)", async () => {
    vi.mocked(prisma.service.create).mockResolvedValue({ ...mockService, price: 0 } as any);

    const res = await request(app)
      .post("/api/services")
      .set(AUTH())
      .send({ name: "Consulta", duration: 30, price: 0 });

    expect(res.status).toBe(201);
  });
});

describe("PUT /api/services/:id", () => {
  it("atualiza serviço existente", async () => {
    vi.mocked(prisma.service.findFirst).mockResolvedValue(mockService as any);
    vi.mocked(prisma.service.update).mockResolvedValue({ ...mockService, price: 90 } as any);

    const res = await request(app)
      .put("/api/services/svc-1")
      .set(AUTH())
      .send({ price: 90 });

    expect(res.status).toBe(200);
    expect(res.body.price).toBe(90);
  });

  it("retorna 404 para serviço inexistente", async () => {
    vi.mocked(prisma.service.findFirst).mockResolvedValue(null);

    const res = await request(app)
      .put("/api/services/nao-existe")
      .set(AUTH())
      .send({ price: 90 });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/services/:id", () => {
  it("faz soft delete do serviço (active = false)", async () => {
    vi.mocked(prisma.service.findFirst).mockResolvedValue(mockService as any);
    vi.mocked(prisma.service.update).mockResolvedValue({ ...mockService, active: false } as any);

    const res = await request(app).delete("/api/services/svc-1").set(AUTH());

    expect(res.status).toBe(200);
    expect(prisma.service.update).toHaveBeenCalledWith({
      where: { id: "svc-1" },
      data: { active: false },
    });
  });

  it("retorna 404 para serviço inexistente", async () => {
    vi.mocked(prisma.service.findFirst).mockResolvedValue(null);

    const res = await request(app).delete("/api/services/nao-existe").set(AUTH());

    expect(res.status).toBe(404);
  });
});
