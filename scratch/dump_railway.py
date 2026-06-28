import requests, json
s = requests.Session()
r = s.post('https://smilecarepro-production.up.railway.app/api/auth/login', json={'username':'a','password':'a'})
token = r.json().get('token')
res = s.get('https://smilecarepro-production.up.railway.app/api/patients/?status=مستمر', headers={'Authorization': 'Bearer '+token}).json()
with open('railway_test.json', 'w', encoding='utf-8') as f:
    json.dump(res[0] if res else {}, f, ensure_ascii=False, indent=2)
