import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/pages',workers:1,use:{launchOptions:{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--disable-dev-shm-usage']}}});
