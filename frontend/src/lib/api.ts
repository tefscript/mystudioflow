const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

export function getToken(): string | null {
  return sessionStorage.getItem("sf_token");
}

export function setToken(token: string) {
  sessionStorage.setItem("sf_token", token);
}

export function clearToken() {
  sessionStorage.removeItem("sf_token");
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function req<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(BASE + path);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v);
    });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return data as T;
}

// ---------------------------------------------------------------------------
// Types (mirrors mock-data + backend additions)
// ---------------------------------------------------------------------------

export type AppointmentStatus = "confirmado" | "aguardando" | "concluido" | "cancelado";

export interface User {
  id: string;
  name: string;
  email: string;
  studio_name: string;
  whatsapp?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  visits: number;
  last_visit?: string;
}

export interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  category: string;
}

export interface AppointmentService {
  id: string;
  name: string;
  price: number;
  duration: number;
}

export interface Appointment {
  id: string;
  client_id: string;
  service_id: string;
  services: AppointmentService[];
  client_name: string;
  client_phone?: string;
  clientInitials: string;
  service_name: string;
  service_price: number;
  date: string;
  time: string;
  duration: number;
  status: AppointmentStatus;
  notes?: string;
}

export interface DashboardData {
  stats: {
    todayAppointments: number;
    upcoming: number;
    totalClients: number;
    estimatedRevenue: number;
    weekRevenue: number;
    newClients: number;
    retentionRate: number;
  };
  revenueWeek: { day: string; value: number }[];
  popularServices: { name: string; count: number }[];
}

export interface Settings {
  notify_new: number;
  notify_cancel: number;
  notify_confirm: number;
  notify_daily_email: number;
  notify_weekly: number;
  wa_confirm_24h: number;
  wa_reminder_2h: number;
  wa_thanks: number;
  pref_dark_auto: number;
  pref_show_values: number;
  pref_block_lunch: number;
  pref_allow_sunday: number;
  evolution_url?: string | null;
  evolution_key?: string | null;
  evolution_instance?: string | null;
  wa_msg_confirmation?: string | null;
  wa_msg_reminder?: string | null;
  wa_msg_reschedule?: string | null;
}

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------

export const authApi = {
  login: (email: string, password: string) =>
    req<{ token: string; user: User }>("POST", "/auth/login", { email, password }),

  logout: () => req<{ message: string }>("POST", "/auth/logout"),

  me: () => req<User>("GET", "/auth/me"),

  forgotPassword: (email: string) =>
    req<{ message: string }>("POST", "/auth/forgot-password", { email }),

  resetPassword: (token: string, password: string) =>
    req<{ message: string }>("POST", "/auth/reset-password", { token, password }),
};

// ---------------------------------------------------------------------------
// Clients API
// ---------------------------------------------------------------------------

export const clientsApi = {
  list: (q?: string) => req<Client[]>("GET", "/clients", undefined, q ? { q } : undefined),

  get: (id: string) => req<Client>("GET", `/clients/${id}`),

  create: (data: Omit<Client, "id" | "visits" | "last_visit">) =>
    req<Client>("POST", "/clients", data),

  update: (id: string, data: Partial<Client>) => req<Client>("PUT", `/clients/${id}`, data),

  delete: (id: string) => req<{ message: string }>("DELETE", `/clients/${id}`),
};

// ---------------------------------------------------------------------------
// Services API
// ---------------------------------------------------------------------------

export const servicesApi = {
  list: () => req<Service[]>("GET", "/services"),

  get: (id: string) => req<Service>("GET", `/services/${id}`),

  create: (data: Omit<Service, "id">) => req<Service>("POST", "/services", data),

  update: (id: string, data: Partial<Service>) => req<Service>("PUT", `/services/${id}`, data),

  delete: (id: string) => req<{ message: string }>("DELETE", `/services/${id}`),
};

// ---------------------------------------------------------------------------
// Appointments API
// ---------------------------------------------------------------------------

export const appointmentsApi = {
  list: (filters?: { date?: string; status?: string }) =>
    req<Appointment[]>("GET", "/appointments", undefined, filters),

  get: (id: string) => req<Appointment>("GET", `/appointments/${id}`),

  create: (data: {
    client_id: string;
    service_ids: string[];
    date: string;
    time: string;
    notes?: string;
  }) => req<Appointment>("POST", "/appointments", data),

  update: (id: string, data: Partial<Appointment> & { service_ids?: string[] }) =>
    req<Appointment>("PUT", `/appointments/${id}`, data),

  setStatus: (id: string, status: AppointmentStatus) =>
    req<Appointment>("PATCH", `/appointments/${id}/status`, { status }),

  delete: (id: string) => req<{ message: string }>("DELETE", `/appointments/${id}`),
};

// ---------------------------------------------------------------------------
// Dashboard API
// ---------------------------------------------------------------------------

export const dashboardApi = {
  get: () => req<DashboardData>("GET", "/dashboard"),
};

// ---------------------------------------------------------------------------
// Settings API
// ---------------------------------------------------------------------------

export const settingsApi = {
  get: () => req<Settings>("GET", "/settings"),
  update: (data: Partial<Settings>) => req<Settings>("PUT", "/settings", data),
};

// ---------------------------------------------------------------------------
// Profile API
// ---------------------------------------------------------------------------

export const profileApi = {
  update: (data: Partial<User> & { password?: string }) => req<User>("PUT", "/profile", data),
};

// ---------------------------------------------------------------------------
// WhatsApp API
// ---------------------------------------------------------------------------

export const whatsappApi = {
  connect: () => req<{ instanceName: string }>("POST", "/whatsapp/instance", {}),
  getQrCode: () => req<{ base64?: string; code?: string }>("GET", "/whatsapp/qrcode"),
  getStatus: () => req<{ connected: boolean; configured: boolean; state?: string }>("GET", "/whatsapp/status"),
  deleteInstance: () => req<{ success: boolean }>("DELETE", "/whatsapp/instance"),
};
