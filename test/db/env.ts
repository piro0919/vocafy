import { testUrl } from './urls';

// catalog.ts は読み込んだときに DATABASE_URL を確かめるので、テストのファイルを読み込む前にテスト用の DB を指しておく
process.env.DATABASE_URL = testUrl;
