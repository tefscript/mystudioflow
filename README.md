# StudioFlow

Sistema web de gestão para estúdios de beleza, desenvolvido como Trabalho de Conclusão de Curso (TCC) em Engenharia de Software — Católica SC.

## Sobre o projeto

O StudioFlow é uma plataforma voltada para profissionais autônomos da área da beleza — lash designers, esteticistas e body piercers — que hoje organizam sua rotina de forma manual, via WhatsApp, papel ou planilhas.

O sistema centraliza agenda, clientes e atendimentos em uma única aplicação, com confirmação automática via WhatsApp e interface pensada para quem tem pouco tempo e baixo conhecimento técnico.

---

## Funcionalidades

- Autenticação de usuários (login com e-mail e senha)
- Dashboard com estatísticas do dia, semana e mês
- Agenda diária com visualização por horário
- Criação, edição e cancelamento de agendamentos
- Verificação automática de conflito de horário
- Cadastro e gerenciamento de clientes
- Histórico de atendimentos por cliente
- Catálogo de serviços com categorias personalizáveis
- Confirmação automática via WhatsApp (EvolutionAPI)
- Configurações de notificações e preferências

---

## Tecnologias

### Frontend
- React 19 + TypeScript
- TanStack Router + React Query
- Tailwind CSS + shadcn/ui
- Vite

### Backend
- Node.js + Express + TypeScript
- Prisma ORM
- PostgreSQL
- JWT + bcrypt

---

## Estrutura do projeto

```
studioflow/
├── frontend/   # Interface web (React)
└── backend/    # API REST (Node.js + Express)
```

---

## Como rodar localmente

### Pré-requisitos

- Node.js 18+
- PostgreSQL 15+

### Backend

```bash
cd backend

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com sua DATABASE_URL e JWT_SECRET

# Criar tabelas e popular dados de demo
npx prisma migrate dev
npm run db:seed

# Iniciar servidor (porta 8000)
npm run dev
```

**Login demo:** `isabel@studio.com` / `demo123`

### Frontend

```bash
cd frontend
npm install
npm run dev
# Acesse http://localhost:8080
```

---

## Arquitetura

O sistema segue o modelo C4, com três containers principais:

- **Frontend** — interface web acessada pelo navegador
- **API Backend** — processa regras de negócio e requisições
- **Banco de Dados** — PostgreSQL para persistência dos dados

A integração com WhatsApp é feita via [EvolutionAPI](https://github.com/EvolutionAPI/evolution-api), configurável via variáveis de ambiente.

---

## Autora

**Stefani Paula Sant'ana Cruz**  
Engenharia de Software — Católica SC
