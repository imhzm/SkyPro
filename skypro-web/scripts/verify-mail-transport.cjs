// No outbound mail: exercises the real application adapter against a loopback
// STARTTLS SMTP fixture with a trusted test certificate and dummy credentials.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const net = require('node:net')
const tls = require('node:tls')
const { execFileSync } = require('node:child_process')
const Module = require('node:module')
const ts = require('typescript')
const nodemailer = require('nodemailer')

async function main() {
  const testRoot = path.resolve(__dirname, '../../.tmp')
  fs.mkdirSync(testRoot, { recursive: true })
  const testDir = fs.mkdtempSync(path.join(testRoot, 'skypro-mail-fixture-'))
  const certPath = path.join(testDir, 'cert.pem')
  const keyPath = path.join(testDir, 'key.pem')
  const openssl = process.env.OPENSSL || (process.platform === 'win32' ? 'C:/Program Files/Git/usr/bin/openssl.exe' : 'openssl')
  execFileSync(openssl, ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', keyPath, '-out', certPath, '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1'], { stdio: 'ignore' })
  const cert = fs.readFileSync(certPath)
  const context = tls.createSecureContext({ key: fs.readFileSync(keyPath), cert, minVersion: 'TLSv1.2' })
  const sockets = new Set()
  const messages = []
  const transports = []
  let tlsUpgrades = 0
  let authenticated = 0
  const originalTransport = nodemailer.createTransport
  const envKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'SMTP_FROM_NAME']
  const previousEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]))

  function attach(socket, secure = false) {
    sockets.add(socket)
    socket.setEncoding('utf8')
    let pending = '', data = null
    socket.on('error', () => {})
    socket.on('data', chunk => {
      pending += chunk
      while (pending.includes('\r\n')) {
        const end = pending.indexOf('\r\n')
        const line = pending.slice(0, end)
        pending = pending.slice(end + 2)
        if (data !== null) {
          if (line === '.') { messages.push(data.join('\r\n')); data = null; socket.write('250 2.0.0 accepted locally\r\n') }
          else data.push(line.replace(/^\.\./, '.'))
        } else if (/^EHLO|^HELO/i.test(line)) {
          socket.write(secure ? '250-localhost\r\n250 AUTH PLAIN\r\n' : '250-localhost\r\n250-STARTTLS\r\n250 AUTH PLAIN\r\n')
        } else if (/^STARTTLS/i.test(line)) {
          socket.write('220 ready for TLS\r\n', () => {
            socket.removeAllListeners('data')
            const encrypted = new tls.TLSSocket(socket, { isServer: true, secureContext: context })
            tlsUpgrades++
            attach(encrypted, true)
          })
          return
        } else if (/^AUTH PLAIN /i.test(line)) {
          assert.equal(secure, true, 'SMTP authentication must happen after TLS')
          assert.equal(Buffer.from(line.slice(11), 'base64').toString(), '\0qa-only-user\0qa-only-password')
          authenticated++
          socket.write('235 authenticated fixture\r\n')
        } else if (/^RCPT TO:/i.test(line) && line.includes('reject@example.invalid')) socket.write('550 fixture rejects recipient\r\n')
        else if (/^MAIL FROM:|^RCPT TO:|^RSET|^NOOP/i.test(line)) socket.write('250 OK\r\n')
        else if (/^DATA/i.test(line)) { data = []; socket.write('354 send fixture message\r\n') }
        else if (/^QUIT/i.test(line)) socket.end('221 closing fixture\r\n')
        else socket.write('500 unsupported fixture command\r\n')
      }
    })
  }
  const server = net.createServer(socket => { attach(socket); socket.write('220 localhost fixture SMTP\r\n') })
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    nodemailer.createTransport = options => {
      assert.equal(options.host, '127.0.0.1')
      assert.equal(options.requireTLS, true)
      assert.equal(options.pool, true)
      const transport = originalTransport({ ...options, tls: { ca: cert, servername: 'localhost', rejectUnauthorized: true } })
      transports.push(transport)
      return transport
    }
    for (const key of envKeys) delete process.env[key]
    const sourcePath = path.resolve(__dirname, '../src/lib/email.ts')
    const fixtureModule = new Module(sourcePath, module)
    fixtureModule.filename = sourcePath
    fixtureModule.paths = Module._nodeModulePaths(path.dirname(sourcePath))
    fixtureModule._compile(ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, sourcePath)
    const email = fixtureModule.exports
    assert.deepEqual(await email.sendEmail({ to: 'qa@example.invalid', subject: 'fixture', text: 'fixture' }), { success: false, error: 'SMTP configuration is incomplete' })
    Object.assign(process.env, { SMTP_HOST: '127.0.0.1', SMTP_PORT: String(server.address().port), SMTP_USER: 'qa-only-user', SMTP_PASS: 'qa-only-password', SMTP_FROM: 'sender@example.invalid', SMTP_FROM_NAME: 'Sky Pro fixture' })
    const data = { name: 'مستخدم اختبار', email: 'qa@example.invalid', serial: 'fixture-serial', expiryDate: '2027-01-01', verifyLink: 'https://example.invalid/verify?fixture=1' }
    assert.equal((await email.sendEmail({ to: data.email, subject: 'تجربة التفعيل', text: email.generateWelcomeEmailText(data), html: email.generateWelcomeEmail(data) })).success, true)
    assert.equal((await email.sendEmail({ to: data.email, subject: 'fixture fallback', text: '', html: '<p>fixture text fallback</p>' })).success, true)
    assert.equal((await email.sendEmail({ to: 'reject@example.invalid', subject: 'fixture rejection', text: 'fixture' })).success, false)
    assert.equal(messages.length, 2)
    assert.match(messages[0], /multipart\/alternative/i)
    assert.match(messages[0], /text\/plain; charset=utf-8/i)
    assert.match(messages[0], /text\/html; charset=utf-8/i)
    assert.ok(messages[0].replace(/=\r\n/g, '').includes('fixture-serial'), 'Serial key must survive MIME line wrapping')
    assert.ok(messages[1].replace(/=\r\n/g, '').includes('fixture text fallback'), 'HTML fallback must produce a text alternative')
    assert.ok(tlsUpgrades > 0 && authenticated > 0)
    console.log(JSON.stringify({ success: true, loopbackOnly: true, tlsValidation: true, messagesAccepted: messages.length, rejectionHandled: true, missingConfigHandled: true, nodemailer: require('nodemailer/package.json').version }))
  } finally {
    nodemailer.createTransport = originalTransport
    for (const transport of transports) transport.close()
    for (const socket of sockets) socket.destroy()
    await new Promise(resolve => server.close(resolve))
    for (const key of envKeys) { if (previousEnv[key] === undefined) delete process.env[key]; else process.env[key] = previousEnv[key] }
    for (const file of [certPath, keyPath]) { if (fs.existsSync(file)) fs.unlinkSync(file) }
    fs.rmdirSync(testDir)
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
