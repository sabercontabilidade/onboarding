import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import { auditMiddleware } from "./audit/middleware.js";
import './cache.js'; // Inicializar Redis
import { initScheduler, shutdownScheduler } from './services/scheduler/scheduler.js';
import { initializeWebSocket } from './services/websocket/socket-server.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middleware de auditoria automática
app.use(auditMiddleware);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Validar conexão com banco de dados na inicialização
  try {
    const { db } = await import('./db.js');
    const { users } = await import('../shared/schema.js');
    await db.select().from(users).limit(1);
    log('✅ Banco de dados (PostgreSQL) conectado');
  } catch (error: any) {
    log('❌ ERRO: Falha ao conectar com banco de dados');
    log(`   ${error.message || error}`);
    log('   Verifique a variável DATABASE_URL no arquivo .env');
    process.exit(1); // Impede inicialização sem banco
  }

  // Validar conexão com Redis (cache)
  try {
    const { redisClient } = await import('./cache.js');
    await redisClient.ping();
    log('✅ Redis (cache) conectado');
  } catch (error: any) {
    log('⚠️  Redis não disponível (cache desabilitado)');
    log(`   ${error.message || error}`);
    log('   A aplicação continuará sem cache');
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Verificação consistente de ambiente com fallback para development
  const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

  if (isDevelopment) {
    log('🔧 Modo DESENVOLVIMENTO');
    log('   Frontend: Vite HMR (compilação em tempo real)');
    log('   Backend: PostgreSQL + Redis (ambiente LOCAL)');
    await setupVite(app, server);
  } else {
    log('📦 Modo PRODUÇÃO');
    log('   Frontend: Arquivos pré-compilados (dist/public/)');
    log('   Backend: PostgreSQL + Redis (ambiente PRODUÇÃO)');
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, "0.0.0.0", () => {
    log(`🚀 Servidor rodando na porta ${port}`);
    log(`📍 Ambiente: ${isDevelopment ? 'DESENVOLVIMENTO' : 'PRODUÇÃO'}`);
    log(`🔗 Acesse: http://localhost:${port}`);

    // Iniciar WebSocket
    try {
      initializeWebSocket(server);
      log('🔌 WebSocket inicializado');
    } catch (error: any) {
      log(`⚠️  Erro ao iniciar WebSocket: ${error.message}`);
    }

    // Iniciar scheduler de jobs
    try {
      initScheduler();
      log('⏰ Job scheduler inicializado');
    } catch (error: any) {
      log(`⚠️  Erro ao iniciar scheduler: ${error.message}`);
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    log('🔄 Recebido SIGTERM, encerrando gracefully...');
    await shutdownScheduler();
    server.close(() => {
      log('✅ Servidor encerrado');
      process.exit(0);
    });
  });

  process.on('SIGINT', async () => {
    log('🔄 Recebido SIGINT, encerrando gracefully...');
    await shutdownScheduler();
    server.close(() => {
      log('✅ Servidor encerrado');
      process.exit(0);
    });
  });
})();
