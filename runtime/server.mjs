// standalone/server.ts
import { createServer } from "node:http";
import { createReadStream as createReadStream2 } from "node:fs";
import { stat } from "node:fs/promises";
import { hostname as hostname2, homedir } from "node:os";
import { resolve as resolve3, extname, sep as sep2, dirname as dirname2 } from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
import { Readable as Readable2 } from "node:stream";
import { pipeline as pipeline2 } from "node:stream/promises";

// standalone/storage.ts
import { DatabaseSync } from "node:sqlite";
import { mkdir, readFile, readdir, rename, writeFile, unlink } from "node:fs/promises";
import { resolve, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
var Prepared = class _Prepared {
  constructor(db, sql, args = []) {
    this.db = db;
    this.sql = sql;
    this.args = args;
  }
  db;
  sql;
  args;
  bind(...args) {
    return new _Prepared(this.db, this.sql, args);
  }
  async first() {
    return this.db.prepare(this.sql).get(...this.args) ?? null;
  }
  async all() {
    return { results: this.db.prepare(this.sql).all(...this.args), success: true };
  }
  execute() {
    const result = this.db.prepare(this.sql).run(...this.args);
    return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
  }
  async run() {
    return this.execute();
  }
};
async function openStorage(dataDir) {
  await mkdir(dataDir, { recursive: true, mode: 448 });
  const db = new DatabaseSync(resolve(dataDir, "aquarium.sqlite"));
  const migrations = resolve(dirname(fileURLToPath(import.meta.url)), "../drizzle");
  const files = (await readdir(migrations)).filter((f) => f.endsWith(".sql")).sort();
  const version = Number(db.prepare("PRAGMA user_version").get().user_version);
  if (version < 0 || version > files.length) {
    db.close();
    throw new Error(`Saved data version ${version} is not supported by this copy of Aquarium. Keep your data folder and use the app version that created it or a newer compatible release.`);
  }
  db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
  for (let i = version; i < files.length; i++) {
    const sql = await readFile(resolve(migrations, files[i]), "utf8");
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(sql);
      db.exec(`PRAGMA user_version=${i + 1}; COMMIT`);
    } catch (e) {
      db.exec("ROLLBACK");
      db.close();
      throw e;
    }
  }
  const DB = { prepare: (sql) => new Prepared(db, sql), batch: async (statements) => {
    db.exec("BEGIN IMMEDIATE");
    try {
      const results = statements.map((s) => s.execute());
      db.exec("COMMIT");
      return results;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  } };
  const root = resolve(dataDir, "objects");
  await mkdir(root, { recursive: true, mode: 448 });
  function path(key) {
    const target = resolve(root, key);
    if (!target.startsWith(root + sep)) throw new Error("Invalid object key");
    return target;
  }
  const BUCKET = { put: async (key, bytes) => {
    const target = path(key);
    await mkdir(dirname(target), { recursive: true, mode: 448 });
    const tmp = target + "." + crypto.randomUUID() + ".tmp";
    try {
      await writeFile(tmp, bytes, { mode: 384, flag: "wx" });
      await rename(tmp, target);
    } finally {
      await unlink(tmp).catch(() => {
      });
    }
  }, get: async (key) => {
    try {
      return { body: new Uint8Array(await readFile(path(key))) };
    } catch (e) {
      if (e.code === "ENOENT") return null;
      throw e;
    }
  }, delete: async (key) => {
    await unlink(path(key)).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
  } };
  return { DB, BUCKET, close: () => db.close() };
}

// standalone/network.ts
import { isIP } from "node:net";
import { networkInterfaces, hostname } from "node:os";
function allowedHost(raw, ownName = hostname(), extra = (process.env.AQUARIUM_ALLOWED_HOSTS || "").split(",")) {
  let host;
  try {
    host = new URL("http://" + raw).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (host === "localhost" || host === "[::1]" || host === ownName.toLowerCase() || extra.some((v) => v.trim().toLowerCase() === host)) return true;
  if (isIP(host) !== 4) return false;
  const p = host.split(".").map(Number);
  return p[0] === 127 || p[0] === 10 || p[0] === 192 && p[1] === 168 || p[0] === 172 && p[1] >= 16 && p[1] <= 31;
}
function lanOrigins(port, discover = networkInterfaces) {
  let interfaces;
  try {
    interfaces = discover();
  } catch {
    return [];
  }
  const ips = Object.values(interfaces).flatMap((list) => list || []).filter((info) => info.family === "IPv4" && !info.internal && allowedHost(info.address)).map((info) => `http://${info.address}:${port}`);
  return [...new Set(ips)];
}

// standalone/video.ts
import { mkdir as mkdir2, readFile as readFile2, writeFile as writeFile2, rename as rename2, unlink as unlink2 } from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { resolve as resolve2 } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

// server/fish-png.ts
function fishPngCrc(bytes) {
  let c = 4294967295;
  for (const b of bytes) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = c >>> 1 ^ 3988292384 & -(c & 1);
  }
  return (c ^ 4294967295) >>> 0;
}
var FISH_MAX_BYTES = 3 * 1024 * 1024;
var FishPngError = class extends Error {
};
async function readFishPng(request) {
  if (request.headers.get("content-type")?.split(";")[0] !== "image/png" || !request.body) throw new FishPngError("Send a transparent PNG.");
  const reader = request.body.getReader();
  let total = 0;
  const chunks = [];
  let timer;
  try {
    await Promise.race([(async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > FISH_MAX_BYTES) {
          void reader.cancel();
          throw new FishPngError("Fish image exceeds 3 MiB.");
        }
        chunks.push(value);
      }
    })(), new Promise((_, reject) => {
      timer = setTimeout(() => {
        void reader.cancel();
        reject(new FishPngError("Upload timed out. Retry your fish."));
      }, 1e4);
    })]);
  } finally {
    if (timer) clearTimeout(timer);
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  return { bytes, ...await validateFishPng(bytes) };
}
async function validateFishPng(bytes) {
  const fail = () => {
    throw new FishPngError("Use a complete transparent RGBA PNG, at most 1024 \xD7 768.");
  };
  if (bytes.length < 45 || bytes.length > FISH_MAX_BYTES || [137, 80, 78, 71, 13, 10, 26, 10].some((n, i) => bytes[i] !== n)) return fail();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16), height = view.getUint32(20);
  if (view.getUint32(8) !== 13 || String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR" || !width || width > 1024 || !height || height > 768 || bytes[24] !== 8 || bytes[25] !== 6 || bytes[26] !== 0 || bytes[27] !== 0 || bytes[28] !== 0) return fail();
  let offset = 8, complete = false, seenData = false, dataEnded = false;
  const data = [];
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset), end = offset + length + 12;
    if (end > bytes.length) return fail();
    const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    if (fishPngCrc(bytes.subarray(offset + 4, end - 4)) !== view.getUint32(end - 4)) return fail();
    if (type === "IDAT") {
      if (dataEnded) return fail();
      seenData = true;
      data.push(bytes.slice(offset + 8, end - 4));
    } else if (seenData) dataEnded = true;
    if (!["IHDR", "IDAT", "IEND"].includes(type) && type[0] === type[0].toUpperCase()) return fail();
    if (type === "IEND") {
      complete = length === 0 && end === bytes.length;
      break;
    }
    if (type === "acTL" || type === "IHDR" && offset !== 8) return fail();
    offset = end;
  }
  if (!complete || !data.length) return fail();
  const packed = new Uint8Array(data.reduce((n, a) => n + a.length, 0));
  offset = 0;
  for (const a of data) {
    packed.set(a, offset);
    offset += a.length;
  }
  const stream = new Blob([packed]).stream().pipeThrough(new DecompressionStream("deflate"));
  const reader = stream.getReader();
  const expected = (width * 4 + 1) * height;
  const decoded = new Uint8Array(expected);
  let read = 0;
  try {
    while (true) {
      const x = await reader.read();
      if (x.done) break;
      if (read + x.value.length > expected) {
        await reader.cancel();
        return fail();
      }
      decoded.set(x.value, read);
      read += x.value.length;
    }
  } catch {
    return fail();
  } finally {
    reader.releaseLock();
  }
  if (read !== expected) return fail();
  const stride = width * 4;
  let previous = new Uint8Array(stride);
  let visible = false, transparent = false, minX = width, minY = height, maxX = 0, maxY = 0;
  for (let y = 0; y < height; y++) {
    const start = y * (stride + 1), filter = decoded[start];
    if (filter > 4) return fail();
    const row = decoded.slice(start + 1, start + 1 + stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? row[x - 4] : 0, b = previous[x], c = x >= 4 ? previous[x - 4] : 0;
      let p = 0;
      if (filter === 1) p = a;
      else if (filter === 2) p = b;
      else if (filter === 3) p = Math.floor((a + b) / 2);
      else if (filter === 4) {
        const t = a + b - c, pa = Math.abs(t - a), pb = Math.abs(t - b), pc = Math.abs(t - c);
        p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      row[x] = row[x] + p & 255;
      if (x % 4 === 3) {
        visible ||= row[x] > 0;
        transparent ||= row[x] === 0;
        if (row[x] > 0) {
          const px = (x - 3) / 4;
          minX = Math.min(minX, px);
          maxX = Math.max(maxX, px);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
    previous = row;
  }
  if (!visible || !transparent) throw new FishPngError("Keep the water transparent and add some fish artwork.");
  return { width, height, bounds: { x: minX / width, y: minY / height, width: (maxX - minX + 1) / width, height: (maxY - minY + 1) / height } };
}

// server/aquarium.ts
var YEAR = 365 * 86400;
var limits = { active: 40, saved: 500, perPerson: 20 };
var ApiError = class extends Error {
  status;
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
function json(value, status = 200, cookie) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...cookie ? { "set-cookie": cookie } : {} } });
}
var random = () => crypto.randomUUID().replaceAll("-", "");
async function hash(s) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))), (b) => b.toString(16).padStart(2, "0")).join("");
}
var cookieName = (code) => `aquarium_${code}`;
var stmt = (db, sql, ...args) => db.prepare(sql).bind(...args);
async function body(req) {
  const text = await boundedText(req, 4096);
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("object required");
    return value;
  } catch {
    throw new ApiError(400, "Send a valid JSON object.");
  }
}
async function boundedText(req, max) {
  if (!req.body) throw new ApiError(400, "Missing request body.");
  const r = req.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await r.read();
      if (done) break;
      size += value.length;
      if (size > max) {
        void r.cancel();
        throw new ApiError(413, "Request too large.");
      }
      chunks.push(value);
    }
  } finally {
    r.releaseLock();
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    all.set(c, offset);
    offset += c.length;
  }
  return new TextDecoder().decode(all);
}
function name(v, fallback, max = 60) {
  if (typeof v !== "string") return fallback;
  return v.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max) || fallback;
}
async function rate(db, key, max, seconds) {
  const now = Date.now();
  const row = await stmt(db, `INSERT INTO rates(key,count,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<=? THEN 1 ELSE count+1 END, reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END RETURNING count`, key, now + seconds * 1e3, now, now).first();
  if (!row || row.count > max) throw new ApiError(429, "Too many attempts. Please wait a few minutes and try again.");
}
async function session(db, req, code) {
  const raw = req.headers.get("cookie")?.split(";").map((x) => x.trim()).find((x) => x.startsWith(cookieName(code) + "="))?.slice(cookieName(code).length + 1);
  if (!raw) return null;
  return stmt(db, "SELECT person,name,role FROM sessions WHERE token_hash=? AND room=? AND expires>?", await hash(raw), code, Date.now()).first();
}
async function newSession(db, req, code, role, personName) {
  const token = random() + random();
  await stmt(db, "INSERT INTO sessions(token_hash,room,person,name,role,expires) VALUES (?,?,?,?,?,?)", await hash(token), code, random(), personName, role, Date.now() + YEAR * 1e3).run();
  return `${cookieName(code)}=${token}; Path=/api/aquariums/${code}; HttpOnly; SameSite=Strict; Max-Age=${YEAR}${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`;
}
function fishView(f, code, s) {
  return { id: f.id, name: f.name, creator: f.creator, imageUrl: `/api/aquariums/${code}/media/${f.id}`, createdAt: f.created_at, active: !!f.active, owned: f.person === s.person, bounds: JSON.parse(f.bounds) };
}
async function state(db, room, s) {
  const rows = await stmt(db, `SELECT * FROM fish WHERE room=? ${s.role === "host" ? "" : "AND (active=1 OR person=?)"} ORDER BY created_at DESC`, ...s.role === "host" ? [room.code] : [room.code, s.person]).all();
  const count = await stmt(db, "SELECT COUNT(*) AS saved,SUM(active) AS active FROM fish WHERE room=?", room.code).first();
  return { code: room.code, title: room.title, accepting: !!room.accepting, role: s.role, participantName: s.role === "participant" ? s.name : null, fish: rows.results.map((f) => fishView(f, room.code, s)), activeCount: count?.active || 0, savedCount: s.role === "host" ? count?.saved || 0 : rows.results.filter((f) => f.person === s.person).length, limits, updatedAt: room.updated_at };
}
async function aquariumRequest(req, env) {
  try {
    const db = env.DB, bucket = env.BUCKET;
    if (!db || !bucket) throw new ApiError(503, "Aquarium storage is not available yet.");
    const url = new URL(req.url), parts = url.pathname.replace(/^\/api\/aquariums\/?/, "").split("/").filter(Boolean);
    const code = (parts[0] || "").toUpperCase(), action = parts[1];
    if (req.method !== "GET" && req.method !== "POST") throw new ApiError(405, "Method not allowed.");
    if (req.method === "POST") {
      const origin = req.headers.get("origin");
      if (origin !== url.origin) throw new ApiError(403, "Open this aquarium directly before making changes.");
    }
    const ip = await hash(req.headers.get("cf-connecting-ip") || "local");
    if (!code && req.method === "POST") {
      await rate(db, "create:" + ip, 10, 3600);
      const input = await body(req);
      const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let newCode = "";
      for (const b of crypto.getRandomValues(new Uint8Array(6))) newCode += alphabet[b % alphabet.length];
      const recoveryKey = random() + random();
      await stmt(db, "INSERT INTO rooms(code,title,recovery_hash,accepting,updated_at) VALUES (?,?,?,1,?)", newCode, name(input.title, "The Work Aquarium", 80), await hash(recoveryKey), Date.now()).run();
      const cookie = await newSession(db, req, newCode, "host", "Host");
      return json({ code: newCode, recoveryKey }, 201, cookie);
    }
    if (!/^[A-Z2-9]{6}$/.test(code)) throw new ApiError(404, "Aquarium not found.");
    const room = await stmt(db, "SELECT * FROM rooms WHERE code=?", code).first();
    if (!room) throw new ApiError(404, "Aquarium not found.");
    let s = await session(db, req, code);
    if (req.method === "GET" && !action) return json(s ? await state(db, room, s) : { code, title: room.title, accepting: !!room.accepting, role: null });
    if (req.method === "POST" && action === "recover") {
      await rate(db, "recover-ip:" + ip, 20, 900);
      await rate(db, "recover-room:" + code, 60, 900);
      const input = await body(req);
      if (typeof input.recoveryKey !== "string" || input.recoveryKey.length > 128 || await hash(input.recoveryKey) !== room.recovery_hash) throw new ApiError(403, "Recovery key does not match.");
      return json({ code }, 200, await newSession(db, req, code, "host", "Host"));
    }
    if (req.method === "POST" && action === "join") {
      if (s) return json(await state(db, room, s));
      if (!room.accepting) throw new ApiError(409, "This aquarium is resting. Ask the host to start a new shift.");
      await rate(db, "join:" + ip + ":" + code, 40, 3600);
      const input = await body(req);
      const cookie = await newSession(db, req, code, "participant", name(input.name, "Guest", 40));
      const request = new Request(req.url, { headers: { cookie: cookie.split(";")[0] } });
      s = await session(db, request, code);
      return json(await state(db, room, s), 200, cookie);
    }
    if (!s) throw new ApiError(403, "Join this aquarium first.");
    if (req.method === "GET" && action === "media") {
      const f = await stmt(db, "SELECT * FROM fish WHERE room=? AND id=?", code, parts[2] || "").first();
      if (!f || s.role !== "host" && !f.active && f.person !== s.person) throw new ApiError(404, "Fish not found.");
      const object = await bucket.get(f.object_key);
      if (!object) throw new ApiError(404, "Fish image not found.");
      return new Response(object.body, { headers: { "content-type": "image/png", "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
    }
    if (req.method === "POST" && action === "control") {
      if (s.role !== "host") throw new ApiError(403, "Only the host can control this aquarium.");
      const input = await body(req);
      if (!["set-active", "end", "start"].includes(String(input.action))) throw new ApiError(400, "Unknown aquarium action.");
      const statements = [];
      if (input.action === "set-active") {
        if (!Array.isArray(input.ids) || input.ids.length > 40 || input.ids.some((id) => typeof id !== "string" || !/^[a-f0-9]{32}$/.test(id)) || new Set(input.ids).size !== input.ids.length) throw new ApiError(400, "Choose up to 40 saved fish.");
        const ids = input.ids;
        if (ids.length) {
          const found = await stmt(db, `SELECT COUNT(*) AS n FROM fish WHERE room=? AND id IN (${ids.map(() => "?").join(",")})`, code, ...ids).first();
          if (found?.n !== ids.length) throw new ApiError(400, "Choose fish saved in this aquarium.");
        }
        statements.push(stmt(db, `UPDATE fish SET active=CASE WHEN id IN (${ids.length ? ids.map(() => "?").join(",") : "''"}) THEN 1 ELSE 0 END WHERE room=?`, ...ids, code));
      }
      if (input.action === "end") statements.push(stmt(db, "UPDATE fish SET active=0 WHERE room=?", code));
      statements.push(stmt(db, `UPDATE rooms SET updated_at=?${input.action === "end" ? ",accepting=0" : input.action === "start" ? ",accepting=1" : ""} WHERE code=?`, Date.now(), code));
      await db.batch(statements);
      const fresh = await stmt(db, "SELECT * FROM rooms WHERE code=?", code).first();
      return json(await state(db, fresh, s));
    }
    if (req.method === "POST" && action === "fish") {
      const actionId = req.headers.get("x-action-id") || "";
      if (!/^[a-zA-Z0-9_-]{8,100}$/.test(actionId)) throw new ApiError(400, "A valid submission ID is required.");
      const previous = () => stmt(db, "SELECT * FROM fish WHERE room=? AND person=? AND action_id=?", code, s.person, actionId).first();
      const duplicate = await previous();
      if (duplicate) return json({ fishId: duplicate.id, active: !!duplicate.active });
      if (!room.accepting) throw new ApiError(409, "This shift has ended. Your drawing is still on this device.");
      await rate(db, "upload:" + code + ":" + s.person, 30, 3600);
      const png = await readFishPng(req);
      let rawName = req.headers.get("x-fish-name") || "";
      try {
        rawName = decodeURIComponent(rawName);
      } catch {
        throw new ApiError(400, "Fish name is not valid.");
      }
      const id = random(), objectKey = `fish/${code}/${id}.png`;
      await bucket.put(objectKey, png.bytes, { httpMetadata: { contentType: "image/png" } });
      try {
        await stmt(db, `INSERT OR IGNORE INTO fish(id,room,person,creator,name,object_key,bounds,created_at,active,action_id) SELECT ?,?,?,?,?,?,?,?,CASE WHEN (SELECT COUNT(*) FROM fish WHERE room=? AND active=1)<40 THEN 1 ELSE 0 END,? WHERE (SELECT accepting FROM rooms WHERE code=?)=1 AND (SELECT COUNT(*) FROM fish WHERE room=?)<500 AND (SELECT COUNT(*) FROM fish WHERE room=? AND person=?)<20`, id, code, s.person, s.name, name(rawName, "New fish"), objectKey, JSON.stringify(png.bounds), Date.now(), code, actionId, code, code, code, s.person).run();
      } catch (e) {
        await bucket.delete(objectKey);
        throw e;
      }
      const accepted = await previous();
      if (!accepted || accepted.id !== id) await bucket.delete(objectKey);
      if (!accepted) {
        const fresh = await stmt(db, "SELECT accepting FROM rooms WHERE code=?", code).first();
        throw new ApiError(409, fresh?.accepting ? "Saved fish limit reached (500 per aquarium, 20 per person). Your drawing is still on this device." : "This shift has ended. Your drawing is still on this device.");
      }
      await stmt(db, "UPDATE rooms SET updated_at=? WHERE code=?", Date.now(), code).run();
      return json({ fishId: accepted.id, active: !!accepted.active, ...!accepted.active ? { message: "Saved safely. The aquarium has 40 active fish; the host can add yours later." } : {} }, accepted.id === id ? 201 : 200);
    }
    throw new ApiError(404, "Not found.");
  } catch (e) {
    if (e instanceof ApiError) return json({ error: e.message }, e.status);
    if (e instanceof FishPngError) return json({ error: e.message }, 400);
    console.error("Aquarium API error", e);
    return json({ error: "Could not complete this request. Please retry." }, 500);
  }
}

// standalone/video.ts
function videoRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!m || !m[1] && !m[2] || size <= 0) return null;
  const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
  const end = m[1] ? m[2] ? Math.min(Number(m[2]), size - 1) : size - 1 : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start || !m[1] && Number(m[2]) === 0) return null;
  return { start, end };
}
var commits = /* @__PURE__ */ new Map();
async function commitBackdrop(key, operation) {
  const previous = commits.get(key) ?? Promise.resolve();
  let release;
  const current = new Promise((resolve4) => {
    release = resolve4;
  });
  commits.set(key, current);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (commits.get(key) === current) commits.delete(key);
  }
}
async function readMeta(path) {
  try {
    return JSON.parse(await readFile2(path, "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}
var response = (body2, status = 200) => new Response(JSON.stringify(body2), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
async function backdropRequest(req, code, env, dataDir) {
  const url = new URL(req.url);
  if (req.method === "POST" && req.headers.get("origin") !== url.origin) return response({ error: "Open this aquarium directly before making changes." }, 403);
  const auth = await aquariumRequest(new Request(`${url.origin}/api/aquariums/${code}`, { headers: { cookie: req.headers.get("cookie") || "" } }), env);
  const state2 = await auth.json();
  if (state2.role !== "host") return response({ error: "Only the host can manage the background video." }, 403);
  const dir = resolve2(dataDir, "backdrops", code);
  await mkdir2(dir, { recursive: true, mode: 448 });
  const metaPath = resolve2(dir, "current.json");
  const old = await readMeta(metaPath);
  const publicMeta = (m) => ({ name: m.name, size: m.size, type: m.type, url: `/api/aquariums/${code}/backdrop/video` });
  if (req.method === "GET" && url.pathname.endsWith("/backdrop")) return response(old ? publicMeta(old) : null);
  if (req.method === "GET" && url.pathname.endsWith("/backdrop/video")) {
    if (!old) return response({ error: "No saved background video." }, 404);
    const header = req.headers.get("range"), range = header ? videoRange(header, old.size) : null;
    if (header && !range) return new Response(null, { status: 416, headers: { "content-range": `bytes */${old.size}` } });
    const start = range?.start ?? 0, end = range?.end ?? old.size - 1;
    const stream = createReadStream(resolve2(dir, old.file), { start, end });
    return new Response(Readable.toWeb(stream), { status: range ? 206 : 200, headers: { "content-type": old.type, "content-length": String(end - start + 1), "accept-ranges": "bytes", "cache-control": "private, no-store", "x-content-type-options": "nosniff", ...range ? { "content-range": `bytes ${start}-${end}/${old.size}` } : {} } });
  }
  if (req.method !== "POST" || !url.pathname.endsWith("/backdrop")) return response({ error: "Method not allowed." }, 405);
  const type = req.headers.get("content-type")?.split(";")[0] || "";
  if (!/^video\/[a-zA-Z0-9.+-]+$/.test(type) || !req.body) return response({ error: "Choose a video file." }, 400);
  const max = 4 * 1024 ** 3;
  if (Number(req.headers.get("content-length")) > max) return response({ error: "Choose a video no larger than 4 GB." }, 413);
  let name2 = "Aquarium background";
  try {
    name2 = decodeURIComponent(req.headers.get("x-video-name") || name2).replace(/[\u0000-\u001f]/g, "").slice(0, 200);
  } catch {
    return response({ error: "Invalid video name." }, 400);
  }
  const id = crypto.randomUUID(), file = id + ".video", temp = resolve2(dir, id + ".upload"), target = resolve2(dir, file), metaTemp = resolve2(dir, id + ".json");
  let size = 0, committed = false;
  try {
    await pipeline(Readable.fromWeb(req.body), new Transform({ transform(chunk, _encoding, callback) {
      size += chunk.length;
      callback(size > max ? new Error("VIDEO_TOO_LARGE") : null, chunk);
    } }), createWriteStream(temp, { flags: "wx", mode: 384 }));
    if (size === 0) throw new Error("EMPTY_VIDEO");
    await rename2(temp, target);
    const meta = { name: name2, size, type, file };
    await writeFile2(metaTemp, JSON.stringify(meta), { mode: 384, flag: "wx" });
    await commitBackdrop(dir, async () => {
      const previous = await readMeta(metaPath);
      await rename2(metaTemp, metaPath);
      committed = true;
      if (previous) await unlink2(resolve2(dir, previous.file)).catch(() => {
      });
    });
    return response(publicMeta(meta), 201);
  } catch (e) {
    const reason = e.message;
    return response({ error: reason === "VIDEO_TOO_LARGE" ? "Choose a video no larger than 4 GB." : "This video could not be saved. Check free disk space and reload to check the saved backdrop before retrying." }, reason === "VIDEO_TOO_LARGE" ? 413 : 500);
  } finally {
    await unlink2(temp).catch(() => {
    });
    await unlink2(metaTemp).catch(() => {
    });
    if (!committed) await unlink2(target).catch(() => {
    });
  }
}

// standalone/server.ts
if (Number(process.versions.node.split(".")[0]) < 24) throw new Error("The Work Aquarium requires Node.js 24 or newer.");
async function createAquariumServer(options = {}) {
  const args = process.argv;
  const portIndex = args.indexOf("--port");
  const port = options.port ?? Number((portIndex >= 0 ? args[portIndex + 1] : void 0) || process.env.PORT || 4317);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be between 1 and 65535.");
  const dataDir = resolve3(options.dataDir || process.env.AQUARIUM_DATA_DIR || resolve3(homedir(), ".work-aquarium"));
  const staticRoot = options.staticDir ? resolve3(options.staticDir) : resolve3(dirname2(fileURLToPath2(import.meta.url)), "../dist-local");
  const storage = await openStorage(dataDir), env = storage;
  const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2" };
  const server = createServer(async (incoming, outgoing) => {
    try {
      const host = incoming.headers.host || "";
      if (!allowedHost(host, hostname2())) {
        outgoing.writeHead(403, { "content-type": "text/plain" });
        outgoing.end("Unrecognized host. Open the aquarium using this computer\u2019s localhost or private LAN address.");
        return;
      }
      const url = new URL(incoming.url || "/", `http://${host}`);
      const headers = new Headers();
      for (const [key, value] of Object.entries(incoming.headers)) {
        if (value) headers.set(key, Array.isArray(value) ? value.join(",") : value);
      }
      headers.set("cf-connecting-ip", incoming.socket.remoteAddress || "local");
      headers.delete("x-forwarded-host");
      headers.delete("x-forwarded-proto");
      headers.delete("forwarded");
      if (url.pathname.startsWith("/api/")) {
        let response2;
        if (url.pathname === "/api/network" && incoming.method === "GET") response2 = Response.json({ origins: lanOrigins(port), hostname: hostname2(), port }, { headers: { "cache-control": "no-store" } });
        else {
          const request = new Request(url, { method: incoming.method, headers, ...!["GET", "HEAD"].includes(incoming.method || "GET") ? { body: Readable2.toWeb(incoming), duplex: "half" } : {} });
          const video = /^\/api\/aquariums\/([A-Z2-9]{6})\/backdrop(?:\/video)?$/.exec(url.pathname);
          response2 = video ? await backdropRequest(request, video[1], env, dataDir) : await aquariumRequest(request, env);
        }
        outgoing.writeHead(response2.status, Object.fromEntries(response2.headers.entries()));
        if (response2.body) await pipeline2(Readable2.fromWeb(response2.body), outgoing);
        else outgoing.end();
        return;
      }
      if (!["GET", "HEAD"].includes(incoming.method || "")) {
        outgoing.writeHead(405);
        outgoing.end();
        return;
      }
      let path = resolve3(staticRoot, "." + decodeURIComponent(url.pathname));
      if (path !== staticRoot && !path.startsWith(staticRoot + sep2)) {
        outgoing.writeHead(403);
        outgoing.end();
        return;
      }
      let info = await stat(path).catch(() => null);
      if (!info?.isFile()) {
        if (extname(path)) {
          outgoing.writeHead(404);
          outgoing.end("File not found");
          return;
        }
        path = resolve3(staticRoot, "index.html");
        info = await stat(path).catch(() => null);
      }
      if (!info) {
        outgoing.writeHead(503, { "content-type": "text/plain" });
        outgoing.end("Build the aquarium first with npm run build:local.");
        return;
      }
      outgoing.writeHead(200, { "content-type": mime[extname(path)] || "application/octet-stream", "content-length": info.size, "x-content-type-options": "nosniff", "referrer-policy": "same-origin", "cache-control": "no-cache" });
      if (incoming.method === "HEAD") outgoing.end();
      else await pipeline2(createReadStream2(path), outgoing);
    } catch (e) {
      console.error("Local aquarium request failed", e);
      if (!outgoing.headersSent) outgoing.writeHead(500, { "content-type": "application/json" });
      outgoing.end(JSON.stringify({ error: "The request could not be completed." }));
    }
  });
  server.requestTimeout = 60 * 60 * 1e3;
  server.headersTimeout = 6e4;
  server.on("close", () => storage.close());
  return { server, port, dataDir };
}
if (process.argv[1] && resolve3(process.argv[1]) === fileURLToPath2(import.meta.url)) {
  const { server, port, dataDir } = await createAquariumServer();
  server.listen(port, "0.0.0.0", () => {
    console.log(`The Work Aquarium: http://localhost:${port}`);
    console.log(`Phone addresses: ${lanOrigins(port).join(", ") || "No private LAN address detected"}`);
    console.log(`Saved fish and backgrounds: ${dataDir}`);
  });
  for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => server.close(() => process.exit(0)));
}
export {
  createAquariumServer
};
