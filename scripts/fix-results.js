import fs from 'fs'
import path from 'path'

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f)
    let isDirectory = fs.statSync(dirPath).isDirectory()
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath)
  })
}

walkDir('src/modules', function(filePath) {
  if (filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8')
    let original = content
    
    // Fix res.data[0]
    content = content.replace(/res\.data\[0\]/g, '(res.data as any[])[0]')

    // Fix otherRes.data || []
    content = content.replace(/leadsRes\.data \|\| \[\]/g, '(leadsRes.data as any[]) || []')
    content = content.replace(/accountsRes\.data \|\| \[\]/g, '(accountsRes.data as any[]) || []')
    content = content.replace(/campaignsRes\.data \|\| \[\]/g, '(campaignsRes.data as any[]) || []')

    // Fix OtherToolsModule
    content = content.replace(/platform: keyword/g, '') // remove invalid platform

    // Fix SendEmailsModule
    content = content.replace(/res\.data\.map/g, '(res.data as any[] || []).map')

    // Fix SnapchatModule / WhatsappModule remaining filter
    content = content.replace(/\(res\.data as any\[\]\)\.filter/g, '((res.data as any[]) || []).filter')

    // SettingsModule error TS2345: Argument of type '{}' is not assignable to parameter of type 'SetStateAction<string>'.
    content = content.replace(/setProxy\(\{\}\)/g, "setProxy('')")
    
    // WhatsappModule
    content = content.replace(/setExtractType\(\{\}\)/g, "setExtractType('groups')")
    content = content.replace(/setFilterNumbers\(\{\}\)/g, "setFilterNumbers('')")

    if (content !== original) {
      fs.writeFileSync(filePath, content)
      console.log('Fixed', filePath)
    }
  }
})
