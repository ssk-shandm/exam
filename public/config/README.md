# 配置目录

项目把“随应用发布的公共配置”和“可写的运行时配置”分开保存，避免把 Prompt、Schema、用户参数和密钥混在一起。

```text
config/
  llm-config.json                     # Vite 开发版实际读写的 AI 运行配置
public/config/
  diagram-renderer.json               # 图表运行时默认配置
  question-schema.md                  # 面向维护者的题库格式说明
  examples/                           # 可复制示例，不由应用直接写入
  schemas/                            # 题库与 LLM 配置 JSON Schema
  llm/
    framework.json                    # 内置转换/修复流水线
    prompts/                          # 随应用预装的 Prompt
```

## LLM 运行配置

`config/llm-config.json` 管理模型连接、请求和 OCR 参数，主要字段包括：

- `provider.baseUrl`、`provider.model`；
- `request.temperature`；
- `request.maxOutputTokens`；
- `request.timeoutMs`；
- `ocr.enabled`、`ocr.language`、`ocr.scale`、`ocr.minTextCharacters`。

保存后项目会立即重新读取并应用。不同运行环境的存储后端如下：

1. **Tauri 桌面端**：由 Rust 命令读写系统 `app_config_dir/llm-config.txt`。首次读取时自动创建，可直接用记事本等文本编辑器读写，内容仍使用 JSON 格式；如果检测到旧版 `llm-config.json`，会先复制为 `llm-config.txt`，避免丢失已有配置。外部编辑保存后，在设置页点击“重新读取”即可应用。
2. **Vite 开发版**：通过开发中间件的 `GET/PUT /api/llm-config` 读写仓库根目录 `config/llm-config.json`。
3. **Web 生产版**：降级保存到浏览器 `localStorage`，因为静态站点不能直接改写服务器文件。

**不要把真实 API Key 写进任何 JSON 配置。** 当前 UI 只把 Key 保存到 `sessionStorage`，关闭桌面应用或浏览器标签页后失效。

## 内置文档转换流程

`llm/framework.json` 定义与供应商无关的处理流程：

1. 批量读取 DOCX、PDF、XLSX/XLSM、TXT、Markdown、JSON 或 CSV；
2. PDF 文本层不足时使用 Tesseract OCR；
3. 按配置分段并填充 `question-bank-convert.prompt.json`；
4. 调用 OpenAI-compatible `/chat/completions` 并显示流式输出；
5. 使用 `schemas/question-bank.schema.json` 严格校验每个分段和最终合并结果；
6. 校验失败时使用 `question-bank-repair.prompt.json` 自动修复，次数由 framework 配置决定；
7. 校验通过后提供复制和下载题库 JSON。

扫描 PDF 首次 OCR 通常需要下载语言数据。默认语言是 `chi_sim+eng`，当前没有预装离线 traineddata。Excel 当前只读取普通单元格文本，不处理复杂合并单元格和公式计算。

## 配置检查

```bash
npm run config:check
```

检查内容包括 JSON 语法、框架引用路径、Prompt 变量、示例题库结构，以及示例中是否意外填写真实 API Key。
