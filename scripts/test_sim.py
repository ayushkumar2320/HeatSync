import urllib.request
import json

data = json.dumps({"scenario": "increase_green_10"}).encode("utf-8")

for ep in ["/api/simulation/run", "/api/simulation/run/current"]:
    url = f"http://localhost:8000{ep}"
    try:
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=20) as res:
            body = json.loads(res.read())
            print(f"{ep} -> HTTP {res.status}: success={body.get('success')} delta={body.get('mean_delta_lst')} baseline={body.get('baseline_mean_lst')} keys={list(body.keys())[:8]}")
    except Exception as e:
        print(f"{ep} -> ERROR: {e}")
