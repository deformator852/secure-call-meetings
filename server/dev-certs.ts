import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const certDir = join(process.cwd(), "certs");
const keyPath = join(certDir, "dev-key.pem");
const certPath = join(certDir, "dev-cert.pem");

function lanIps(): string[] {
  const ips = new Set<string>(["127.0.0.1"]);
  try {
    const raw = execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' } | Select-Object -ExpandProperty IPAddress",
      ],
      { encoding: "utf8", timeout: 8000, windowsHide: true },
    );
    for (const line of raw.split(/\r?\n/)) {
      const ip = line.trim();
      if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
        ips.add(ip);
      }
    }
  } catch {
    // WSL/Linux without Windows PowerShell is fine
  }
  return [...ips];
}

export function loadDevTls(): { key: Buffer; cert: Buffer } {
  if (!existsSync(keyPath) || !existsSync(certPath)) {
    mkdirSync(certDir, { recursive: true });
    const san = ["DNS:localhost", ...lanIps().map((ip) => `IP:${ip}`)].join(",");
    execFileSync(
      "openssl",
      [
        "req",
        "-x509",
        "-nodes",
        "-newkey",
        "rsa:2048",
        "-keyout",
        keyPath,
        "-out",
        certPath,
        "-days",
        "825",
        "-subj",
        "/CN=localhost",
        "-addext",
        `subjectAltName=${san}`,
      ],
      { stdio: "inherit" },
    );
  }
  return {
    key: readFileSync(keyPath),
    cert: readFileSync(certPath),
  };
}
