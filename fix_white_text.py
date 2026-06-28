import os, glob, re

files = []
for root, dirs, filenames in os.walk('frontend/src'):
    for filename in filenames:
        if filename.endswith('.jsx'):
            files.append(os.path.join(root, filename))

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    changed = False
    for i, line in enumerate(lines):
        if re.search(r'color:\s*([\'\x22]white[\'\x22]|[\'\x22]#fff[\'\x22])', line):
            if 'background' not in line or 'background: \x22transparent\x22' in line or 'background: \x22none\x22' in line or 'background: \'none\'' in line or 'background: \'transparent\'' in line:
                new_line = re.sub(r'color:\s*([\'\x22]white[\'\x22]|[\'\x22]#fff[\'\x22])', 'color: \x22var(--text-main)\x22', line)
                lines[i] = new_line
                changed = True

    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print(f'Patched {filepath}')
