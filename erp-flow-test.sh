#!/bin/bash
# ERP 进销存端到端业务流程测试
set -e

BASE="http://localhost:3000"
TOKEN=$(cat /tmp/erp_token.txt 2>/dev/null || echo "")
[ -z "$TOKEN" ] && { echo "No token"; exit 1; }
AUTH="Authorization: Bearer $TOKEN"
PASS=0; FAIL=0

check() {
  local desc="$1" actual="$2"
  if echo "$actual" | grep -q '"code":200'; then
    echo "  [PASS] $desc"
    PASS=$((PASS+1))
  else
    local code=$(echo "$actual" | grep -o '"code":[0-9]*' | head -1 | sed 's/"code"://')
    echo "  [FAIL] $desc (code=$code)"
    echo "    $(echo "$actual" | grep -o '"message":"[^"]*"' | head -1 | sed 's/"message":"//;s/"//')"
    FAIL=$((FAIL+1))
  fi
}

extract() { echo "$1" | grep -o '"'"$2"'":"[^"]*"' | head -1 | sed 's/.*":"//;s/"//'; }

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ERP 进销存端到端流程测试"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# === 1. 基础数据 ===
echo ""; echo "=== 1. 创建商品 ==="

CAT_ID=$(curl -s "$BASE/categories" -H "$AUTH" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
UNIT_ID=$(curl -s "$BASE/units" -H "$AUTH" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
WHS_ID=$(curl -s "$BASE/warehouses" -H "$AUTH" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')

TS=$(date +%s)
CODE1="T${TS}1"; CODE2="T${TS}2"; CODE3="T${TS}3"

P1=$(curl -s -X POST "$BASE/products" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"name\":\"阿莫西林胶囊\",\"code\":\"$CODE1\",\"spec\":\"0.5g*24粒\",\"categoryId\":\"$CAT_ID\",\"unitId\":\"$UNIT_ID\",\"price\":12.50,\"minQuantity\":50}")
check "创建商品" "$P1"; P1_ID=$(extract "$P1" "id")

P2=$(curl -s -X POST "$BASE/products" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"name\":\"头孢克肟分散片\",\"code\":\"$CODE2\",\"spec\":\"50mg*12片\",\"categoryId\":\"$CAT_ID\",\"unitId\":\"$UNIT_ID\",\"price\":28.00,\"minQuantity\":30}")
check "创建商品2" "$P2"; P2_ID=$(extract "$P2" "id")

P3=$(curl -s -X POST "$BASE/products" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"name\":\"布洛芬缓释胶囊\",\"code\":\"$CODE3\",\"spec\":\"0.3g*20粒\",\"categoryId\":\"$CAT_ID\",\"unitId\":\"$UNIT_ID\",\"price\":18.50,\"minQuantity\":100}")
check "创建商品3" "$P3"; P3_ID=$(extract "$P3" "id")

LOC=$(curl -s -X POST "$BASE/locations" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"name\":\"A货架-01\",\"code\":\"LOC-A01\",\"warehouseId\":\"$WHS_ID\"}")
check "创建库位" "$LOC"

echo "  Product IDs: $P1_ID $P2_ID $P3_ID"

# === 2. 采购流程 ===
echo ""; echo "=== 2. 采购流程 ==="
SUPPLIER_ID=$(curl -s "$BASE/suppliers" -H "$AUTH" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')

PO=$(curl -s -X POST "$BASE/purchase" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"supplierId\":\"$SUPPLIER_ID\",\"remark\":\"测试采购\",\"items\":[{\"productId\":\"$P1_ID\",\"productName\":\"阿莫西林胶囊\",\"quantity\":200,\"price\":8.50},{\"productId\":\"$P2_ID\",\"productName\":\"头孢克肟分散片\",\"quantity\":100,\"price\":18.00}]}")
check "创建采购单" "$PO"; PO_ID=$(extract "$PO" "id")

curl -s -X PUT "$BASE/purchase/$PO_ID/status" -H "$AUTH" -H "Content-Type: application/json" -d '{"status":"pending"}' >/dev/null
curl -s -X PUT "$BASE/purchase/$PO_ID/status" -H "$AUTH" -H "Content-Type: application/json" -d '{"status":"approved"}' >/dev/null
PO3=$(curl -s -X PUT "$BASE/purchase/$PO_ID/status" -H "$AUTH" -H "Content-Type: application/json" -d '{"status":"received"}')
check "采购入库" "$PO3"

PO_GET=$(curl -s "$BASE/purchase/$PO_ID" -H "$AUTH")
check "采购单明细" "$PO_GET"

# === 3. 销售流程 ===
echo ""; echo "=== 3. 销售流程 ==="
CUST_ID=$(curl -s "$BASE/customers" -H "$AUTH" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')

SO=$(curl -s -X POST "$BASE/sales" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"customerId\":\"$CUST_ID\",\"remark\":\"测试销售\",\"items\":[{\"productId\":\"$P1_ID\",\"productName\":\"阿莫西林胶囊\",\"quantity\":10,\"price\":12.50},{\"productId\":\"$P3_ID\",\"productName\":\"布洛芬缓释胶囊\",\"quantity\":20,\"price\":18.50}]}")
check "创建销售单" "$SO"; SO_ID=$(extract "$SO" "id")

curl -s -X PUT "$BASE/sales/$SO_ID/status" -H "$AUTH" -H "Content-Type: application/json" -d '{"status":"pending"}' >/dev/null
curl -s -X PUT "$BASE/sales/$SO_ID/status" -H "$AUTH" -H "Content-Type: application/json" -d '{"status":"approved"}' >/dev/null
SO3=$(curl -s -X PUT "$BASE/sales/$SO_ID/status" -H "$AUTH" -H "Content-Type: application/json" -d '{"status":"delivered"}')
check "销售出库" "$SO3"

SO_GET=$(curl -s "$BASE/sales/$SO_ID" -H "$AUTH")
check "销售单明细" "$SO_GET"

# === 4. 库存 ===
echo ""; echo "=== 4. 库存 ==="
Ov=$(curl -s "$BASE/inventory/overview" -H "$AUTH"); check "库存概览" "$Ov"
St=$(curl -s "$BASE/inventory" -H "$AUTH"); check "库存列表" "$St"

STOCK_ID=$(echo "$St" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
[ -n "$STOCK_ID" ] && { D=$(curl -s "$BASE/inventory/detail/$STOCK_ID" -H "$AUTH"); check "库存明细" "$D"; }

CK=$(curl -s -X POST "$BASE/check/save" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"productId\":\"$P1_ID\",\"productName\":\"阿莫西林\",\"checkCount\":190,\"stockCount\":190,\"location\":\"LOC-A01\",\"batchNo\":\"B001\",\"remark\":\"盘点\"}")
check "盘点录入" "$CK"

CR=$(curl -s "$BASE/check/records" -H "$AUTH"); check "盘点记录" "$CR"

# === 5. 报表 ===
echo ""; echo "=== 5. 报表 ==="
Tp=$(curl -s "$BASE/report/top-products?limit=5" -H "$AUTH"); check "销售排行" "$Tp"
Ls=$(curl -s "$BASE/report/low-stock" -H "$AUTH"); check "低库存预警" "$Ls"

echo ""; echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  结果: $PASS 通过, $FAIL 失败"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
exit $FAIL
