import fs from 'node:fs';
import path from 'node:path';

// 首次运行时在军械库内放置一条元技能，让中枢具备「自我描述」：
// 任何接入的智能体都能检索到它，从而知道如何检索、读取、上报与提交维修补丁。
const HUB_SKILL = `---
name: capability-hub-usage
description: 在智能体核武库中检索并调用能力的工作流说明
version: 1.0.0
author: Agent Arsenal
license: MIT
tags: [meta, usage, hub]
---

# 能力中枢使用说明

当你不确定本机有哪些可用能力时，按下面的顺序操作。

## 1. 检索

调用 MCP 工具 \`arsenal.search\`：

\`\`\`json
{ "query": "读取 PDF 并提取文本", "limit": 5 }
\`\`\`

返回每一行的 \`id\` 是后续调用的句柄。结果里同时给出作者、宿主、健康状态与匹配解释。

## 2. 读取正文

\`\`\`json
{ "id": "cap_xxx" }
\`\`\`

调用 \`arsenal.read_skill\` 拿到完整 SKILL.md。按其中的指令执行，不要凭名称猜测用法。

## 3. 上报使用

\`\`\`json
{ "capabilityId": "cap_xxx", "action": "use" }
\`\`\`

调用 \`arsenal.report_usage\`，中枢据此调整检索排序。

## 4. 遇到能力损坏

1. \`arsenal.list_faults\` 查看工单
2. 按工单里的路径修复文件
3. \`arsenal.submit_patch\` 回传完整文件内容与说明

中枢会校验路径边界、备份并记录维修历史。
`;

const EXAMPLE_MCP = {
  mcpServers: {
    'example-filesystem': {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', './workspace'],
      description: '示例：本地文件系统 MCP 服务（默认停用，需联网安装依赖；目录参数 ./workspace 请按需修改）',
      enabled: false
    }
  }
};

export function ensureArsenalSeed(arsenalDir) {
  if (!arsenalDir) return;
  try {
    const skillDir = path.join(arsenalDir, 'skill', 'capability-hub-usage');
    const entry = path.join(skillDir, 'SKILL.md');
    if (!fs.existsSync(entry)) {
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(entry, HUB_SKILL, 'utf8');
    }
    const mcpDir = path.join(arsenalDir, 'mcp', 'example');
    const mcpFile = path.join(mcpDir, 'mcp.json');
    if (!fs.existsSync(mcpFile)) {
      fs.mkdirSync(mcpDir, { recursive: true });
      fs.writeFileSync(mcpFile, JSON.stringify(EXAMPLE_MCP, null, 2), 'utf8');
    }
    for (const sub of ['plugin', 'prompt']) fs.mkdirSync(path.join(arsenalDir, sub), { recursive: true });
  } catch { /* 种子失败不应阻止启动 */ }
}
