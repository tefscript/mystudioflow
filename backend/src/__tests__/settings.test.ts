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
  notifyNew: true,
  notifyCancel: true,
  notifyConfirm: true,
  notifyDailyEmail: false,
  notifyWeekly: false,
  waConfirm24h: true,
  waReminder2h: false,
  waThanks: false,
  prefDarkAuto: false,
  prefShowValues: true,
  prefBlockLunch: false,
  prefAllowSunday: false,
  evolutionUrl: null,
  evolutionKey: null,
  evolutionInstance: null,
  waMsgConfirmation: null,
  waMsgReminder: null,
  waMsgReschedule: null,
};

beforeEach(() => vi.clearAllMocks());

describe("GET /api/settings", () => {
  it("retorna configurações existentes", async () => {
    vi.mocked(prisma.settings.findUnique).mockResolvedValue(mockSettings as any);

    const res = await request(app).get("/api/settings").set(AUTH());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("notify_new");
    expect(res.body).toHaveProperty("wa_confirm_24h");
    expect(res.body.notify_new).toBe(true);
  });

  it("cria configurações padrão se não existirem", async () => {
    vi.mocked(prisma.settings.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.settings.create).mockResolvedValue(mockSettings as any);

    const res = await request(app).get("/api/settings").set(AUTH());

    expect(res.status).toBe(200);
    expect(prisma.settings.create).toHaveBeenCalled();
  });

  it("retorna 401 sem autenticação", async () => {
    const res = await request(app).get("/api/settings");
    expect(res.status).toBe(401);
  });

  it("mapeia campos do banco para snake_case na resposta", async () => {
    vi.mocked(prisma.settings.findUnique).mockResolvedValue(mockSettings as any);

    const res = await request(app).get("/api/settings").set(AUTH());

    expect(res.body).toHaveProperty("notify_new");
    expect(res.body).toHaveProperty("notify_cancel");
    expect(res.body).toHaveProperty("wa_confirm_24h");
    expect(res.body).toHaveProperty("pref_dark_auto");
    expect(res.body).toHaveProperty("evolution_url");
  });
});

describe("PUT /api/settings", () => {
  it("atualiza configurações com upsert", async () => {
    vi.mocked(prisma.settings.upsert).mockResolvedValue({
      ...mockSettings,
      waConfirm24h: false,
    } as any);

    const res = await request(app)
      .put("/api/settings")
      .set(AUTH())
      .send({ wa_confirm_24h: false });

    expect(res.status).toBe(200);
    expect(prisma.settings.upsert).toHaveBeenCalled();
  });

  it("atualiza templates de mensagem WhatsApp", async () => {
    const updatedSettings = {
      ...mockSettings,
      waMsgConfirmation: "Olá {nome}, confirmamos seu agendamento!",
    };
    vi.mocked(prisma.settings.upsert).mockResolvedValue(updatedSettings as any);

    const res = await request(app)
      .put("/api/settings")
      .set(AUTH())
      .send({ wa_msg_confirmation: "Olá {nome}, confirmamos seu agendamento!" });

    expect(res.status).toBe(200);
    expect(res.body.wa_msg_confirmation).toBe("Olá {nome}, confirmamos seu agendamento!");
  });

  it("atualiza múltiplas configurações de uma vez", async () => {
    vi.mocked(prisma.settings.upsert).mockResolvedValue(mockSettings as any);

    const res = await request(app)
      .put("/api/settings")
      .set(AUTH())
      .send({
        notify_new: false,
        notify_cancel: false,
        pref_show_values: false,
      });

    expect(res.status).toBe(200);
  });

  it("retorna 401 sem autenticação", async () => {
    const res = await request(app).put("/api/settings").send({ notify_new: false });
    expect(res.status).toBe(401);
  });
});
