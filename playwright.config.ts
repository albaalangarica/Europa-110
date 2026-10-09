import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'

/*
 * Pruebas de extremo a extremo contra un Supabase de PRUEBAS (nunca el de producción)
 * con los datos importados del Sheet. Ver tests/e2e/flujos.spec.ts.
 */
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined)

export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3200',
    trace: 'retain-on-failure',
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    launchOptions: { executablePath },
  },
  projects: [
    { name: 'movil', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', launchOptions: { executablePath } } },
    { name: 'escritorio', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 }, launchOptions: { executablePath } } },
  ],
  webServer: {
    command: 'npm run build && npm run start -- -p 3200',
    url: 'http://localhost:3200/acceso',
    reuseExistingServer: true,
    timeout: 240_000,
  },
})
