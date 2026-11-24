import { spawn } from "node:child_process";
import { on } from "node:events";
import { access } from "node:fs/promises";
import { createRequire } from "node:module";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  interface ProvidedContext {
    publicApiOrigin: string;
  }
}

const require = createRequire(import.meta.url);
const hostname = "127.0.0.1";
const startupTimeoutMs = 15_000;
const shutdownTimeoutMs = 3_000;

export default async function setup(project: TestProject) {
  await access(".next/BUILD_ID").catch(() => {
    throw new Error("Run pnpm build before pnpm test:integration.");
  });

  const server = spawn(process.execPath, [
    require.resolve("next/dist/bin/next"), "start", "--hostname", hostname, "--port", "0",
  ], {
    // Keep credentials and shell-specific options out of the production child process.
    env: {
      NODE_ENV: "production",
      PATH: process.env.PATH,
      NEXT_TELEMETRY_DISABLED: "1",
      FORCE_COLOR: "0",
      // Empty entries also shadow local dotenv files loaded by Next.js.
      FIREBASE_PROJECT_ID: "",
      FIREBASE_CLIENT_EMAIL: "",
      FIREBASE_PRIVATE_KEY: "",
      FIREBASE_AUTH_EMULATOR_HOST: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let output = "";
  let serverError: Error | undefined;
  const capture = (chunk: Buffer) => {
    output = (output + chunk.toString()).slice(-8_000);
  };
  server.stdout.on("data", capture);
  server.stderr.on("data", capture);
  server.on("error", (error) => { serverError = error; });
  const closed = new Promise<void>((resolve) => server.once("close", () => resolve()));

  const forceStop = () => { server.kill("SIGKILL"); };
  process.once("exit", forceStop);

  async function stop() {
    server.kill("SIGTERM");
    const deadline = setTimeout(forceStop, shutdownTimeoutMs);
    try {
      await closed;
    } finally {
      clearTimeout(deadline);
      process.removeListener("exit", forceStop);
    }
  }

  try {
    const signal = AbortSignal.timeout(startupTimeoutMs);
    let origin: string | undefined;
    let stdout = "";
    for await (const [chunk] of on(server.stdout, "data", { signal, close: ["end"] })) {
      stdout = (stdout + chunk.toString()).slice(-8_000);
      // Next prints the actual kernel-assigned port after listening.
      const address = /Local:\s+(http:\/\/127\.0\.0\.1:\d+)\s/u.exec(stdout);
      if (address) {
        origin = address[1];
        break;
      }
    }
    if (!origin) throw serverError ?? new Error("Next.js exited before announcing its port.");

    const ready = await fetch(`${origin}/api/v1/health`, { signal });
    await ready.body?.cancel();
    if (!ready.ok) throw new Error(`Health readiness probe returned HTTP ${ready.status}.`);

    project.provide("publicApiOrigin", origin);
    return stop;
  } catch (error) {
    await stop();
    throw new Error(`Production server did not become ready.\n${output}`, { cause: error });
  }
}
