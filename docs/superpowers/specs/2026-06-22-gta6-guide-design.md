# GTA6 攻略站 — 设计文档

## 目标

抢 GTA6 英文搜索流量红利，靠广告（Google AdSense → Ezoic → Mediavine 阶梯升级）盈利。

## 站点定位

- 独立新站，纯 GTA6，英文
- 纯静态 HTML/CSS，GitHub Pages 免费部署 + 自定义域名
- 三阶段上线：抢坑期（发售前）→ 爆发期（发售后 2 周）→ 收割期（发售后 1 月）

## 内容策略

### 首发三类（抢坑期，~15-20 页）
1. **作弊码** — 制作成本最低，搜索量稳定
2. **赚钱攻略** — GTA 系列永恒痛点
3. **主线任务列表 + 前 5 关详解** — 目录页占坑，逐步补齐

### 后续扩展
- 武器图鉴、载具图鉴、收集品位置、支线任务、在线模式

## 内容生产方式

- AI 生成初稿 → CSV 真实数据注入 → 模板变体随机化句式（5-6 种变体轮换）
- 规避 Google Helpful Content 打击：每页数据结构不同但来自同一 CSV

## 技术架构

```
gta6-guide/
├── index.html
├── cheats.html
├── money-guide.html
├── story-missions/
│   ├── index.html
│   └── mission-*.html
├── weapons/
│   ├── index.html
│   └── weapon-*.html
├── vehicles/
│   ├── index.html
│   └── vehicle-*.html
├── collectibles/
│   ├── index.html
│   └── *.html
├── side-missions/
│   ├── index.html
│   └── *.html
├── online/
│   └── index.html
├── css/
│   └── style.css
├── templates/          # 4 套 HTML 模板
│   ├── mission.html
│   ├── weapon.html
│   ├── vehicle.html
│   └── generic.html
├── data/               # CSV 数据文件
│   ├── missions.csv
│   ├── weapons.csv
│   └── vehicles.csv
├── scripts/
│   └── build.py        # 一键批量生成脚本
└── robots.txt / sitemap.xml
```

## 页面模板（4 种）

| 模板 | 用途 | 关键元素 |
|------|------|----------|
| 任务页 | 主线/支线任务攻略 | 步骤列表、关键提示框、上下任务导航 |
| 装备页 | 武器/载具图鉴 | 属性表格、图片占位、使用技巧 |
| 列表页 | 各栏目目录索引 | 快速索引列表 |
| 通用页 | 作弊码、赚钱攻略等 | 自由排版 |

## SEO 设计

- 静态 URL（`/weapons/ak-47.html`）
- 每页自动生成 title、meta description、结构化数据
- sitemap.xml 随页面生成自动更新
- 内链：装备页底部链同类装备、任务页链上下任务

## AI 风险规避

- 每页注入 CSV 真实数据（伤害数字、价格等），非 AI 编造
- 脚本随机化段落结构（5-6 种变体），避免全站千篇一律
- 数据与文案分离，Google 可识别页间差异

## 盈利路径

| 阶段 | 月 PV | 平台 | 预估月收入 |
|------|-------|------|-----------|
| 起步 | 0–1 万 | AdSense | $0–50 |
| 增长 | 1–10 万 | Ezoic | $100–1000 |
| 成熟 | 10 万+ | Mediavine | $2000–10000+ |

## 分工

- 用户：搜集游戏原始信息（Wiki、截图、其他攻略站链接）
- Agent：填 CSV、跑脚本生成页面、SEO 配置、部署上线

## 部署

- GitHub Pages 免费托管
- 自定义域名（~$10/年）
- 零服务器运维成本
