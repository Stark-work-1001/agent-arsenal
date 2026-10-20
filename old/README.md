# 旧项目归档 · The `old/` Directory

> `old/` 是 agent-arsenal **上一代项目的成果归档**：**Rust 内核 + Tauri 2 桌面端**，v0.1.0（项目代号 Capability Nexus）。
> 当前主线是仓库根目录的 **Electron 版 v1.0.0**。`old/` **仅作参考保留**——不再维护、不再迭代新功能，也不随主线发布包分发。
>
> `old/` is the **archived result of the previous generation** of agent-arsenal: a **Rust kernel with a Tauri 2 desktop shell**, v0.1.0 (codename *Capability Nexus*).
> The current mainline is the Electron-based v1.0.0 at the repository root. `old/` is **kept for reference only** — it is not maintained, receives no new features, and is not shipped in the mainline release package.

> **本文件中的所有路径均相对于仓库根目录。** / All paths in this document are relative to the repository root.
> 本文件的同一内容同时交付于仓库根目录与 `old/` 目录内，因此不使用相对链接。
> The same content is delivered at both the repository root and inside `old/`, so no relative links are used.

---

## 为什么保留它 · Why it is kept

旧代实现里有几样东西是重写后的主线**没有**的，而它们能解释这个项目为什么长成今天这样：

| 保留的东西 | Why it stays |
| --- | --- |
| **6 个 Rust crate 的分层纪律** | `ac-core` 零 IO 零依赖；`ac-retrieval` 经 trait 抽象存储而不直接依赖 `ac-registry`——检索算法可脱离 SQLite 单独测试。这是主线用 Node 重写后看不到的设计约束 |
| **M0–M6 的里程碑划分与完成标志** | 能看懂「当初为什么把范围切成这样」 |
| **19 条踩坑记录**（P01–P23） | 多是「看起来无关但真会咬人」的那类：Rust 派生属性、PowerShell 参数求值、manifest 嵌入、Windows 清单 |
| **可运行的老版二进制** | 与源码一一对应，可直接启动对照 |

Nothing here is maintained. If you want the product, use v1.0.0 at the repository root; if you want to study the Rust/Tauri generation, this is it.

---

## 里面有什么 · What is inside

| 路径 | 内容 |
| --- | --- |
| `old/kernel/` | Rust workspace，6 个 crate（协议层 / 连接执行 / 模型槽位 / MCP / 资产注册 / 检索） |
| `old/apps/desktop/` | Tauri 2 + React 19 + TypeScript + Vite 7 桌面端；其中 `old/apps/desktop/public/preview.json` 是**合成样例**，不是真实扫描结果 |
| `old/arsenal/` | 自研 `obsidian-suite` MCP 套件（REST + CLI 双通道）；含上游 `mcp-obsidian` 0.2.2 的 MIT 源码副本 |
| `old/proto/` | Capability Manifest v1 协议定义 |
| `old/scripts/` | 构建脚本；路径一律由脚本自身位置推导 |
| `old/docs/` | 调研 / 规划 / 改动 / 测试 / 经验 / 使用手册 |
| `old/release/` | 脱敏后的解压即用包（8 个文件） |
| `old/DESENSITIZATION.md` | 逐项脱敏处理记录、保留项理由与实测复核结果 |

**有意不包含**：第三方语料目录、运行数据库、构建产物、版本库历史、任何构建缓存。

---

## 怎么用 · How to use it

**当参考资料读（推荐）**——主体是 `old/docs/` 里的规划、踩坑与测试文档。

**从源码构建旧版**——需要 Rust 工具链、Node.js；Windows 上还需 MSVC Build Tools 与 WebView2 运行时。在仓库根目录执行：

```bash
# 1. Rust 内核
(cd old/kernel && cargo build --release && cargo test --release)

# 2. 桌面应用
(cd old/apps/desktop && npm install && npm run tauri dev)
```

> Windows 上单独 `cargo build --release` 出的 exe 会停在 **dev 模式**：窗口能开，但内容是 `ERR_CONNECTION_REFUSED`。
> 用 `npm run tauri build`，或在 `Cargo.toml` 里设 `default = ["custom-protocol"]`。
> On Windows a bare `cargo build --release` leaves the exe in dev mode — the window opens but shows `ERR_CONNECTION_REFUSED`.

**运行打包好的旧版**——解压 `old/release/` 后双击 `启动-智能体军械库.cmd`（或纯 ASCII 文件名的 `launch.cmd`），首次启动会在同目录自建数据目录。包内说明见 `old/release/使用说明.md`（中文）与 `old/release/README.md`（英文）。

---

## 脱敏状态 · Desensitization status

`old/` 已按《数据脱敏指南》的口径处理完毕：**切断与真实个体 / 真实机密的「可识别联系」，同时尽量保留任务所需的语义、结构和上下文**。技术内容一律保留，抹掉的是「能指回某台具体机器、某个人」的标识符。

| 类别 | 处理 |
| --- | --- |
| 本机绝对路径 | 改为运行期推导或占位符 |
| 硬编码的用户名 | 二进制内做**等长字节替换**（文件长度与 PE 结构不变，替换窗口之外零差异） |
| 真实扫描快照 | 重建为**同结构合成样例**，条目全部虚构 |
| 运行数据库与第三方语料 | 一律不发布 |
| 环境指纹（内容摘要、字节数、构建时间戳、工具链精确版本、本机端口） | 删除或中性化 |
| 第三方作者署名、许可证原文、公开常量、纯技术结论数字 | **保留**（不指向任何个人） |

**实测结果**：所有指向真实个体或真实机密的标识符，命中数均为 **0**；旧代工作区的 207,137 个源文件在交付全程**逐字节未变**；`cargo test --workspace` **531 passed / 0 failed**。

逐项清单、保留项及理由、已知遗留与复核方法，见 `old/DESENSITIZATION.md`；打包目录内所有残留盘符串的逐项定性，见 `old/release/RESIDUAL_PATHS.md`。**本说明文档本身也按同一口径脱敏**——不含本机路径、用户名、真实密钥与本机环境指纹。

---

## 边界与注意 · Boundaries and caveats

1. 仅支持 Windows（Tauri + WebView2）。
2. `old/` 不再维护；功能与缺陷请以主线 v1.0.0 为准。
3. `old/release/` 不含第三方语料目录，依赖语料的检索类功能不可用。
4. 旧代源码中保留了若干**源文件自身**的编码缺陷（替换字符与控制字符），不属脱敏范围，未做修复。
5. `old/` 与主线是两套独立实现，接口、数据格式与配置**互不兼容**，请勿混用。

---

## 相关 · Related

- 主线说明：仓库根目录的 `README.md`（v1.0.0）
- 脱敏处理记录：`old/DESENSITIZATION.md`
- 旧版使用说明：`old/release/使用说明.md` · `old/release/README.md`
- 仓库 / Repository: <https://github.com/Stark-work-1001/Agent-arsenal>
- 许可 / License: MIT（见仓库根目录的 `LICENSE`）
