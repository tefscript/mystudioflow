import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type React from "react";
import type { ReactNode } from "react";

vi.mock("@/components/AppShell", () => ({
  PageHeader: ({ title, action }: { title: string; action?: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {action}
    </div>
  ),
  PrimaryButton: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

const clientes = [
  { id: "1", name: "José Silva", phone: "(47) 99123-4567", email: "jose@x.com", visits: 5 },
  { id: "2", name: "Ana Souza", phone: "(47) 98888-1111", email: "", visits: 0 },
  { id: "3", name: "Bia Lima", phone: "(11) 97777-2222", email: "bia@x.com", visits: 2 },
];

vi.mock("@/lib/api", () => ({
  clientsApi: {
    list: vi.fn(() => Promise.resolve(clientes)),
    history: vi.fn(() => Promise.resolve([])),
    update: vi.fn((id: string, data: object) =>
      Promise.resolve({ ...clientes.find((c) => c.id === id), ...data }),
    ),
  },
}));

import { Route } from "../routes/_app.clientes";

const ClientesPage = Route.options.component as React.ComponentType;

function nomesNaTabela() {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((r) => r.querySelector("p")?.textContent);
}

describe("tela de clientes: busca", () => {
  beforeEach(async () => {
    render(<ClientesPage />);
    await waitFor(() => expect(screen.getByText("José Silva")).toBeTruthy());
  });

  it("busca ignora acento", async () => {
    await userEvent.type(screen.getByPlaceholderText(/Buscar/), "jose");
    expect(nomesNaTabela()).toEqual(["José Silva"]);
  });

  it("busca pelo comeco da palavra, nao pelo meio", async () => {
    await userEvent.type(screen.getByPlaceholderText(/Buscar/), "li");
    expect(nomesNaTabela()).toEqual(["Bia Lima"]);
    await userEvent.clear(screen.getByPlaceholderText(/Buscar/));
    await userEvent.type(screen.getByPlaceholderText(/Buscar/), "ouza");
    expect(screen.queryAllByRole("row")).toHaveLength(0);
  });

  it("busca telefone digitado sem formatacao", async () => {
    await userEvent.type(screen.getByPlaceholderText(/Buscar/), "4798888");
    expect(nomesNaTabela()).toEqual(["Ana Souza"]);
  });

  it("edita a cliente depois de criada", async () => {
    await userEvent.click(screen.getByText("Bia Lima"));
    await userEvent.click(await screen.findByRole("button", { name: /Editar/ }));

    const email = screen.getByDisplayValue("bia@x.com");
    await userEvent.clear(email);
    await userEvent.type(email, "bia.nova@x.com");
    await userEvent.type(screen.getByPlaceholderText(/Preferências/), "alergia a esmalte");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    const { clientsApi } = await import("@/lib/api");
    expect(clientsApi.update).toHaveBeenCalledWith(
      "3",
      expect.objectContaining({ email: "bia.nova@x.com", notes: "alergia a esmalte" }),
    );
  });
});
