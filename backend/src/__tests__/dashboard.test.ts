import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import prisma from "../lib/prisma";

function makeToken(userId = "user-1") {
  return jwt.sign({ userId }, "test-secret-key", { expiresIn: "7d" });
}

const AUTH = () => ({ Authorization: `Bearer ${makeToken()}` });

beforeEach(() => vi.clearAllMocks());

function setupDashboardMocks(overrides: Record<string, any> = {}) {
  vi.mocked(prisma.appointment.count)
    .mockResolvedValueOnce(overrides.todayAppointments ?? 3)
    .mockResolvedValueOnce(overrides.upcoming ?? 5);

  vi.mocked(prisma.client.count)
    .mockResolvedValueOnce(overrides.totalClients ?? 10)
    .mockResolvedValueOnce(overrides.newClients ?? 2)
    .mockResolvedValueOnce(overrides.returningClients ?? 7);

  vi.mocked(prisma.appointment.findMany)
    .mockResolvedValueOnce(overrides.weekRevenue ?? [])
    .mockResolvedValueOnce(overrides.todayEstimated ?? []);

  vi.mocked(prisma.appointmentService.groupBy).mockResolvedValue([]);
  vi.mocked(prisma.service.findMany).mockResolvedValue([]);
}

describe("GET /api/dashboard", () => {
  it("retorna estrutura completa de stats", async () => {
    setupDashboardMocks();

    const res = await request(app).get("/api/dashboard").set(AUTH());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("stats");
    expect(res.body).toHaveProperty("revenueWeek");
    expect(res.body).toHaveProperty("popularServices");
    expect(res.body.stats.todayAppointments).toBe(3);
    expect(res.body.stats.totalClients).toBe(10);
  });

  it("retorna 401 sem autenticação", async () => {
    const res = await request(app).get("/api/dashboard");
    expect(res.status).toBe(401);
  });

  it("calcula retentionRate corretamente", async () => {
    setupDashboardMocks({ totalClients: 10, returningClients: 8 });

    const res = await request(app).get("/api/dashboard").set(AUTH());

    expect(res.body.stats.retentionRate).toBe(80);
  });

  it("retentionRate é 0 quando não há clientes", async () => {
    setupDashboardMocks({ totalClients: 0, returningClients: 0 });

    const res = await request(app).get("/api/dashboard").set(AUTH());

    expect(res.body.stats.retentionRate).toBe(0);
  });

  it("calcula receita da semana somando serviços", async () => {
    const weekRevenueData = [
      {
        date: new Date().toISOString().split("T")[0],
        services: [
          { service: { price: 80 } },
          { service: { price: 50 } },
        ],
      },
    ];

    setupDashboardMocks({ weekRevenue: weekRevenueData });

    const res = await request(app).get("/api/dashboard").set(AUTH());

    expect(res.body.stats.weekRevenue).toBe(130);
  });

  it("retorna array de 7 dias em revenueWeek", async () => {
    setupDashboardMocks();

    const res = await request(app).get("/api/dashboard").set(AUTH());

    expect(res.body.revenueWeek).toHaveLength(7);
    expect(res.body.revenueWeek[0]).toHaveProperty("day");
    expect(res.body.revenueWeek[0]).toHaveProperty("value");
  });

  it("mapeia serviços populares com nome e contagem", async () => {
    vi.mocked(prisma.appointment.count)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    vi.mocked(prisma.client.count)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    vi.mocked(prisma.appointment.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    vi.mocked(prisma.appointmentService.groupBy).mockResolvedValue([
      { serviceId: "svc-1", _count: { serviceId: 5 } } as any,
    ]);
    vi.mocked(prisma.service.findMany).mockResolvedValue([
      { id: "svc-1", name: "Corte de cabelo" } as any,
    ]);

    const res = await request(app).get("/api/dashboard").set(AUTH());

    expect(res.body.popularServices[0].name).toBe("Corte de cabelo");
    expect(res.body.popularServices[0].count).toBe(5);
  });
});
