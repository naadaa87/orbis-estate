/**
 * 오르비스중개법인 — 새 상담 접수 알림 메일 (Google Apps Script)
 *
 * 홈페이지 문의 → Cloudflare(/api/lead)가 D1에 저장 → 이 스크립트로 접수 내용 전달 → Gmail 알림
 * 접수 원본은 D1(관리자 화면 → 상담 접수)에 있고, 이 스크립트는 알림만 보냅니다. 따로 저장하지 않습니다.
 *
 * 설치
 *  1. script.google.com → 새 프로젝트 → 이 파일 내용을 붙여 넣기
 *  2. 아래 SECRET에 Cloudflare의 LEAD_WEBHOOK_SECRET과 같은 값을 넣기
 *  3. 배포 → 새 배포 → 유형: 웹 앱 / 실행 사용자: 나 / 액세스 권한: 모든 사용자 → 배포 → 권한 허용
 *  4. 나온 웹 앱 URL(https://script.google.com/macros/s/…/exec)을 Cloudflare의 LEAD_WEBHOOK에 넣기
 */

// 알림 받을 주소. 비워 두면 이 스크립트를 만든 구글 계정으로 보냅니다. 여러 명이면 쉼표로 구분합니다.
const TO = '';
// Cloudflare 환경변수 LEAD_WEBHOOK_SECRET과 같은 값 (다르면 알림을 보내지 않습니다)
const SECRET = 'PUT-THE-SAME-SECRET-HERE';

const HIDE = ['text', 'secret', 'admin_url', 'lead_id', 'received_at', 'ip_country', '성함', '연락처', '이메일', '문의유형', '접수페이지'];

function doPost(e) {
  var d = {};
  try { d = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: 'invalid' }); }
  if (!SECRET || d.secret !== SECRET) return out_({ ok: false, error: 'forbidden' });

  var name = d['성함'] || d['담당자'] || '이름 없음';
  var type = d['문의유형'] || '상담';
  var phone = d['연락처'] || '';
  var when = Utilities.formatDate(d.received_at ? new Date(d.received_at) : new Date(), 'Asia/Seoul', 'yyyy.MM.dd HH:mm');
  var rows = Object.keys(d).filter(function (k) { return HIDE.indexOf(k) < 0; }).map(function (k) {
    return '<tr><td style="padding:8px 12px;color:#5F6A7B;font-size:13px;white-space:nowrap;vertical-align:top;border-bottom:1px solid #EEF0F3">' + esc_(k) +
      '</td><td style="padding:8px 12px;color:#14243E;font-size:14px;border-bottom:1px solid #EEF0F3">' + esc_(d[k]).replace(/\n/g, '<br>') + '</td></tr>';
  }).join('');
  var tel = String(phone).replace(/[^0-9+]/g, '');
  var html =
    '<div style="font-family:Apple SD Gothic Neo,Malgun Gothic,sans-serif;max-width:620px;margin:0 auto;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden">' +
    '<div style="background:#14243E;padding:18px 22px;color:#fff"><div style="font-size:12px;color:#C5A15A;letter-spacing:.08em">ORBIS · 새 상담 접수</div>' +
    '<div style="font-size:19px;font-weight:700;margin-top:6px">' + esc_(type) + '</div></div>' +
    '<div style="padding:18px 22px"><div style="font-size:17px;font-weight:700;color:#14243E">' + esc_(name) + '</div>' +
    '<div style="margin-top:4px;font-size:15px"><a href="tel:' + tel + '" style="color:#866829;font-weight:700;text-decoration:none">' + esc_(phone) + '</a>' +
    (d['이메일'] ? ' · ' + esc_(d['이메일']) : '') + '</div>' +
    '<div style="margin-top:4px;font-size:12px;color:#646E7E">접수 ' + when + ' · ' + esc_(d.lead_id || '') + '</div>' +
    '<table style="width:100%;border-collapse:collapse;margin-top:14px">' + rows + '</table>' +
    (d.admin_url ? '<div style="margin-top:18px"><a href="' + esc_(d.admin_url) + '" style="display:inline-block;background:#C5A15A;color:#1C1507;font-weight:700;padding:11px 18px;border-radius:999px;text-decoration:none">관리자 화면에서 보기</a></div>' : '') +
    '</div></div>';
  var plain = '[' + type + '] ' + name + ' ' + phone + '\n' + (d.text || '') + '\n' + (d.admin_url || '');
  MailApp.sendEmail({
    to: TO || Session.getEffectiveUser().getEmail(),
    subject: '[오르비스 상담접수] ' + type + ' · ' + name,
    htmlBody: html,
    body: plain,
    name: '오르비스 홈페이지',
  });
  return out_({ ok: true });
}

function doGet() { return out_({ ok: true, service: 'orbis-lead-alert' }); }

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function esc_(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

/** 설치 확인용: 편집기에서 이 함수를 실행하면 시험 메일이 갑니다. */
function testAlert() {
  doPost({ postData: { contents: JSON.stringify({ secret: SECRET, 문의유형: '시험 접수', 성함: '테스트', 연락처: '010-0000-0000', '희망 지역': '서울 강남구', lead_id: 'TEST', received_at: new Date().toISOString(), admin_url: 'https://orbis-estate.com/admin/#/leads' }) } });
}
