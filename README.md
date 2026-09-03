# 活动雷达 ActivityRadar v2.0

> 「你的城市，正在发生什么？」—— AI 与马拉松活动即时搜索 + 志愿者招募一站式平台

## 🌟 项目简介

活动雷达是一款专注于 **AI 厂商线下活动** 与 **马拉松赛事** 的即时搜索与志愿者招募通知应用。无论你是技术爱好者、跑者还是志愿者，都能第一时间掌握身边正在发生的精彩活动。

### ✨ 核心特性

- **🔍 全网活动即时搜索** — 聚合各大 AI 厂商（字节跳动、百度、阿里、腾讯、华为等）线下沙龙、黑客松、技术大会，以及全国马拉松赛事信息
- **📍 智能定位切换** — 基于地理位置自动推荐附近活动，**武汉地区活动重点高亮突出**
- **🙋 志愿者招募通知** — 每场活动附带志愿者招募信息，一键了解报名条件与截止日期
- **🌓 深色/浅色双模式** — 现代时尚 UI，渐变色彩 + 毛玻璃效果 + 流畅微动画
- **📱 跨平台支持** — Web 版（PWA）+ Android APK 安装包，独立联网与定位
- **⚡ C++ 高性能引擎** — 核心搜索筛选引擎采用 C++ 零依赖实现，毫秒级响应
- **🐍 Python 数据管理** — Python 脚本提供数据统计、导出、校验等管理能力

### 📊 数据概览

- 30+ 场精选活动数据
- 武汉地区 17 场（AI 13 场 + 马拉松 4 场）
- 覆盖北京、上海、深圳、杭州、成都等 10+ 城市
- 志愿者招募信息全覆盖

## 🚀 快速开始

### Web 版

直接访问：https://072529-aaa.github.io/activity-radar-web/

### Android 版

下载 Release 中的 APK 安装包，安装即可使用。支持 Android 7.0+。

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | 原生 HTML/CSS/JS（PWA） |
| 搜索核心 | C++17（零依赖 JSON 解析 + 筛选排序引擎） |
| 数据管理 | Python 3 |
| 移动端 | Android WebView（手动编译，无 Gradle 依赖） |
| 部署 | GitHub Pages |

## 📁 项目结构

```
activity-radar-v2/
├── www/                    # Web 前端（PWA）
│   ├── index.html          # 主页面（现代时尚 UI）
│   ├── manifest.json       # PWA 清单
│   ├── sw.js               # Service Worker
│   ├── activities.json     # 活动数据
│   └── icon.svg            # 应用图标
├── src/
│   ├── cpp/
│   │   ├── activity_engine.cpp   # C++ 搜索引擎
│   │   └── activity_engine.exe   # 编译后的可执行文件
│   └── python/
│       └── data_manager.py       # Python 数据管理脚本
└── manual-apk/             # Android APK 手动构建工程
```

## 🎯 C++ 引擎使用

```bash
# 搜索武汉的 AI 活动
activity_engine.exe --data activities.json --city 武汉 --type ai

# 搜索本周的马拉松活动
activity_engine.exe --data activities.json --type marathon --time week

# 按日期排序输出 JSON
activity_engine.exe --data activities.json --sort date --json
```

## 🐍 Python 数据管理

```bash
# 查看数据统计
python data_manager.py stats

# 搜索活动
python data_manager.py search --city 武汉 --type ai

# 导出为 CSV
python data_manager.py export --format csv
```

## 📜 License

MIT License — 自由使用，欢迎 Star ⭐

---

*用代码丈量城市，用热爱连接每一场活动。*