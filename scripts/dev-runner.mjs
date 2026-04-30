import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import process from 'node:process'
import { createServer } from 'vite'

const require = createRequire(import.meta.url)
const electronBinary = require('electron')

const viteServer = await createServer({
  server: {
    host: '127.0.0.1',
    port: 5180,
    strictPort: false,
  },
})

await viteServer.listen()

const address = viteServer.httpServer?.address()
const port =
  address && typeof address === 'object' && 'port' in address ? address.port : 5180
const devServerUrl = `http://127.0.0.1:${port}`

viteServer.printUrls()

const electronProcess = spawn(electronBinary, ['.'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_DEV_SERVER_URL: devServerUrl,
  },
})

let isShuttingDown = false

async function shutdown(exitCode = 0) {
  if (isShuttingDown) return

  isShuttingDown = true

  if (!electronProcess.killed && electronProcess.exitCode === null) {
    electronProcess.kill()
  }

  await viteServer.close()
  process.exit(exitCode)
}

electronProcess.on('exit', async (code) => {
  await shutdown(code ?? 0)
})

process.on('SIGINT', async () => {
  await shutdown(0)
})

process.on('SIGTERM', async () => {
  await shutdown(0)
})
