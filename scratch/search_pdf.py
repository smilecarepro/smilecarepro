import os

frontend_dir = r"c:\Users\Dell\Desktop\claude 1 - Copy - Copy - Copy\claude 1 - Copy - Copy - Copy\dental-clinic\frontend\src"

def search():
    for root, dirs, files in os.walk(frontend_dir):
        for file in files:
            if file.endswith((".jsx", ".js")):
                path = os.path.join(root, file)
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        content = f.read()
                        if "pdf" in content or "PDF" in content:
                            # print matching lines
                            lines = content.split("\n")
                            for idx, line in enumerate(lines):
                                if "pdf" in line or "PDF" in line:
                                    print(f"{os.path.basename(path)}:{idx+1}: {line.strip()}")
                except Exception as e:
                    print(f"Error reading {file}: {e}")

if __name__ == "__main__":
    search()
