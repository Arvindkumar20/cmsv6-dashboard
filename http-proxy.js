const http = require("http");
const httpProxy = require("http-proxy");
 function httpProxyServer() {
  const PORT = 3000;
  const TARGET = "http://180.167.106.70:6605";

  const allowedOrigins = new Set([
    "http://localhost:3001",
    // "http://localhost:5500"
  ]);

  const proxy = httpProxy.createProxyServer({
    target: TARGET,
    changeOrigin: true,
    ws: true,
    timeout: 30000,
    proxyTimeout: 30000,
  });

  const server = http.createServer((req, res) => {
    const origin = req.headers.origin;

    console.log(`[HTTP] ${req.method} ${req.url}`);

    if (allowedOrigins.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }

    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }

    proxy.web(req, res);
  });

  proxy.on("proxyRes", (proxyRes, req) => {
    console.log(`[UPSTREAM] ${proxyRes.statusCode} ${req.url}`);

    const origin = req.headers.origin;

    if (allowedOrigins.has(origin)) {
      proxyRes.headers["access-control-allow-origin"] = origin;
      proxyRes.headers["vary"] = "Origin";
    } else {
      delete proxyRes.headers["access-control-allow-origin"];
    }
  });

  server.on("upgrade", (req, socket, head) => {
    console.log(`[WEBSOCKET] ${req.url}`);
    proxy.ws(req, socket, head);
  });

  proxy.on("error", (err, req, res) => {
    console.error("[PROXY ERROR]", err.message);

    if (res && typeof res.writeHead === "function") {
      if (!res.headersSent) {
        res.writeHead(502);
      }
      res.end("Proxy error");
    } else {
      res?.destroy();
    }
  });

  server.listen(PORT, "127.0.0.1", () => {
    console.log(`Proxy running on port ${PORT}`);
  });
};

exports.default = httpProxyServer;
