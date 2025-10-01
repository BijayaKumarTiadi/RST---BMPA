import express, { type Request, Response, NextFunction } from "express";
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase } from "./database";
import searchRouter from "./searchRoutes";

const app = express();

// Initialize database
initializeDatabase().catch(console.error);

// Setup session store with PostgreSQL
import MemoryStore from 'memorystore';
const MemStore = MemoryStore(session);
const PgSession = connectPgSimple(session);

let sessionStore;
// Only use PostgreSQL if DATABASE_URL is configured
if (process.env.DATABASE_URL) {
  try {
    // Use PostgreSQL store for sessions (BMPS_sessions table)
    sessionStore = new PgSession({
      tableName: 'BMPS_sessions',
      createTableIfMissing: true,
      conString: process.env.DATABASE_URL,
    });
    console.log('✅ PostgreSQL session store initialized');
  } catch (error) {
    console.log('⚠️ PostgreSQL session store failed, using memory store:', error);
    sessionStore = new MemStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }
} else {
  console.log('ℹ️ No DATABASE_URL configured, using memory store for sessions');
  sessionStore = new MemStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  });
}

// Session configuration with fallback to memory store
app.use(session({
  name: 'stock_laabh_session',
  secret: 'stock-laabh-secret-key-2025',
  store: sessionStore || new MemStore({
    checkPeriod: 15 * 60 * 1000 // prune expired entries every 15 minutes
  }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours session validity
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
    sameSite: 'lax' // Add sameSite for better cookie handling
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
