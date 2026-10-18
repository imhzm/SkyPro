// A loopback-only STARTTLS outbox for real registration/reset UI tests.
// Rejects all non-.invalid recipients and never forwards any message.
const fs = require("node:fs"),
  path = require("node:path"),
  net = require("node:net"),
  tls = require("node:tls");
const { execFileSync } = require("node:child_process");
const runtime = require("./theme-fixture-runtime.cjs");
const config = runtime.requireFixture();
const directory = path.join(runtime.directory, "smtp");
fs.mkdirSync(directory, { recursive: true });
const certPath = path.join(directory, "cert.pem"),
  keyPath = path.join(directory, "key.pem");
const openssl =
  process.env.OPENSSL ||
  (process.platform === "win32"
    ? "C:/Program Files/Git/usr/bin/openssl.exe"
    : "openssl");
execFileSync(
  openssl,
  [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-keyout",
    keyPath,
    "-out",
    certPath,
    "-days",
    "2",
    "-subj",
    "/CN=localhost",
    "-addext",
    "subjectAltName=DNS:localhost,IP:127.0.0.1",
  ],
  { stdio: "ignore" },
);
const context = tls.createSecureContext({
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
  minVersion: "TLSv1.2",
});
const db = new URL(config.DATABASE_URL);
if (
  !["127.0.0.1", "localhost"].includes(db.hostname) ||
  db.pathname !== "/skypro_theme_fixture"
)
  throw Error("Fixture database required");
Object.assign(config, {
  SMTP_HOST: "127.0.0.1",
  SMTP_PORT: "33125",
  SMTP_USER: "qa-only-user",
  SMTP_PASS: "qa-only-password",
  SMTP_FROM: "qa@theme-fixture.invalid",
  NODE_EXTRA_CA_CERTS: certPath,
});
const outbox = path.join(directory, "outbox.json");
let messages = fs.existsSync(outbox)
  ? JSON.parse(fs.readFileSync(outbox, "utf8"))
  : [];
const sockets = new Set();
function attach(socket, secure = false) {
  sockets.add(socket);
  socket.setEncoding("utf8");
  socket.on("error", () => {});
  socket.on("close", () => sockets.delete(socket));
  let pending = "",
    data = null,
    recipients = [],
    authenticated = false;
  socket.on("data", (chunk) => {
    pending += chunk;
    while (pending.includes("\r\n")) {
      const index = pending.indexOf("\r\n"),
        line = pending.slice(0, index);
      pending = pending.slice(index + 2);
      if (data !== null) {
        if (line === ".") {
          messages.push({
            receivedAt: new Date().toISOString(),
            recipients,
            raw: data.join("\r\n"),
          });
          fs.writeFileSync(outbox, JSON.stringify(messages, null, 2));
          data = null;
          recipients = [];
          socket.write("250 accepted locally\r\n");
        } else data.push(line.replace(/^\.\./, "."));
      } else if (/^EHLO|^HELO/i.test(line))
        socket.write(
          secure
            ? "250-localhost\r\n250 AUTH PLAIN\r\n"
            : "250-localhost\r\n250 STARTTLS\r\n",
        );
      else if (/^STARTTLS/i.test(line)) {
        socket.write("220 ready for TLS\r\n", () => {
          socket.removeAllListeners("data");
          attach(
            new tls.TLSSocket(socket, {
              isServer: true,
              secureContext: context,
            }),
            true,
          );
        });
        return;
      } else if (/^AUTH PLAIN /i.test(line)) {
        authenticated =
          secure &&
          Buffer.from(line.slice(11), "base64").toString() ===
            "\0qa-only-user\0qa-only-password";
        socket.write(
          authenticated
            ? "235 authenticated fixture\r\n"
            : "535 fixture authentication rejected\r\n",
        );
      } else if (/^MAIL FROM:/i.test(line)) {
        recipients = [];
        socket.write(
          authenticated ? "250 OK\r\n" : "530 authentication required\r\n",
        );
      } else if (/^RCPT TO:/i.test(line)) {
        const address = line.match(/<([^>]+)>/)?.[1] || "";
        if (authenticated && address.endsWith(".invalid")) {
          recipients.push(address);
          socket.write("250 OK\r\n");
        } else socket.write("550 only local .invalid recipients accepted\r\n");
      } else if (/^DATA/i.test(line)) {
        if (!authenticated || !recipients.length)
          socket.write("530 local recipient required\r\n");
        else {
          data = [];
          socket.write("354 send fixture message\r\n");
        }
      } else if (/^RSET|^NOOP/i.test(line)) socket.write("250 OK\r\n");
      else if (/^QUIT/i.test(line)) socket.end("221 closing fixture\r\n");
      else socket.write("500 unsupported fixture command\r\n");
    }
  });
}
const server = net.createServer((socket) => {
  attach(socket);
  socket.write("220 localhost fixture SMTP\r\n");
});
server.listen(33125, "127.0.0.1", () =>
  console.log(
    JSON.stringify({
      localOnly: true,
      port: 33125,
      starttls: true,
      nonFixtureRecipientsRejected: true,
    }),
  ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    for (const socket of sockets) socket.destroy();
    server.close(() => process.exit(0));
  });
