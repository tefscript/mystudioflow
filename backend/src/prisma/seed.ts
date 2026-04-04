import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  const passwordHash = await bcrypt.hash("demo123", 10);

  const user = await prisma.user.upsert({
    where: { email: "isabel@studio.com" },
    update: {},
    create: {
      id: "user-demo",
      name: "Isabel Rocha",
      email: "isabel@studio.com",
      password: passwordHash,
      studioName: "Studio Isabel Lashes",
      whatsapp: "(11) 99876-5432",
    },
  });

  console.log(`✅ Usuária criada: ${user.email}`);

  await prisma.settings.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  const clientsData = [
    { id: "c1", name: "Beatriz Cavalcante", phone: "(11) 98765-4321", email: "bia@email.com", notes: "Prefere atendimentos pela manhã. Alérgica a látex.", visits: 12, lastVisit: "2026-05-10" },
    { id: "c2", name: "Amanda Martins", phone: "(11) 99123-4567", email: "amanda.m@email.com", notes: "Cliente VIP — sempre vem com indicações.", visits: 24, lastVisit: "2026-05-15" },
    { id: "c3", name: "Luana Ferreira", phone: "(11) 97654-3210", notes: "Pele oleosa, micropigmentação delicada.", visits: 6, lastVisit: "2026-04-28" },
    { id: "c4", name: "Camila Rocha", phone: "(11) 98888-1234", email: "camila.r@email.com", visits: 3, lastVisit: "2026-05-12" },
    { id: "c5", name: "Fernanda Lima", phone: "(11) 96655-2211", notes: "Indicação da Amanda.", visits: 1, lastVisit: "2026-05-05" },
    { id: "c6", name: "Patrícia Mendes", phone: "(11) 99887-7665", email: "paty@email.com", visits: 8, lastVisit: "2026-05-09" },
    { id: "c7", name: "Juliana Souza", phone: "(11) 91122-3344", visits: 15, lastVisit: "2026-05-14" },
    { id: "c8", name: "Bruna Oliveira", phone: "(11) 93344-5566", email: "bruna.o@email.com", notes: "Sensível a perfumes.", visits: 4, lastVisit: "2026-04-20" },
  ];

  for (const c of clientsData) {
    await prisma.client.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, userId: user.id },
    });
  }
  console.log(`✅ ${clientsData.length} clientes criadas`);

  const servicesData = [
    { id: "s1", name: "Lash Lifting", duration: 60, price: 120, category: "Cílios" },
    { id: "s2", name: "Volume Russo", duration: 90, price: 220, category: "Cílios" },
    { id: "s3", name: "Volume Brasileiro", duration: 75, price: 180, category: "Cílios" },
    { id: "s4", name: "Design de Sobrancelha", duration: 30, price: 60, category: "Sobrancelha" },
    { id: "s5", name: "Design + Henna", duration: 45, price: 80, category: "Sobrancelha" },
    { id: "s6", name: "Microblading", duration: 120, price: 450, category: "Sobrancelha" },
    { id: "s7", name: "Limpeza de Pele Profunda", duration: 75, price: 150, category: "Estética" },
  ];

  for (const s of servicesData) {
    await prisma.service.upsert({
      where: { id: s.id },
      update: {},
      create: { ...s, userId: user.id },
    });
  }
  console.log(`✅ ${servicesData.length} serviços criados`);

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const appointmentsData = [
    { id: "a1", clientId: "c1", serviceId: "s1", date: today, time: "09:00", duration: 60, status: "confirmado", notes: "Cliente sensível, usar máscara hipoalergênica." },
    { id: "a2", clientId: "c2", serviceId: "s2", date: today, time: "10:30", duration: 90, status: "aguardando" },
    { id: "a3", clientId: "c3", serviceId: "s6", date: today, time: "14:00", duration: 120, status: "concluido" },
    { id: "a4", clientId: "c4", serviceId: "s4", date: today, time: "16:30", duration: 45, status: "confirmado" },
    { id: "a5", clientId: "c5", serviceId: "s1", date: tomorrow, time: "09:30", duration: 60, status: "confirmado" },
    { id: "a6", clientId: "c6", serviceId: "s5", date: tomorrow, time: "11:00", duration: 45, status: "aguardando" },
    { id: "a7", clientId: "c7", serviceId: "s2", date: tomorrow, time: "15:00", duration: 90, status: "confirmado" },
  ];

  for (const a of appointmentsData) {
    await prisma.appointment.upsert({
      where: { id: a.id },
      update: {},
      create: { ...a, userId: user.id },
    });
  }
  console.log(`✅ ${appointmentsData.length} agendamentos criados`);

  console.log("\n🎉 Seed concluído!");
  console.log("   Login: isabel@studio.com / demo123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
