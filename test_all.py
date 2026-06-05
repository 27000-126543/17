#!/usr/bin/env python3
import json, urllib.request

BASE = "http://localhost:3001/api"
HEADERS = {"Content-Type": "application/json"}

def api(method, path, data=None, extra_headers=None):
    hdrs = dict(HEADERS)
    if extra_headers: hdrs.update(extra_headers)
    req = urllib.request.Request(BASE+path, method=method, headers=hdrs,
                                 data=json.dumps(data).encode() if data else None)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode())

# 1. Login
login = api("POST", "/auth/login", {"username":"admin","password":"123456"})
user = login["data"]["user"]
token = login["data"]["token"]
auth = {"x-user-id": user["id"], "x-auth-token": token}
print(f"[1] 登录: {user['name']}({user['role']}) ID={user['id']}")

# 2. Dashboard stats
stats = api("GET", "/dashboard/stats", extra_headers=auth)["data"]
print(f"\n[2] Dashboard统计:")
for k,v in stats.items():
    print(f"    {k}: {v}")

# 3. Water sources (permission check)
srcs = api("GET", "/water/sources", extra_headers=auth)["data"]
print(f"\n[3] 水源地({len(srcs)}个):")
for s in srcs: print(f"    {s['id']}: {s['name']} area={s['area']} status={s['status']}")

# 4. Pumps (smart scheduling)
pumps = api("GET", "/water/pumps", extra_headers=auth)["data"]
running = [p for p in pumps if p["status"]=="running"]
print(f"\n[4] 水泵({len(pumps)}台, 运行{len(running)}台):")
for p in pumps[:5]:
    print(f"    {p['id']}: {p['name']} status={p['status']} mode={p['mode']} {p.get('ratedPower',p.get('power',0))}kW eff={p.get('efficiency',0)}% hours={p.get('runHours',0)}")

# 5. Quality history
qh = api("GET", "/water/quality-history?sourceId=ws-001&hours=12", extra_headers=auth)["data"]
print(f"\n[5] 水质历史数据({len(qh)}条):")
for x in qh[:3]: print(f"    {x['timestamp']}: turbid={x['turbidity']} ph={x['ph']} chlorine={x['residualChlorine']} cod={x['cod']}")

# 6. Alarms
alarms = api("GET", "/dashboard/alarms", extra_headers=auth)["data"]
print(f"\n[6] 报警列表({len(alarms)}条):")
for a in alarms[:5]:
    print(f"    {a['id']}: {a['type']} {a['parameter']}={a['value']} threshold={a['threshold']} level={a['level']} status={a['status']} pushedTo={a['pushedTo']}")

# 7. Metering customers
custs = api("GET", "/metering/customers", extra_headers=auth)["data"]
print(f"\n[7] 抄表用户({len(custs)}个):")
for c in custs[:5]: print(f"    {c['id']}: {c['name']} {c['address']} meter={c['meterNo']}")

# 8. Bills
bills = api("GET", "/metering/bills", extra_headers=auth)["data"]
unpaid = [b for b in bills if b["status"]=="unpaid"]
overdue = [b for b in bills if b["status"]=="overdue"]
suspend = [b for b in bills if b["status"]=="suspend"]
paid = [b for b in bills if b["status"]=="paid"]
print(f"\n[8] 账单({len(bills)}笔): unpaid={len(unpaid)} overdue={len(overdue)} suspend={len(suspend)} paid={len(paid)}")
for b in bills[:5]:
    tiers = "+".join([f"{t['tier']}阶{t['consumption']}吨" for t in b.get("tierAmounts",[])])
    print(f"    {b['id']}: period={b['period']} use={b['consumption']}吨 ¥{b['totalAmount']} status={b['status']} {tiers}")

# 9. Drainage
points = api("GET", "/drainage/points", extra_headers=auth)["data"]
dpumps = api("GET", "/drainage/pumps", extra_headers=auth)["data"]
dwarns = api("GET", "/drainage/warnings", extra_headers=auth)["data"]
dp_running = [p for p in dpumps if p["status"]=="running"]
print(f"\n[9] 排水管网: 监测点={len(points)} 排涝泵={len(dpumps)}(运行{len(dp_running)}) 预警={len(dwarns)}")
for p in points[:3]: print(f"    point {p['id']}: {p['name']} level={p['level']}/{p['warningLevel']} status={p['status']}")
for p in dpumps[:3]: print(f"    pump  {p['id']}: {p['name']} status={p['status']} control={p.get('controlMode',p.get('mode','auto'))}")

# 10. Sewage
stages = api("GET", "/sewage/stages", extra_headers=auth)["data"]
devices = api("GET", "/sewage/devices", extra_headers=auth)["data"]
print(f"\n[10] 污水处理: 工艺段={len(stages)} 设备={len(devices)}")
for s in stages[:5]:
    print(f"    stage {s['id']}: {s['name']} cod={s['cod']}/{s['threshold']['cod']} nh3={s['ammoniaNitrogen']}/{s['threshold']['ammoniaNitrogen']} codRemoval={s['codRemoval']}% nh3Removal={s['ammoniaRemoval']}% status={s['status']}")
for d in devices[:5]: print(f"    device {d['id']}: {d['name']} status={d['status']} stage={d.get('stageId','')}")

# 11. Work orders
wos = api("GET", "/inspection/work-orders", extra_headers=auth)["data"]
pending = [w for w in wos if w["status"] in ("pending","processing")]
escalated = [w for w in wos if w.get("escalated")]
print(f"\n[11] 工单({len(wos)}笔, 未闭环{len(pending)}, 已升级{len(escalated)}):")
for w in wos[:5]:
    print(f"    {w['id']}: type={w['type']} pri={w['priority']} status={w['status']} esc={w.get('escalated',False)} hrs={w.get('pendingHours',0)}")

# 12. Permission test: inspector should only see his own area
ins_login = api("POST", "/auth/login", {"username":"inspector","password":"123456"})
ins_auth = {"x-user-id": ins_login["data"]["user"]["id"], "x-auth-token": ins_login["data"]["token"]}
ins_srcs = api("GET", "/water/sources", extra_headers=ins_auth)["data"]
ins_area = ins_login["data"]["user"]["area"]
print(f"\n[12] 权限测试 - 巡线员{ins_login['data']['user']['name']}(区域={ins_area}):")
print(f"    可见水源地({len(ins_srcs)}个): {[s['name'] for s in ins_srcs]}")

# 13. Export CSV test
print(f"\n[13] CSV导出测试...")
req = urllib.request.Request(BASE+"/dashboard/export/operation?period=month", headers={"Content-Type":"application/json", **auth})
with urllib.request.urlopen(req) as r:
    data = r.read()
    cd = r.headers.get("Content-Disposition","")
    print(f"    Content-Disposition: {cd}")
    print(f"    Size: {len(data)} bytes")
    lines = data.decode("utf-8-sig").split("\n")
    print(f"    Lines: {len(lines)}")
    for l in lines[:5]: print(f"    {l[:120]}")

print("\n✅ 全部API测试完成!")
