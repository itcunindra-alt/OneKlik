import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { jsonrepair } from "jsonrepair";
import dotenv from "dotenv";
import fs from "fs";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config();

// User Database and Token Helpers
const USERS_FILE = process.env.NETLIFY ? path.join("/tmp", "users.json") : path.join(process.cwd(), "users.json");
const FIREBASE_CONFIG_FILE = process.env.NETLIFY ? path.resolve(__dirname, "firebase-applet-config.json") : path.join(process.cwd(), "firebase-applet-config.json");
let db: any = null;
let isFirestoreAvailable = true;

function getDb() {
  if (!isFirestoreAvailable) return null;
  if (db) return db;
  try {
    if (fs.existsSync(FIREBASE_CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(FIREBASE_CONFIG_FILE, "utf-8"));
      const saStr = process.env.CUSTOM_FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT;
      if (getApps().length === 0) {
        if (saStr) {
          initializeApp({
            credential: cert(JSON.parse(saStr)),
            // If they provided a custom service account, they likely want the default database in that project
            projectId: JSON.parse(saStr).project_id || config.projectId
          });
        } else {
          initializeApp({
            projectId: config.projectId,
          });
        }
      }
      if (config.firestoreDatabaseId && !process.env.CUSTOM_FIREBASE_SERVICE_ACCOUNT && !process.env.FIREBASE_SERVICE_ACCOUNT) {
        db = getFirestore(getApps()[0], config.firestoreDatabaseId);
      } else {
        db = getFirestore();
      }
      console.log("Firebase Admin successfully initialized.");
    } else {
      console.warn("firebase-applet-config.json not found, falling back to local users.json");
      isFirestoreAvailable = false;
    }
  } catch (err) {
    console.error("Failed to initialize Firebase Admin:", err);
    isFirestoreAvailable = false;
  }
  return db;
}

function initUsersDb() {
  if (!fs.existsSync(USERS_FILE)) {
    const seedUsers = [
      {
        id: "u-admin",
        name: "Administrator",
        email: "admin@gmail.com",
        password: "admin",
        role: "admin",
        createdAt: new Date().toISOString()
      },
      {
        id: "u-user",
        name: "Regular User",
        email: "user@gmail.com",
        password: "user123",
        role: "user",
        createdAt: new Date().toISOString()
      }
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(seedUsers, null, 2), "utf-8");
  }
}

async function loadUsers(): Promise<any[]> {
  const firebaseDb = getDb();
  if (firebaseDb && isFirestoreAvailable) {
    try {
      const snapshot = await firebaseDb.collection("users").get();
      const users: any[] = [];
      snapshot.forEach((doc: any) => {
        users.push({ id: doc.id, ...doc.data() });
      });
      if (users.length === 0) {
        const seedUsers = [
          {
            name: "Administrator",
            email: "admin@gmail.com",
            password: "admin",
            role: "admin",
            createdAt: new Date().toISOString()
          },
          {
            name: "Regular User",
            email: "user@gmail.com",
            password: "user123",
            role: "user",
            createdAt: new Date().toISOString()
          }
        ];
        for (const u of seedUsers) {
          const docId = u.role === "admin" ? "u-admin" : "u-user";
          await firebaseDb.collection("users").doc(docId).set(u);
          users.push({ id: docId, ...u });
        }
      }
      return users;
    } catch (err: any) {
      isFirestoreAvailable = false;
      console.warn("Firestore is not accessible (e.g. missing permissions or offline). Falling back to local database users.json.");
      console.log(`Firestore message: ${err.message || err}`);
    }
  }

  initUsersDb();
  try {
    const raw = fs.readFileSync(USERS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

async function saveUsers(users: any[]) {
  const firebaseDb = getDb();
  if (firebaseDb && isFirestoreAvailable) {
    try {
      const snapshot = await firebaseDb.collection("users").get();
      const existingIds = new Set<string>();
      snapshot.forEach((doc: any) => {
        existingIds.add(doc.id);
      });

      const newIds = new Set(users.map((u) => u.id));

      for (const id of existingIds) {
        if (!newIds.has(id)) {
          await firebaseDb.collection("users").doc(id).delete();
        }
      }

      for (const u of users) {
        const userToSave = { ...u };
        const docId = userToSave.id;
        delete userToSave.id;
        await firebaseDb.collection("users").doc(docId).set(userToSave);
      }
      
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
      return;
    } catch (err: any) {
      isFirestoreAvailable = false;
      console.warn("Firestore is not accessible. Falling back to saving locally in users.json.");
      console.log(`Firestore message: ${err.message || err}`);
    }
  }

  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

function parseToken(token: string): any {
  try {
    if (token.includes(".")) {
      const payloadBase64 = token.split(".")[1];
      const decoded = JSON.parse(Buffer.from(payloadBase64, "base64").toString("utf-8"));
      return {
        id: decoded.user_id || decoded.sub,
        email: decoded.email,
        name: decoded.name || decoded.email,
        role: decoded.email === "admin@gmail.com" ? "admin" : "user",
      };
    }
    const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    return decoded;
  } catch (e) {
    return null;
  }
}

function refreshUserCreditsIfNeeded(user: any): boolean {
  if (!user.expiresAt || user.role === "admin") return false;

  const now = Date.now();
  let modified = false;

  if (!user.lastCreditResetAt) {
    user.lastCreditResetAt = user.createdAt || new Date().toISOString();
    if (user.credits === undefined) user.credits = 30; // 3 generations
    modified = true;
  }

  return modified;
}

function getAiClient(reqApiKey?: string): GoogleGenAI {
  const apiKey = reqApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key belum dikonfigurasi. Silakan klik ikon Settings (roda gigi) di kanan atas halaman untuk memasukkan API Key Anda.");
  }
  
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function generateAiContent(
  prompt: string,
  options: {
    apiKey?: string;
    channel?: string;
    modelId?: string;
    responseMimeType?: string;
    temperature?: number;
  }
): Promise<string> {
  const { apiKey, channel, modelId, responseMimeType, temperature } = options;
  const finalApiKey = apiKey || process.env.GEMINI_API_KEY;
  if (!finalApiKey) {
    throw new Error(
      "API Key belum dikonfigurasi. Silakan klik ikon Settings (roda gigi) di kanan atas halaman untuk memasukkan API Key Anda."
    );
  }

  // Handle OpenAI compatible channels
  if (channel && channel !== "GEMINI" && channel !== "Gemini API") {
    let baseUrl = "";
    if (channel === "OPENROUTER") baseUrl = "https://openrouter.ai/api/v1";
    else if (channel === "OPENAGENTIC") baseUrl = "https://openagentic.id/api/v1";
    
    if (baseUrl) {
      let actualModel = modelId;
      if (!actualModel) {
        if (channel === "OPENROUTER") {
          // OpenRouter has a default
          actualModel = "google/gemini-2.5-flash";
        } else {
          throw new Error(`Model AI belum diisi. Silakan isi custom model ID untuk ${channel} di menu pengaturan (misalnya 'gemini-3.1-pro').`);
        }
      }
      
      const payload: any = {
        model: actualModel || "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: temperature ?? 0.8,
        max_tokens: 8000,
        stream: false,
      };

      if (responseMimeType === "application/json") {
        payload.response_format = { type: "json_object" };
      }

      console.log(`[${channel}] Calling model: ${actualModel}`);
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${finalApiKey}`,
          ...(channel === "OPENROUTER" && { "HTTP-Referer": "https://aistudio.google.com", "X-Title": "Adin Story Engine" })
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        let formattedMsg = errText;
        try {
          const parsed = JSON.parse(errText);
          if (parsed.error?.message) formattedMsg = parsed.error.message;
          else if (parsed.message) formattedMsg = parsed.message;
        } catch (_) {}
        throw new Error(`[${channel}] Error ${response.status}: ${formattedMsg}`);
      }

      const rawText = await response.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseError: any) {
        // AI endpoints sometimes add trailing spaces or stream artifacts
        try {
          // Find first { and last } to extract JSON
          const firstBrace = rawText.indexOf("{");
          const lastBrace = rawText.lastIndexOf("}");
          if (firstBrace !== -1 && lastBrace > firstBrace) {
            data = JSON.parse(rawText.substring(firstBrace, lastBrace + 1));
          } else {
            throw parseError;
          }
        } catch (e) {
          throw new Error(`[${channel}] JSON parsing failed: ` + parseError.message);
        }
      }

      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      }
      throw new Error(`[${channel}] Invalid response format: ${JSON.stringify(data)}`);
    }
  }

  // Fallback to Gemini
  const client = new GoogleGenAI({
    apiKey: finalApiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      }
    }
  });

  // Clean model ID: remove prefixes like "models/" or "google/" and upgrade deprecated gemini-1.5 models
  let cleanModel = (modelId || "").trim().replace(/^models\//i, "").replace(/^google\//i, "");
  if (cleanModel.includes("1.5")) {
    cleanModel = "gemini-2.5-flash";
  }

  const validGeminiModels = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-2.0-flash"];
  const models = (cleanModel && cleanModel.startsWith("gemini"))
    ? Array.from(new Set([cleanModel, ...validGeminiModels]))
    : validGeminiModels;

  let firstError: any = null;
  let lastError: any = null;

  for (const model of models) {
    let delay = 600; // ms
    const maxRetries = 2; // 3 attempts total per model
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini API] Calling model: ${model} (attempt ${attempt + 1}/${maxRetries + 1})`);
        const response = await client.models.generateContent({
          model: model,
          contents: prompt,
          config: {
            responseMimeType: responseMimeType || "text/plain",
            temperature: temperature ?? 0.8,
          }
        });
        
        if (response.text) {
          console.log(`[Gemini API] Successfully generated content using ${model}`);
          return response.text;
        }
        
        throw new Error("Empty response text received");
      } catch (error: any) {
        lastError = error;
        const errStr = (error.message || String(error)).toLowerCase();
        
        // Save first error ONLY if it's not a 404 / model not found error
        if (!firstError && !errStr.includes("not found") && !errStr.includes("404")) {
          firstError = error;
        }

        if (errStr.includes("api key not valid") || errStr.includes("api_key_invalid") || errStr.includes("authentication failed")) {
          throw new Error("API Key Gemini tidak valid. Silakan periksa kembali API Key Anda di menu pengaturan.");
        }
        
        const isServerBusy = errStr.includes("503") || 
                             errStr.includes("unavailable") || 
                             errStr.includes("demand");
                             
        const isTransient = isServerBusy ||
                            errStr.includes("429") || 
                            errStr.includes("resource_exhausted") ||
                            errStr.includes("limit") ||
                            errStr.includes("empty response");

        if (isServerBusy) {
          console.warn(`[Gemini API] Server busy (503/demand) with model ${model}. Bypassing retries and falling back to next model immediately.`);
          break; // Break inner loop immediately to switch model instantly
        }

        if (isTransient && attempt < maxRetries) {
          console.warn(`[Gemini API] Transient error with model ${model} on attempt ${attempt + 1}. Retrying in ${delay}ms...`, error);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 1.8; // Exponential backoff
        } else {
          console.warn(`[Gemini API] Error or exhausted retries for model ${model}. Moving to fallback or final failure. Error:`, error);
          break; // Break inner loop, try next fallback model in list
        }
      }
    }
  }

  // If we reach here, all models and retries failed.
  let errorToThrow = firstError || lastError;
  const errStr = (errorToThrow?.message || String(errorToThrow)).toLowerCase();
  
  if (errStr.includes("503") || errStr.includes("unavailable") || errStr.includes("demand")) {
    throw new Error(
      "Layanan AI sedang mengalami lalu lintas sangat tinggi (High Demand/503) di semua model. Silakan tunggu beberapa detik dan coba kembali."
    );
  }
   
  if (errStr.includes("429") || errStr.includes("resource_exhausted") || errStr.includes("quota") || errStr.includes("limit")) {
    throw new Error(
      "Batas kuota API gratis terlampaui (Rate Limit/429). Google membatasi jumlah pembuatan konten per menit/hari pada akun gratis. Silakan tunggu 1 hingga 2 menit sebelum mencoba kembali, atau ganti/masukkan API Key Anda di menu Settings (ikon roda gigi di kanan atas)."
    );
  }

  // If error is JSON, try parsing and extracting message
  try {
    const parsedErr = typeof errorToThrow?.message === "string" ? JSON.parse(errorToThrow.message) : errorToThrow;
    if (parsedErr?.error?.message) {
      throw new Error(`Detail Error AI: ${parsedErr.error.message}`);
    }
  } catch (e: any) {
    if (e.message.startsWith("Detail Error AI:")) throw e;
  }

  throw new Error(errorToThrow?.message || "Semua model AI gagal merespon. Silakan coba beberapa saat lagi.");
}

function sanitizeNewlinesInJson(str: string): string {
  let result = "";
  let inString = false;
  let esc = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (esc) {
      result += ch;
      esc = false;
      continue;
    }
    if (ch === "\\") {
      result += ch;
      esc = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }
    if (inString) {
      if (ch === "\n") result += "\\n";
      else if (ch === "\r") result += "\\r";
      else if (ch === "\t") result += "\\t";
      else result += ch;
    } else {
      result += ch;
    }
  }
  return result;
}

function robustParseJson(str: string): any {
  if (typeof str !== "string") return str;
  let cleaned = str.trim();

  // 1. Remove markdown code block markers anywhere in text
  cleaned = cleaned.replace(/```json/gi, "").replace(/```/g, "").trim();

  // 2. Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch (e1: any) {
    if (e1.message && e1.message.includes("Unexpected non-whitespace character after JSON at position")) {
      const match = e1.message.match(/position (\d+)/);
      if (match) {
        const pos = parseInt(match[1], 10);
        try { return JSON.parse(cleaned.substring(0, pos)); } catch(e) {}
      }
    }
  }

  // 3. Extract candidate JSON structure from first [ or {
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");

  let startIdx = -1;
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }

  if (startIdx !== -1) {
    const fromStart = cleaned.substring(startIdx);
    
    // Try to parse from start
    try {
      return JSON.parse(fromStart);
    } catch (e2: any) {
      if (e2.message && e2.message.includes("Unexpected non-whitespace character after JSON at position")) {
        const match = e2.message.match(/position (\d+)/);
        if (match) {
          const pos = parseInt(match[1], 10);
          try { return JSON.parse(fromStart.substring(0, pos)); } catch(e) {}
        }
      }
    }

    // Iterate backwards finding the closing bracket/brace
    const endChar = cleaned[startIdx] === '{' ? '}' : ']';
    let currentEndIdx = fromStart.lastIndexOf(endChar);
    
    while (currentEndIdx > 0) {
      const candidate = fromStart.substring(0, currentEndIdx + 1);
      try {
        return JSON.parse(candidate);
      } catch(e) {
        try {
          return JSON.parse(jsonrepair(candidate));
        } catch(e2) {
          // continue searching backwards
        }
      }
      currentEndIdx = fromStart.lastIndexOf(endChar, currentEndIdx - 1);
    }
  }

  // 4. Sanitize raw newlines/tabs inside string literals then jsonrepair
  const newlineSanitized = sanitizeNewlinesInJson(cleaned);
  try {
    return JSON.parse(newlineSanitized);
  } catch (e4) {}

  try {
    return JSON.parse(jsonrepair(newlineSanitized));
  } catch (e5) {}

  // 5. Fallback: jsonrepair on whole cleaned
  try {
    return JSON.parse(jsonrepair(cleaned));
  } catch (eFinal) {
    console.error("[robustParseJson] All JSON repair attempts failed. Raw text:", str.substring(0, 300));
    throw new Error("Gagal memproses format JSON dari AI. Silakan coba klik tombol generate kembali.");
  }
}

export async function createServerApp() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // API: Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API: Check Credit Balance or general validity
  app.post("/api/check-credit", async (req, res) => {
    try {
      const { apiKey } = req.body;
      if (!apiKey) {
        return res.json({ success: false, error: "API Key kosong." });
      }
      
      const firstKey = apiKey.split("\n").map((k: string) => k.trim()).filter((k: string) => k.length > 0)[0];
      if (!firstKey) {
        return res.json({ success: false, error: "API Key kosong." });
      }

      return res.json({ success: true, data: { status: "valid", type: "Gemini API" } });
    } catch (err: any) {
      return res.json({ success: false, error: err.message || "Gagal memeriksa kunci API." });
    }
  });

  // Admin and Auth Middlewares & Endpoints
  const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const authHeader = req.headers["authorization"];
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, error: "Akses ditolak. Diperlukan autentikasi." });
      }

      const token = authHeader.split(" ")[1];
      const decoded = parseToken(token);
      if (!decoded || !decoded.id) {
        return res.status(403).json({ success: false, error: "Token tidak valid." });
      }

      const users = await loadUsers();
      // Find by ID, or fallback to email (for Google Auth users who haven't fully synced ID yet)
      const user = users.find((u: any) => u.id === decoded.id || u.email === decoded.email);
      
      if (!user || user.role !== "admin") {
        return res.status(403).json({ success: false, error: "Akses ditolak. Hanya untuk Administrator." });
      }

      // Optionally attach user to req for later use
      (req as any).user = user;
      next();
    } catch (err) {
      return res.status(500).json({ success: false, error: "Kesalahan otorisasi." });
    }
  };

  // API: User Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: "Email/Username dan password wajib diisi." });
      }

      const users = await loadUsers();
      const user = users.find((u: any) => 
        u.email.toLowerCase() === email.toLowerCase() || 
        (u.name && u.name.toLowerCase() === email.toLowerCase())
      );

      if (!user || user.password !== password) {
        return res.status(401).json({ success: false, error: "Email/Username atau password salah." });
      }

      // Check account expiration for self-registered users (valid for 1 day)
      if (user.expiresAt) {
        const expiryDate = new Date(user.expiresAt);
        if (expiryDate < new Date()) {
          return res.status(403).json({ 
            success: false, 
            error: `Akun sementara Anda telah kedaluwarsa pada ${expiryDate.toLocaleString("id-ID")}. Akun mandiri hanya berlaku selama 1 hari.` 
          });
        }
      }

      if (refreshUserCreditsIfNeeded(user)) {
        await saveUsers(users);
      }

      // Generate stateless base64 token
      const tokenPayload = { id: user.id, name: user.name, email: user.email, role: user.role, timestamp: Date.now() };
      const token = Buffer.from(JSON.stringify(tokenPayload)).toString("base64");

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          expiresAt: user.expiresAt || null,
          credits: user.credits ?? (user.expiresAt ? 30 : undefined)
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Gagal melakukan login." });
    }
  });

  // API: User Self-Registration (creates account valid for exactly 1 day)
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ success: false, error: "Semua data (Nama, Email, Password) wajib diisi." });
      }

      const users = await loadUsers();
      const emailExists = users.some((u: any) => u.email.toLowerCase() === email.toLowerCase());
      if (emailExists) {
        return res.status(400).json({ success: false, error: "Alamat email ini sudah terdaftar." });
      }

      // Calculate expiration: exactly 1 day from now
      const createdAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();

      const newUser = {
        id: "u-" + Math.random().toString(36).substring(2, 11),
        name,
        email,
        password,
        role: "user",
        createdAt,
        expiresAt, // 1 day expiration
        credits: 30, // Akun mandiri mendapat 30 credit
        lastCreditResetAt: createdAt
      };

      users.push(newUser);
      await saveUsers(users);

      // Generate login token automatically on successful registration
      const tokenPayload = { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, timestamp: Date.now() };
      const token = Buffer.from(JSON.stringify(tokenPayload)).toString("base64");

      return res.json({
        success: true,
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          expiresAt: newUser.expiresAt
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Gagal mendaftarkan akun baru." });
    }
  });

  // API: Sync Users from Client Backup (to handle Cloud Run stateless/ephemeral resets)
  app.post("/api/auth/sync-backup", async (req, res) => {
    try {
      const { backupUsers } = req.body;
      if (!backupUsers || !Array.isArray(backupUsers)) {
        return res.json({ success: true, count: 0 });
      }
      const users = await loadUsers();
      let updated = false;
      backupUsers.forEach((bu: any) => {
        if (bu && bu.email && bu.id) {
          const exists = users.some((u: any) => u.email.toLowerCase() === bu.email.toLowerCase() || u.id === bu.id);
          if (!exists) {
            users.push({
              id: bu.id,
              name: bu.name,
              email: bu.email,
              password: bu.password,
              role: bu.role || "user",
              createdAt: bu.createdAt || new Date().toISOString(),
              expiresAt: bu.expiresAt || null
            });
            updated = true;
          }
        }
      });
      if (updated) {
        await saveUsers(users);
      }
      return res.json({ success: true, count: users.length });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Gagal melakukan sinkronisasi backup." });
    }
  });

  // API: Get Current Authenticated User (verify token)
  app.get("/api/auth/me", async (req, res) => {
    try {
      const authHeader = req.headers["authorization"];
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, error: "Tidak diotorisasi." });
      }

      const token = authHeader.split(" ")[1];
      const decoded = parseToken(token);
      if (!decoded) {
        return res.status(401).json({ success: false, error: "Sesi tidak valid." });
      }

      const users = await loadUsers();
      let user = users.find((u: any) => u.id === decoded.id);
      if (!user && decoded.email) {
        user = users.find((u: any) => u.email === decoded.email);
      }
      
      if (!user) {
        return res.status(401).json({ success: false, error: "User tidak ditemukan." });
      }

      // Check account expiration for self-registered users
      if (user.expiresAt) {
        const expiryDate = new Date(user.expiresAt);
        if (expiryDate < new Date()) {
          return res.status(401).json({ success: false, error: "Sesi Anda telah kedaluwarsa. Akun sementara 1 hari telah berakhir." });
        }
      }

      if (refreshUserCreditsIfNeeded(user)) {
        await saveUsers(users);
      }

      return res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          expiresAt: user.expiresAt || null,
          credits: user.credits ?? (user.expiresAt ? 30 : undefined)
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Gagal memverifikasi pengguna." });
    }
  });

  // API: List All Users (Admin only)
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await loadUsers();
      const safeUsers = users.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt || new Date().toISOString(),
        expiresAt: u.expiresAt || null
      }));
      return res.json({ success: true, users: safeUsers });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Gagal mengambil daftar pengguna." });
    }
  });

  // API: Create New User (Admin only)
  app.post("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const { name, email, password, role } = req.body;
      if (!name || !email || !password || !role) {
        return res.status(400).json({ success: false, error: "Semua data wajib diisi (Nama, Email, Password, Peran)." });
      }

      const users = await loadUsers();
      const emailExists = users.some((u: any) => u.email.toLowerCase() === email.toLowerCase());
      if (emailExists) {
        return res.status(400).json({ success: false, error: "Alamat email ini sudah terdaftar." });
      }

      let uid = "u-" + Math.random().toString(36).substring(2, 11);
      
      // Connect to Firebase Authentication
      if (getApps().length > 0 && process.env.CUSTOM_FIREBASE_SERVICE_ACCOUNT) {
        try {
          const fbUser = await getAdminAuth().createUser({
            email,
            password,
            displayName: name
          });
          uid = fbUser.uid;
        } catch (fbErr: any) {
          if (fbErr.code === "auth/email-already-exists") {
            return res.status(400).json({ success: false, error: "Alamat email ini sudah terdaftar di Firebase." });
          }
          console.error("Firebase Auth create error:", fbErr);
          return res.status(500).json({ success: false, error: "Gagal membuat pengguna di Firebase Auth: " + fbErr.message });
        }
      }

      const newUser = {
        id: uid,
        name,
        email,
        password,
        role: role === "admin" ? "admin" : "user",
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      await saveUsers(users);

      return res.json({
        success: true,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          createdAt: newUser.createdAt
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Gagal menambahkan pengguna baru." });
    }
  });

  // API: Delete User (Admin only)
  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const authHeader = req.headers["authorization"];
      const token = authHeader!.split(" ")[1];
      const decoded = parseToken(token);
      const currentAdminId = decoded ? decoded.id : null;

      if (id === "all-self-registered") {
        const users = await loadUsers();
        const selfRegistered = users.filter((u: any) => u.expiresAt && u.id !== currentAdminId);
        
        if (getApps().length > 0 && process.env.CUSTOM_FIREBASE_SERVICE_ACCOUNT) {
          for (const u of selfRegistered) {
            try {
              await getAdminAuth().deleteUser(u.id);
            } catch (e) {
              console.warn("Failed to delete user from Firebase Auth:", u.id);
            }
          }
        }
        
        // Keep only users that do not have expiresAt (not self registered), or the current admin
        const remainingUsers = users.filter((u: any) => !u.expiresAt || u.id === currentAdminId);
        await saveUsers(remainingUsers);
        return res.json({ success: true, message: "Semua pengguna daftar mandiri berhasil dihapus." });
      }

      if (id === "all-users") {
        const users = await loadUsers();
        const others = users.filter((u: any) => u.id !== currentAdminId);
        
        if (getApps().length > 0 && process.env.CUSTOM_FIREBASE_SERVICE_ACCOUNT) {
          for (const u of others) {
            try {
              await getAdminAuth().deleteUser(u.id);
            } catch (e) {
              console.warn("Failed to delete user from Firebase Auth:", u.id);
            }
          }
        }

        // Keep only the current admin
        const remainingUsers = users.filter((u: any) => u.id === currentAdminId);
        await saveUsers(remainingUsers);
        return res.json({ success: true, message: "Semua pengguna selain Anda berhasil dihapus." });
      }
      
      if (currentAdminId === id) {
        return res.status(400).json({ success: false, error: "Anda tidak dapat menghapus akun Anda sendiri." });
      }

      const users = await loadUsers();
      const userIdx = users.findIndex((u: any) => u.id === id);
      if (userIdx === -1) {
        return res.status(404).json({ success: false, error: "Pengguna tidak ditemukan." });
      }
      
      if (getApps().length > 0 && process.env.CUSTOM_FIREBASE_SERVICE_ACCOUNT) {
        try {
          await getAdminAuth().deleteUser(id);
        } catch (e) {
          console.warn("Failed to delete user from Firebase Auth:", id);
        }
      }

      users.splice(userIdx, 1);
      await saveUsers(users);

      return res.json({ success: true, message: "Pengguna berhasil dihapus." });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Gagal menghapus pengguna." });
    }
  });

  // API: Get AI Trending Topic suggestions based on selected Audience
  app.post("/api/generate/topics", async (req, res) => {
    try {
      const reqApiKey = req.headers["x-api-key"] as string | undefined;
      const reqApiChannel = req.headers["x-api-channel"] as string | undefined;
      const reqApiModel = req.headers["x-api-model"] as string | undefined;
      
      const { audience, customAudience, themeContext, genre, customGenre } = req.body;
      const targetAudience = audience === "custom" ? (customAudience || "Kustom") : (audience === "indonesia" ? "Indonesia" : "Global/Internasional");
      const selectedGenre = genre === "Kustom" ? (customGenre || "Kustom") : (genre || "");
      
      let themePromptText = "";
      if (selectedGenre) {
        themePromptText += `The suggestions and their categories MUST strictly align with the chosen video genre: "${selectedGenre}". Every topic, angle, and category name generated must be a direct sub-niche, sub-topic, or thematic variation of "${selectedGenre}". `;
      }
      if (themeContext && themeContext.trim()) {
        themePromptText += `The suggestions MUST also be focused on the specific theme/niche: "${themeContext}". Adjust all recommendations to fit this theme within the context of "${selectedGenre}" creatively.`;
      } else {
        themePromptText += `The suggestions should represent highly trending viral sub-categories of "${selectedGenre || "general viral content"}" tailored to capture deep viewer interest.`;
      }

      let languageDirective = "";
      if (audience === "global") {
        languageDirective = `CRITICAL LANGUAGE DIRECTIVE: Since the selected audience is Global/Internasional, ALL categories, titles, descriptions, and hook lines MUST be written completely in modern, engaging, and high-retention English. DO NOT use Indonesian under any circumstances, even if other inputs (like genre) are written in Indonesian. Translate any Indonesian inputs/categories to English if needed.`;
      } else {
        languageDirective = `If the target audience text is written in Indonesian, implies an Indonesian demographic, or is specified with Indonesian terms, or if the chosen genre is written in Indonesian, write the categories, titles, descriptions, and hook lines in casual, engaging Indonesian (Bahasa Indonesia santai/gaul/menarik). Otherwise, write them in modern, engaging English.`;
      }

      const prompt = `Generate 10 fresh, highly engaging, trending video short topics/angles for TikTok/Instagram Reels/YouTube Shorts.
The target audience is: ${targetAudience}.
Video Genre: ${selectedGenre || "Any"}.
${themePromptText}

${languageDirective}

You MUST return a JSON array containing EXACTLY 10 objects. Each object must have these keys:
- "category": A specific category/sub-niche that is directly under the chosen video genre: "${selectedGenre || "General"}". For example, if genre is "Misteri & Horor", category could be "Mitos Mistis", "Urban Legend", "True Crime", or "Teori Konspirasi". If genre is "Edukasi & Tips", category could be "Lifehack", "Edukasi Keuangan", "Tips Produktivitas", or "Sains Populer". If genre is "Motivasi & Inspirasi", category could be "Self-Improvement", "Filsafat Hidup", or "Mental Health". Every category MUST be relevant to "${selectedGenre || "General"}".
- "title": A super catchy, high-CTR hook title.
- "description": A short explanation of what the short is about (max 2 sentences).
- "hookAngle": The primary hook line or strategy to capture attention in the first 3 seconds.
- "viralScore": An integer between 85 and 99 representing the potential virality/high retention rating.
- "uniqueness": An integer between 80 and 99 representing how distinct and unique this hook is in the niche.

Format your response strictly as valid, parsable JSON, with no markdown code block backticks (i.e. do not wrap in \`\`\`json).`;

      const responseText = await generateAiContent(prompt, {
        apiKey: reqApiKey,
        channel: reqApiChannel,
        modelId: reqApiModel,
        responseMimeType: "application/json",
        temperature: 0.85
      });
      const parsed = robustParseJson(responseText);
      if (Array.isArray(parsed)) {
        return res.json(parsed);
      } else if (parsed && typeof parsed === "object") {
        const arrayProp = parsed.topics || parsed.data || parsed.suggestions || parsed.items || Object.values(parsed).find((v: any) => Array.isArray(v));
        if (arrayProp && Array.isArray(arrayProp)) {
          return res.json(arrayProp);
        }
        return res.json([parsed]);
      }
      return res.json(parsed);
    } catch (error: any) {
      console.error("Error generating topics:", error);
      res.status(500).json({ 
        error: error.message || "Failed to generate topics",
        needsApiKey: !process.env.GEMINI_API_KEY
      });
    }
  });

  // API: Refine/Polish user's own topic idea based on audience and genre
  app.post("/api/generate/refine-topic", async (req, res) => {
    try {
      const reqApiKey = req.headers["x-api-key"] as string | undefined;
      const reqApiChannel = req.headers["x-api-channel"] as string | undefined;
      const reqApiModel = req.headers["x-api-model"] as string | undefined;
      
      const { topic, audience, customAudience, genre, customGenre } = req.body;
      if (!topic || !topic.trim()) {
        return res.status(400).json({ success: false, error: "Topik tidak boleh kosong." });
      }
      
      const targetAudience = audience === "custom" ? (customAudience || "Kustom") : (audience === "indonesia" ? "Indonesia" : "Global/Internasional");
      const selectedGenre = genre === "Kustom" ? (customGenre || "Kustom") : (genre || "");

      let languageRefineDirective = "";
      if (audience === "global") {
        languageRefineDirective = "Since the target audience is Global/Internasional, you MUST output the refined topic completely in modern, engaging, and high-CTR English. Do not use Indonesian under any circumstances. Translate the concept to English if needed.";
      } else {
        languageRefineDirective = "If the target audience is \"Indonesia\" or if the genre/input is in Indonesian, output the refined topic in casual, highly engaging, and viral Indonesian (Bahasa Indonesia santai/menarik/gaul yang cocok untuk Reels/TikTok/Shorts). Otherwise, output it in modern, engaging, and high-CTR English.";
      }

      const prompt = `You are an expert social media scriptwriter and content strategist. 
The user has provided their own video topic/idea: "${topic}".
Your goal is to correct, polish, and optimize this topic to be extremely engaging, catchy, and viral, strictly matching the selected Video Genre and Target Audience.

Target Audience: ${targetAudience}
Selected Genre: ${selectedGenre || "Any/General"}

Instructions:
1. Make the topic sound incredibly professional, clear, and highly clickable (high CTR).
2. Fix any spelling, grammatical, or punctuation errors in the input.
3. Align the phrasing, vocabulary, and tone perfectly with the chosen Video Genre: "${selectedGenre}".
4. Language rule: ${languageRefineDirective}
5. Keep the response concise, punchy, and limited to exactly ONE sentence/phrase that represents the polished topic itself. Do not include any intro, outro, conversational text, or explanation. Only return the final corrected/refined topic string directly.`;

      const responseText = await generateAiContent(prompt, {
        apiKey: reqApiKey,
        channel: reqApiChannel,
        modelId: reqApiModel,
        temperature: 0.7
      });
      
      res.json({ success: true, refinedTopic: responseText.trim() });
    } catch (error: any) {
      console.error("Error refining topic:", error);
      res.status(500).json({ 
        error: error.message || "Gagal mengkoreksi topik",
        needsApiKey: !process.env.GEMINI_API_KEY
      });
    }
  });

  // API: Generate script based on audience, topic, genre, and duration
  app.post("/api/generate/script", async (req, res) => {
    try {
      const reqApiKey = req.headers["x-api-key"] as string | undefined;
      const reqApiChannel = req.headers["x-api-channel"] as string | undefined;
      const reqApiModel = req.headers["x-api-model"] as string | undefined;

      const { audience, customAudience, topic, genre, customGenre, duration } = req.body;
      const targetAudience = audience === "custom" ? (customAudience || "Kustom") : (audience === "indonesia" ? "Indonesia" : "Global/Internasional");
      const finalGenre = genre === "Kustom" ? (customGenre || "Kustom") : genre;
      const finalDuration = duration || "30"; // default to 30s

      let comedyFormattingDirective = "";
      const isComedy = finalGenre.toLowerCase().includes("komedi") || finalGenre.toLowerCase().includes("comedy") || finalGenre.toLowerCase().includes("humor");
      if (isComedy) {
        comedyFormattingDirective = `
CRITICAL COMEDY DIRECTIVE (DYNAMIC CUT-TO-CUT & COMIC TIMING):
- Since the genre is Comedy ("${finalGenre}"), the script MUST employ a highly dynamic, fast-paced, humorous "cut-to-cut" editing style.
- Visual instructions MUST include snappy editing cues (e.g., "SUDDEN JUMP CUT to...", "FAST ZOOM-IN for facial expression", "COMIC SILENCE CUT to...", "MEME-STYLE TEXT OVERLAY", or "SIDE-BY-SIDE reaction comparison").
- Structure the voiceOver so punchlines land exactly on dramatic visual cuts or expressions.
- The "audioVibe" should recommend rich comic sound effects (e.g., rapid swooshes, record scratch, comic boings, sarcastic soundbeds, or sudden comedic comedic pauses).`;
      }

      let languageScriptDirective = "";
      if (audience === "global") {
        languageScriptDirective = `CRITICAL LANGUAGE DIRECTIVE: Since the target audience is Global/Internasional, the ENTIRE script (title, hookDescription, pacingStyle, visualInstructions, voiceOver, and audioVibe) MUST be written completely in English. Do NOT use Indonesian under any circumstances, even if other inputs (like topic or genre) are written in Indonesian. Translate any Indonesian ideas/concepts to English within the script.`;
      } else {
        languageScriptDirective = `If the target audience, topic, or genre contains Indonesian text or implies an Indonesian setting/demographic, write completely in engaging, natural Indonesian (Bahasa Indonesia) with casual/conversational/trendy slang. The voiceOver must feel emotional, highly relatable, natural, and start with an incredibly strong emotional hook. Otherwise, write completely in high-retention, modern engaging English with visual emphasis.`;
      }

      const prompt = `You are an expert viral content strategist and screenwriter specializing in YouTube Shorts, TikTok, and Instagram Reels.
Create a highly engaging, high-retention video short screenplay (target duration: exactly ${finalDuration} seconds) based on:
- Topic: "${topic}"
- Genre: "${finalGenre}"
- Target Audience: ${targetAudience}

The script MUST be timed for a total of exactly ${finalDuration} seconds. Organize your timeline and pacing of voiceover to match this timing.
${comedyFormattingDirective}

CRITICAL LOCK NARRATOR VOICE & CHARACTER CONSISTENCY:
- Lock the narrator/speaker's tone, perspective, pacing, and speech style across all scenes. The voiceover (VO) MUST flow seamlessly as if spoken by a single, identical voice actor/persona with consistent vocabulary, attitude, and emotional depth.
- If a main character, speaker, or subject is featured visually in the scenes, you must establish their specific physical look (e.g. hair color/style, clothing, facial features, age, gender) in the "visualInstructions" of Scene 1, and strictly reuse and carry forward those exact same details in every subsequent scene to keep the character fully consistent across scenes.

CRITICAL TIMING RULE:
Each scene MUST correspond to exactly a 10-second segment (or 7.5 seconds if duration is 15 seconds) to make it easy for generative video models.
For example, if duration is 30 seconds, there must be EXACTLY 3 scenes:
- Scene 1: "0-10 DETIK"
- Scene 2: "10-20 DETIK"
- Scene 3: "20-30 DETIK"
If duration is 60 seconds, there must be EXACTLY 6 scenes:
- Scene 1: "0-10 DETIK"
- Scene 2: "10-20 DETIK"
...
- Scene 6: "50-60 DETIK"
If duration is 15 seconds, there must be EXACTLY 2 scenes:
- Scene 1: "0-7 DETIK"
- Scene 2: "7-15 DETIK"

CRITICAL VO WORD LIMIT (15-22 WORDS PER 10 SECONDS SCENE):
- To ensure the voiceover (VO) fits perfectly and does not get cut off or feel rushed, each 10-second scene's "voiceOver" text MUST contain EXACTLY 15 to 22 words.
- For 7.5-second scenes, each scene's "voiceOver" text MUST contain EXACTLY 11 to 16 words.
- DO NOT generate long paragraphs. If the VO is too long, the reader will not be able to speak it naturally within the scene's timeframe. Keep it short, concise, and dynamic!
- Ensure that the reading pace is natural and comfortable (around 1.5 to 2 words per second).

Language and Tone Guidelines:
${languageScriptDirective}

Structure your screenplay logically and return a single valid JSON object. The object MUST have:
1. "title": A striking, catchy title.
2. "hookDescription": A short analysis of how this script hooks the user in the first 3 seconds.
3. "pacingStyle": The recommended speed of cuts and visual presentation (e.g., "Fast-paced, split-screen action", "Atmospheric with slow zooms").
4. "scenes": An array of chronological scenes. Each scene object must have:
   - "sceneNumber": number (1, 2, 3...)
   - "timeRange": string (MUST be formatted exactly like "0-10 DETIK", "10-20 DETIK", etc., based on the CRITICAL TIMING RULE above)
   - "visualInstructions": string (detailed description of what appears on screen, b-roll directions, camera movements, text overlays/captions on screen)
   - "voiceOver": string (what the narrator or speaker says out loud. Keep it punchy, rhythmic, and perfectly timed for the duration - REMEMBER THE STRICT 15-22 WORD LIMIT PER 10s SCENE OR 11-16 WORDS PER 7.5s SCENE)
   - "audioVibe": string (background music genre, sound effects [SFX], atmospheric audio cues)

Do NOT wrap the JSON in markdown backticks \`\`\`json. Return only the raw JSON string.`;

      const responseText = await generateAiContent(prompt, {
        apiKey: reqApiKey,
        channel: reqApiChannel,
        modelId: reqApiModel,
        responseMimeType: "application/json",
        temperature: 0.8
      });
      res.json(robustParseJson(responseText));
    } catch (error: any) {
      console.error("Error generating script:", error);
      res.status(500).json({ 
        error: error.message || "Failed to generate script",
        needsApiKey: !process.env.GEMINI_API_KEY
      });
    }
  });

  // API: Generate Image Prompts (Midjourney/Stable Diffusion) based on script scenes and selected style
  app.post("/api/generate/image-prompts", async (req, res) => {
    try {
      const reqApiKey = req.headers["x-api-key"] as string | undefined;
      const reqApiChannel = req.headers["x-api-channel"] as string | undefined;
      const reqApiModel = req.headers["x-api-model"] as string | undefined;

      const { scenes, visualStyle, customVisualStyle, visualStyleKeyword } = req.body;

      const selectedStyleName = visualStyle === "Gaya Kustom" ? (customVisualStyle || "Gaya Kustom") : visualStyle;
      const selectedStyleDetails = visualStyleKeyword ? `${selectedStyleName} (${visualStyleKeyword})` : selectedStyleName;

      const prompt = `You are a professional AI generative artist specializing in crafting high-quality art direction.
Based on the following video short scenes, generate a highly optimized visual prompt for AI image generator models (like Midjourney, Stable Diffusion, or DALL-E) for EACH scene.

The exact artistic style requested is: "${selectedStyleDetails}".

Scenes data:
${JSON.stringify(scenes, null, 2)}

CRITICAL CHARACTER & STYLE CONSISTENCY RULE:
- If there is a main character, subject, or visible person in the scenes, you MUST explicitly define their exact physical appearance (gender, age, hair style, hair color, clothing type & color, specific face details, expression style) in the first scene prompt, and then STICK to that exact same description across ALL other scene prompts.
- Do NOT use generic terms like "a person" or "a character" in subsequent scenes. Instead, repeat their locked descriptors (e.g. "a 30-year-old female explorer with braided silver hair, wearing a dark green canvas jacket"). This ensures image generators produce the exact same identical character across every single scene.
- Ensure the background setting, color temperature, and atmospheric vibe are also consistent or flow logically from scene to scene.

For each scene in the list, write a professional prompt. A high-quality visual prompt must include the central subject, clothing/features, setting, dramatic lighting, camera lens/depth of field, atmospheric texture, and artistic rendering cues.
Ensure the prompts are optimized to capture the exact vibe and technical definitions of the style: "${selectedStyleDetails}". Do not default to generic look and feel. Match the stylistic details exactly.

Return a JSON array of objects. Each object must have:
- "sceneNumber": number (corresponding to the scene)
- "optimizedPrompt": string (the rich, English visual prompt. AI generator prompts should always be in English for the best results, and must contain the locked character/subject/style details)
- "aspectRatioTip": string (aspect ratio recommendation, e.g. "Use --ar 9:16 for full vertical format")

Return ONLY the raw JSON string, no markdown backticks.`;

      const responseText = await generateAiContent(prompt, {
        apiKey: reqApiKey,
        channel: reqApiChannel,
        modelId: reqApiModel,
        responseMimeType: "application/json",
        temperature: 0.75
      });
      const parsed = robustParseJson(responseText);
      if (Array.isArray(parsed)) {
        return res.json(parsed);
      } else if (parsed && typeof parsed === "object") {
        const arrayProp = parsed.imagePrompts || parsed.prompts || parsed.data || parsed.scenes || parsed.items || Object.values(parsed).find((v: any) => Array.isArray(v));
        if (arrayProp && Array.isArray(arrayProp)) {
          return res.json(arrayProp);
        }
        return res.json([parsed]);
      }
      return res.json(parsed);
    } catch (error: any) {
      console.error("Error generating image prompts:", error);
      res.status(500).json({ 
        error: error.message || "Failed to generate image prompts",
        needsApiKey: !process.env.GEMINI_API_KEY
      });
    }
  });

  // API: Generate Video Prompts (Runway Gen-3/Luma Dream Machine/Sora) based on script scenes and image prompts
  app.post("/api/generate/video-prompts", async (req, res) => {
    try {
      const authHeader = req.headers["authorization"];
      let loggedInUserId = null;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        const decoded = parseToken(token);
        if (decoded && decoded.id) {
          loggedInUserId = decoded.id;
        }
      }

      if (loggedInUserId) {
        const users = await loadUsers();
        const userIndex = users.findIndex((u: any) => u.id === loggedInUserId);
        if (userIndex !== -1) {
          const user = users[userIndex];
          // Check if self-registered user (has expiresAt) and not admin
          if (user.expiresAt && user.role !== "admin") {
            // First refresh credits if needed
            refreshUserCreditsIfNeeded(user);
            
            const currentCredits = user.credits ?? 30;
            if (currentCredits < 10) {
              return res.status(403).json({ success: false, error: "Credit tidak cukup. Akun mandiri Anda memiliki sisa " + currentCredits + " credit. 1 kali generate vidio prompt membutuhkan 10 credit. Akun mandiri hanya memiliki 3 kali kesempatan (30 credit) per pendaftaran." });
            }
            // Deduct credits
            users[userIndex].credits = currentCredits - 10;
            await saveUsers(users);
          }
        }
      }

      const reqApiKey = req.headers["x-api-key"] as string | undefined;
      const reqApiChannel = req.headers["x-api-channel"] as string | undefined;
      const reqApiModel = req.headers["x-api-model"] as string | undefined;

      const { scenes, imagePrompts, visualStyle, customVisualStyle, visualStyleKeyword } = req.body;

      const selectedStyle = visualStyle === "Gaya Kustom" ? (customVisualStyle || "Gaya Kustom") : (visualStyle || "Cinematic Realistic");
      const selectedStyleDetails = visualStyleKeyword ? `${selectedStyle} (${visualStyleKeyword})` : selectedStyle;

      const prompt = `You are an AI Cinematographer specializing in generative AI video models (such as Runway Gen-3, Luma Dream Machine, OpenAI Sora, Kling AI, Gemini Veo).
Generate a highly detailed, professional, and fully structured final video production scene bundle for each scene.

The selected artistic visual style requested by the user is: "${selectedStyleDetails}".
YOU MUST ENSURE the video "Prompt Visual (Google Gemini Veo)" and "Style Tag" sections STRICTLY match and represent this exact artistic style. Do not default to generic real-world/photorealistic styles if they chose something else (e.g., if they chose Ghibli, claymation, Disney, modern anime, or 3D render, write descriptions that are deeply nested in that specific stylized aesthetic).

The scenes data is:
${JSON.stringify(scenes, null, 2)}
Image Prompts reference (if any, use as visual inspiration): ${JSON.stringify(imagePrompts, null, 2)}

For each scene, you MUST return a single string for "motionPrompt" formatted EXACTLY according to the plaintext layout shown in the template below. Keep the sections, empty lines, and labels perfectly consistent.

TEMPLATE FOR "motionPrompt" (Return EXACTLY this layout inside the "motionPrompt" field):
SCENE [sceneNumber] — [SCENE_THEME_OR_HOOK_TYPE_UPPERCASE] ([START_TIME–END_TIME_FORMATTED_LIKE_00:00-00:10])

Prompt Visual (Google Gemini Veo)
[Write a premium, highly-detailed English visual video generation prompt that describes the artistic style "${selectedStyleDetails}", background environment, main characters, camera lens/settings, and cinematic quality. Make it extremely descriptive and perfectly matched to the style "${selectedStyleDetails}".]

Sequence
0–2 Seconds
[Punchy descriptive action line 1 describing subject action or macro b-roll shot]
[Punchy descriptive action line 2]
[Optional uppercase sound or text emphasis line, e.g. 'CLINK! CLINK! CLINK!']
[Punchy descriptive action line 3]

2–4 Seconds
[Punchy descriptive action line 1]
[Punchy descriptive action line 2]

4–6 Seconds
[Punchy descriptive action line 1]
[Punchy descriptive action line 2]

6–8 Seconds
[Punchy descriptive action line 1]
[Punchy descriptive action line 2]

8–10 Seconds
[Punchy descriptive action line 1]
[Punchy descriptive action line 2]
[Descriptive visual transition cue, e.g. 'Fade into Scene [NextSceneNumber].']

Voice Over
'[The exact voiceOver text of this scene in natural, emotional Indonesian or original language]'

Sound Design
- [Specific sound effect cue 1]
- [Specific sound effect cue 2]
- [Specific sound effect cue 3]
- [Specific background music genre or atmosphere, e.g. 'Soft cinematic mystery beat']

Style Tag
[A rich list of 15+ descriptive style tags, camera parameters, and keywords relevant to the visual theme and the chosen style "${selectedStyleDetails}", e.g., 'Premium stylized aesthetic, 8K cinematic, Gemini Veo optimized, and style-specific terms matching ${selectedStyleDetails}.']

CRITICAL STRUCTURAL INSTRUCTIONS:
1. The "motionPrompt" value for each scene MUST be a single string containing the exact layout shown above, including all headings like "Prompt Visual (Google Gemini Veo)", "Sequence", "Voice Over", "Sound Design", and "Style Tag". Use standard line breaks (\n) to separate sections.
2. Align the "Prompt Visual" style and "Style Tag" with the user's chosen visual style: "${selectedStyleDetails}". If the script is Indonesian, use Indonesian themes/vendors/settings inside the visual description.
3. Divide the scene's 10-second duration into five distinct 2-second sub-sequences: "0–2 Seconds", "2–4 Seconds", "4–6 Seconds", "6–8 Seconds", and "8–10 Seconds". For each sub-sequence, write 2 to 4 vivid, detailed visual action steps.
4. The "Voice Over" section must display the exact voiceover text from the screenplay scene enclosed in single quotes (e.g. 'text'). Do NOT use raw double quotes (") inside the motionPrompt string.
5. The "Sound Design" section must contain 5 to 10 specific audio effects and background music details in bullet points (using "- ").
6. The "Style Tag" section must contain a rich set of 15+ comma-separated descriptive tags relevant to the chosen visual style "${selectedStyleDetails}", camera work, composition, and video models.
7. JSON VALIDITY: Since "motionPrompt" is a JSON string property, you MUST NEVER write raw unescaped double-quotes (") inside its text. Any quotes, speech, sound effects, or emphasized texts MUST use single quotes (') instead. This is extremely critical to ensure JSON parsing does not fail.
8. CHARACTER & STYLE CONSISTENCY: Keep character descriptions and physical appearance elements fully consistent and locked across all scenes. Use the exact same set of visual keywords and features (hair color/style, clothing details, gender, age, facial features) to refer to any character so that the video/image generative model will interpret them as the same person in every 10-second scene.

Return a JSON array of objects. Each object must have EXACTLY these keys:
- "sceneNumber": number (e.g., 1, 2, 3)
- "motionPrompt": string (the complete, structured plaintext matching the template above)
- "runwaySettings": string (specifically suggested camera/motion settings, e.g., "Motion: 6, Camera: Orbit Right, Speed: 1.0")

Return ONLY the raw JSON string, no markdown backticks.`;

      const responseText = await generateAiContent(prompt, {
        apiKey: reqApiKey,
        channel: reqApiChannel,
        modelId: reqApiModel,
        responseMimeType: "application/json",
        temperature: 0.75
      });
      const parsed = robustParseJson(responseText);
      if (Array.isArray(parsed)) {
        return res.json(parsed);
      } else if (parsed && typeof parsed === "object") {
        const arrayProp = parsed.videoPrompts || parsed.prompts || parsed.data || parsed.scenes || parsed.items || Object.values(parsed).find((v: any) => Array.isArray(v));
        if (arrayProp && Array.isArray(arrayProp)) {
          return res.json(arrayProp);
        }
        return res.json([parsed]);
      }
      return res.json(parsed);
    } catch (error: any) {
      console.error("Error generating video prompts:", error);
      res.status(500).json({ 
        error: error.message || "Failed to generate video prompts",
        needsApiKey: !process.env.GEMINI_API_KEY
      });
    }
  });

  // Serve Vite or static assets depending on environment
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  return app;
}

// Start the server if not running in a serverless environment (like Netlify)
if (process.env.NODE_ENV !== "test" && !process.env.NETLIFY) {
  createServerApp().then((app) => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[Adin Story Engine] Server active at http://0.0.0.0:${PORT}`);
    });
  });
}
