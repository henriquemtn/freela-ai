import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

// Claude CLI execution adapter. Flags verified against Claude Code 2.1.x `claude --help`;
// if the CLI changes, only this file should need to.

const MAX_OUTPUT_BYTES = 5 * 1024 * 1024;

const envelopeSchema = z.object({
  is_error: z.boolean(),
  subtype: z.string(),
  structured_output: z.unknown().optional(),
  result: z.string().optional(),
  total_cost_usd: z.number().optional(),
  num_turns: z.number().optional(),
});

export type ClaudeRun<T> = { output: T; costUsd: number | null; turns: number | null };

/** Env passed to the CLI: enough to run and authenticate, never app secrets. */
function childEnv() {
  const keep = ["PATH", "HOME", "USER", "LANG", "TMPDIR", "SHELL", "CLAUDE_CONFIG_DIR", "ANTHROPIC_API_KEY"];
  const env: Record<string, string> = {};
  for (const k of keep) if (process.env[k]) env[k] = process.env[k];
  return env as NodeJS.ProcessEnv; // Next's typings mark NODE_ENV required; the child doesn't need it
}

/**
 * Runs `claude -p` non-interactively in an empty temp directory with only the
 * given tools (no shell, no MCP, no project/user settings) and returns the
 * structured output validated against `schema`.
 */
export async function runClaude<S extends z.ZodType>(opts: {
  prompt: string;
  schema: S;
  tools: ("WebSearch" | "WebFetch")[];
  timeoutMs: number;
  model?: string;
}): Promise<ClaudeRun<z.output<S>>> {
  const cwd = await mkdtemp(join(tmpdir(), "freela-claude-"));
  const args = [
    "-p",
    opts.prompt,
    "--output-format", "json",
    "--json-schema", JSON.stringify(z.toJSONSchema(opts.schema, { target: "draft-7" })), // CLI rejects 2020-12
    "--tools", opts.tools.join(","),
    "--allowedTools", opts.tools.join(","),
    "--permission-mode", "dontAsk",
    "--restricted",
    "--strict-mcp-config",
    "--no-session-persistence",
    ...(opts.model ? ["--model", opts.model] : []),
  ];

  try {
    const stdout = await new Promise<string>((resolve, reject) => {
      const child = spawn(process.env.CLAUDE_BIN || "claude", args, { cwd, env: childEnv(), stdio: ["ignore", "pipe", "pipe"] });
      let out = "";
      let err = "";
      const timer = setTimeout(() => {
        child.kill("SIGTERM");
        reject(new Error(`Claude CLI excedeu ${Math.round(opts.timeoutMs / 1000)}s`));
      }, opts.timeoutMs);
      child.stdout.on("data", (d: Buffer) => {
        out += d;
        if (out.length > MAX_OUTPUT_BYTES) {
          child.kill("SIGTERM");
          reject(new Error("Saída do Claude CLI grande demais"));
        }
      });
      child.stderr.on("data", (d: Buffer) => (err = (err + d).slice(-2000)));
      child.on("error", (e) => {
        clearTimeout(timer);
        reject(new Error(`Não foi possível executar o Claude CLI: ${e.message}`));
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve(out);
        else reject(new Error(`Claude CLI saiu com código ${code}: ${err.trim() || out.slice(-500)}`));
      });
    });

    const env = envelopeSchema.parse(JSON.parse(stdout));
    if (env.is_error || env.subtype !== "success") {
      throw new Error(`Claude CLI falhou (${env.subtype}): ${(env.result ?? "").slice(0, 500)}`);
    }
    // The CLI validates against the JSON schema; re-validate anyway (spec: validate all agent output).
    const parsed = opts.schema.safeParse(env.structured_output);
    if (!parsed.success) throw new Error(`Resposta do Claude fora do formato: ${z.prettifyError(parsed.error)}`);
    return { output: parsed.data, costUsd: env.total_cost_usd ?? null, turns: env.num_turns ?? null };
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
}
