import { describe, it, expect } from "vitest";
import { cn } from "../lib/utils";

describe("cn", () => {
  it("retorna classe simples", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("combina múltiplas classes", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("ignora valores falsy", () => {
    expect(cn("foo", undefined, null, false, "bar")).toBe("foo bar");
  });

  it("resolve conflitos do Tailwind (última classe vence)", () => {
    expect(cn("p-4", "p-8")).toBe("p-8");
  });

  it("funciona com classes condicionais", () => {
    const active = true;
    expect(cn("base", active && "active")).toBe("base active");
  });

  it("funciona com objeto de classes", () => {
    expect(cn({ "text-red-500": true, "text-blue-500": false })).toBe("text-red-500");
  });

  it("retorna string vazia sem argumentos", () => {
    expect(cn()).toBe("");
  });
});
