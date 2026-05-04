import fs from 'fs'
import path from 'path'

function getFiles(dir) {
  const dirents = fs.readdirSync(dir, { withFileTypes: true })
  const files = dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name)
    return dirent.isDirectory() ? getFiles(res) : res
  })
  return Array.prototype.concat(...files)
}

const files = getFiles('src/modules').filter(f => f.endsWith('.tsx'))
for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8')

  const newContent = content
    .replace(/window\.electronAPI\.([a-zA-Z]+)Login\(\{\s*username:\s*account\.username/g, 'window.electronAPI.$1Login({ accountId: account.id, username: account.username')
    .replace(/!!\(account\.password && account\.password\.trim\(\)\)/g, '(!!account.has_password || !!(account.password && account.password.trim()))')

  if (newContent !== content) {
    fs.writeFileSync(file, newContent)
    console.log('Updated', file)
  }
}
