import os, re

files = []
for root, dirs, filenames in os.walk('frontend/src'):
    for filename in filenames:
        if filename.endswith('.jsx'):
            files.append(os.path.join(root, filename))

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    old_content = content
    
    # In ternary operations or plain strings: replace 'rgba(255, 255, 255, 0.xx)' directly
    # 0.01 to 0.05 -> var(--panel-bg)
    content = re.sub(r'[\'\"\`]rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.0[1-5]\s*\)[\'\"\`]', r'"var(--panel-bg)"', content)
    
    # 0.06 to 0.15 (commonly used for borders or hover bg) -> var(--glass-border) or panel-bg-hover
    # Let's replace specifically in border definitions:
    content = re.sub(r'(border(?:Top|Bottom|Left|Right)?\s*:\s*[\'\"\`].*?)rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.[0-9]+\s*\)', r'\g<1>var(--glass-border)', content)
    
    # Remaining 0.06 to 0.99 -> var(--panel-bg-hover)
    content = re.sub(r'[\'\"\`]rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.[0-9]+\s*\)[\'\"\`]', r'"var(--panel-bg-hover)"', content)
    
    if content != old_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Patched {filepath}')
