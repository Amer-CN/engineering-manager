import urllib.request
import base64
import json
import os

# 创建目录
os.makedirs("storage-analyzer/scripts", exist_ok=True)
os.makedirs("storage-analyzer/assets", exist_ok=True)
os.makedirs("storage-analyzer/references", exist_ok=True)

# 文件列表
files = [
    ("scripts/scan.py", "https://api.github.com/repos/KKKKhazix/khazix-skills/contents/storage-analyzer/scripts/scan.py?ref=main"),
    ("scripts/server.py", "https://api.github.com/repos/KKKKhazix/khazix-skills/contents/storage-analyzer/scripts/server.py?ref=main"),
    ("scripts/build_report.py", "https://api.github.com/repos/KKKKhazix/khazix-skills/contents/storage-analyzer/scripts/build_report.py?ref=main"),
    ("references/windows.md", "https://api.github.com/repos/KKKKhazix/khazix-skills/contents/storage-analyzer/references/windows.md?ref=main"),
    ("assets/report_template.html", "https://api.github.com/repos/KKKKhazix/khazix-skills/contents/storage-analyzer/assets/report_template.html?ref=main"),
]

for local_path, url in files:
    print(f"Downloading {local_path}...")
    try:
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read().decode('utf-8'))
            content = base64.b64decode(data['content'])
            with open(f"storage-analyzer/{local_path}", 'wb') as f:
                f.write(content)
            print(f"  Saved to storage-analyzer/{local_path}")
    except Exception as e:
        print(f"  Error: {e}")

print("Done!")
