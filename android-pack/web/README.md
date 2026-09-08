# 活动雷达 ActivityRadar

聚合 AI 科技盛会、马拉松赛事与志愿者招募信息的城市活动雷达。纯前端 PWA，可一键定位最近城市，并发布为 Android APK。

![GitHub Pages](https://img.shields.io/badge/PWA-动态更新-brightgreen) ![Android](https://img.shields.io/badge/Android-Capacitor-blue)

## 在线访问

- GitHub Pages：`https://072529-aaa.github.io/activity-radar-web/`
- 安卓 APK：本仓库 Release 中下载 `ActivityRadar-v2.3.0.apk`

在 Chrome 中打开在线地址后，可通过「添加到主屏幕」获得全屏独立窗口的 PWA 体验。

## 核心功能

- 官方活动源：接入并核验马拉松、科技会议与志愿者公告等官方渠道，首页只展示名称、时间、地点、报名状态等关键摘要
- 自动更新：打开应用立即联网同步，之后每 4 分钟自动检查；回到前台与点击刷新按钮也会立即同步，新增活动会高亮
- 一键定位：优先使用设备 GPS，按远程数据中实际存在的活动城市就近匹配，避免定位到空城市
- 报名直达：详情页展示报名截止、费用、要求、官方渠道并可直接打开官网/合作平台报名
- 志愿者信息：详情页集中展示招募条件、岗位、截止时间、保障与激励、招募渠道
- 城市筛选：支持武汉、北京、上海、广州、深圳、珠海、杭州、成都、南京、福州等及「全部」
- 活动类型：AI 活动、马拉松、志愿者招募
- 时间筛选：本周 / 本月 / 未来三月
- 关键词搜索与排序：时间 / 志愿者优先
- Android 体验优化：适配状态栏安全区、无横向滑动，页面全屏详情可返回
- 离线可用：Service Worker 缓存页面壳与最近一次同步数据

## 动态更新与真实性

活动数据不再写在页面里，统一维护在 `data/registry.json`，每次同步通过 `scripts/update-data.py` 生成 `data/activities.json`。发布的数据带 `sourceName`、`sourceUrl`、`verified` 与更新时间，详情页会显示官方来源。

应用按以下时机自动更新：

- 打开页面时
- 页面在线期间每 4 分钟
- 从后台切回前台时
- 点击导航栏刷新按钮时

数据源按 GitHub Pages、raw.githubusercontent.com、jsDelivr CDN 自动回退，每次请求携带时间戳绕过缓存。离线时回退到本地缓存；本地无缓存时展示内置离线数据。

`sync-data.yml` 每天自动重跑官方源同步脚本并提交最新数据，`pages.yml` 在推送后自动发布 GitHub Pages。

所有活动信息仅供信息参考，不构成官方报名渠道，具体请以活动方官方发布为准。

## 更新官方活动数据

1. 修改 `data/registry.json`，追加活动项与来源元数据
2. 运行 `python scripts/update-data.py --skip-health` 生成本地 JSON
3. 提交并推送到 `main`，Pages 工作流自动发布，PWA / APK 下一次联网同步即可收到

如果本机有网络，去掉 `--skip-health` 会顺便检查各官方源连通性并写入 `meta.sources`。

## 本地运行

Service Worker 需要 HTTP(S) 环境，不建议直接双击 HTML：

```bash
python -m http.server 8080
# 访问 http://localhost:8080
```

## Android APK

工程目录为 `android-pack/`，基于 Capacitor。Android 源码中已声明网络与定位权限，并使用与网页一致的雷达图标。

重新构建：

```bash
cd android-pack
npm ci
npx cap sync android
cd android
./gradlew assembleRelease
```

APK 输出到 `android-pack/android/app/build/outputs/apk/release/`。签名通过环境变量提供，密钥不提交到仓库。

## 目录结构

```text
.
├── index.html             # 单页应用
├── radar-v23.js           # v2.3 自动同步与报名直达逻辑
├── radar-v23.css          # v2.3 移动端与详情页样式
├── data/registry.json     # 官方活动源注册表（维护主入口）
├── data/activities.json   # 自动生成的公开同步数据
├── scripts/update-data.py # 官方源同步脚本
├── .github/workflows/     # Pages 发布与每日数据同步
└── android-pack/          # Capacitor Android 工程
```

## License

MIT
