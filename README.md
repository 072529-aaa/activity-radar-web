# 活动雷达 ActivityRadar

> **你的城市活动脉搏** — 聚合 AI 科技盛会与马拉松赛事，实时捕捉志愿者招募机会。PWA 渐进式网页应用，支持 GPS 定位自动切换城市，武汉活动红色高亮优先突出。

---

## 简介

活动雷达是一款 **PWA（渐进式网页应用）**，帮你提前了解附近正在发生的 AI 厂商线下活动与马拉松赛事，以及相关的志愿者招募机会。

- **AI 活动**：智博会、产业大会、黑客松、创新大赛、厂商巡展等
- **马拉松赛事**：全马、半马、迷你马、越野跑等
- **志愿者招募**：招募人数、岗位、福利、报名方式一站式查看
- **武汉优先**：武汉本地活动红色边框高亮，排序可设为武汉优先

## 功能

- 城市切换：武汉 / 北京 / 上海 / 广州 / 深圳 / 杭州 / 成都 / 南京 / 长沙 / 重庆 / 合肥 / 厦门 / 全部
- GPS 定位：一键定位当前城市，自动匹配最近城市
- 类型筛选：AI 活动 / 马拉松 / 志愿者招募
- 时间筛选：本周 / 本月 / 未来三月
- 关键词搜索：标题、地点、主办方、描述、标签全文检索
- 排序：按时间 / 武汉优先 / 志愿者优先
- 活动详情弹窗：完整信息展示
- 离线可用：Service Worker 缓存，断网可浏览已加载内容

## 访问

GitHub Pages 部署后访问：

```
https://072529-aaa.github.io/activity-radar-web/
```

## 安卓安装

本应用为 PWA，可在安卓上获得类原生 App 体验：

1. 用 Chrome 打开上方链接
2. 点击菜单（右上角三个点）→ **「添加到主屏幕」**
3. 桌面生成独立图标，点击全屏启动，无浏览器地址栏
4. 支持独立联网与 GPS 定位

如需真正的 APK 安装包，可使用 Capacitor 打包：

```bash
npm install -g @capacitor/cli
npx cap init activity-radar com.example.activityradar --web-dir=.
npx cap add android
npx cap open android
# 在 Android Studio 中 Build → Build Bundle(s) / APK(s) → Build APK(s)
```

## 技术栈

- 纯前端 HTML / CSS / JavaScript，零框架依赖
- PWA：manifest.json + Service Worker
- Geolocation API：浏览器定位
- Claude 式浅色文气 UI：暖米白底色、衬线标题、陶土橙强调色

## 数据说明

内置 30 场活动数据（2026 年），数据仅供参考，请以官方发布为准。

## License

MIT
