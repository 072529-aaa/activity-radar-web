# 活动雷达 ActivityRadar

聚合 AI 科技盛会、马拉松赛事与志愿者招募信息的城市活动雷达。纯前端 PWA，可一键定位最近城市，并发布为 Android APK。

![GitHub Pages](https://img.shields.io/badge/PWA-动态更新-brightgreen) ![Android](https://img.shields.io/badge/Android-Capacitor-blue)

## 在线访问

- GitHub Pages：`https://072529-aaa.github.io/activity-radar-web/`
- 安卓 APK：本仓库 Release 中下载 `ActivityRadar-v2.2.0.apk`

在 Chrome 中打开在线地址后，可通过「添加到主屏幕」获得全屏独立窗口的 PWA 体验。

## 核心功能

- 城市筛选：支持武汉、北京、上海、广州、深圳、杭州、成都、南京、长沙、重庆、合肥、厦门及「全部」
- 一键定位：读取设备位置，自动匹配最近城市，也可手动选择
- 活动类型：AI 活动、马拉松、志愿者招募
- 时间筛选：本周 / 本月 / 未来三月
- 关键词搜索与排序：时间 / 武汉优先 / 志愿者优先
- 首页简卡：仅展示类型、时间、地点、报名时间等关键摘要
- 点击卡片进入全屏详情页：活动内容、参与价值、官网与官方渠道、志愿者招募信息
- 武汉优先：武汉活动以红色边框高亮，排序可一键置顶
- Android 体验优化：适配状态栏安全区、无横向滑动
- 离线可用：Service Worker 缓存页面壳与数据

Android 真机端优先调用系统定位，并适配 Android 状态栏安全区；网页端同样支持浏览器定位。

## 动态更新

活动数据独立存放在 `data/activities.json`，不随页面源码一起写死：

```json
{
  "updatedAt": "2026-09-03T16:30:00+08:00",
  "items": [
    {
      "id": 1,
      "type": "ai",
      "city": "武汉",
      "title": "活动名称",
      "date": "2026-10-01",
      "endDate": "2026-10-02",
      "volunteer": { "recruiting": true }
    }
  ]
}
```

应用在以下时机自动检查并更新：

- 打开页面时
- 页面保持在线期间每 15 分钟
- 从后台切回前台时

数据源按 GitHub Pages、raw.githubusercontent.com、jsDelivr CDN 的顺序自动回退，每次请求携带时间戳绕过缓存，保证已安装的 APK / PWA 能拉到最新活动。

离线时回退到本地缓存；本地无缓存时展示页面内置示例数据。所有活动信息仅供信息参考，不构成官方报名渠道，请以活动方官方发布为准。

## 更新数据并发布

1. 修改或追加 `data/activities.json` 中的 `items`
2. 同时更新 `updatedAt`
3. 提交并推送到 `main`，GitHub Pages 工作流会自动发布
4. 已安装的 PWA / APK 在联网状态下会自动拉到新数据

如果页面内嵌的示例数据需要同步为 JSON，可运行：

```bash
node scripts/export-data.mjs
```

## 本地运行

Service Worker 需要 HTTP(S) 环境，不建议直接双击 HTML：

```bash
python -m http.server 8080
# 或 npx serve .
# 访问 http://localhost:8080
```

## Android APK

工程目录为 `android-pack/`，基于 Capacitor。Android 源码中已声明网络与定位权限，并用与网页一致的雷达图标作为启动图标。

重新构建：

```bash
cd android-pack
npm ci
npx cap sync android
cd android
./gradlew assembleRelease
```

APK 输出到 `android-pack/android/app/build/outputs/apk/release/`。签名密钥不提交到 GitHub，构建时通过 `keystore.properties` 或环境变量提供。

## 目录结构

```text
.
├── index.html          # 单页应用
├── data/activities.json # 可远程更新的活动数据
├── sw.js               # Service Worker
├── manifest.json       # PWA 清单
├── icons/              # PWA 图标
├── scripts/export-data.mjs
├── .github/workflows/pages.yml
└── android-pack/       # Capacitor Android 工程
```

## License

MIT
