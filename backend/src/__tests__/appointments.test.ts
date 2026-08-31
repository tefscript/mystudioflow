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
};

const mockService = {
  id: "svc-1",
  userId: "user-1",
  name: "Corte de cabelo",
  duration: 60,
  price: 80,
  category: "Cabelo",
  active: true,
};

const mockAppointment = {
  id: "apt-1",
  userId: "user-1",
  clientId: "client-1",
  date: "2026-09-10",
  time: "14:00",
  duration: 60,
  status: "aguardando",
  notes: null,
  createdAt: new Date("2026-09-01"),
  updatedAt: new Date("2026-09-01"),
  client: { name: "Ana Silva", phone: "47999990000" },
  services: [
    {
      serviceId: "svc-1",
      service: { name: "Corte de cabelo", price: 80, duration: 60 },
    },
  ],
};

beforeEach(() => vi.clearAllMocks());

describe("GET /api/appointments", () => {
  it("retorna agendamentos do usuário", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([mockAppointment] as any);

    const res = await request(app).get("/api/appointments").set(AUTH());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].client_name).toBe("Ana Silva");
  });

  it("retorna 401 sem autenticação", async () => {
    const res = await request(app).get("/api/appointments");
    expect(res.status).toBe(401);
  });

  it("filtra por data quando passada como query", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([mockAppointment] as any);

    await request(app).get("/api/appointments?date=2026-09-10").set(AUTH());

    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ date: "2026-09-10" }),
      })
    );
  });

  it("filtra por status quando passado como query", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([mockAppointment] as any);

    await request(app).get("/api/appointments?status=confirmado").set(AUTH());

    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "confirmado" }),
      })
    );
  });
});

describe("GET /api/appointments/:id", () => {
  it("retorna agendamento pelo id", async () => {
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue(mockAppointment as any);

    const res = await request(app).get("/api/appointments/apt-1").set(AUTH());

    expect(res.status).toBe(200);
    expect(res.body.id).toBe("apt-1");
  });

  it("retorna 404 para agendamento inexistente", async () => {
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue(null);

    const res = await request(app).get("/api/appointments/nao-existe").set(AUTH());

    expect(res.status).toBe(404);
  });
});

describe("POST /api/appointments", () => {
  it("cria agendamento com dados válidos", async () => {
    vi.mocked(prisma.client.findFirst).mockResolvedValue(mockClient as any);
    vi.mocked(prisma.service.findMany).mockResolvedValue([mockService] as any);
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue(null); // sem conflito
    vi.mocked(prisma.appointment.create).mockResolvedValue(mockAppointment as any);
    vi.mocked(prisma.client.update).mockResolvedValue(mockClient as any);

    const res = await request(app)
      .post("/api/appointments")
      .set(AUTH())
      .send({
        client_id: "client-1",
        service_ids: ["svc-1"],
        date: "2026-09-10",
        time: "14:00",
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe("apt-1");
  });

  it("retorna 409 quando horário já está ocupado", async () => {
    vi.mocked(prisma.client.findFirst).mockResolvedValue(mockClient as any);
    vi.mocked(prisma.service.findMany).mockResolvedValue([mockService] as any);
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue(mockAppointment as any); // conflito

    const res = await request(app)
      .post("/api/appointments")
      .set(AUTH())
      .send({
        client_id: "client-1",
        service_ids: ["svc-1"],
        date: "2026-09-10",
        time: "14:00",
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain("horário");
  });

  it("retorna 404 para cliente inexistente", async () => {
    vi.mocked(prisma.client.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.service.findMany).mockResolvedValue([mockService] as any);

    const res = await request(app)
      .post("/api/appointments")
      .set(AUTH())
      .send({
        client_id: "nao-existe",
        service_ids: ["svc-1"],
        date: "2026-09-10",
        time: "14:00",
      });

    expect(res.status).toBe(404);
  });

  it("retorna 404 quando serviço não pertence ao usuário", async () => {
    vi.mocked(prisma.client.findFirst).mockResolvedValue(mockClient as any);
    vi.mocked(prisma.service.findMany).mockResolvedValue([]); // nenhum encontrado

    const res = await request(app)
      .post("/api/appointments")
      .set(AUTH())
      .send({
        client_id: "client-1",
        service_ids: ["svc-inexistente"],
        date: "2026-09-10",
        time: "14:00",
      });

    expect(res.status).toBe(404);
  });

  it("retorna 400 com data no formato errado", async () => {
    const res = await request(app)
      .post("/api/appointments")
      .set(AUTH())
      .send({
        client_id: "client-1",
        service_ids: ["svc-1"],
        date: "10/09/2026",
        time: "14:00",
      });

    expect(res.status).toBe(400);
  });

  it("retorna 400 sem service_ids", async () => {
    const res = await request(app)
      .post("/api/appointments")
      .set(AUTH())
      .send({
        client_id: "client-1",
        service_ids: [],
        date: "2026-09-10",
        time: "14:00",
      });

    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/appointments/:id/status", () => {
  it("atualiza status do agendamento", async () => {
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue(mockAppointment as any);
    vi.mocked(prisma.appointment.update).mockResolvedValue({
      ...mockAppointment,
      status: "confirmado",
    } as any);

    const res = await request(app)
      .patch("/api/appointments/apt-1/status")
      .set(AUTH())
      .send({ status: "confirmado" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("confirmado");
  });

  it("retorna 400 para status inválido", async () => {
    const res = await request(app)
      .patch("/api/appointments/apt-1/status")
      .set(AUTH())
      .send({ status: "status-invalido" });

    expect(res.status).toBe(400);
  });

  it("retorna 404 para agendamento inexistente", async () => {
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/appointments/nao-existe/status")
      .set(AUTH())
      .send({ status: "confirmado" });

    expect(res.status).toBe(404);
  });

  it("aceita todos os status válidos", async () => {
    const statuses = ["confirmado", "aguardando", "concluido", "cancelado"];

    for (const status of statuses) {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue(mockAppointment as any);
      vi.mocked(prisma.appointment.update).mockResolvedValue({ ...mockAppointment, status } as any);

      const res = await request(app)
        .patch("/api/appointments/apt-1/status")
        .set(AUTH())
        .send({ status });

      expect(res.status).toBe(200);
    }
  });
});

describe("DELETE /api/appointments/:id", () => {
  it("remove agendamento existente", async () => {
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue(mockAppointment as any);
    vi.mocked(prisma.appointment.delete).mockResolvedValue(mockAppointment as any);

    const res = await request(app).delete("/api/appointments/apt-1").set(AUTH());

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Agendamento removido");
  });

  it("retorna 404 para agendamento inexistente", async () => {
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue(null);

    const res = await request(app).delete("/api/appointments/nao-existe").set(AUTH());

    expect(res.status).toBe(404);
  });
});

describe("buildInitials (via formatAppointment)", () => {
  it("gera iniciais corretamente a partir do nome do cliente", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      { ...mockAppointment, client: { name: "Maria Oliveira", phone: "47999990000" } },
    ] as any);

    const res = await request(app).get("/api/appointments").set(AUTH());

    expect(res.body[0].clientInitials).toBe("MO");
  });

  it("gera inicial única para nome simples", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      { ...mockAppointment, client: { name: "Isabel", phone: "47999990000" } },
    ] as any);

    const res = await request(app).get("/api/appointments").set(AUTH());

    expect(res.body[0].clientInitials).toBe("I");
  });
});
