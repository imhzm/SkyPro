// electron-builder afterPack hook — flips Electron security fuses on the packaged binary
// to harden against the common Electron app-cracking / tampering techniques:
//   • RunAsNode off          -> binary cannot be run as plain Node (ELECTRON_RUN_AS_NODE) to dump the app
//   • NodeOptions env off    -> cannot inject code via NODE_OPTIONS=--require malicious.js
//   • NodeCliInspect off     -> cannot attach a debugger to the main process (--inspect / --inspect-brk)
//   • OnlyLoadAppFromAsar on -> main process only loads app code from app.asar (blocks repackaging swaps)
//   • EnableCookieEncryption -> Electron's cookie store is encrypted at rest
//
// Runs once per packaged target during `electron-builder`. Safe to no-op if the binary is missing.
const path = require('path')
const fs = require('fs')
const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses')

exports.default = async function afterPack(context) {
  const { appOutDir, packager, electronPlatformName } = context
  const productFilename = packager.appInfo.productFilename

  let electronBinary
  if (electronPlatformName === 'win32') {
    electronBinary = path.join(appOutDir, `${productFilename}.exe`)
  } else if (electronPlatformName === 'darwin') {
    electronBinary = path.join(appOutDir, `${productFilename}.app`, 'Contents', 'MacOS', productFilename)
  } else {
    electronBinary = path.join(appOutDir, productFilename)
  }

  if (!fs.existsSync(electronBinary)) {
    console.warn(`[afterPack] Electron binary not found, skipping fuses: ${electronBinary}`)
    return
  }

  await flipFuses(electronBinary, {
    version: FuseVersion.V1,
    resetAdHocDarwinSignature: electronPlatformName === 'darwin',
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
    [FuseV1Options.EnableCookieEncryption]: true,
  })

  console.log(`[afterPack] Electron security fuses applied: ${path.basename(electronBinary)}`)
}
