import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import prisma from "../lib/prisma";

function makeToken(userId = "user-1") {
  return jwt.sign({ userId }, "test-secret-key", { expiresIn: "7d" });
}

const AUTH = () => ({ Authorization: `Bearer ${makeToken()}` });

const mockSettings = {
  id: "settings-1",
  userId: "user-1",
  evolutionUrl: "http://evolution.test",
  evolutionKey: "test-key",
  evolutionInstance: "sf-estudio-teste",
  evolutionInstanceCreatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  // Mock global fetch
  global.fetch = vi.fn();
});

// ─── Webhook ──────────────────────────────────────────────────────────────────

describe("POST /api/whatsapp/webhook", () => {
  it("responde 200 imediatamente", async () => {
    const res = await request(app)
      .post("/api/whatsapp/webhook")
      .send({});

    expect(res.status).toBe(200);
  });

  it("ignora eventos que não são messages.upsert", async () => {
    const res = await request(app)
      .post("/api/whatsapp/webhook")
      .send({ event: "connection.update", data: {} });

    expect(res.status).toBe(200);
    expect(prisma.client.findMany).not.toHaveBeenCalled();
  });

  it("ignora mensagens enviadas pelo próprio bot (fromMe=true)", async () => {
    const res = await request(app)
      .post("/api/whatsapp/webhook")
      .send({
        event: "messages.upsert",
        data: { key: { fromMe: true, remoteJid: "5547999990000@s.whatsapp.net" } },
      });

    expect(res.status).toBe(200);
    expect(prisma.client.findMany).not.toHaveBeenCalled();
  });

  // cada linha e uma resposta da cliente e o status que ela deve gerar.
  // "Não vou poder ir" tem "vou" (confirmar) e "nao" (cancelar): cancelamento tem prioridade
  it.each([
    ["Sim, confirmo!", "confirmado"],
    ["Não posso comparecer", "cancelado"],
    ["Não vou poder ir", "cancelado"],
  ])("resposta \"%s\" deixa o agendamento %s", async (mensagem, statusEsperado) => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      { id: "client-1", userId: "user-1", name: "Ana Silva", phone: "47999990000" } as any,
    ]);
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue({
      id: "apt-1",
      date: new Date().toISOString().split("T")[0],
      time: "14:00",
      status: "aguardando",
      services: [{ service: { name: "Corte" } }],
    } as any);
    vi.mocked(prisma.appointment.update).mockResolvedValue({} as any);

    const res = await request(app)
      .post("/api/whatsapp/webhook")
      .send({
        event: "messages.upsert",
        data: {
          key: { fromMe: false, remoteJid: "5547999990000@s.whatsapp.net" },
          message: { conversation: mensagem },
        },
      });

    expect(res.status).toBe(200);
    // espera async processar
    await new Promise((r) => setTimeout(r, 50));
    expect(prisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: statusEsperado } })
    );
  });

  it("ignora mensagens sem texto relevante", async () => {
    const res = await request(app)
      .post("/api/whatsapp/webhook")
      .send({
        event: "messages.upsert",
        data: {
          key: { fromMe: false, remoteJid: "5547999990000@s.whatsapp.net" },
          message: { conversation: "oi tudo bem" },
        },
      });

    expect(res.status).toBe(200);
    await new Promise((r) => setTimeout(r, 50));
    expect(prisma.client.findMany).not.toHaveBeenCalled();
  });
});

// ─── Status ───────────────────────────────────────────────────────────────────

describe("GET /api/whatsapp/status", () => {
  it("retorna connected=false quando não configurado", async () => {
    vi.mocked(prisma.settings.findUnique).mockResolvedValue(null);

    const res = await request(app).get("/api/whatsapp/status").set(AUTH());

    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(false);
    expect(res.body.configured).toBe(false);
  });

  it("retorna connected=true quando state=open", async () => {
    vi.mocked(prisma.settings.findUnique).mockResolvedValue(mockSettings as any);
    vi.mocked(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ instance: { state: "open" } }),
    });

    const res = await request(app).get("/api/whatsapp/status").set(AUTH());

    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(true);
  });

  it("retorna connected=false quando state != open", async () => {
    vi.mocked(prisma.settings.findUnique).mockResolvedValue(mockSettings as any);
    vi.mocked(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ instance: { state: "connecting" } }),
    });

    const res = await request(app).get("/api/whatsapp/status").set(AUTH());

    expect(res.body.connected).toBe(false);
  });

  it("retorna 401 sem autenticação", async () => {
    const res = await request(app).get("/api/whatsapp/status");
    expect(res.status).toBe(401);
  });
});

// ─── QR Code ──────────────────────────────────────────────────────────────────

describe("GET /api/whatsapp/qrcode", () => {
  it("retorna 400 quando não configurado", async () => {
    vi.mocked(prisma.settings.findUnique).mockResolvedValue(null);

    const res = await request(app).get("/api/whatsapp/qrcode").set(AUTH());

    expect(res.status).toBe(400);
  });

  it("retorna dados do QR code quando configurado", async () => {
    vi.mocked(prisma.settings.findUnique).mockResolvedValue(mockSettings as any);
    vi.mocked(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ code: "qr-data-base64" }),
    });

    const res = await request(app).get("/api/whatsapp/qrcode").set(AUTH());

    expect(res.status).toBe(200);
    expect(res.body.code).toBe("qr-data-base64");
  });

  it("retorna 401 sem autenticação", async () => {
    const res = await request(app).get("/api/whatsapp/qrcode");
    expect(res.status).toBe(401);
  });
});

// ─── Delete instance ──────────────────────────────────────────────────────────

describe("DELETE /api/whatsapp/instance", () => {
  it("desconecta instância e limpa configurações", async () => {
    vi.mocked(prisma.settings.findUnique).mockResolvedValue(mockSettings as any);
    vi.mocked(global.fetch as any).mockResolvedValue({ ok: true });
    vi.mocked(prisma.settings.update).mockResolvedValue(mockSettings as any);

    const res = await request(app).delete("/api/whatsapp/instance").set(AUTH());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(prisma.settings.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { evolutionUrl: null, evolutionKey: null, evolutionInstance: null },
      })
    );
  });

  it("retorna 401 sem autenticação", async () => {
    const res = await request(app).delete("/api/whatsapp/instance");
    expect(res.status).toBe(401);
  });
});
