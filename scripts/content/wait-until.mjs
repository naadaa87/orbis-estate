#!/usr/bin/env node
// 정기 발행 시각(한국 시간)까지 기다립니다. 이미 지났거나 90분 넘게 남았으면 바로 끝냅니다.
// 사용법: node scripts/content/wait-until.mjs 11:00
const [hh, mm] = (process.argv[2] || '11:00').split(':').map(Number);
const now = new Date();
const k = new Date(now.getTime() + 9 * 3600e3);
const target = Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate(), hh - 9, mm, 5);
const ms = target - now.getTime();
if (ms > 0 && ms < 90 * 60e3) {
  console.log(`정기 발행 시각까지 ${Math.round(ms / 1000)}초 기다립니다.`);
  await new Promise((r) => setTimeout(r, ms));
} else {
  console.log('기다리지 않고 바로 진행합니다.');
}
