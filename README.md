# 刷题助手

一个基于 **Vue 3 + Tauri** 的桌面刷题应用，支持多种练习模式、错题本管理、Markdown 题面渲染与暗黑模式。同时可作为纯 Web 应用通过 Docker 部署。

## ✨ 功能特性

- **多练习模式**：顺序练习、考试模式（自动判分）、背题模式（直接展示答案）、专项练习
- **错题本管理**：多错题本创建 / 切换 / 删除，错题导入导出，一键备份与恢复
- **丰富题型支持**：单选、多选、判断、填空、简答、程序分析、编程题、复合题（含共享场景与子题）
- **Markdown 渲染**：题面与答案支持 Markdown，代码块语法高亮（highlight.js）
- **图片题**：题目可关联图片资源
- **乱序练习**：题目顺序可打乱
- **答题卡**：侧边答题卡快速跳转、标记错题
- **暗黑模式**：一键切换明暗主题
- **桌面应用**：基于 Tauri 打包为 Windows 原生安装包，数据本地持久化
- **Web 部署**：可通过 Docker 容器化部署为 Web 版本

## 🛠 技术栈

| 层面 | 技术 |
|------|------|
| 前端框架 | Vue 3 + TypeScript |
| 构建工具 | Vite 7 |
| 状态管理 | Pinia |
| Markdown | marked + marked-highlight + highlight.js |
| 桌面框架 | Tauri 2（Rust） |
| 容器化 | Docker + Nginx |

## 📁 项目结构

```
exam/
├── src/                    # 前端源码
│   ├── components/         # Vue 组件（答题卡、题目展示、错题本管理等）
│   ├── composables/        # 组合式函数（暗黑模式、答题逻辑、Toast、版本检查）
│   ├── stores/             # Pinia store（quizStore）
│   ├── utils/              # 工具函数（markdown 渲染）
│   └── types.ts            # TypeScript 类型定义
├── public/
│   ├── subjects/           # 题库 JSON 文件（需自行导入）
│   ├── images/             # 题目图片资源
│   ├── wrong-notebooks/    # 错题本数据（运行时生成）
│   └── config/             # 版本与转换配置示例
├── src-tauri/              # Tauri 桌面端 Rust 工程
├── scripts/                # 辅助脚本（docx 转换、答案填充、图标生成）
├── Dockerfile              # Web 版 Docker 构建文件
├── docker/nginx.conf       # Nginx 配置
└── vite.config.ts          # Vite 配置（含错题本同步中间件）
```

## 🚀 快速开始

### 环境要求

- Node.js `^20.19.0` 或 `>=22.12.0`
- npm（项目附带 `package-lock.json`）

### 安装与本地开发

```bash
# 安装依赖
npm install

# 启动 Web 开发服务器（http://localhost:5173）
npm run dev
```

### 类型检查与生产构建

```bash
# 类型检查 + 构建
npm run build

# 仅构建（跳过类型检查，Docker 中使用）
npm run build-only

# 预览生产构建
npm run preview
```

### 代码规范

```bash
# ESLint 检查并自动修复
npm run lint

# Prettier 格式化
npm run format
```

## 🖥 桌面应用（Tauri）

本应用主要面向桌面端，通过 Tauri 打包为原生应用。

### 前置依赖

- [Rust](https://www.rust-lang.org/) 工具链
- Tauri 2 的系统依赖（参见 [Tauri 官方文档](https://tauri.app/start/prerequisites/)）

### 开发与打包

```bash
# 桌面端开发模式
npm run tauri:dev

# 打包为 Windows 安装包（NSIS）
npm run tauri:build
```

打包产物位于 `src-tauri/target/release/bundle/`。

> 桌面端错题本数据通过 Tauri 文件系统 API 持久化到系统应用数据目录，比 Web 版的 localStorage 更可靠。

## 🐳 Docker 部署（Web 版）

通过 Docker 将应用部署为 Web 版本，适合在线访问或局域网共享。

### 构建并运行

```bash
# 构建镜像
docker build -t exam-app .

# 运行容器（映射到宿主机 8080 端口）
docker run -d -p 8080:80 --name exam-web exam-app
```

访问 `http://localhost:8080` 即可使用。

### 说明

- Web 版通过 Nginx 托管 `dist/` 静态资源，支持 SPA 路由回退与静态资源缓存。
- Web 版的错题本数据存储于浏览器 **localStorage**，不同浏览器 / 设备间不互通；桌面版则使用本地文件持久化。
- 若需自定义 Nginx 配置，修改 `docker/nginx.conf` 后重新构建镜像。

## 📖 题库格式

题库为 JSON 文件，放置于 `public/subjects/` 目录。每道题包含题号、题型、题干、选项、答案、解析等字段，支持 Markdown 与图片。详见 `src/types.ts` 中的 `Question` 类型定义。

`scripts/convert-docx.mjs` 提供从 docx 文档自动转换为题库 JSON 的能力，配置示例见 `public/config/docx-convert-config.sample.json`。

## 📦 项目脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run build-only` | 仅生产构建（跳过类型检查） |
| `npm run preview` | 预览生产构建 |
| `npm run lint` | ESLint 检查并修复 |
| `npm run format` | Prettier 格式化 |
| `npm run tauri:dev` | Tauri 桌面端开发 |
| `npm run tauri:build` | Tauri 桌面端打包 |

## 📄 License

本项目仅供学习交流使用。
