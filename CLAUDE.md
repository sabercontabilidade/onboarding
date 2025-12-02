# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Idioma

**Sempre interaja e responda em português brasileiro.**

## Visão Geral

**SABER Onboarding** é um sistema full-stack de gestão de onboarding de clientes para escritórios de contabilidade. Arquitetura monorepo com client (React), server (Express), e shared (schemas/tipos).

### Stack Principal
- **Frontend**: React 18 + TypeScript + Vite + Tailwind + shadcn/ui + TanStack Query + Wouter
- **Backend**: Express + TypeScript + Drizzle ORM + PostgreSQL + Redis (cache)
- **Autenticação**: JWT (23h) + Refresh Tokens (7d) + bcrypt
- **Validação**: Zod em ambos lados

## Comandos de Desenvolvimento

```bash
npm run dev              # Backend + Frontend com HMR
npm run build            # Build completo para produção
npm run check            # TypeScript type check
npm run db:generate      # Gerar migrations após alterar schema
npm run db:migrate       # Executar migrations pendentes
npm run db:push          # Push schema direto (dev apenas)
npm run db:studio        # Abrir Drizzle Studio
npm run db:seed          # Popular banco com dados iniciais
```

## Arquitetura

### Estrutura de Pastas
```
client/src/
├── pages/              # Páginas (login, dashboard, clientes, etc)
├── components/
│   ├── layout/         # Sidebar, Header, AppLayout
│   ├── ui/             # Componentes shadcn/ui
│   └── auth/           # ProtectedRoute, RequireAdmin
├── contexts/           # AuthContext
└── lib/
    ├── api.ts          # Cliente HTTP centralizado
    └── queryClient.ts  # TanStack Query config

server/
├── index.ts            # Entry point Express
├── routes.ts           # Registro central de rotas
├── routes/             # Rotas modulares (auth, users, audit, etc)
├── auth/               # JWT + middleware de autenticação
├── audit/              # Logger e middleware de auditoria
├── db.ts               # Conexão PostgreSQL + Drizzle
├── cache.ts            # Client Redis
└── storage.ts          # Camada de dados (IStorage interface)

shared/
└── schema.ts           # Schemas Drizzle + Zod + tipos TypeScript
```

### Banco de Dados (PostgreSQL)
Tabelas principais: `users`, `clients`, `onboarding_stages`, `appointments`, `visits`, `process_assignments`, `comments`, `notifications`, `audit_logs`

Enums importantes:
- `funcao`: comercial | integracao | onboarding | admin
- `nivelPermissao`: administrador | operador | analista
- Status de cliente: pending | onboarding | active | inactive

### Padrão de Tipos (shared/schema.ts)
```typescript
export const users = pgTable("users", { ... })           // Tabela Drizzle
export const insertUserSchema = createInsertSchema(users) // Schema Zod
export type User = typeof users.$inferSelect             // Tipo Select
export type InsertUser = z.infer<typeof insertUserSchema> // Tipo Insert
```

### Fluxo de Autenticação
1. Login POST /api/auth/login retorna accessToken + user
2. Token armazenado no localStorage
3. Middleware `authenticate` valida JWT em rotas protegidas
4. Cache Redis para sessões (TTL 1h)
5. Refresh automático quando token expira

### Import Aliases
```typescript
import { api } from '@/lib/api'           // client/src/lib
import { Client } from '@shared/schema'    // shared/schema
import { Button } from '@/components/ui'   // client/src/components/ui
```

## Convenções

- **Nomenclatura**: camelCase para variáveis/funções, PascalCase para componentes/tipos
- **Validação**: Sempre usar Zod schemas para entrada de dados
- **Rotas protegidas**: Usar middleware `authenticate` e `requireAdmin` quando necessário
- **Cache**: Redis com graceful degradation (continua sem cache se Redis falhar)
- **Auditoria**: Middleware automático loga todas as ações

## Variáveis de Ambiente (.env)

Obrigatórias:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Chave para assinar tokens
- `CACHE_URL`: Redis connection string (opcional, funciona sem)
- `EMAIL_API_KEY`: Resend API key para emails
- `ROOT_*`: Credenciais do admin root (ROOT_EMAIL, ROOT_SENHA, etc)

## Padrões de Código

### Componente React
```typescript
interface Props { id: string; onSuccess?: () => void }

export function MyComponent({ id, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  // ... lógica
  return <Button onClick={handleAction}>{loading ? 'Carregando...' : 'Ação'}</Button>
}
```

### Rota Backend
```typescript
app.post("/api/resource", authenticate, async (req, res) => {
  try {
    const data = schema.parse(req.body)
    const result = await storage.create(data)
    res.status(201).json(result)
  } catch (error: any) {
    if (error instanceof ZodError) return res.status(400).json({ error: error.errors })
    res.status(500).json({ error: error.message })
  }
})
```
