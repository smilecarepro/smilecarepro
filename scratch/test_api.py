import requests
import json

s = requests.Session()
r = s.post('https://smilecarepro-production.up.railway.app/api/auth/login', json={'username':'a','password':'a'})
token = r.json().get('token')

r1 = s.get('https://smilecarepro-production.up.railway.app/api/patients/?status=مستمر', headers={'Authorization': 'Bearer '+token})
r2 = s.get('https://smilecarepro-production.up.railway.app/api/patients/?status=مديون', headers={'Authorization': 'Bearer '+token})
r3 = s.get('https://smilecarepro-production.up.railway.app/api/patients/?status=منتهي', headers={'Authorization': 'Bearer '+token})

with open('test_output.txt', 'w', encoding='utf-8') as f:
    f.write("مستمر: " + str(len(r1.json())) + "\n")
    f.write("مديون: " + str(len(r2.json())) + "\n")
    f.write("منتهي: " + str(len(r3.json())) + "\n")
