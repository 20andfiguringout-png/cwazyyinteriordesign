/**
 * load-env.ts — loaded via `node --import ./dist/load-env.mjs` BEFORE index.ts
 *
 * Because ESM imports are hoisted, dotenv cannot be called inside index.ts and
 * have it take effect before other modules read process.env.  This pre-loader
 * runs first and sets env vars from .env (if present) without overriding vars
 * that are already set by the host (Replit secrets, CI, etc.).
 */
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env"),
  override: false,
});
