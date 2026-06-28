import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

log_path = r"C:\Users\Dell\.gemini\antigravity\brain\90c51f5f-3e50-4177-905c-273cc6b49b3b\.system_generated\tasks\task-2957.log"

def search():
    if not os.path.exists(log_path):
        print("Log not found")
        return
        
    with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
        print(f"Total lines: {len(lines)}")
        for idx, line in enumerate(lines):
            if "appointments" in line and "POST" in line:
                print(f"{idx+1}: {line.strip()}")

if __name__ == "__main__":
    search()
