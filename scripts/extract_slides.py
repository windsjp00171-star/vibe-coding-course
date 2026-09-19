"""從各單元網頁擷取簡報內容，輸出成 JSON 給 build_slides.js 使用。

網站是教材的單一來源：改了網頁，重跑這支腳本和 build_slides.js，簡報就跟著更新。
執行：python scripts/extract_slides.py → teacher/slides/content.json（講師私人資料夾）
"""
import json
import pathlib
import re
import subprocess

from bs4 import BeautifulSoup, NavigableString

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "teacher" / "slides" / "content.json"
MAX_CARDS = 6
# 這些容器由 JavaScript 產生互動內容，簡報上改成「請打開網站操作」
INTERACTIVE_ATTRS = ("data-sim", "data-quiz", "data-gate", "data-match", "data-order", "data-picker", "data-secretary",
                     "data-matrix", "data-chat", "data-push-toggles", "data-strategies", "data-spot-code", "data-scan-input",
                     "data-prompt-input", "data-meters", "data-wall", "data-glossary", "data-rules", "data-traps",
                     "data-flow", "data-mask-input", "data-agency", "data-utc", "data-rls", "data-line-pits", "data-pits",
                     "data-meters", "data-meters-after")


def text(el) -> str:
    """取出純文字，<br> 變換行，多餘空白收起來。"""
    if el is None:
        return ""
    for br in el.find_all("br"):
        br.replace_with(NavigableString("\n"))
    raw = el.get_text("", strip=False)  # 中文行內標籤之間不補空白（原始碼裡的英文空格會保留）
    lines = [re.sub(r"[ \t　]+", " ", ln).strip() for ln in raw.split("\n")]
    return "\n".join(ln for ln in lines if ln)


def node_json(expr: str, path: pathlib.Path):
    out = subprocess.run(["node", "-e", expr, str(path)], capture_output=True, text=True, encoding="utf-8", check=True).stdout
    return json.loads(out)


def is_interactive(section) -> bool:
    for attr in INTERACTIVE_ATTRS:
        for el in section.find_all(attrs={attr: True}):
            if "screen-only" in (el.get("class") or []) or not el.get_text(strip=True) or el.name in ("textarea", "input"):
                return True
    return False


def cards(section):
    found = []
    for card in section.select(".card, .flip"):
        if card.find_parent(class_="flip") is not None and "flip" not in (card.get("class") or []):
            continue
        if "print-only" in (card.get("class") or []) or card.find_parent(class_="print-only") is not None:
            continue  # 紙本學習單專用，不放簡報
        h = card.find("h3")
        if not h:
            continue
        front = card.select_one(".flip-front") or card
        p = front.find("p")
        pill = card.select_one(".pill")
        found.append({"title": text(h), "text": text(p), "tag": text(pill)})
    return found[:MAX_CARDS]


def table(section):
    t = section.find("table", class_=["compare", "talk-table"])
    if not t:
        return None
    head = [text(th) for th in t.select("thead th")]
    rows = [[text(c) for c in tr.find_all(["th", "td"])] for tr in t.select("tbody tr")]
    return {"head": head, "rows": rows}


def steps(section):
    ol = section.select_one(".workshop ol") or section.select_one("ol.install-steps")
    if not ol:
        return []
    out = []
    for li in ol.find_all("li", recursive=False):
        time_el = li.select_one(".time")
        title_el = li.select_one(".step-title")
        t = text(time_el) if time_el else ""
        if time_el:
            time_el.extract()
        title = text(title_el) if title_el else ""
        if title_el:
            title_el.extract()
        out.append({"time": t, "title": title, "text": text(li)})
    return out


def section_data(sec):
    head = sec.select_one(".section-head")
    h2 = sec.find("h2")
    intro = head.find("p") if head else None
    analogy = sec.select_one(".analogy")
    callout = sec.select_one(".callout")
    prompt = sec.select_one("pre.gen-out")
    return {
        "id": sec.get("id") or "",
        "num": text(sec.select_one(".section-num")),
        "kicker": text(sec.select_one(".kicker")),
        "title": text(h2),
        "intro": text(intro),
        "cards": cards(sec),
        "table": table(sec),
        "analogy": text(analogy),
        "callout": text(callout),
        "prompt": text(prompt) if prompt else "",
        "steps": steps(sec),
        "workshop": sec.select_one(".workshop") is not None,
        "interactive": is_interactive(sec),
        "slots": [s["data-teacher-slot"] for s in sec.select("[data-teacher-slot]")],
    }


def module_data(page: pathlib.Path, quiz_bank: dict, notes: dict) -> dict:
    soup = BeautifulSoup(page.read_text(encoding="utf-8"), "html.parser")
    mid = soup.body["data-module"]
    hero = soup.select_one(".module-hero")
    sections = [section_data(s) for s in soup.select("main > section.slide") if "module-hero" not in (s.get("class") or [])]
    homework = next((s for s in soup.select("main > section") if s.get("id") == "homework"), None)
    return {
        "id": mid,
        "file": f"modules/{page.name}",
        "eyebrow": text(hero.select_one(".eyebrow")),
        "title": text(hero.find("h1")),
        "lead": text(hero.select_one(".lead")),
        "goals": [text(li) for li in hero.select(".goals li")],
        "phases": [text(p) for p in hero.select(".phase")],
        "heroSlots": [s["data-teacher-slot"] for s in hero.select("[data-teacher-slot]")],
        "sections": [s for s in sections if s["id"] not in ("quiz", "homework")],
        "homework": [text(li) for li in homework.select(".checklist li")] if homework else [],
        "quiz": quiz_bank.get(mid, []),
        "notes": {k: v for k, v in notes.items() if k.startswith(mid + "-")},
    }


def main() -> None:
    quiz_bank = node_json("process.stdout.write(JSON.stringify(require(process.argv[1])))", ROOT / "assets/js/quiz-bank.js")
    notes_path = ROOT / "teacher" / "notes.js"
    notes = {}
    if notes_path.exists():
        raw = node_json("global.window={};require(process.argv[1]);process.stdout.write(JSON.stringify(window.TEACHER_NOTES))", notes_path)
        notes = {k: BeautifulSoup(v["html"], "html.parser").get_text(" ", strip=True) for k, v in raw.items()}
    modules = [module_data(p, quiz_bank, notes) for p in sorted((ROOT / "modules").glob("*.html"))]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(modules, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"已擷取 {len(modules)} 個單元，{sum(len(m['sections']) for m in modules)} 個段落 → {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
