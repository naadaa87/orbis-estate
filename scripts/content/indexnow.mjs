#!/usr/bin/env node
// 새로 공개·수정된 주소를 IndexNow(네이버 서치어드바이저·빙 등)에 알립니다.
// build.mjs가 만든 scripts/content/.out/changed-urls.json 을 읽습니다.
// 키 파일: 저장소 맨 위의 849e717d7a8c7b57c5bb3e1b2b1bebda.txt (사이트 주소/849e717d7a8c7b57c5bb3e1b2b1bebda.txt 로 열려야 합니다)
import fs from 'node:fs';
import { execSync } from 'node:child_process';
const KEY = '849e717d7a8c7b57c5bb3e1b2b1bebda';
const HOST = 'orbis-estate.com';
const file = new URL('./.out/changed-urls.json', import.meta.url);
let urls = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
// 사이트 파일까지 함께 올린 커밋이면(빌드 결과가 이미 저장소에 있음) 이번 push에서 바뀐 원고로 주소를 만듭니다
if (!urls.length && process.env.DIFF_BASE && !/^0+$/.test(process.env.DIFF_BASE)) {
  try {
    try { execSync('git fetch --quiet --deepen=50 origin main', { stdio: 'ignore' }); } catch {}
    const names = execSync(`git diff --name-only ${process.env.DIFF_BASE} HEAD`, { encoding: 'utf8' }).split('\n').filter(Boolean);
    const set = new Set();
    for (const n of names) {
      let m = n.match(/^content\/insights\/([a-z0-9-]+)\.md$/);
      if (m && fs.existsSync(`insights/${m[1]}.html`)) set.add(`https://${HOST}/insights/${m[1]}`);
      m = n.match(/^content\/pages\/(faq|glossary)\.md$/);
      if (m) set.add(`https://${HOST}/${m[1]}`);
    }
    if (set.size) set.add(`https://${HOST}/insights`);
    urls = [...set];
  } catch (e) { console.log('바뀐 원고 목록을 읽지 못했습니다:', e.message); }
}
if (!urls.length) { console.log('알릴 주소가 없습니다.'); process.exit(0); }
const wait = Number(process.env.INDEXNOW_WAIT || 120);
console.log(`Cloudflare 배포를 기다립니다 (${wait}초)…`);
await new Promise((r) => setTimeout(r, wait * 1000));
// 배포 확인: 첫 주소가 열리는지 최대 5분 확인
for (let i = 0; i < 10; i++) {
  try { const r = await fetch(urls[0], { method: 'HEAD', redirect: 'follow' }); if (r.ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 30000));
}
const body = JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls });
for (const ep of ['https://searchadvisor.naver.com/indexnow', 'https://api.indexnow.org/indexnow']) {
  try {
    const r = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body });
    console.log(ep, r.status);
  } catch (e) { console.log(ep, '실패', e.message); }
}
console.log('알린 주소:', urls.join(', '));
