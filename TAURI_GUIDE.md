# 刷题助手 — 打包 exe 与更新指南

## 项目结构

```
exam/
├── src/                      # Vue 前端源码
│   ├── composables/
│   │   └── useVersion.ts     # 版本显示 & 更新检查逻辑
│   └── components/
│       └── StartScreen.vue   # 首页（含版本号 + 检查更新按钮）
├── src-tauri/                # Tauri 桌面壳
│   ├── Cargo.toml            # Rust 依赖
│   ├── tauri.conf.json       # Tauri 配置（窗口标题、大小等）
│   ├── capabilities/
│   ├── icons/                # 应用图标
│   └── src/
│       ├── main.rs           # 入口
│       └── lib.rs            # Rust 命令（get_app_version）
├── public/
│   ├── config/
│   │   └── version.sample.json   # 远程版本检查 JSON 模板
│   └── subjects/                 # 各科题库 JSON
```

---

## 第一步：安装 Rust

Tauri 需要 Rust 编译环境。打开终端执行：

```bash
# 国内用户可使用镜像加速：
export RUSTUP_DIST_SERVER=https://mirrors.ustc.edu.cn/rust-static
export RUSTUP_UPDATE_ROOT=https://mirrors.ustc.edu.cn/rust-static/rustup
# Windows: 下载安装 https://rustup.rs/ 或用 winget
winget install Rustlang.Rustup
```

安装完毕后重启终端，验证：

```bash
rustc --version   # 应显示 rustc 1.xx
cargo --version   # 应显示 cargo 1.xx
```

---

## 第二步：开发调试

在浏览器中调试前端（不需要 Rust）：

```bash
npm run dev
```

在 Tauri 桌面窗口中调试（需要 Rust）：

```bash
npm run tauri:dev
```

---

## 第三步：打包 exe

```bash
npm run tauri:build
```

产物生成在：

- **安装包（NSIS 安装器）：** `src-tauri/target/release/bundle/nsis/刷题助手_0.1.0_x64-setup.exe`
- **便携版 exe：** `src-tauri/target/release/aaa.exe`

> ⚠️ Windows 上首次构建可能需要安装 **WebView2**（Win10+ 自带）和 **Visual Studio Build Tools**（C++ 编译环境）。如果构建报错提示 `Visual Studio` 相关，安装 [VS Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) 并勾选“用 C++ 的桌面开发”。

---

## 第四步：后续更新的工作流

### 4.1 修改代码后重新打包

每次改完代码发新版：

```bash
# 1. 更新版本号
```

1. 改 `src-tauri/tauri.conf.json` 中的 `"version": "0.2.0"`
2. 改 `src/composables/useVersion.ts` 中的 `APP_VERSION`

```bash
# 2. 重新构建
npm run tauri:build
# 产物在 src-tauri/target/release/bundle/nsis/*.exe
# 可直接发布 exe 到 GitHub Releases 或任意网盘
```

### 4.2 配置更新检查

当前版本已经内置了「检查更新」按钮（首页底部）。你需要准备一个**远程 JSON 文件**供应用检查。

**方案 A：使用 GitHub Releases（推荐）**

1. 把代码推送到 GitHub
2. 每次发布到 [GitHub Releases](https://docs.github.com/repositories/releasing-projects-on-github/managing-releases-in-a-repository)
3. 把 `UPDATE_CHECK_URL` 指向一个 GitHub Pages 或任意能返回 JSON 的 URL

**方案 B：放到自己的服务器或对象存储**

准备一个 JSON 文件，内容如下：

```json
{
  "version": "0.2.0",
  "downloadUrl": "https://example.com/downloads/刷题助手_0.2.0_x64-setup.exe",
  "releaseNotes": "- 新增功能 xxx\n- 修复 xxx"
}
```

然后把 `src/composables/useVersion.ts` 中的 `UPDATE_CHECK_URL` 改为这个 JSON 的地址：

```ts
const UPDATE_CHECK_URL = 'https://your-domain.com/version.json'
```

用户点击「检查更新」→ 拉取远程 JSON → 对比版本 → 有新版则弹窗提供下载链接。

### 4.3 更新流程总结

```
你：改代码 → 改版本号 → npm run tauri:build → 上传 exe → 更新 version.json
用户：打开应用 → 首页点"检查更新" → 看到新版弹窗 → 点击下载 → 关旧版、安装新版
```

---

## 常见问题

**Q: 能否只打包成一个 exe 文件？**

可以。在 `src-tauri/tauri.conf.json` 中配置：

```json
"bundle": {
  "windows": {
    "nsis": {
      "installMode": "currentUser"
    }
  }
}
```

构建后会在 `bundle/nsis/` 下生成安装包。如果想单 exe 便携版，直接用 `target/release/aaa.exe`（但需要用户系统安装 WebView2）。

**Q: 如何更改应用窗口标题和尺寸？**

编辑 `src-tauri/tauri.conf.json` 中的 `app.windows[0]`：

```json
"windows": [{
  "title": "刷题助手",
  "width": 1200,
  "height": 800,
  "minWidth": 800,
  "minHeight": 600,
  "resizable": true
}]
```

**Q: 应用图标怎么换？**

重新生成图标（替换 `src-tauri/icons/` 下的文件），或用 Tauri CLI 自动生成：

```bash
npx tauri icon path/to/your-icon.png
```

要求源图至少 1024×1024 的 PNG。

---

## 相关命令速查

| 命令 | 说明 |
|------|------|
| `npm run dev` | 浏览器开发模式 |
| `npm run tauri:dev` | Tauri 桌面开发模式 |
| `npm run tauri:build` | 打包成 exe/安装包 |
| `npm run tauri icon <图片>` | 从 PNG 生成各平台图标 |
