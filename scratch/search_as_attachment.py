import os

routes_dir = r"c:\Users\Dell\Desktop\claude 1 - Copy - Copy - Copy\claude 1 - Copy - Copy - Copy\dental-clinic\backend\routes"

def search():
    for file in os.listdir(routes_dir):
        if file.endswith(".py"):
            path = os.path.join(routes_dir, file)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                    if "as_attachment" in content:
                        lines = content.split("\n")
                        for idx, line in enumerate(lines):
                            if "as_attachment" in line:
                                print(f"{file}:{idx+1}: {line.strip()}")
            except Exception as e:
                print(f"Error reading {file}: {e}")

if __name__ == "__main__":
    search()
