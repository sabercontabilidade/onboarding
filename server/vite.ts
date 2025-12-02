import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";
import { nanoid } from "nanoid";

// Importação lazy do Vite - só carrega em desenvolvimento
let createViteServer: any;
let createLogger: any;
let viteConfig: any;

async function initVite() {
  if (process.env.NODE_ENV !== 'production') {
    try {
      const vite = await import('vite');
      createViteServer = vite.createServer;
      createLogger = vite.createLogger;
      viteConfig = (await import('../vite.config.js')).default;
    } catch (error) {
      console.warn('⚠️  Vite não disponível em produção');
    }
  }
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // Verificar se estamos em produção
  if (process.env.NODE_ENV === 'production') {
    log('📦 Modo PRODUÇÃO: servindo frontend pré-compilado (HTML/JS/CSS)');
    log('   ℹ️  Backend continua usando banco de dados REAL (PostgreSQL + Redis)');
    return;
  }

  // Inicializar Vite se necessário
  if (!createViteServer) {
    await initVite();
  }

  if (!createViteServer || !viteConfig) {
    log('⚠️  Vite não inicializado, servindo frontend pré-compilado');
    log('   ℹ️  Backend continua usando banco de dados REAL');
    return;
  }

  const viteLogger = createLogger();

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg: any, options: any) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
