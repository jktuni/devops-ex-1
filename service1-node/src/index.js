import http from "http";
import fs from "fs/promises";
import { exec as _exec } from "child_process";
import { promisify } from "util";
const exec = promisify(_exec);

const PORT = 8199;
const SERVICE2_BASE_URL = process.env.SERVICE2_BASE_URL || "http://service2:8081";
const STORAGE_BASE_URL  = process.env.STORAGE_BASE_URL  || "http://storage:8080";
const VSTORAGE_PATH     = process.env.VSTORAGE_PATH     || "/app/vstorage/log.txt";
const START_TIME = Date.now();

function nowIsoUtc() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

async function getFreeDiskMB() {
  // Alpine/busybox: df -k /
  const { stdout } = await exec("df -k / | tail -1 | awk '{print $4}'");
  const kb = parseInt(stdout.trim(), 10);
  return Math.floor(kb / 1024);
}

function getUptimeHours() {
  const ms = Date.now() - START_TIME;
  return Math.floor(ms / (1000 * 60 * 60));
}

async function appendVStorage(line) {
  await fs.mkdir(new URL("file:" + VSTORAGE_PATH).pathname.replace(/\/[^/]+$/, ""), { recursive: true }).catch(() => {});
  await fs.appendFile(VSTORAGE_PATH, line + "\n", "utf8");
}

async function postToStorage(line) {
  const res = await fetch(`${STORAGE_BASE_URL}/log`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: line
  });
  if (!res.ok) throw new Error(`Storage POST failed: ${res.status}`);
}

async function createRecord1() {
  const ts = nowIsoUtc(); 
  const uptimeH = getUptimeHours();
  const freeMB = await getFreeDiskMB();
  return `Timestamp1 ${ts}: uptime ${uptimeH} hours, free disk in root: ${freeMB} MBytes`;
}

async function handleStatus(res) {
  const record1 = await createRecord1();
  await postToStorage(record1);
  await appendVStorage(record1);
  const res2 = await fetch(`${SERVICE2_BASE_URL}/status`);
  if (!res2.ok) throw new Error(`Service2 GET /status failed: ${res2.status}`);
  const record2 = await res2.text();
  const combined = `${record1}\n${record2}`;
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(combined);
}

async function handleLog(res) {
  const r = await fetch(`${STORAGE_BASE_URL}/log`);
  if (!r.ok) {
    res.writeHead(r.status, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`Storage GET /log failed: ${r.status}`);
    return;
  }
  const text = await r.text();
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/status") {
      await handleStatus(res);
    } else if (req.method === "GET" && req.url === "/log") {
      await handleLog(res);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
    }
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`Error: ${err.message}`);
  }
});

server.listen(PORT, () => {
  console.log(`Service1 listening on ${PORT}`);
});
