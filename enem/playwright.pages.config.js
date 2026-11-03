import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/pages',workers:1,use:{trace:'retain-on-failure',screenshot:'only-on-failure',launchOptions:{...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--disable-dev-shm-usage']}}});
