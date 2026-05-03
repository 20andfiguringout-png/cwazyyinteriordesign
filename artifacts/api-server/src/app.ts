import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/authMiddleware";

const app: Express = express();

// ─── Trust Replit's reverse proxy so req.ip is the real client IP ─────────────
app.set("trust proxy", 1);

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  }),
);

// ─── CORS: restrict to known app origins only ─────────────────────────────────
const REPLIT_DOMAIN = process.env["REPLIT_DOMAINS"]?.split(",")[0]?.trim();
const allowedOrigins = new Set<string>(
  [
    REPLIT_DOMAIN ? `https://${REPLIT_DOMAIN}` : null,
    process.env["ALLOWED_ORIGIN"] ?? null,
    "http://localhost:22495",
    "http://localhost:3000",
  ].filter(Boolean) as string[],
);

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  }),
);

app.use(cookieParser());

// ─── Body parsing: generous limit for quote PDF attachments ───────────────────
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(authMiddleware);
app.use("/api", router);

export default app;
