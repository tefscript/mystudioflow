export type AppointmentStatus = "confirmado" | "aguardando" | "concluido" | "cancelado";

export interface Appointment {
  id: string;
  clientName: string;
  clientInitials: string;
  service: string;
  time: string;
  duration: number;
  date: string; // ISO yyyy-mm-dd
  status: AppointmentStatus;
  notes?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  visits: number;
  lastVisit: string;
}

export interface Service {
  id: string;
  name: string;
  duration: number; // minutes
  price: number;
  category: string;
}

const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

export const appointments: Appointment[] = [
  {
    id: "a1",
    clientName: "Beatriz Cavalcante",
    clientInitials: "BC",
    service: "Lash Lifting + Design",
    time: "09:00",
    duration: 60,
    date: today,
    status: "confirmado",
    notes: "Cliente sensível, usar máscara hipoalergênica.",
  },
  {
    id: "a2",
    clientName: "Amanda Martins",
    clientInitials: "AM",
    service: "Volume Russo",
    time: "10:30",
    duration: 90,
    date: today,
    status: "aguardando",
  },
  {
    id: "a3",
    clientName: "Luana Ferreira",
    clientInitials: "LF",
    service: "Microblading Retoque",
    time: "14:00",
    duration: 120,
    date: today,
    status: "concluido",
  },
  {
    id: "a4",
    clientName: "Camila Rocha",
    clientInitials: "CR",
    service: "Design de Sobrancelha",
    time: "16:30",
    duration: 45,
    date: today,
    status: "confirmado",
  },
  {
    id: "a5",
    clientName: "Fernanda Lima",
    clientInitials: "FL",
    service: "Lash Lifting",
    time: "09:30",
    duration: 60,
    date: tomorrow,
    status: "confirmado",
  },
  {
    id: "a6",
    clientName: "Patrícia Mendes",
    clientInitials: "PM",
    service: "Design & Tintura",
    time: "11:00",
    duration: 45,
    date: tomorrow,
    status: "aguardando",
  },
  {
    id: "a7",
    clientName: "Juliana Souza",
    clientInitials: "JS",
    service: "Volume Russo",
    time: "15:00",
    duration: 90,
    date: tomorrow,
    status: "confirmado",
  },
];

export const clients: Client[] = [
  {
    id: "c1",
    name: "Beatriz Cavalcante",
    phone: "(11) 98765-4321",
    email: "bia@email.com",
    notes: "Prefere atendimentos pela manhã. Alérgica a látex.",
    visits: 12,
    lastVisit: "2026-05-10",
  },
  {
    id: "c2",
    name: "Amanda Martins",
    phone: "(11) 99123-4567",
    email: "amanda.m@email.com",
    notes: "Cliente VIP — sempre vem com indicações.",
    visits: 24,
    lastVisit: "2026-05-15",
  },
  {
    id: "c3",
    name: "Luana Ferreira",
    phone: "(11) 97654-3210",
    notes: "Pele oleosa, micropigmentação delicada.",
    visits: 6,
    lastVisit: "2026-04-28",
  },
  {
    id: "c4",
    name: "Camila Rocha",
    phone: "(11) 98888-1234",
    email: "camila.r@email.com",
    visits: 3,
    lastVisit: "2026-05-12",
  },
  {
    id: "c5",
    name: "Fernanda Lima",
    phone: "(11) 96655-2211",
    notes: "Indicação da Amanda.",
    visits: 1,
    lastVisit: "2026-05-05",
  },
  {
    id: "c6",
    name: "Patrícia Mendes",
    phone: "(11) 99887-7665",
    email: "paty@email.com",
    visits: 8,
    lastVisit: "2026-05-09",
  },
  {
    id: "c7",
    name: "Juliana Souza",
    phone: "(11) 91122-3344",
    visits: 15,
    lastVisit: "2026-05-14",
  },
  {
    id: "c8",
    name: "Bruna Oliveira",
    phone: "(11) 93344-5566",
    email: "bruna.o@email.com",
    notes: "Sensível a perfumes.",
    visits: 4,
    lastVisit: "2026-04-20",
  },
];

export const services: Service[] = [
  { id: "s1", name: "Lash Lifting", duration: 60, price: 120, category: "Cílios" },
  { id: "s2", name: "Volume Russo", duration: 90, price: 220, category: "Cílios" },
  { id: "s3", name: "Volume Brasileiro", duration: 75, price: 180, category: "Cílios" },
  { id: "s4", name: "Design de Sobrancelha", duration: 30, price: 60, category: "Sobrancelha" },
  { id: "s5", name: "Design + Henna", duration: 45, price: 80, category: "Sobrancelha" },
  { id: "s6", name: "Microblading", duration: 120, price: 450, category: "Sobrancelha" },
  { id: "s7", name: "Limpeza de Pele Profunda", duration: 75, price: 150, category: "Estética" },
];

export const stats = {
  todayAppointments: 8,
  upcoming: 4,
  totalClients: 148,
  estimatedRevenue: 4280,
  newClients: 24,
  retentionRate: 92,
};

export const popularServices = [
  { name: "Volume Russo", count: 42 },
  { name: "Lash Lifting", count: 28 },
  { name: "Design Simples", count: 19 },
  { name: "Microblading", count: 11 },
];

export const revenueWeek = [
  { day: "Seg", value: 580 },
  { day: "Ter", value: 720 },
  { day: "Qua", value: 640 },
  { day: "Qui", value: 890 },
  { day: "Sex", value: 1120 },
  { day: "Sáb", value: 1340 },
  { day: "Dom", value: 280 },
];

export const statusLabels: Record<AppointmentStatus, string> = {
  confirmado: "Confirmado",
  aguardando: "Aguardando",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const statusStyles: Record<AppointmentStatus, string> = {
  confirmado: "bg-emerald-500 text-white",
  aguardando: "bg-sky-500 text-white",
  concluido: "bg-brand-500 text-white",
  cancelado: "bg-rose-400 text-white",
};
