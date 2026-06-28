import re

def fix_loading_interval(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update loadSchedule signature
    content = re.sub(
        r'const loadSchedule = \(\) => \{',
        r'const loadSchedule = (silent = false) => {',
        content
    )

    # 2. Update setLoadingSchedule(true)
    content = re.sub(
        r'setLoadingSchedule\(true\);',
        r'if (!silent) setLoadingSchedule(true);',
        content
    )

    # 3. Update setLoadingSchedule(false)
    content = re.sub(
        r'setLoadingSchedule\(false\);',
        r'if (!silent) setLoadingSchedule(false);',
        content
    )

    # 4. Update setInterval to pass silent=true
    content = re.sub(
        r'setInterval\(loadSchedule, 5000\)',
        r'setInterval(() => loadSchedule(true), 5000)',
        content
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

fix_loading_interval('frontend/src/pages/SecretaryDashboard.jsx')
fix_loading_interval('frontend/src/pages/DoctorDashboard.jsx')

print("Fixed loadSchedule polling in dashboards.")
