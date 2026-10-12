"""Development only: download the design system's fonts for self-hosting."""
import concurrent.futures
import pathlib
import re
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1] / 'public/assets/fonts'
ROOT.mkdir(parents=True, exist_ok=True)
urls = [
    'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap',
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,300,0,0&display=swap',
]
css = '\n'.join(urllib.request.urlopen(u, timeout=30).read().decode() for u in urls)
fonts = list(dict.fromkeys(re.findall(r'https://fonts.gstatic.com/[^)]+', css)))
def download(item):
    index, url = item
    name = f'font-{index}{pathlib.Path(url).suffix}'
    (ROOT / name).write_bytes(urllib.request.urlopen(url, timeout=30).read())
    return url, './' + name
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    for url, name in pool.map(download, enumerate(fonts)):
        css = css.replace(url, name)
(ROOT / 'fonts.css').write_text(css)
print(f'{len(fonts)} local fonts prepared')
