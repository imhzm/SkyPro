import { existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'

const projectRoot = process.cwd()
const standaloneDir = resolve(projectRoot, '.next', 'standalone')

if (!existsSync(standaloneDir)) {
  console.log('No standalone directory found — skipping env cleanup.')
  process.exit(0)
}

let removed = 0

/**
 * Recursively scan a directory and remove .env files.
 * Guards against path traversal by ensuring all paths stay under standaloneDir.
 */
function cleanEnvFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = resolve(dir, entry.name)

    // Path traversal guard — refuse to touch anything outside standaloneDir
    if (!absolutePath.startsWith(standaloneDir)) {
      console.error(`SECURITY: Refusing to process outside standalone: ${absolutePath}`)
      continue
    }

    if (entry.isDirectory()) {
      // Recurse into subdirectories (e.g., .next/standalone/skypro-web/.env)
      cleanEnvFiles(absolutePath)
    } else if (entry.isFile() && (entry.name === '.env' || entry.name.startsWith('.env.'))) {
      rmSync(absolutePath, { force: true })
      console.log(`Removed: ${relative(projectRoot, absolutePath)}`)
      removed++
    }
  }
}

cleanEnvFiles(standaloneDir)

if (removed > 0) {
  console.log(`✅ Removed ${removed} .env file(s) from standalone build.`)
} else {
  console.log('No .env files found in standalone build.')
}
