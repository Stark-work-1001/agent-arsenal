# 脱敏处理记录 · Desensitization Record

> 本文件记录 agent-arsenal **旧代实现**（Rust 内核 + Tauri 桌面端，v0.1.0）归档为公开版时所做的**逐项脱敏处理**。
> 原则依据《数据脱敏指南》：**切断与真实个体 / 真实机密的「可识别联系」，同时尽量保留任务所需的语义、结构和上下文**。
> 即：**任务用得到的敏感信息 → 脱敏替换；用不到的 → 删除截取**。
>
> This file records every desensitization step applied to the archived Rust/Tauri generation (v0.1.0) before it was made public.
> Principle: **cut the identifiable link to a real person or a real secret, while preserving the semantics, structure and context the task needs.**
> Sensitive-but-needed → replace; sensitive-and-unneeded → delete.

---

## 一、范围与来源 · Scope and provenance

| 项 | 值 |
| --- | --- |
| 源目录（冻结，只读） | 旧代工作区副本，**207,137 个文件 / 26.4 GB** |
| 交付目录 | 本仓库 `old/`，**229 个文件 / 23,706,484 字节** |
| 实际源码 | 源目录中仅 **240 个文件**是真正的源码；其余 99.85% 是构建垃圾（`artifacts/` 8.4 GB、`kernel/target`、`apps/node_modules`、`embedder/venv` 4.9 GB、`vendor/` 654 MB、WebView2 浏览器 profile、`.git/`） |
| 脱敏命中面 | 240 个源码文件中 **79 个**命中敏感模式，其中 **22 个**需要实际处理 |
| 交付构成 | `kernel/` 85 · `apps/` 100 · `docs/` 11 · `arsenal/` 12 · `release/` 8 · `scripts/` 10 · `proto/` 1 · 本文件与 `old/README.md` 2 |

### 冻结验证 · Freeze verification

源目录在交付全过程**零改动**，以 207,137 个文件的「相对路径 + 字节数 + 最后修改时间」清单做前后 diff：

```
ADDED    (基线后新增)   : 0
REMOVED  (基线后删除)   : 0
MODIFIED (大小/时间变化) : 0
=> 源目录与基线逐字节一致
```

---

## 二、处理分类 · Treatment categories

### A. 本机绝对路径 → 运行期推导或占位符

| 位置 | 处理前 | 处理后 |
| --- | --- | --- |
| `scripts/build-release.ps1` 的 `$RepoRoot` / `$StandaloneRoot` / `$ReleaseRoot` | 硬编码的旧工作区与同级目录绝对路径 | **param 留空 + param 块后 `if (-not …)` 由 `$PSScriptRoot` 推导**；仍可被外部传参覆盖 |
| `scripts/build-standalone.ps1` / `scripts/promote-candidate.ps1` | 同上 | 同上 |
| `kernel/crates/ac-registry/src/origin.rs` L356 / L368 | 旧工作区下的 vendor 绝对路径（测试数据） | `C:\example\agent-arsenal\vendor\...` |
| `kernel/crates/ac-registry/src/store.rs` L3798 | 旧工作区下的 vendor 绝对路径（测试数据，正斜杠形式） | 同上 |
| `kernel/crates/ac-mcp/src/gateway.rs`、`ac-registry/src/locator.rs`、`ac-registry/src/testutil.rs`、`ac-retrieval/src/fulltext.rs`（注释 13 处） | 以具体盘符目录举例的文件系统策略说明 | 通用工作区占位 |
| `apps/desktop/src-tauri/build.rs` L104 | 注释里的具体搬迁路径 | 通用表述 |
| `apps/desktop/src/__tests__/round3-ui.test.tsx` L472 | 插件目录绝对路径（测试 evidence） | `<工作区>\.plugin` 占位 |
| `arsenal/mcp/obsidian-suite/arsenal-manifest.json`、`mcp.json`、`mcp/.mcp.json` | 插件目录与 Python 解释器绝对路径 | `<plugin-root>\` / `<workspace>\` / `<python-interpreter>` |
| `arsenal/mcp/obsidian-suite/SKILL.md` L51 / L52 / L101 | 真实 vault 路径、插件交付路径 | `<vault A>\`、`<vault B>\`、`<sandbox vault>\`、`<插件目录>\` |
| 文档 6 类（18 处以上） | 旧工作区与数据目录绝对路径 | `<项目根>\`、`<数据目录>\`、`<工作区>\`、`<用户目录>\`、`<归档源>\`、`<隔离版目录>\` |

> **实现要点**：`build-standalone.ps1` 与 `promote-candidate.ps1` 带 `[CmdletBinding()]`，在 PowerShell 5.1 下 **param 默认值求值阶段 `$PSScriptRoot` 为空**，
> 直接写 `[string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path` 会让脚本直接崩溃。
> 故一律采用「param 留空 + param 块后 `if (-not …)` 推导」的等价写法，并实测验证「无参运行」与「显式传参」两条路径。

### B. 真实扫描快照 → 同结构合成样例

| 文件 | 问题 | 处理 |
| --- | --- | --- |
| `apps/desktop/public/preview.json` | 1.4 MB 的**真实扫描结果**：含 1016 处旧工作区绝对路径、506 条真实资产路径与真实资产名 | **重建为同结构合成样例**（约 23 KB）：顶层 9 个键与 item 的 25 个键及子键顺序**逐键保持**；10 条**完全虚构**的条目；`db_path` / `scan_root` 改为占位；`generated_at_unix` 改为中性值。**保留前端实际消费的取值域**（lifecycle / origin_kind / registration_kind / host_support 的枚举值），否则筛选下拉会变空 |
| `data/asset-research.json`、`data/registry.db`、`data/llm-providers.json` | 真实扫描数据；registry.db 内含 **8 个 `sk-` 形态密钥**、2869 处旧工作区路径、6 处真实 vault 路径 | **整个 `data/` 不发布** |

### C. 构建机身份 → 二进制内等长字节替换

`release/arsenal-desktop.exe` 是**编译产物**，Rust 的 panic 定位串把构建机的绝对路径焊进了二进制：实测含 **702 处**构建机用户目录路径与 **18 处**构建机源码绝对路径。

替换采用**等长字节替换**（Rust `&'static str` 的长度是编译期常量，改长度会越界）：

| 原 | 后 | 处数 |
| --- | --- | --- |
| 构建机用户主目录前缀（22 字节） | `C:\Builds\PublicUser01` | 1010 |
| 构建机源码目录前缀（31 字节） | `D:\pub-build-repo\agent-arsenal` | 24 |

**实测不变量**（最终 exe 对源 exe）：

| 项 | 值 |
| --- | --- |
| 文件字节数 | **20,178,432**（替换前后完全一致） |
| 差异字节总数 | **18,492**（C 窗口 1010×18 = 18,180，D 窗口 24×13 = 312），与理论值**完全吻合** |
| **替换窗口之外的差异字节** | **0** ← 关键不变量 |
| 1010 / 24 个窗口在改后文件中的偏移 | 与源文件**逐一对应** |
| MZ / PE 签名 | 完好（源文件本无 Authenticode 证书表，故无签名失效问题） |
| UTF-16LE 宽字符变体 | 同步扫描，0 处漏网 |

> **为什么替身不含 `Users\` 段**：第一版替身带 `Users\` 前缀，导致朴素正则 `[A-Za-z]:[\\/]Users[\\/]` 仍命中 1010 处，需人工推理「这些是替身」才能判定干净。
> 改为 `C:\Builds\PublicUser01` 后该正则**直接归零**，复核者跑一条命令即可确认。

### D. 环境指纹 → 删除或中性化

| 类别 | 处理 |
| --- | --- |
| exe / `registry.db` 的 **SHA256**、**字节数**、**构建时间戳** | 全部删除，改用「以内容摘要标识」 |
| 工具链精确版本（rustc 1.99.1 / node v24.15.0 / npm 11.12.1 / WebView2 155.0.4283.60） | 改为 `rustc（stable 工具链）· node（LTS）· npm（随 node 分发）· WebView2（固定版本）` |
| 本机开发端口（18191 / 18195 / <neighbour-port-1> / <neighbour-port-2> / 18197 / 18198 / 18297） | 改为 `<嵌入端口>\`、`<对外端口>\`、`<候选端口>\`、`<调试端口>\` 等占位 |
| 「**本仓库无 git**」这类自述性元信息 | 删除，改写为中性表述 |
| 第一人称本机叙述（「我在本机实测……」「本机有 X 条策略」） | 改为第三人称（「在该环境下……」「该环境存在策略」） |

### E. 密钥形态 → 删除或改为环境变量读取

| 位置 | 处理 |
| --- | --- |
| `data/registry.db` | 不发布（含 8 个 `sk-` 密钥） |
| `vendor/mcp/mcp-obsidian/.env` | 不发布（含真实 Obsidian API key） |
| `apps/desktop/public/preview.json` | 重建为合成样例。**注**：初判的「7 个 sk- 密钥」经复核为**正则子串误报**——全部来自资产名 `risk-quality-reviewer` 一类的字符片段；严格密钥形态 `sk-[A-Za-z0-9]{20,}`、`sk-proj-`、`sk-ant-`、`ghp_`、`AKIA` 实测均为 0 |
| `kernel/crates/ac-llm/src/slots.rs` 单元测试夹具 | `sk-test-…` / `sk-supersecretvalue123456` → `dummykey-…`（**保留 `supersecret` 子串**，因 `view_never_exposes_plain_key` 两条断言依赖它）。理由：`sk-` + 22 位字母数字**完全符合 OpenAI key 形状**，会被 GitHub secret scanning 等自动扫描器误判为疑似真实密钥 |
| `data/llm-providers.json`、`docs/configuration/model-slots.example.json` | 只含环境变量名（如 `SILICONFLOW_API_KEY`），无真实密钥，原样保留 |

### F. 个人化口吻 → 中性化

`release/` 启动器与使用说明中「**把 data 目录一并反馈给维护者**」这类个人化指引，改为「请记录本窗口显示的全部文字，再通过项目公开渠道反馈问题」；并把对 `vendor` 的**硬性存在性检查**（缺目录即 `exit /b 2`）改为**可选**（缺目录时提示仍可启动），删去 `data` 的存在性要求。

---

## 三、**保留**项及理由 · Deliberately retained

保留不等于漏脱敏。以下内容**不指向任何真实个体或真实机密**，按「尽量保留语义与上下文」的原则原样保留：

| 保留项 | 出现处 / 数量 | 理由 |
| --- | --- | --- |
| **第三方开源项目作者署名与邮箱**（上游 `mcp-obsidian` 作者的邮箱） | 2 处 | MIT 许可要求版权声明随代码分发，删除署名反而构成许可违规。出处已完整记录在 `arsenal/mcp/obsidian-suite/ACKNOWLEDGEMENTS.md` |
| **MIT 许可证原文** | `mcp/LICENSE.upstream` | 与上游 SHA256 逐字节一致；并补齐了此前**缺失**的 `ACKNOWLEDGEMENTS.md`——旧代码的 `server_entry.py` 文件头早已引用该文件名，但文件并不存在 |
| **第三方项目对照表**（含仓库链接与 MIT / Apache-2.0 等许可证列） | 文档 1 篇 | 出处标注，公开信息 |
| **微软 `Common-Controls publicKeyToken=6595b64144ccf1df`** 等公开常量 | 若干 | 公开常量 |
| **纯技术结论数字**（P95 6.00 ms、资产计数、测试通过数、语料字符数） | 若干 | 技术结论，不随机器变化 |
| **`D:/.agent-core/.plugin`** | exe 1 处 + 源码 8 处 | 旧代产品**自身的默认插件根目录约定**。exe 中那 1 处是界面证据标签（源码 `hosts.rs:656`，紧邻「Claude Code 的用户配置目录」）；源码中是同名常量与测试夹具。对任何用户都长得一模一样 |
| **`D:/.my-agent/...`** | 源码 16 处 | 旧代工作区根目录名，全部是**单元测试夹具**（`locator.rs` 13、`faults.rs` 2、`origin.rs` 1）。不指向某台具体机器 |
| **`C:/Users/<user>/...`** | 源码 3 处 | 用户名字段是**字面占位符 `<user>`**（`hosts.rs` 2 处文档注释、`presence.rs` 1 处测试夹具）。已核实 `presence.rs` 的 `classify` 按路径段做精确匹配，`<user>` 段不参与任何 marker 比较，断言不受影响 |
| **`C:\Program Files (x86)\Windows Kits\10\bin`** | 1 处 | Windows SDK 的**固定安装位置**。改为占位会导致 `mt.exe` 定位失败 |
| **`Bearer {api_key}`** | 3 处 | 构造 HTTP 鉴权头的正常业务代码（`cloud.rs`），密钥是运行期变量，源码中无字面值 |
| **`operations.rs` 中的敏感词黑名单 `["sk-", "bearer ", "api_key", …]`** | 1 处 + 1 处测试 | 这是**脱敏逻辑本身**，删掉功能就没了 |
| **`D:/x/registry.db`、`E:/override`、`D:/portable`、`C:/appdata/data`** | 若干 | 单元测试里的通用假路径 |
| **产品代号 Capability Nexus、旧产品名 agent-core、`ARSENAL_*` 环境变量契约** | 若干 | 产品自身历史与对外契约，非个人隐私 |

---

## 四、已知遗留 · Known artifacts

| 项 | 说明 | 决定 |
| --- | --- | --- |
| **16 处 U+FFFD 替换字符** | `gateway.rs` 6 处、`ac-registry/src/store.rs` 8 处、`fingerprint.rs` 2 处。经逐字节比对与 SHA256 比对确认**全部源自源文件自身**（fingerprint.rs 与 store.rs 与源 SHA256 完全一致，即原样复制），属源仓库既有的编码缺陷，**非本次引入** | **不修**。修它属于超出脱敏范围的功能性改动，且会掩盖「归档保真」这一前提。已在此记录 |
| **1 处 U+000C（换页符）** | `ac-registry/src/locator.rs` 第 708 行，位于文档注释中，**不含任何个人数据** | 不修，同上 |
| **源仓库 git 状态本就 dirty** | 源目录 `git status` 显示大量已修改 / 未跟踪文件，是该仓库的**既有状态**，与本次交付无关 | 不处理，仅记录以免误判 |

---

## 五、复核方法 · How to verify

### 5.1 文本类文件

在仓库根目录运行（Windows PowerShell），**正斜杠与反斜杠双向覆盖**：

```powershell
Get-ChildItem -LiteralPath .\old -Recurse -File -Force | Where-Object {
  $_.Extension -in '.rs','.ts','.tsx','.js','.mjs','.json','.md','.yaml','.yml','.py','.ps1','.sh','.cmd','.txt','.html','.css','.toml','.lock'
} | Where-Object { $_.Name -notmatch '^(README|DESENSITIZATION|RESIDUAL_PATHS)\.md$' } |
  Select-String -Pattern '[A-Za-z]:[\\/]Users[\\/]','[A-Za-z]:[\\/]agent-vibe-app','sk-[A-Za-z0-9]{20,}','sk-proj-|sk-ant-|ghp_|AKIA','[A-Za-z]:[\\/]001-run','[A-Za-z]:[\\/]003-knowledge'
```

**必须排除三个审计文档**（`old/README.md`、本文件、`release/RESIDUAL_PATHS.md`）——它们按设计会引用上述模式串本身，否则会得到自指命中。

### 5.2 二进制

`release/arsenal-desktop.exe` 与图标 PNG 需按字节扫描（PNG/ICO 是像素数据，正则会误报）。逐项定性见 `release/RESIDUAL_PATHS.md`：

- 严格口径（盘符后紧跟合法路径字符）**1046** 处 = **1035 处真路径**（全部已是中性占位）+ **11 处机器码 / 随机字节误命中**
- 宽松口径 **1171** 处 = 上者 + **125 处** URL scheme / 文本语料误命中
- 其中 `C:\Builds\PublicUser01`（1010）、`D:\pub-build-repo\agent-arsenal`（24）为占位；`D:/.agent-core/.plugin`（1）为产品约定；其余 136 处非路径

### 5.3 实测结果 · Measured results

下表为对交付树的全量实测值（**已排除三个审计文档**）：

| 模式 | 源码 / 文档（文本） | 二进制 exe |
| --- | --- | --- |
| `[A-Za-z]:[\\/]Users[\\/]` | **3** —— 全部为 `<user>` 通用占位（`hosts.rs` 2、`presence.rs` 1） | **0** |
| `[A-Za-z]:[\\/]agent-vibe-app` | **0** | **0** |
| `Administrator` | **0** | **0** |
| `sk-[A-Za-z0-9]{20,}` / `sk-proj-` / `sk-ant-` / `ghp_` / `AKIA` | **0** | **0** |
| `[A-Za-z]:[\\/]001-run` / `003-knowledge` | **0** | **0** |
| `Bearer\s+[A-Za-z0-9._\-]{20, }`（带真实凭据形态） | **0** | **0** |
| `[A-Za-z]:[\\/]\.agent-core` | **8**（产品目录约定，见 §三） | **1**（产品约定） |
| `[A-Za-z]:[\\/]\.my-agent` | **16**（单元测试夹具，见 §三） | **0** |
| `Bearer `（协议关键字本身） | **5**（业务代码 3 + 脱敏词表 1 + 测试 1） | — |

**结论：所有指向真实个体或真实机密的标识符，命中数均为 0。** 剩余命中逐项对应 §三 的保留项，均已人工复核。

---

## 六、功能验证 · Functional verification

脱敏必须**不改变行为**，因此对交付源码做了实际构建与测试：

| 验证 | 结果 |
| --- | --- |
| `cargo check --workspace --all-targets --offline` | **EXITCODE = 0**（含 `#[cfg(test)]`，仅 1 条既有 dead_code 警告，与本次改动无关） |
| `cargo test --workspace --offline` | **EXITCODE = 0 · passed = 531 · failed = 0**（ac_core 10 / ac_ipc 1 / ac_llm 17 / ac_mcp 74 / ac_registry 334 / ac_retrieval 95） |
| 受影响的 3 个 `slots` 用例 | `save_then_load_round_trip`、`view_never_exposes_plain_key`、`none_key_keeps_existing_and_empty_string_clears` 全部 `ok` |
| 3 个 PowerShell 脚本语法与行为 | `Parser::ParseFile` 全部 OK；「无参运行」与「显式传参」两条路径均实测通过 |
| 交付树的 JSON | 全部通过 `ConvertFrom-Json` / `JSON.parse` |
| 交付树的 Python | 6 个文件全部通过 `ast.parse` |
| 交付树内无构建产物 | `kernel/target`、`apps/desktop/node_modules`、`apps/desktop/dist`、`__pycache__`、`*.bak`、`*.pyc` 均为 0 |
| 交付树内无预置数据库 / 语料 | `registry.db`、`vendor`、`artifacts`、`.git`、`.arsenal-appdata` 均为 0 |
| `release/SHA256SUMS.txt` | 7 条**逐条自校验全部通过**，无未列出的文件 |
| 源目录 | **207,137 个文件逐字节未变**（见 §一） |
