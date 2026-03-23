import type { Plugin } from "@opencode-ai/plugin"
import { delimiter, dirname, join } from "node:path"

const files = ["devenv.nix", "devenv.yaml", "devenv.yml"]
const cache = new Map<string, Promise<Record<string, string>>>()

async function match(dir: string) {
  const hits = await Promise.all(files.map((x) => Bun.file(join(dir, x)).exists()))
  return hits.some(Boolean)
}

async function root(dir: string) {
  let cur = dir

  while (true) {
    if (await match(cur)) return cur

    const up = dirname(cur)
    if (up === cur) return
    cur = up
  }
}

async function load(dir: string) {
  const run = Bun.spawn(["devenv", "print-dev-env", "--json"], {
    cwd: dir,
    stdout: "pipe",
    stderr: "pipe",
  })

  const txt = await new Response(run.stdout).text()
  const err = await new Response(run.stderr).text()
  const code = await run.exited

  if (code !== 0) throw new Error(err || `devenv failed in ${dir}`)

  const json = JSON.parse(txt)
  const vars = json.variables ?? {}

  return Object.fromEntries(
    Object.entries(vars).flatMap(([k, v]) => {
      const val =
        typeof v === "string"
          ? v
          : typeof v === "object" && v && "value" in v && typeof v.value === "string"
            ? v.value
            : undefined

      return val === undefined ? [] : [[k, val]]
    }),
  )
}

function mergePath(current: string | undefined, next: string | undefined) {
  if (!current) return next
  if (!next) return current

  const seen = new Set<string>()
  const merged: string[] = []

  for (const value of [...next.split(delimiter), ...current.split(delimiter)]) {
    if (!value || seen.has(value)) continue
    seen.add(value)
    merged.push(value)
  }

  return merged.join(delimiter)
}

export const DevenvPlugin: Plugin = async () => {
  return {
    "shell.env": async (input, output) => {
      const dir = await root(input.cwd)
      if (!dir) return

      for (const [key, value] of Object.entries(process.env)) {
        if (value !== undefined && output.env[key] === undefined) {
          output.env[key] = value
        }
      }

      const env =
        cache.get(dir) ??
        load(dir).catch((err) => {
          cache.delete(dir)
          throw err
        })

      cache.set(dir, env)

      const loaded = await env
      Object.assign(output.env, loaded)
      output.env.PATH = mergePath(process.env.PATH, loaded.PATH)
    },
  }
}
