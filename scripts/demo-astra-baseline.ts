// Path: /scripts/demo-astra-baseline.ts

import { pathToFileURL } from "node:url";
import {
  applyBaseline,
  assertTargetIdentity,
  BaselineContractError,
  buildRecoveryPlan,
  computeTargetFingerprint,
  planBaseline,
  verifyBaseline,
} from "@/lib/demoAstraBaseline/contract";
import type { TargetIdentityInput } from "@/lib/demoAstraBaseline/contract";

type Command = "fingerprint" | "plan" | "verify" | "apply" | "recovery";

type CliArgs = Readonly<{
  command: Command;
  endpoint: string;
  keyspace: string;
  expectedFingerprint: string;
  confirmation: string;
}>;

function readOption(argv: string[], name: string): string {
  const prefix = `--${name}=`;
  const inline = argv.find((value) => value.startsWith(prefix));
  if (inline) return inline.slice(prefix.length).trim();
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? String(argv[index + 1] ?? "").trim() : "";
}

export function parseDemoAstraBaselineArgs(argv: string[]): CliArgs {
  const values = argv.slice(2);
  const first = values[0] ?? "plan";
  const rawCommand = first.startsWith("--") ? "plan" : first;
  if (!["fingerprint", "plan", "verify", "apply", "recovery"].includes(rawCommand)) {
    throw new BaselineContractError("CLI_COMMAND_INVALID");
  }
  return {
    command: rawCommand as Command,
    endpoint: readOption(values, "endpoint"),
    keyspace: readOption(values, "keyspace"),
    expectedFingerprint: readOption(values, "expected-target-fingerprint"),
    confirmation: readOption(values, "confirm"),
  };
}

function toTarget(args: CliArgs): TargetIdentityInput {
  return {
    endpoint: args.endpoint,
    keyspace: args.keyspace,
    expectedFingerprint: args.expectedFingerprint,
  };
}

function printSanitized(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function formatSanitizedCliFailure(error: unknown): string {
  const code = error instanceof BaselineContractError ? error.code : "UNEXPECTED_FAILURE";
  return JSON.stringify({ ok: false, code });
}

export async function runDemoAstraBaselineCli(
  argv: string[],
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  const args = parseDemoAstraBaselineArgs(argv);
  if (args.command === "fingerprint") {
    printSanitized({
      mode: "fingerprint",
      writes: false,
      keyspace: args.keyspace,
      fingerprint: computeTargetFingerprint(args.endpoint, args.keyspace),
    });
    return;
  }

  if (args.command === "recovery") {
    printSanitized(buildRecoveryPlan(toTarget(args)));
    return;
  }

  const target = assertTargetIdentity(toTarget(args));
  const token = String(env.BEGASIST_DEMO_ASTRA_APPLICATION_TOKEN ?? "").trim();
  if (!token) throw new BaselineContractError("DEMO_ASTRA_TOKEN_REQUIRED");
  const { AstraDataApiBaselineAdapter } = await import("@/lib/demoAstraBaseline/astraAdapter");
  const adapter = new AstraDataApiBaselineAdapter({
    endpoint: target.endpoint,
    keyspace: target.keyspace,
    token,
  });

  if (args.command === "plan") {
    printSanitized(await planBaseline(toTarget(args), adapter));
    return;
  }
  if (args.command === "verify") {
    printSanitized(await verifyBaseline(toTarget(args), adapter));
    return;
  }
  printSanitized(await applyBaseline({ ...toTarget(args), confirmation: args.confirmation }, adapter));
}

async function main(): Promise<void> {
  try {
    await runDemoAstraBaselineCli(process.argv);
  } catch (error) {
    process.stderr.write(`${formatSanitizedCliFailure(error)}\n`);
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invokedPath) void main();
