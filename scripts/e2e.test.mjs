import { _electron as electron } from 'playwright';

// This is a standalone script that runs the E2E test using Node.js test runner or just as a script.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let electronApp;
let window;

describe('SkyPro E2E Tests', { timeout: 30000 }, () => {
  before(async () => {
    // Launch the Electron app
    electronApp = await electron.launch({
      args: [path.join(__dirname, '..', 'electron', 'main.cjs')],
      env: { ...process.env, NODE_ENV: 'production' }
    });

    // Wait for the first window to be created
    window = await electronApp.firstWindow();
    
    // Listen for console logs
    window.on('console', msg => console.log('Window console:', msg.text()));
    
    await window.waitForLoadState('networkidle');
  });

  after(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  it('should launch and log in', async () => {
    const title = await window.title();
    assert.strictEqual(title, 'SkyPro');

    // Wait for the login screen to render
    await window.waitForSelector('input[type="email"]');

    // Fill in the credentials provided by the user
    await window.fill('input[type="email"]', 'skywaveads3@gmail.com');
    await window.fill('input[type="password"]', 'SkyProSec@20260502182105aA1!');
    
    // Fill the serial key fields (4 inputs for the chunks)
    // SKY1-PRO2-7482-79F4-2027
    const serialInputs = await window.locator('.serial-inputs input').all();
    if (serialInputs.length >= 4) {
      await serialInputs[0].fill('SKY1');
      await serialInputs[1].fill('PRO2');
      await serialInputs[2].fill('7482');
      await serialInputs[3].fill('79F4');
      if (serialInputs.length === 5) {
        await serialInputs[4].fill('2027');
      }
    } else {
      // Fallback if it's a single input or different structure
      const serialSingle = await window.locator('input[placeholder*="SKY1"]');
      if (await serialSingle.count() > 0) {
        await serialSingle.fill('SKY1-PRO2-7482-79F4-2027');
      }
    }

    // Click Login
    await window.click('button:has-text("تسجيل الدخول")');

    // Wait for dashboard to load (checking for sidebar or main dashboard elements)
    await window.waitForSelector('.sidebar', { timeout: 15000 });
    
    const bodyText = await window.locator('body').innerText();
    assert.ok(bodyText.includes('SkyPro'), 'Dashboard should be loaded');
    console.log('Login successful and dashboard loaded!');
  });
});
