/**
 * ORBIS 상담 접수 API — Cloudflare Pages Functions
 * 경로: POST /api/lead
 *
 * 이 파일은 zip에 포함된 그대로 Cloudflare Pages에 업로드하면
 * 자동으로 서버리스 함수로 배포됩니다. (별도 서버 불필요)
 *
 * ★ 알림 연결 (Cloudflare 대시보드 → 프로젝트 → Settings → Variables and Secrets):
 *   LEAD_WEBHOOK : 접수 JSON을 전달할 웹훅 URL (Slack/Make/Zapier/Google Chat 등) — 권장
 *   RESEND_API_KEY + LEAD_TO : Resend(이메일 API) 사용 시 — 선택
 * 둘 다 설정하지 않으면 함수는 501을 반환하고,
 * 사이트는 자동으로 '메일 작성 fallback'으로 전환됩니다.
 */
export async function onRequestPost(context) {
  const { request, env } = context;
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });

  let data;
  try {
    data = await request.json();
  } catch (e) {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  // honeypot / 기본 검증
  if (data.website) return json({ ok: true }); // 봇은 조용히 무시
  const phone = (data["연락처"] || "").replace(/[^0-9+]/g, "");
  if (!data["성함"] && !data["담당자"] && !data["이메일"] && !phone) {
    return json({ ok: false, error: "missing_contact" }, 400);
  }
  if (JSON.stringify(data).length > 20000) {
    return json({ ok: false, error: "too_large" }, 400);
  }

  const record = {
    ...data,
    lead_id: "L" + Date.now().toString(36).toUpperCase(),
    received_at: new Date().toISOString(),
    ip_country: request.headers.get("CF-IPCountry") || "",
    user_agent: (request.headers.get("User-Agent") || "").slice(0, 160),
  };

  const lines = Object.entries(record)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  let delivered = false;

  // 1) 웹훅 전달 (권장)
  if (env.LEAD_WEBHOOK) {
    try {
      const r = await fetch(env.LEAD_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "📩 오르비스 상담 접수\n" + lines, ...record }),
      });
      if (r.ok) delivered = true;
    } catch (e) {}
  }

  // 2) Resend 이메일 전달 (선택)
  if (!delivered && env.RESEND_API_KEY && env.LEAD_TO) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.LEAD_FROM || "onboarding@resend.dev",
          to: [env.LEAD_TO],
          subject: `[오르비스 상담접수] ${record["문의유형"] || "일반"} · ${record["성함"] || record["담당자"] || ""}`,
          text: lines,
        }),
      });
      if (r.ok) delivered = true;
    } catch (e) {}
  }

  if (!delivered) {
    // 알림 채널 미설정 → 클라이언트가 메일 fallback을 사용하도록 유도
    return json({ ok: false, error: "not_configured" }, 501);
  }
  return json({ ok: true, lead_id: record.lead_id });
}

export async function onRequest(context) {
  if (context.request.method === "POST") return onRequestPost(context);
  return new Response("Method Not Allowed", { status: 405 });
}
