# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-19

首个公开版本 / First public release.

### Added
- 跨智能体能力中枢：六类协议来源（Agent Skills / MCP / DSH 插件 / Claude·Codex 插件 / A2A / OpenAPI 3）自动发现与归一化入库。
  Cross-agent capability hub with automatic discovery and normalization of six protocol families.
- 混合检索：FTS5 全文 + trigram 子串 + 结构化匹配三路融合，含中英同义词扩展与打分构成解释。
  Hybrid retrieval fusing FTS5, trigram and structured matching, with synonym expansion and score explanations.
- 智能体接入三通道：MCP 会话 / 心跳文件 / 进程识别，界面明确区分三种在线状态。
  Three agent-onboarding channels with distinct online states in the UI.
- 故障诊断与维修：8 条确定性规则、安全规则自动修复（可回滚）、工单派发与补丁回传落盘。
  Diagnostics and repair: deterministic rules, reversible auto-fixes, work orders and patch write-back.
- 去重裁决：逻辑能力分组、重复候选组、保留最新 / 合并 / 共存 / 忽略四类裁决。
  Duplicate arbitration with logical grouping and four resolution actions.
- 更新管理与生态同步：三级版本证据链、目录导入、宿主原生配置一键写入（写入前备份）。
  Update management and ecosystem sync with a three-tier evidence chain and backed-up config writes.
- 12 个界面视图：总览 / 能力库 / 检索实验室 / 智能体接入 / 来源与扫描 / 去重裁决 / 维修站 / 更新管理 / 工作流 / 生态同步 / 数据库 / 设置。
  12 UI views covering overview, capability library, search lab, onboarding, sources, duplicates, repair, updates, workflows, sync, database and settings.
- 24 项后端测试（node:test）。
  24 backend test suites.

### Changed
- 发布前脱敏：移除全部硬编码的本机绝对路径，改为按运行期推导或用户主目录探测。
  Pre-release desensitization: every hard-coded machine path replaced by runtime-derived or home-relative lookups.
- 发布包不再预置任何扫描结果与数据库，首次启动时应用只索引使用者本机的能力。
  The published archive no longer ships scan results or a database; the app indexes only the user's own machine.
- README 改为中英双语。
  README is now bilingual (Chinese / English).

### Security
- HTTP 服务默认只监听 127.0.0.1；渲染进程禁用 nodeIntegration 并启用 contextIsolation，IPC 采用白名单。
  The HTTP server binds loopback only; the renderer runs with node integration disabled, context isolation on and an allow-listed IPC bridge.
- 所有写操作（修复 / 同步 / 导入）均落备份记录并可回滚；删除为移入回收站。
  Every write is backed up and reversible; deletion moves files to the trash.

[1.0.0]: https://github.com/Stark-work-1001/Agent-arsenal/releases/tag/v1.0.0
