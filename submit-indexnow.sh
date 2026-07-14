#!/bin/bash
# IndexNow 提交脚本 — 更新网站后运行，通知搜索引擎重新抓取
# 用法：bash submit-indexnow.sh

KEY="738ed258b2bb4d35a0046a01bd9bb418"
HOST="yxhtl.com"
SITEMAP="https://yxhtl.com/sitemap.xml"

# 方式1：提交单个站点地图（推荐，提交一次Bing会自动发现所有页面）
echo "=== 提交 Sitemap 到 IndexNow ==="
curl -s -o /dev/null -w "  HTTP %{http_code}\n" \
  "https://www.bing.com/indexnow?url=${SITEMAP}&key=${KEY}"

echo ""
echo "=== 额外提交主要页面 ==="
PAGES=(
  "https://yxhtl.com/"
  "https://yxhtl.com/en/"
  "https://yxhtl.com/rimworld-guide-getting-started.html"
  "https://yxhtl.com/rimworld-guide-base-building.html"
  "https://yxhtl.com/rimworld-guide-combat.html"
  "https://yxhtl.com/rimworld-guide-pawns.html"
  "https://yxhtl.com/rimworld-guide-research.html"
  "https://yxhtl.com/rimworld-guide-crafting.html"
  "https://yxhtl.com/rimworld-guide-trade.html"
  "https://yxhtl.com/rimworld-guide-animals.html"
  "https://yxhtl.com/rimworld-guide-biomes.html"
  "https://yxhtl.com/rimworld-guide-mods.html"
  "https://yxhtl.com/rimworld-guide-dlc-royalty.html"
  "https://yxhtl.com/rimworld-guide-dlc-ideology.html"
  "https://yxhtl.com/rimworld-guide-dlc-biotech.html"
  "https://yxhtl.com/rimworld-guide-dlc-anomaly.html"
)

for url in "${PAGES[@]}"; do
  curl -s -o /dev/null -w "  ${url} → HTTP %{http_code}\n" \
    "https://www.bing.com/indexnow?url=${url}&key=${KEY}"
done

echo ""
echo "✅ IndexNow 提交完成"
