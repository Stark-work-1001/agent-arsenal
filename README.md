# 智能体核武库 · Agent Arsenal

> **跨智能体能力中枢** —— 把散落在各个 AI 智能体里的技能、MCP 服务与插件，统一采集进本地数据库，
> 让任何接入的智能体都能**主动检索、读取并调用**，并承担故障诊断、重复裁决与更新巡检。
>
> **Cross-agent capability hub** — Collect skills, MCP servers and plugins scattered across AI agents
> into one local database, so any connected agent can **search, read and call** them, while the hub
> owns diagnostics, duplicate arbitration and update checks.

版本 **1.0.0** · Windows 桌面应用 / Windows desktop app · 数据全部留在本机 / all data stays on your machine
仓库 / Repository: <https://github.com/Stark-work-1001/Agent-arsenal>

---

## 一键开始 · Quick Start

**下载即用 / Download and run**

1. 从 [Releases](https://github.com/Stark-work-1001/Agent-arsenal/releases) 下载 `agent-arsenal-v1.0.0-windows-x64.zip`
2. 解压到任意目录（路径含中文或空格都可以）
3. 双击 **`启动-智能体核武库.cmd`**

1. Download `agent-arsenal-v1.0.0-windows-x64.zip` from [Releases](https://github.com/Stark-work-1001/Agent-arsenal/releases)
2. Extract it anywhere (Chinese characters and spaces in the path are fine)
3. Double-click **`启动-智能体核武库.cmd`**

首次启动会在后台扫描本机全部能力来源（约 20–30 秒），界面顶部有扫描进度提示。
数据默认保存在 `arsenal-data/`（与程序同级），可整体备份或迁移。

On first launch the app scans every capability source on the machine in the background (about 20–30 s);
the progress is shown at the top of the window. Data lives in `arsenal-data/` next to the program and can
be backed up or migrated as a whole.

**从源码运行 · Run from source**

```bash
npm install
npm run dev        # Vite dev server + Electron 热更新 / hot reload
npm test           # 24 项后端测试 / backend tests
npm run build      # 生成 release/ 绿色版 / produce the portable build
```

---

## 它解决什么问题 · What problem it solves

| 现状 · The problem | 核武库的做法 · What Agent Arsenal does |
| --- | --- |
| 技能散落在 `~/.dsh`、`~/.codex`、`~/.minimax` 等各处 · Skills scattered across agent homes | 统一扫描 → 归一化为「能力」入 SQLite · One scan → normalized *capabilities* in SQLite |
| 每个智能体都要重复安装同一份技能 · Every agent re-installs the same skill | 一份纳管副本，多个宿主共享检索 · One managed copy, shared by all hosts |
| 不知道能力是谁写的、什么版本、还能不能用 · Who wrote it, which version, does it still work | 作者 / 版本 / 健康状态 / 更新时间全部可见 · Author, version, health and freshness all visible |
| 坏了只能靠人翻目录排查 · Breakage is diagnosed by hand | 规则化诊断 + 自动修复 + 派单给智能体修 · Rule-based diagnosis, safe auto-fix, work orders for agents |
| 同一能力装了多份，版本不一致 · Duplicate copies, drifting versions | 去重裁决：保留最新版本 / 合并 / 共存 / 忽略 · Arbitrate: keep newest / merge / coexist / ignore |
| 换智能体就得重新配一遍 MCP · Re-configure MCP for every new agent | 生态同步：一键写入宿主原生配置，可回滚 · Ecosystem sync writes host-native config, with rollback |

---

## 六个核心能力 · Six core capabilities

### 1. 多协议采集 · Multi-protocol collection

| 协议 Protocol | 识别内容 What it reads |
| --- | --- |
| Agent Skills | `SKILL.md` + YAML frontmatter、资源文件清单 · frontmatter and resource manifests |
| MCP | `mcp.json` / `.mcp.json` / `config.toml` / `config.yaml` 的服务器声明；工程目录（package.json / pyproject.toml） |
| DSH 插件 · DSH plugins | `package.json` + `dsh.bundle` / `dsh.client` |
| Claude / Codex 插件 · plugins | `plugin.json` / `.claude-plugin` / `.codex-plugin` |
| A2A | Agent Card（skills 声明）· Agent Card skill declarations |
| OpenAPI 3 | `openapi.json` 操作声明 · operation declarations |

### 2. 混合检索 · Hybrid retrieval

三路融合，全部离线可用 · Three signals fused, fully offline:

- **FTS5 全文**（BM25，字段加权：名称 8 / 摘要 4 / 正文 1 / 标签 2 / 作者 2 / 宿主 1.5）
- **trigram 子串**（中文短语、路径片段 · Chinese phrases and path fragments）
- **结构化匹配**（名称 / 作者 / 标签 LIKE）

外加中英同义词扩展（pdf↔文档、mcp↔服务端…）与使用热度加权，每条结果给出**打分构成解释**。
Plus bilingual synonym expansion and usage-weighted ranking; every hit explains **how it scored**.

> CJK 说明：SQLite 的 `unicode61` 不切分中文，因此入库前把 CJK 逐字空格分隔（`智能体` → `智 能 体`），
> 索引与查询两侧一致即可命中；短语连贯性由应用层的字符对覆盖率修正。
> Note: SQLite's `unicode61` tokenizer does not segment Chinese, so CJK text is space-separated per
> character on write; both index and query sides are transformed identically.

### 3. 智能体接入（三通道）· Agent onboarding (three channels)

| 通道 Channel | 机制 Mechanism | 说明 Notes |
| --- | --- | --- |
| A · MCP 会话 · MCP session | 智能体连 `/mcp` 并 `initialize` · agent calls `initialize` | 最可靠：有真实调用记录与用量 · most reliable, real call records |
| B · 心跳文件 · Heartbeat file | 宿主写 `arsenal-data/run/heartbeats/<host>.json` | 低成本，跨进程 · cheap, cross-process |
| C · 进程识别 · Process detection | WMI 进程名 / 命令行匹配 | 零接入成本，但只能证明「在跑」 · zero setup, but only proves "running" |

三种状态在界面上明确区分：**运行中 / 心跳在线 / 未运行** · The UI distinguishes *running / heartbeat online / not running*.

### 4. 故障识别与维修 · Fault diagnosis and repair

- 8 条确定性诊断规则（缺 frontmatter、入口缺失、MCP 命令不存在、路径不可访问、正文为空、多实例重复…）
- **中枢只负责诊断与定位，修复由智能体执行**：生成结构化工单 → 智能体修复 →
  通过 `arsenal.submit_patch` 回传完整文件 → 中枢校验路径边界、备份、落盘、记录维修历史
  *The hub diagnoses and localizes; the connected agent does the fixing*, via work orders and
  `arsenal.submit_patch`; the hub validates path boundaries, backs up, writes and records history.
- 少数**安全规则**可自动修复（补 frontmatter / 补 description），修复前自动备份，可一键回滚
  *A few safe rules can be auto-fixed; every fix is backed up and reversible.*

### 5. 去重与版本裁决 · Duplicate and version arbitration

- 身份键 = `kind:author/name`（无作者退化为 `kind:name`）· identity key
- 同身份多实例 → 合并为一个逻辑能力 + 多个安装实例 · one logical capability, many instances
- 不同身份但名称归一相同或描述相似度 ≥ 0.86 → 重复候选组 · duplicate candidate group
- 裁决动作：**保留最新版本 / 合并 / 允许共存 / 忽略**；归档不删文件 · arbitrate; archiving never destroys files

### 6. 更新与生态同步 · Updates and ecosystem sync

- 版本证据链：DSH Market 兼容性缓存 → 本地 node_modules → npm registry（并发 6、6 小时缓存）
- 上游目录浏览：把上游插件目录导入本地索引，标注已安装/未安装
- 生态同步：把 `agent-arsenal` 的 MCP 端点写入 DSH / Codex / Claude Code / 中枢自身的原生配置，写入前备份
  *Write the hub's MCP endpoint into each host's native config; always back up first.*

---

## MCP 工具清单 · MCP tool list

接入 `http://127.0.0.1:18297/mcp` 后，智能体可调用 · After connecting, agents can call:

| 工具 Tool | 用途 Purpose |
| --- | --- |
| `arsenal.search` | 按自然语言检索能力（返回分数、作者、宿主、摘要、id）· search by natural language |
| `arsenal.list` | 分页浏览 · paginated listing |
| `arsenal.get` | 读取能力详情、安装路径、清单 · details, install path, manifest |
| `arsenal.read_skill` | 读取技能正文全文 · read the full skill body |
| `arsenal.report_usage` | 上报调用记录（影响排序）· report usage, affects ranking |
| `arsenal.list_faults` | 查询维修工单 · list repair work orders |
| `arsenal.submit_patch` | 回传维修补丁 · submit a repair patch |
| `arsenal.register_agent` | 登记智能体 · register an agent |
| `arsenal.registry_stats` | 中枢统计 · hub statistics |
| `arsenal.sync_status` | 扫描/诊断状态 · scan and diagnosis status |

配置示例 · Configuration:

```json
{
  "mcpServers": {
    "agent-arsenal": {
      "type": "streamableHttp",
      "url": "http://127.0.0.1:18297/mcp"
    }
  }
}
```

只支持 stdio 的宿主 · For stdio-only hosts:

```json
{
  "mcpServers": {
    "agent-arsenal": {
      "command": "node",
      "args": ["<项目路径>/apps/desktop/src/main/cli.js", "stdio"]
    }
  }
}
```

---

## 目录结构 · Repository layout

```text
agent-arsenal/
├── apps/desktop/
│   ├── src/main/            Electron 主进程 + 后端内核 · Electron main process and backend core
│   │   ├── core/            路径、工具、YAML/TOML、清单、事件、日志、切分
│   │   ├── db/              SQLite 模式与连接 · schema and connection
│   │   ├── adapters/        skill / mcp / plugin 协议适配 · protocol adapters
│   │   ├── services/        registry / scanner / dedupe / search / faults / workflow / lifecycle …
│   │   ├── mcp/             MCP JSON-RPC 核心与工具定义 · MCP core and tool definitions
│   │   └── server/          HTTP + MCP Streamable HTTP
│   ├── src/renderer/        React 19 + TypeScript 界面（12 个视图）· 12 views
│   └── preload.cjs          安全的 IPC 白名单桥 · allow-listed IPC bridge
├── tests/                   24 项 node:test 测试 · node:test suites
├── scripts/                 启动 / 开发 / 构建 / start, dev, build
├── docs/                    六类文档 · six document sets
├── arsenal/                 纳管的能力实体（skill / mcp 分散目录）· managed capability entities
├── agent-arsenal-v1.0.0-windows-x64.zip   解压即用的绿色版 · portable build, ready to extract
└── old/                     旧项目归档（Rust 内核 + Tauri 桌面端，v0.1.0），仅作参考 · archive of the previous generation, for reference only
```

---

## 环境变量 · Environment variables

| 变量 Variable | 作用 Purpose | 默认值 Default |
| --- | --- | --- |
| `ARSENAL_HOME` | 覆盖数据目录（数据库 / 日志 / 快照 / 备份）· override the data directory | 程序同级 `arsenal-data/` |
| `ARSENAL_DB` | 直接指定 SQLite 文件 · point at a specific SQLite file | `<ARSENAL_HOME>/arsenal.db` |
| `ARSENAL_LIBRARY` | 指定军械库目录（纳管的能力实体）· the managed capability library | 程序同级 `arsenal/` |
| `ARSENAL_EXTRA_LIB` | 追加扫描的额外能力仓库，多个用 `;` 分隔 · extra capability roots, `;`-separated | `%USERPROFILE%\.agent-core` |
| `ARSENAL_PACKAGED` | 置 `1` 表示绿色版运行 · set to `1` for the portable build | 由启动器设置 · set by the launcher |

---

## 安全边界 · Security boundaries

- HTTP 服务默认**只监听 127.0.0.1** · the HTTP server binds loopback only
- 渲染进程 `nodeIntegration: false` + `contextIsolation: true`，仅通过白名单 IPC 访问主进程
- 请求体上限 4–8 MB、并发上限、超时限制 · body size cap, concurrency cap, timeouts
- 所有写操作（修复 / 同步 / 导入）均有备份记录，可回滚 · every write is backed up and reversible
- 删除是「移入回收站」而非销毁，数据库保留可恢复记录 · delete means "move to trash", never destroy
- 无遥测、无外网上报：能力目录与调用记录只在本机 · no telemetry, no outbound reporting

> **发布包不含任何个人数据** · **The published package contains no personal data.**
> 压缩包里没有预置的扫描结果、数据库、日志或本机路径；首次启动时应用只扫描并索引**你本机**的能力。
> No pre-seeded scan results, database, logs or machine paths ship in the archive; on first launch the
> app only scans and indexes the capabilities **on your own machine**.

---

## 文档 · Documentation

| 文档 Document | 内容 Contents |
| --- | --- |
| [调研文档](docs/research/01-调研文档.md) | 同类项目批判性分析 · critical analysis of comparable projects |
| [规划文档](docs/planning/02-规划文档.md) | 架构、数据模型、里程碑 · architecture, data model, milestones |
| [改动文档](docs/changelog/03-改动文档.md) | 实现记录 · implementation log |
| [测试文档](docs/testing/04-测试文档.md) | 测试项、结果、验收证据 · test matrix and evidence |
| [经验文档](docs/lessons/05-经验文档.md) | 踩坑与提升建议 · pitfalls and lessons |
| [使用手册](docs/usage/06-使用手册.md) | 界面逐页说明 · page-by-page guide |
| [旧项目归档说明](OLD.md) | 上一代实现（Rust 内核 + Tauri 桌面端）的归档说明，仅供参考 · archive guide to the previous generation, for reference only |

---

## 许可 · License

[MIT](LICENSE) © 2026 Stark-work-1001
