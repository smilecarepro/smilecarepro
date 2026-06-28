import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

log_path = r"C:\Users\Dell\.gemini\antigravity\brain\90c51f5f-3e50-4177-905c-273cc6b49b3b\.system_generated\tasks\task-2957.log"

def read_last_lines():
    if not os.path.exists(log_path):
        print("Log file not found")
        return
        
    with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
        print(f"Total lines: {len(lines)}")
        for line in lines[-50:]:
            print(line.strip())

if __name__ == "__main__":
    read_last_lines()
