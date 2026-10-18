const path = require("node:path");
const { spawn } = require("node:child_process");
const {
  loadConfig,
  attest,
  childEnv,
  redact,
} = require("./theme-fixture-runtime.cjs");
async function main() {
  const config = loadConfig();
  await attest(config);
  const command = process.argv[2] || "dev";
  let file, args;
  if (["dev", "start"].includes(command)) {
    file = require.resolve("next/dist/bin/next");
    args = [
      command,
      "-p",
      "3102",
      "-H",
      "127.0.0.1",
      ...(command === "dev" ? ["--webpack"] : []),
    ];
  } else if (command === "build") {
    file = require.resolve("next/dist/bin/next");
    args = ["build"];
  } else {
    const scripts = {
      seed: "seed-theme-fixture",
      check: "verify-site",
      forms: "verify-account-flows",
      admin: "verify-admin-flows",
      smtp: "theme-smtp-fixture",
    };
    if (!scripts[command]) throw Error("Unknown fixture command");
    file = path.resolve("scripts", scripts[command] + ".cjs");
    args = [];
  }
  const child = spawn(process.execPath, [file, ...args], {
    stdio: ["inherit", "pipe", "pipe"],
    env: childEnv(config),
  });
  child.stdout.on("data", (chunk) =>
    process.stdout.write(redact(chunk.toString(), config)),
  );
  child.stderr.on("data", (chunk) =>
    process.stderr.write(redact(chunk.toString(), config)),
  );
  child.on("exit", (code) => {
    process.exitCode = code || 0;
  });
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => child.kill(signal));
}
main().catch(() => {
  console.error(
    "Fixture startup rejected; verify private configuration and local datasource.",
  );
  process.exitCode = 1;
});
