import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/e2e-sales',workers:1,timeout:45000,
 use:{trace:'retain-on-failure',screenshot:'only-on-failure',baseURL:'http://127.0.0.1:3300',launchOptions:{...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--disable-dev-shm-usage']}},
 webServer:{command:'npm run build:pages && npm run preview -- --host 127.0.0.1 --port 3300 --strictPort',url:'http://127.0.0.1:3300',reuseExistingServer:false,env:{CF_PAGES:'1',VITE_SUPABASE_URL:'https://enem-test.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'}}
});
