import { vi } from "vitest";

// Mock do Prisma — nenhum teste toca banco de dados real
vi.mock("../lib/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    client: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    service: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    appointment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    appointmentService: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      groupBy: vi.fn(),
    },
    settings: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

// Mock dos serviços externos — sem chamadas reais a WhatsApp ou e-mail
vi.mock("../services/whatsapp", () => ({
  sendWhatsAppConfirmation: vi.fn().mockResolvedValue(undefined),
  sendWhatsAppReschedule: vi.fn().mockResolvedValue(undefined),
  sendWhatsAppReminder: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../services/email", () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock do cron para não disparar jobs durante testes
vi.mock("../jobs/reminderJob", () => ({
  startReminderJob: vi.fn(),
}));

process.env.JWT_SECRET = "test-secret-key";
process.env.JWT_EXPIRES_IN = "7d";
