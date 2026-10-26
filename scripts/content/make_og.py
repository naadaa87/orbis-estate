# -*- coding: utf-8 -*-
"""인사이트 글 대표 이미지(1200×630) 만들기 — 검색·공유 미리보기용

사용법: python3 scripts/content/make_og.py <slug> [<slug> ...]   (모든 글: --all)
결과:   assets/insights/<slug>.jpg  (글 머리말에 cover: /assets/insights/<slug>.jpg 를 적어 주세요)
필요:   Playwright(파이썬) + Chromium. 글꼴은 scripts/content/fonts 안의 Pretendard를 씁니다.
"""
import html, json, os, re, sys, tempfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
FONT = os.path.join(ROOT, "scripts/content/fonts/PretendardVariable.woff2")
LOGO = os.path.join(ROOT, "assets/logo-icon.png")
CATS = {
    "market": ("시장동향", "#27406B"), "invest": ("투자전략", "#866829"), "area": ("상권분석", "#2F6F6A"),
    "brand": ("브랜드·출점", "#A8513A"), "legal": ("계약·법률", "#3D4E6E"), "asset": ("공실·자산관리", "#5B6A3A"),
}


def meta_of(slug):
    text = open(os.path.join(ROOT, "content/insights", slug + ".md"), encoding="utf-8").read()
    fm = text.split("\n---", 1)[0]
    def get(k):
        m = re.search(rf"^{k}:\s*(.+)$", fm, re.M)
        return m.group(1).strip().strip('"') if m else ""
    return {"title": get("title"), "category": get("category"), "date": get("date")[:10]}


def page(meta):
    name, color = CATS.get(meta["category"], ("인사이트", "#C5A15A"))
    t = html.escape(meta["title"])
    size = 64 if len(meta["title"]) <= 22 else 58 if len(meta["title"]) <= 30 else 52
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@font-face{{font-family:P;src:url('file://{FONT}') format('woff2-variations');font-weight:100 900}}
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:1200px;height:630px;background:#fff;overflow:hidden;font-family:P,sans-serif;color:#14243E}}
.ring{{position:absolute;border-radius:50%;border:2px solid rgba(197,161,90,.35)}}
.r1{{width:620px;height:620px;right:-230px;top:-250px}}
.r2{{width:420px;height:420px;right:-130px;top:-150px;border-color:#EFE6D4}}
.bar{{position:absolute;left:0;top:0;bottom:0;width:14px;background:{color}}}
.wrap{{position:absolute;left:90px;right:120px;top:84px;bottom:70px;display:flex;flex-direction:column}}
.cat{{align-self:flex-start;font-size:24px;font-weight:800;color:{color};border:2.5px solid {color};border-radius:999px;padding:7px 22px}}
h1{{font-size:{size}px;font-weight:800;line-height:1.3;letter-spacing:-.02em;margin-top:34px;word-break:keep-all;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}}
.foot{{margin-top:auto;display:flex;align-items:center;gap:16px;font-size:24px;color:#5F6A7B;border-top:2px solid #E5E7EB;padding-top:26px}}
.foot img{{width:40px}}
.foot b{{color:#14243E;font-weight:800}}
.foot span{{margin-left:auto;font-size:21px;color:#866829;font-weight:700}}
</style></head><body><div class="ring r1"></div><div class="ring r2"></div><div class="bar"></div>
<div class="wrap"><div class="cat">{name}</div><h1>{t}</h1>
<div class="foot"><img src="file://{LOGO}" alt=""><b>오르비스중개법인</b> 인사이트<span>orbis-estate.com</span></div></div>
</body></html>"""


def main(slugs):
    from playwright.sync_api import sync_playwright
    from PIL import Image
    os.makedirs(os.path.join(ROOT, "assets/insights"), exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=1)
        for slug in slugs:
            meta = meta_of(slug)
            with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as f:
                f.write(page(meta)); tmp = f.name
            pg.goto("file://" + tmp); pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(250)
            png = tmp.replace(".html", ".png"); pg.screenshot(path=png)
            out = os.path.join(ROOT, "assets/insights", slug + ".jpg")
            Image.open(png).convert("RGB").save(out, quality=86, optimize=True, progressive=True)
            os.unlink(tmp); os.unlink(png)
            print("만듦:", os.path.relpath(out, ROOT))
        b.close()


if __name__ == "__main__":
    args = sys.argv[1:]
    if args == ["--all"]:
        args = sorted(f[:-3] for f in os.listdir(os.path.join(ROOT, "content/insights")) if f.endswith(".md"))
    if not args:
        print(__doc__); sys.exit(1)
    main(args)
