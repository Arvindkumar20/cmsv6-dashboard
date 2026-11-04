
const net = require("net");

const server = net.createServer((client) => {
  const upstream = net.connect(
    6604,
    "chinamdvr.com",
    () => {
      console.log("[TCP] Remote connected");
      client.pipe(upstream);
      upstream.pipe(client);
    }
  );

  client.on("error", (err) => {
    console.log("[CLIENT ERROR]", err.code);
    upstream.destroy();
  });

  upstream.on("error", (err) => {
    console.log("[UPSTREAM ERROR]", err.code);
    client.destroy();
  });

  client.on("close", () => upstream.destroy());
  upstream.on("close", () => client.destroy());
});

server.listen(6604, "127.0.0.1", () => {
  console.log("TCP tunnel: 127.0.0.1:6604 -> chinamdvr.com:6604");
});
