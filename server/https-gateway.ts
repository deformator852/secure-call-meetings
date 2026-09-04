import { request as httpRequest } from "node:http";
import { createServer } from "node:https";
import { connect } from "node:net";
import type { IncomingMessage, ServerResponse } from "node:http";
import { loadDevTls } from "./dev-certs";

const targetPort = Number.parseInt(process.env.PORT ?? "3000", 10);
const httpsPort = Number.parseInt(process.env.HTTPS_PORT ?? "3443", 10);

function proxyWeb(request: IncomingMessage, response: ServerResponse): void {
  const forwardedHeaders = {
    ...request.headers,
    host: request.headers.host,
    "x-forwarded-host": request.headers.host,
    "x-forwarded-proto": "https",
    "x-forwarded-port": String(httpsPort),
  };

  const proxy = httpRequest(
    {
      hostname: "127.0.0.1",
      port: targetPort,
      path: request.url,
      method: request.method,
      headers: forwardedHeaders,
    },
    (upstream) => {
      response.writeHead(upstream.statusCode ?? 502, upstream.headers);
      upstream.pipe(response);
    },
  );
  proxy.on("error", () => {
    if (!response.headersSent) {
      response.writeHead(502);
    }
    response.end("bad gateway");
  });
  request.pipe(proxy);
}

function proxyUpgrade(request: IncomingMessage, socket: import("node:net").Socket, head: Buffer): void {
  const backend = connect(targetPort, "127.0.0.1", () => {
    const lines = [`${request.method} ${request.url} HTTP/1.1`];
    for (const [key, value] of Object.entries(request.headers)) {
      if (value === undefined) {
        continue;
      }
      lines.push(`${key}: ${Array.isArray(value) ? value.join(", ") : value}`);
    }
    backend.write(`${lines.join("\r\n")}\r\n\r\n`);
    if (head.length > 0) {
      backend.write(head);
    }
    backend.pipe(socket);
    socket.pipe(backend);
  });
  backend.on("error", () => {
    socket.destroy();
  });
  socket.on("error", () => {
    backend.destroy();
  });
}

const tls = loadDevTls();
const server = createServer(tls, proxyWeb);
server.on("upgrade", proxyUpgrade);
server.listen(httpsPort, "0.0.0.0", () => {
  console.log(`https://localhost:${httpsPort} → http://127.0.0.1:${targetPort}`);
});
