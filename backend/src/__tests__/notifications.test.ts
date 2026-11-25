import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import prisma from "../lib/prisma";

const AUTH = () => ({
  Authorization: `Bearer ${jwt.sign({ userId: "user-1" }, "test-secret-key", { expiresIn: "7d" })}`,
});

beforeEach(() => vi.clearAllMocks());

describe("GET /api/notifications", () => {
  it("exige login", async () => {
    const res = await request(app).get("/api/notifications");
    expect(res.status).toBe(401);
  });

  it("lista confirmacoes e cancelamentos recentes da usuaria", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      {
        id: "a1",
        status: "cancelado",
        date: "2026-11-26",
        time: "07:35",
        updatedAt: new Date("2026-11-25T22:00:00Z"),
        client: { name: "Ana Souza" },
      },
    ] as any);

    const res = await request(app).get("/api/notifications").set(AUTH());

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({ id: "a1", type: "cancelado", client_name: "Ana Souza", time: "07:35" }),
    ]);
    const where = vi.mocked(prisma.appointment.findMany).mock.calls[0][0]!.where as any;
    expect(where.userId).toBe("user-1");
    expect(where.status).toEqual({ in: ["confirmado", "cancelado"] });
  });
});
