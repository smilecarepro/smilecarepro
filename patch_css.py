import re

with open('frontend/src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

old_content = content

# Avoid replacing the root variable definitions
# We only want to replace actual property values.
# Let's use negative lookbehind to avoid replacing variable definitions like `--glass-border: rgba(0, 0, 0, 0.15);`
# But python's re module requires fixed width for lookbehind.
# So we just replace all, and then manually restore the ones we know we shouldn't touch.

# 1. Borders
# Find `border: ... rgba(...)` and `border-color: ... rgba(...)`
# and replace the `rgba` part with `var(--glass-border)`
def replace_border(match):
    full_str = match.group(0)
    rgba_str = re.search(r'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.[0-9]+\s*\)', full_str)
    if rgba_str:
        return full_str.replace(rgba_str.group(0), 'var(--glass-border)')
    return full_str

content = re.sub(r'border(?:-color|-top|-bottom|-left|-right)?\s*:.*?rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.[0-9]+\s*\).*?;', replace_border, content)

# 2. Box shadows
def replace_shadow(match):
    full_str = match.group(0)
    rgba_str = re.search(r'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.[0-9]+\s*\)', full_str)
    if rgba_str:
        return full_str.replace(rgba_str.group(0), 'var(--glass-border)')
    return full_str
content = re.sub(r'box-shadow\s*:.*?rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.[0-9]+\s*\).*?;', replace_shadow, content)

# 3. Backgrounds (opacity <= 0.05) -> panel-bg
def replace_bg_low(match):
    full_str = match.group(0)
    rgba_str = re.search(r'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.0[1-5]\s*\)', full_str)
    if rgba_str:
        return full_str.replace(rgba_str.group(0), 'var(--panel-bg)')
    return full_str
content = re.sub(r'background\s*:.*?rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.0[1-5]\s*\).*?;', replace_bg_low, content)

# 4. Backgrounds (opacity > 0.05) -> panel-bg-hover
def replace_bg_high(match):
    full_str = match.group(0)
    # Ignore the root variable assignments
    if "--bg-card" in full_str: return full_str
    rgba_str = re.search(r'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.[0-9]+\s*\)', full_str)
    if rgba_str:
        return full_str.replace(rgba_str.group(0), 'var(--panel-bg-hover)')
    return full_str
content = re.sub(r'background\s*:.*?rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.[0-9]+\s*\).*?;', replace_bg_high, content)

# 5. Fix any missed SVG backgrounds (don't want to break the select dropdown arrow)
content = content.replace("stroke='var(--panel-bg-hover)'", "stroke='rgba(255,255,255,0.3)'")
content = content.replace("stroke='var(--glass-border)'", "stroke='rgba(255,255,255,0.3)'")
content = content.replace("stroke='var(--panel-bg)'", "stroke='rgba(255,255,255,0.3)'")

if content != old_content:
    with open('frontend/src/index.css', 'w', encoding='utf-8') as f:
        f.write(content)
    print('index.css successfully patched')
else:
    print('No changes needed')
