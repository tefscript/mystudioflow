import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "../lib/prisma";

const mockSettings = {
  userId: "user-1",
  evolutionUrl: "http://evolution.test",
  evolutionKey: "test-key",
  evolutionInstance: "sf-estudio-teste",
};

// o setup mocka o service inteiro; aqui testamos a implementacao de verdade
async function sendWhatsAppMessage(userId: string, phone: string, text: string) {
  const real = await vi.importActual<typeof import("../services/whatsapp")>(
    "../services/whatsapp",
  );
  return real.sendWhatsAppMessage(userId, phone, text);
}

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
  vi.mocked(prisma.settings.findUnique).mockResolvedValue(mockSettings as any);
});

describe("sendWhatsAppMessage: nono digito", () => {
  it("manda pro numero real do WhatsApp (conta antiga sem o nono digito)", async () => {
    vi.mocked(global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ exists: true, jid: "554796171992@s.whatsapp.net" }],
      })
      .mockResolvedValueOnce({ ok: true });

    await sendWhatsAppMessage("user-1", "(47) 99617-1992", "oi");

    const [url, init] = vi.mocked(global.fetch as any).mock.calls[1];
    expect(url).toBe("http://evolution.test/message/sendText/sf-estudio-teste");
    expect(JSON.parse(init.body).number).toBe("554796171992");
  });

  it("se a consulta do numero falhar, usa o numero como esta", async () => {
    vi.mocked(global.fetch as any)
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce({ ok: true });

    await sendWhatsAppMessage("user-1", "(47) 99617-1992", "oi");

    const [, init] = vi.mocked(global.fetch as any).mock.calls[1];
    expect(JSON.parse(init.body).number).toBe("5547996171992");
  });
});
