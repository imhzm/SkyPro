import { existsSync } from 'node:fs'
import { resolve, relative } from 'node:path'

const projectRoot = process.cwd()
const forbiddenPaths = ['.electron-data']

const failures = forbiddenPaths
  .map((entry) => resolve(projectRoot, entry))
  .filter((absolutePath) => existsSync(absolutePath))

if (failures.length > 0) {
  const details = failures
    .map((absolutePath) => ` - ${relative(projectRoot, absolutePath)}`)
    .join('\n')

  console.error(`Runtime data must not exist inside the project before build:\n${details}`)
  console.error('Move runtime data to Electron userData or delete the local cache before building.')
  process.exit(1)
}
