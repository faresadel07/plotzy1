"""
Combine the five job-search markdown files into a single styled HTML
document, then point Chrome at it with --print-to-pdf to produce
docs/Faris_Hamdan_Job_Search_Kit.pdf.

Run: python docs/job-search/build-pdf.py
"""

import os
import subprocess
import sys
from pathlib import Path

import markdown

HERE = Path(__file__).parent
ROOT = HERE.parent.parent
OUT_HTML = HERE / "_build" / "kit.html"
OUT_PDF = HERE.parent / "Faris_Hamdan_Job_Search_Kit.pdf"

SECTIONS = [
    ("README.md", "Overview"),
    ("01_COVER_LETTERS.md", "Chapter 1, Cover Letters"),
    ("02_TARGET_COMPANIES.md", "Chapter 2, Target Companies"),
    ("03_TRACKER.md", "Chapter 3, Application Tracker"),
    ("04_DAILY_PLAYBOOK.md", "Chapter 4, Daily Playbook"),
    ("05_BATCH_01_LIVE_JOBS.md", "Chapter 5, Batch 01 (25 Live Jobs)"),
]

CSS = """
@page {
  size: A4;
  margin: 18mm 16mm;
}

* { box-sizing: border-box; }

html, body {
  margin: 0; padding: 0;
  font-family: "Calibri", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  font-size: 10.5pt;
  line-height: 1.55;
  color: #1a1a1a;
}

h1 {
  font-size: 18pt;
  border-bottom: 2px solid #1a1a1a;
  padding-bottom: 6px;
  margin: 28px 0 12px 0;
  page-break-before: always;
}

h1.cover-title {
  font-size: 32pt;
  border-bottom: none;
  margin: 0;
  page-break-before: avoid;
}

h2 {
  font-size: 13pt;
  margin: 20px 0 8px 0;
  color: #1a1a1a;
}

h3 {
  font-size: 11.5pt;
  margin: 16px 0 6px 0;
  color: #1a1a1a;
}

h4 {
  font-size: 10.5pt;
  margin: 12px 0 4px 0;
  font-weight: 700;
  color: #2a2a2a;
}

p { margin: 6px 0; }

ul, ol { margin: 6px 0 6px 22px; padding: 0; }
li { margin: 3px 0; }

a {
  color: #0a4dc4;
  text-decoration: none;
  word-break: break-all;
}

code {
  font-family: "Consolas", "Courier New", monospace;
  background: #f3f3f3;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 9.5pt;
}

pre {
  background: #f6f6f6;
  border-left: 3px solid #0a4dc4;
  padding: 10px 12px;
  border-radius: 4px;
  overflow-wrap: break-word;
  white-space: pre-wrap;
  font-family: "Consolas", "Courier New", monospace;
  font-size: 9pt;
  line-height: 1.45;
  page-break-inside: avoid;
}

pre code {
  background: none;
  padding: 0;
  font-size: 9pt;
}

blockquote {
  border-left: 3px solid #ccc;
  padding-left: 14px;
  color: #444;
  margin: 8px 0;
  font-style: italic;
}

table {
  border-collapse: collapse;
  width: 100%;
  margin: 10px 0;
  page-break-inside: avoid;
  font-size: 9.5pt;
}

th, td {
  border: 1px solid #d0d0d0;
  padding: 6px 8px;
  text-align: left;
  vertical-align: top;
}

th {
  background: #ececec;
  font-weight: 700;
  color: #1a1a1a;
}

tr:nth-child(even) td { background: #fafafa; }

hr {
  border: none;
  border-top: 1px solid #d0d0d0;
  margin: 18px 0;
}

/* Cover page */
.cover {
  page-break-after: always;
  text-align: center;
  padding-top: 80px;
}
.cover .subtitle {
  font-size: 14pt;
  color: #555;
  margin-top: 14px;
  font-weight: 400;
}
.cover .author {
  margin-top: 60px;
  font-size: 14pt;
  color: #1a1a1a;
  font-weight: 600;
}
.cover .meta {
  margin-top: 6px;
  font-size: 10pt;
  color: #777;
}

/* Table of contents */
.toc { page-break-after: always; }
.toc h1 { page-break-before: avoid; margin-top: 0; }
.toc ol { font-size: 11pt; line-height: 2; }

/* Section title page-break helpers */
.section-anchor { display: block; height: 0; visibility: hidden; }
"""

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Faris Hamdan, Job Search Kit</title>
<style>{css}</style>
</head>
<body>

<div class="cover">
  <h1 class="cover-title">Job Search Kit</h1>
  <div class="subtitle">Cover letters, target companies, tracker, daily playbook,<br/>and 25 live jobs ready to apply to.</div>
  <div class="author">Faris Hamdan</div>
  <div class="meta">Built 2026-05-27 to support the launch of the Plotzy.co job search.</div>
</div>

<div class="toc">
  <h1>Contents</h1>
  <ol>
    {toc_items}
  </ol>
</div>

{body}

</body>
</html>
"""


def slug(name: str) -> str:
    return name.replace(" ", "-").replace(",", "").lower()


def main() -> int:
    if not OUT_HTML.parent.exists():
        OUT_HTML.parent.mkdir(parents=True, exist_ok=True)

    md = markdown.Markdown(
        extensions=["extra", "tables", "fenced_code", "sane_lists"],
        output_format="html5",
    )

    rendered = []
    toc_items = []
    for filename, title in SECTIONS:
        path = HERE / filename
        if not path.exists():
            print(f"warn: missing {path}")
            continue
        with path.open("r", encoding="utf-8") as fh:
            md_text = fh.read()
        md.reset()
        html_body = md.convert(md_text)
        section_id = slug(title)
        rendered.append(
            f'<section id="{section_id}"><h1>{title}</h1>{html_body}</section>'
        )
        toc_items.append(f'<li><a href="#{section_id}">{title}</a></li>')

    final_html = HTML_TEMPLATE.format(
        css=CSS,
        toc_items="\n    ".join(toc_items),
        body="\n\n".join(rendered),
    )

    OUT_HTML.write_text(final_html, encoding="utf-8")
    print(f"html written: {OUT_HTML}")

    # Now invoke Chrome to print to PDF.
    chrome = (
        r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    )
    if not Path(chrome).exists():
        print(f"error: Chrome not found at {chrome}", file=sys.stderr)
        return 1

    url = "file:///" + str(OUT_HTML).replace("\\", "/")
    cmd = [
        chrome,
        "--headless=new",
        "--disable-gpu",
        f"--print-to-pdf={OUT_PDF}",
        "--no-pdf-header-footer",
        "--virtual-time-budget=4000",
        url,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"chrome stderr: {result.stderr}", file=sys.stderr)
    if OUT_PDF.exists():
        kb = OUT_PDF.stat().st_size / 1024
        print(f"pdf built: {OUT_PDF} ({kb:.1f} KB)")
        return 0
    print("pdf failed", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
