import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import prisma from "../lib/prisma";

function makeToken(userId = "user-1") {
  return jwt.sign({ userId }, "test-secret-key", { expiresIn: "7d" });
}

const AUTH = () => ({ Authorization: `Bearer ${makeToken()}` });

const mockClient = {
  id: "client-1",
  userId: "user-1",
  name: "Ana Silva",
  phone: "47999990000",
  email: "ana@teste.com",
  notes: null,
  visits: 3,
  lastVisit: "2026-08-01",
};

beforeEach(() => vi.clearAllMocks());

describe("GET /api/clients", () => {
  it("retorna lista de clientes", async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([mockClient] as any);

    const res = await request(app).get("/api/clients").set(AUTH());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Ana Silva");
  });

  it("retorna 401 sem autenticação", async () => {
    const res = await request(app).get("/api/clients");
    expect(res.status).toBe(401);
  });

  it("filtra clientes por query string", async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([mockClient] as any);

    await request(app).get("/api/clients?q=Ana").set(AUTH());

    expect(prisma.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      })
    );
  });
});

describe("GET /api/clients/:id", () => {
  it("retorna cliente pelo id", async () => {
    vi.mocked(prisma.client.findFirst).mockResolvedValue(mockClient as any);

    const res = await request(app).get("/api/clients/client-1").set(AUTH());

    expect(res.status).toBe(200);
    expect(res.body.id).toBe("client-1");
  });

  it("retorna 404 para cliente inexistente", async () => {
    vi.mocked(prisma.client.findFirst).mockResolvedValue(null);

    const res = await request(app).get("/api/clients/nao-existe").set(AUTH());

    expect(res.status).toBe(404);
  });
});

describe("POST /api/clients", () => {
  it("cria cliente com dados válidos", async () => {
    vi.mocked(prisma.client.create).mockResolvedValue(mockClient as any);

    const res = await request(app)
      .post("/api/clients")
      .set(AUTH())
      .send({ name: "Ana Silva", phone: "47999990000" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Ana Silva");
  });

  it("retorna 400 sem nome", async () => {
    const res = await request(app)
      .post("/api/clients")
      .set(AUTH())
      .send({ phone: "47999990000" });

    expect(res.status).toBe(400);
  });

  it("retorna 400 sem telefone", async () => {
    const res = await request(app)
      .post("/api/clients")
      .set(AUTH())
      .send({ name: "Ana" });

    expect(res.status).toBe(400);
  });

  it("retorna 400 com e-mail inválido", async () => {
    const res = await request(app)
      .post("/api/clients")
      .set(AUTH())
      .send({ name: "Ana", phone: "47999990000", email: "naoeumemail" });

    expect(res.status).toBe(400);
  });

  it("aceita e-mail vazio (campo opcional)", async () => {
    vi.mocked(prisma.client.create).mockResolvedValue(mockClient as any);

    const res = await request(app)
      .post("/api/clients")
      .set(AUTH())
      .send({ name: "Ana Silva", phone: "47999990000", email: "" });

    expect(res.status).toBe(201);
  });
});

describe("PUT /api/clients/:id", () => {
  it("atualiza cliente existente", async () => {
    vi.mocked(prisma.client.findFirst).mockResolvedValue(mockClient as any);
    vi.mocked(prisma.client.update).mockResolvedValue({ ...mockClient, name: "Ana Souza" } as any);

    const res = await request(app)
      .put("/api/clients/client-1")
      .set(AUTH())
      .send({ name: "Ana Souza" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Ana Souza");
  });

  it("retorna 404 para cliente inexistente", async () => {
    vi.mocked(prisma.client.findFirst).mockResolvedValue(null);

    const res = await request(app)
      .put("/api/clients/nao-existe")
      .set(AUTH())
      .send({ name: "Ana Souza" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/clients/:id", () => {
  it("remove cliente existente", async () => {
    vi.mocked(prisma.client.findFirst).mockResolvedValue(mockClient as any);
    vi.mocked(prisma.client.delete).mockResolvedValue(mockClient as any);

    const res = await request(app).delete("/api/clients/client-1").set(AUTH());

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Cliente removida");
  });

  it("retorna 404 para cliente inexistente", async () => {
    vi.mocked(prisma.client.findFirst).mockResolvedValue(null);

    const res = await request(app).delete("/api/clients/nao-existe").set(AUTH());

    expect(res.status).toBe(404);
  });
});
