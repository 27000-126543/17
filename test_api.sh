#!/bin/bash
BASE="http://localhost:3001/api"
UID="u-001"
TOKEN="token_u-001_1780677082284"
HDRS="-H x-user-id:$UID -H x-auth-token:$TOKEN -H Content-Type:application/json"

echo "=== 2. Dashboard统计数据 ==="
curl -s $HDRS "$BASE/dashboard/stats" | python3 -m json.tool 2>/dev/null | head -25

echo -e "\n=== 3. 水源地列表（权限测试-admin应看到全部） ==="
curl -s $HDRS "$BASE/water/sources" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'数量: {len(d[\"data\"])}'); [print(f'  {s[\"id\"]}: {s[\"name\"]} ({s[\"area\"]}) status={s[\"status\"]}') for s in d['data']]" 2>/dev/null

echo -e "\n=== 4. 水质历史数据 ==="
curl -s $HDRS "$BASE/water/quality-history?sourceId=ws-001&hours=24" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'数据点: {len(d[\"data\"])}'); [print(f'  {x[\"timestamp\"]}: turbidity={x[\"turbidity\"]} ph={x[\"ph\"]}') for x in d['data'][:3]]" 2>/dev/null

echo -e "\n=== 5. 水泵列表 + 智能调度 ==="
curl -s $HDRS "$BASE/water/pumps" | python3 -c "import sys,json; d=json.load(sys.stdin); running=len([p for p in d['data'] if p['status']=='running']); print(f'总水泵: {len(d[\"data\"])} 运行中: {running}'); [print(f'  {p[\"id\"]}: {p[\"name\"]} status={p[\"status\"]} mode={p[\"mode\"]} power={p.get(\"ratedPower\",p.get(\"power\"))}kW') for p in d['data'][:5]]" 2>/dev/null

echo -e "\n=== 6. 压力监测点 ==="
curl -s $HDRS "$BASE/dashboard/pressure-points" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'压力点: {len(d[\"data\"])}'); [print(f'  {p[\"id\"]}: {p[\"name\"]} {p[\"pressure\"]}MPa status={p[\"status\"]}') for p in d['data'][:3]]" 2>/dev/null
