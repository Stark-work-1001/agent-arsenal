# Release Notes — Agent Arsenal v1.0.0

**发布日期 / Release date:** 2026-10-19
**产物 / Artifact:** `agent-arsenal-v1.0.0-windows-x64.zip`（Windows x64，解压即用 / Windows x64, ready to extract）
**仓库 / Repository:** <https://github.com/Stark-work-1001/Agent-arsenal>

---

## 中文

### 这是什么

**智能体核武库**是一个跨智能体能力中枢：把散落在 DSH、Codex、Claude Code、MiniMax、Gemini 等宿主里的技能、MCP 服务与插件，统一采集进本地 SQLite 数据库，再通过 MCP 协议开放给任何接入的智能体**主动检索、读取、调用**。它同时承担故障诊断、重复裁决与更新巡检——中枢负责**汇报与定位故障**，修复动作由接入的智能体执行。

### 主要能力

- **多协议采集**：Agent Skills、MCP、DSH 插件、Claude/Codex 插件、A2A、OpenAPI 3 六类来源自动发现。
- **混合检索**：FTS5 全文 + trigram 子串 + 结构化匹配三路融合，离线可用，附带中英同义词扩展与打分构成解释。
- **智能体接入三通道**：MCP 会话（可靠）、心跳文件（低成本）、进程识别（零接入），界面明确区分三种在线状态。
- **故障识别与维修**：8 条确定性诊断规则 + 安全规则自动修复（可回滚）+ 结构化工单派发给接入智能体，补丁经 `arsenal.submit_patch` 回传并由中枢校验落盘。
- **去重裁决**：同身份合并为逻辑能力，名称归一或描述相似度 ≥ 0.86 生成重复候选组，裁决动作含保留最新 / 合并 / 共存 / 忽略，归档不删文件。
- **更新与生态同步**：DSH Market 兼容性缓存 → 本地 node_modules → npm registry 三级证据链；一键把 MCP 端点写入各宿主原生配置，写入前自动备份。

### 上手

1. 下载 `agent-arsenal-v1.0.0-windows-x64.zip`，解压到任意目录。
2. 双击 `启动-智能体核武库.cmd`。首次启动后台扫描本机全部来源（约 20–30 秒），数据写入同目录 `arsenal-data/`。
3. 在「设置」页复制 MCP 配置，或用「生态同步」一键写入宿主配置。默认端点 `http://127.0.0.1:18297/mcp`，提供 10 个 MCP 工具与 20 个 REST 端点。

### 本次发布的数据与隐私处理

发布包**不含任何个人数据**：没有预置扫描结果、数据库、日志、真实路径或进程信息。代码中原有的本机绝对路径已改为按运行期推导或按用户主目录探测。包内所有第三方内容仅限自研的示例能力与元技能。应用无遥测、无外网上报，默认只监听 127.0.0.1。

### 已知边界

1. 仅支持 Windows（进程识别依赖 WMI / tasklist）。
2. 不提供安装包与代码签名，为绿色解压版。
3. 中枢不代替宿主执行技能，只负责检索、读取与治理。
4. 依赖预检是静态判断（文件是否存在），不做真实启动探活。

---

## English

### What this is

**Agent Arsenal** is a cross-agent capability hub. It collects skills, MCP servers and plugins from hosts
such as DSH, Codex, Claude Code, MiniMax and Gemini into one local SQLite database, then exposes them over
MCP so any connected agent can **search, read and call** them on demand. It also owns diagnostics,
duplicate arbitration and update checks. The hub **reports and localizes faults**; the connected agent
performs the repair.

### Highlights

- **Multi-protocol collection** — six source families discovered automatically: Agent Skills, MCP, DSH plugins, Claude/Codex plugins, A2A and OpenAPI 3.
- **Hybrid retrieval** — FTS5 full text, trigram substrings and structured matching fused, fully offline, with bilingual synonym expansion and a per-hit score breakdown.
- **Three onboarding channels** — MCP session (reliable), heartbeat file (cheap) and process detection (zero setup); the UI distinguishes *running*, *heartbeat online* and *not running*.
- **Diagnosis and repair** — 8 deterministic rules, safe auto-fixes that are always reversible, plus structured work orders dispatched to connected agents; patches come back through `arsenal.submit_patch` and are path-validated before being written.
- **Duplicate arbitration** — same-identity instances merge into one logical capability; normalized-name or ≥ 0.86 description similarity forms candidate groups; actions are keep-newest, merge, coexist or ignore, and archiving never destroys files.
- **Updates and ecosystem sync** — a three-tier evidence chain (DSH Market cache → local node_modules → npm registry) and one-click MCP endpoint injection into each host's native config, with backups taken first.

### Getting started

1. Download `agent-arsenal-v1.0.0-windows-x64.zip` and extract it anywhere.
2. Double-click `启动-智能体核武库.cmd`. The first launch scans every source on your machine in the background (about 20–30 s) and writes everything to `arsenal-data/` next to the program.
3. Copy the MCP configuration from the Settings page, or use Ecosystem Sync to write it into your host. The default endpoint is `http://127.0.0.1:18297/mcp`, exposing 10 MCP tools and 20 REST endpoints.

### Data and privacy in this release

The published package **contains no personal data**: no pre-seeded scan results, no database, no logs, no real machine paths and no process information. Machine-specific absolute paths in the code were replaced by runtime-derived locations or user-home probing. The only bundled content is the project's own sample capability and meta skill. There is no telemetry and no outbound reporting; the server binds 127.0.0.1 by default.

### Known limits

1. Windows only (process detection relies on WMI / tasklist).
2. Portable extract-and-run build — no installer and no code signing.
3. The hub does not execute skills for you; it retrieves, reads and governs them.
4. Dependency pre-checks are static (does the file exist), not live start-up probes.
