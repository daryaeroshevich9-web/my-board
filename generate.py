import html

COLORS = {
    "Авиабит": "#fff3a3",
    "Портал 2.0": "#ffc2d1",
    "Прочее": "#bde0fe",
}
ORDER = ["Авиабит", "Портал 2.0", "Прочее"]


def parse_markdown(md_text):
    columns = {}
    current = None
    for line in md_text.split("\n"):
        s = line.strip()
        if s.startswith("## "):
            current = s[3:].strip()
            columns.setdefault(current, [])
        elif current is not None and s.startswith("- [ ]"):
            columns[current].append({"text": s[5:].strip(), "done": False})
        elif current is not None and s.startswith("- [x]"):
            columns[current].append({"text": s[5:].strip(), "done": True})
    return columns


def build_html(columns):
    names = [n for n in ORDER if n in columns]
    names += [n for n in columns if n not in ORDER]
    zones = ""
    for name in names:
        stickies = ""
        for t in columns[name]:
            cls = "sticky done" if t["done"] else "sticky"
            color = COLORS.get(name, "#d8f3dc")
            stickies += (
                '<div class="' + cls + '" style="background:' + color + '">'
                + html.escape(t["text"]) + "</div>"
            )
        zones += (
            '<div class="zone"><div class="zone-tag">' + html.escape(name)
            + '</div><div class="stickies">' + stickies + "</div></div>"
        )
    css = """
    body { margin:0; padding:24px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
      background-color:#b98a5a;
      background-image:
        radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1.6px),
        radial-gradient(rgba(80,50,20,0.20) 1px, transparent 1.6px),
        radial-gradient(rgba(255,255,255,0.08) 2px, transparent 2.6px);
      background-size:14px 14px,22px 22px,34px 34px;
      background-position:0 0,7px 9px,12px 4px;
      color:#3d2b1f; }
    h1 { text-align:center; color:#fdf6e3; font-size:22px; margin:4px 0 26px; text-shadow:0 2px 3px rgba(0,0,0,.35); }
    .zones { display:flex; gap:28px; flex-wrap:wrap; justify-content:center; align-items:flex-start; }
    .zone { width:320px; }
    .zone-tag { display:inline-block; background:#fdf6e3; padding:8px 16px; font-weight:700; font-size:15px;
      box-shadow:0 2px 5px rgba(0,0,0,.3); transform:rotate(-1.5deg); position:relative; margin-bottom:20px; }
    .zone-tag::before { content:''; position:absolute; top:-7px; left:50%; margin-left:-7px; width:14px; height:14px;
      border-radius:50%; background:radial-gradient(circle at 35% 30%, #868e96, #343a40 70%); box-shadow:0 2px 3px rgba(0,0,0,.4); }
    .stickies { display:flex; flex-direction:column; gap:18px; }
    .sticky { padding:16px 14px 18px; min-height:64px; font-size:15px; line-height:1.35; word-break:break-word;
      border-radius:2px; box-shadow:2px 4px 9px rgba(0,0,0,.3); position:relative; }
    .sticky::before { content:''; position:absolute; top:-7px; left:50%; margin-left:-7px; width:14px; height:14px;
      border-radius:50%; background:radial-gradient(circle at 35% 30%, #ff8787, #c92a2a 70%); box-shadow:0 2px 3px rgba(0,0,0,.45); }
    .sticky:nth-child(odd) { transform:rotate(-1.6deg); }
    .sticky:nth-child(even) { transform:rotate(1.4deg); }
    .sticky.done { opacity:.55; text-decoration:line-through; }
    @media (max-width:720px) {
      body { padding:14px; }
      .zones { flex-direction:column; gap:24px; }
      .zone { width:100%; }
      .sticky:nth-child(odd) { transform:rotate(-0.8deg); }
      .sticky:nth-child(even) { transform:rotate(0.7deg); }
    }
    """
    return (
        "<!DOCTYPE html>\n<html lang=\"ru\">\n<head>\n<meta charset=\"UTF-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n"
        "<title>Доска Дарьи</title>\n<style>" + css + "</style>\n</head>\n<body>\n"
        "<h1>Доска Дарьи</h1>\n<div class=\"zones\">" + zones + "</div>\n</body>\n</html>"
    )


with open("notes.md", "r", encoding="utf-8") as f:
    md = f.read()
with open("index.html", "w", encoding="utf-8") as f:
    f.write(build_html(parse_markdown(md)))
