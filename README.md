# SABER Onboarding

Sistema de gestão de onboarding de clientes para escritórios de contabilidade com integração automática ao Google Calendar e Gmail.

## 🚀 Tecnologias Utilizadas

### Backend
- **Python 3.10+** - Linguagem principal
- **FastAPI** - Framework web para APIs
- **SQLAlchemy** - ORM para banco de dados
- **SQLite** - Banco de dados (desenvolvimento)
- **APScheduler** - Jobs automáticos
- **Google APIs** - Calendar e Gmail
- **Cryptography** - Criptografia de tokens (Fernet)
- **Uvicorn** - Servidor ASGI

### Frontend
- **React 18** - Biblioteca para interface
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Framework CSS
- **shadcn/ui** - Componentes UI
- **TanStack Query** - Gerenciamento de estado
- **Wouter** - Roteamento
- **dayjs** - Manipulação de datas
- **lucide-react** - Ícones

## 📦 Como Executar

### Backend

1. **Instalar dependências:**
```bash
pip install -r requirements.txt
```

2. **Executar servidor:**
```bash
uvicorn main:app --reload
```

O backend estará disponível em `http://localhost:8000`

### Frontend

1. **Instalar dependências:**
```bash
npm install
```

2. **Executar em desenvolvimento:**
```bash
npm run dev
```

O frontend estará disponível em `http://localhost:5000`

## 🔧 Variáveis de Ambiente

### Obrigatórias

Crie um arquivo `.env` na raiz do projeto backend com as seguintes variáveis:

```env
# Google OAuth2 (obrigatório)
GOOGLE_CLIENT_ID=seu_client_id_do_google.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu_client_secret_do_google
GOOGLE_REDIRECT_URI=http://localhost:8000/integrations/google/callback

# Criptografia (obrigatório)
FERNET_KEY=sua_chave_fernet_base64_32_bytes

# Base URL da aplicação (opcional)
APP_BASE_URL=http://localhost:8000
```

### Opcional

```env
# Banco de dados (padrão: SQLite local)
DATABASE_URL=sqlite:///./saber_onboarding.db

# Configurações de log
LOG_LEVEL=INFO

# Timezone
TIMEZONE=America/Sao_Paulo
```

### Gerando FERNET_KEY

Para gerar uma chave Fernet válida:

```python
from cryptography.fernet import Fernet
print(Fernet.generate_key().decode())
```

## ⚙️ Ativando Jobs Automáticos

Os jobs do FastAPI são ativados automaticamente quando o servidor inicia. Para configurar:

### Jobs Disponíveis

1. **sync_agendamentos** - Executa a cada hora
   - Sincroniza agendamentos com Google Calendar
   - Envia e-mails de confirmação via Gmail

2. **remind_today** - Executa diariamente às 08:00 (BRT)
   - Envia lembretes de agendamentos do dia

### Configuração Manual

Os jobs podem ser executados manualmente através da API:

```bash
# Executar sincronização manual
curl -X POST http://localhost:8000/api/v1/jobs/run/sync_agendamentos

# Executar lembretes manual
curl -X POST http://localhost:8000/api/v1/jobs/run/remind_today

# Ver status dos jobs
curl http://localhost:8000/api/v1/jobs/info
```

## 🔐 Configuração Google Cloud

### 1. Criar Projeto no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Anote o **Project ID**

### 2. Ativar APIs Necessárias

1. No menu lateral, vá para **APIs & Services > Library**
2. Busque e ative as seguintes APIs:
   - **Google Calendar API**
   - **Gmail API**

### 3. Configurar OAuth2

1. Vá para **APIs & Services > Credentials**
2. Clique em **+ CREATE CREDENTIALS > OAuth client ID**
3. Configure:
   - **Application type**: Web application
   - **Name**: SABER Onboarding
   - **Authorized redirect URIs**: 
     - `http://localhost:8000/integrations/google/callback` (desenvolvimento)
     - `https://seu-dominio.com/integrations/google/callback` (produção)

### 4. Obter Credenciais

1. Após criar, baixe o arquivo JSON ou copie:
   - **Client ID** → `GOOGLE_CLIENT_ID`
   - **Client Secret** → `GOOGLE_CLIENT_SECRET`

### 5. Configurar Tela de Consentimento

1. Vá para **APIs & Services > OAuth consent screen**
2. Configure:
   - **User Type**: External (para testes) ou Internal (para empresa)
   - **App name**: SABER Onboarding
   - **Scopes**: Adicione os escopos necessários:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/gmail.send`

### 6. Testar Integração

1. Inicie o backend com as variáveis configuradas
2. Acesse `http://localhost:5000/configuracoes`
3. Clique em "Conectar Google"
4. Autorize as permissões solicitadas

## 🔄 Fluxo de Integração Google

### Processo de Autorização

1. **Usuário clica "Conectar Google"** → Redirecionado para Google
2. **Google autentica usuário** → Retorna código de autorização
3. **Sistema troca código por tokens** → Salva tokens criptografados
4. **Criação automática de eventos** → Google Calendar
5. **Envio automático de e-mails** → Gmail API

### Funcionalidades Automáticas

- ✅ **Eventos no Calendar**: Criados automaticamente para novos agendamentos
- ✅ **E-mails de confirmação**: Enviados via Gmail após criar agendamento
- ✅ **Lembretes automáticos**: Configurados nos eventos (24h, 1h, 10min)
- ✅ **Renovação de tokens**: Automática quando expiram

## 📝 Estrutura do Projeto

```
SABER-Onboarding/
├── backend/
│   ├── main.py              # Aplicação FastAPI principal
│   ├── models.py            # Modelos SQLAlchemy
│   ├── database.py          # Configuração do banco
│   ├── dependencies.py      # Dependências FastAPI
│   ├── routers/            # Rotas da API
│   ├── services/           # Lógica de negócio
│   ├── jobs/               # Jobs automáticos
│   └── requirements.txt    # Dependências Python
├── client/
│   ├── src/
│   │   ├── pages/          # Páginas React
│   │   ├── components/     # Componentes reutilizáveis
│   │   ├── lib/            # Utilitários e configurações
│   │   └── App.tsx         # Aplicação principal
│   ├── package.json        # Dependências Node.js
│   └── vite.config.ts      # Configuração Vite
└── README.md               # Este arquivo
```

## 🎯 Principais Funcionalidades

- **Dashboard**: Métricas e visão geral dos clientes
- **Gestão de Clientes**: CRUD completo com onboarding timeline
- **Agendamentos**: Criação automática no Google Calendar
- **Visitas Técnicas**: ATAs com decisões e pendências
- **Integração Google**: OAuth2 seguro com Calendar + Gmail
- **Jobs Automáticos**: Sincronização e lembretes

## 🔒 Segurança

- **Tokens criptografados**: Fernet encryption para credenciais Google
- **OAuth2 flow**: Implementação segura do fluxo de autorização
- **Variáveis de ambiente**: Credenciais separadas do código
- **Renovação automática**: Tokens atualizados automaticamente

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique se todas as variáveis de ambiente estão configuradas
2. Confirme que as APIs do Google estão ativadas
3. Teste a conectividade com Google OAuth2
4. Consulte os logs do backend para detalhes de erros