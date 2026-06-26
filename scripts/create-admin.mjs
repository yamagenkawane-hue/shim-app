import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください。");
  process.exit(1);
}

const rl = readline.createInterface({ input, output });
const loginId = await rl.question("login id: ");
const displayName = await rl.question("display name: ");
const password = await rl.question("password: ");
rl.close();

const passwordHash = await hashPassword(password);
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const { error } = await supabase.from("app_users").upsert({
  login_id: loginId,
  display_name: displayName,
  password_hash: passwordHash,
  role: "admin",
  can_manage_settings: true,
  is_active: true,
}, { onConflict: "login_id" });

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log("admin user saved");

async function hashPassword(rawPassword) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await new Promise((resolve, reject) => {
    crypto.scrypt(rawPassword, salt, 64, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}
