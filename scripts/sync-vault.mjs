#!/usr/bin/env node
// Mirrors the private Obsidian vault's "MISSING LINK" section into content/MISSING LINK.
// The vault is the source of truth (see ../../README.md); this script never writes to it.
// What actually publishes is decided at build time by the RequireEdited Quartz filter
// (quartz/plugins/filters/editGate.ts) — this script is a dumb mirror, not a gate.

import { readdirSync, statSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs"
import { join, relative, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(scriptDir, "..")
const vaultRoot = process.env.VAULT_ROOT ?? join(repoRoot, "..", "MISSING LINK", "MISSING LINK")
const destRoot = join(repoRoot, "content", "MISSING LINK")

// Quartz-authored navigation pages that don't exist in the vault and must survive syncing.
const PROTECTED_BASENAMES = new Set(["index.md"])

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...walk(full))
    } else {
      out.push(full)
    }
  }
  return out
}

function main() {
  const dryRun = process.argv.includes("--dry-run")
  const sourceFiles = walk(vaultRoot)
  const sourceRelPaths = new Set(sourceFiles.map((f) => relative(vaultRoot, f)))

  let copied = 0
  let unchanged = 0
  for (const src of sourceFiles) {
    const rel = relative(vaultRoot, src)
    const dest = join(destRoot, rel)
    const content = readFileSync(src)
    let same = false
    try {
      same = readFileSync(dest).equals(content)
    } catch {
      same = false
    }
    if (same) {
      unchanged++
      continue
    }
    copied++
    console.log(`${dryRun ? "[dry-run] would copy" : "copy"}  ${rel}`)
    if (!dryRun) {
      mkdirSync(dirname(dest), { recursive: true })
      writeFileSync(dest, content)
    }
  }

  let removed = 0
  const destFiles = walk(destRoot)
  for (const dest of destFiles) {
    const rel = relative(destRoot, dest)
    const basename = rel.split(/[\\/]/).pop()
    if (PROTECTED_BASENAMES.has(basename)) continue
    if (sourceRelPaths.has(rel)) continue
    removed++
    console.log(`${dryRun ? "[dry-run] would remove" : "remove"}  ${rel}`)
    if (!dryRun) {
      rmSync(dest)
    }
  }

  console.log(`\n${copied} copied, ${unchanged} unchanged, ${removed} removed.`)
  if (dryRun) console.log("(dry run — nothing was written)")
}

main()
