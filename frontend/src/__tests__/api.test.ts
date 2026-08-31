import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getToken, setToken, clearToken, authApi, clientsApi, appointmentsApi } from "../lib/api";

// sessionStorage mock via jsdom
beforeEach(() => {
  sessionStorage.clear();
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Token management ────────────────────────────────────────────────────────

describe("getToken", () => {
  it("retorna null quando não há token", () => {
    expect(getToken()).toBeNull();
  });

  it("retorna o token após setToken", () => {
    setToken("meu-token");
    expect(getToken()).toBe("meu-token");
  });
});

describe("setToken", () => {
  it("salva o token no sessionStorage", () => {
    setToken("abc123");
    expect(sessionStorage.getItem("sf_token")).toBe("abc123");
  });
});

describe("clearToken", () => {
  it("remove o token do sessionStorage", () => {
    setToken("abc123");
    clearToken();
    expect(getToken()).toBeNull();
  });

  it("não falha se não houver token", () => {
    expect(() => clearToken()).not.toThrow();
  });
});

// ─── authApi ─────────────────────────────────────────────────────────────────

describe("authApi.login", () => {
  it("faz POST /auth/login e retorna token + user", async () => {
    const mockResponse = { token: "jwt-abc", user: { id: "1", name: "Isabel" } };
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as any);

    const result = await authApi.login("isabel@teste.com", "senha123");

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/login"),
      expect.objectContaining({ method: "POST" })
    );
    expect(result.token).toBe("jwt-abc");
  });

  it("lança erro quando resposta não é ok", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "E-mail ou senha incorretos" }),
    } as any);

    await expect(authApi.login("x@x.com", "errada")).rejects.toThrow("E-mail ou senha incorretos");
  });
});

describe("authApi.me", () => {
  it("inclui Authorization header quando há token", async () => {
    setToken("meu-jwt");
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ id: "1", name: "Isabel" }),
    } as any);

    await authApi.me();

    const callArgs = vi.mocked(global.fetch).mock.calls[0];
    const headers = (callArgs[1] as RequestInit).headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer meu-jwt");
  });

  it("não inclui Authorization header sem token", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ id: "1", name: "Isabel" }),
    } as any);

    await authApi.me();

    const callArgs = vi.mocked(global.fetch).mock.calls[0];
    const headers = (callArgs[1] as RequestInit).headers as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
  });
});

describe("authApi.forgotPassword", () => {
  it("faz POST /auth/forgot-password", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ message: "instruções enviadas" }),
    } as any);

    const result = await authApi.forgotPassword("isabel@teste.com");
    expect(result.message).toBe("instruções enviadas");
  });
});

// ─── clientsApi ──────────────────────────────────────────────────────────────

describe("clientsApi.list", () => {
  it("faz GET /clients sem filtro", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => [],
    } as any);

    await clientsApi.list();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/clients"),
      expect.objectContaining({ method: "GET" })
    );
  });

  it("inclui query param q quando fornecido", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => [],
    } as any);

    await clientsApi.list("Ana");
    const url = vi.mocked(global.fetch).mock.calls[0][0] as string;
    expect(url).toContain("q=Ana");
  });
});

describe("clientsApi.delete", () => {
  it("faz DELETE /clients/:id", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Cliente removida" }),
    } as any);

    await clientsApi.delete("client-1");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/clients/client-1"),
      expect.objectContaining({ method: "DELETE" })
    );
  });
});

// ─── appointmentsApi ─────────────────────────────────────────────────────────

describe("appointmentsApi.list", () => {
  it("inclui filtros de data e status na URL", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => [],
    } as any);

    await appointmentsApi.list({ date: "2026-09-10", status: "confirmado" });
    const url = vi.mocked(global.fetch).mock.calls[0][0] as string;
    expect(url).toContain("date=2026-09-10");
    expect(url).toContain("status=confirmado");
  });
});

describe("appointmentsApi.setStatus", () => {
  it("faz PATCH /appointments/:id/status", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ id: "apt-1", status: "confirmado" }),
    } as any);

    await appointmentsApi.setStatus("apt-1", "confirmado");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/appointments/apt-1/status"),
      expect.objectContaining({ method: "PATCH" })
    );
  });
});
