import {defineConfig} from '@playwright/test';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const database=join(mkdtempSync(join(tmpdir(),'enem-browser-')),'test.sqlite');
export default defineConfig({
 testDir:'./tests/e2e',fullyParallel:false,workers:1,timeout:30000,
 use:{trace:'retain-on-failure',screenshot:'only-on-failure',baseURL:'http://127.0.0.1:3100',launchOptions:{...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--disable-dev-shm-usage']}},
 webServer:{command:'npm run build && node server/app.js',url:'http://127.0.0.1:3100/api/health',reuseExistingServer:false,env:{PORT:'3100',NODE_ENV:'test',DATABASE_PATH:database,APP_ORIGIN:'http://127.0.0.1:3100'}}
});
