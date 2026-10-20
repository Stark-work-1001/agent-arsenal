import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { now, newId, jsonParse, readTextSafe } from '../core/util.js';
import { USER_HOME } from '../core/paths.js';

// 智能体接入识别（三条通道叠加）：
// A. 进程识别：任务列表 + 已知可执行文件特征；
// B. 心跳文件：各宿主写 JSON 到 arsenal-data/run/heartbeats/<host>.json（低成本，跨进程）；
// C. MCP 会话：外部智能体通过 /mcp 连入时登记（真实调用证据）。
const HOST_SIGNATURES = [
  { host: 'dsh', label: 'DeepSeek Harness', match: [/deepseek harness/i, /dsh\.exe/i, /dsh-desktop/i], protocol: 'mcp' },
  { host: 'codex', label: 'Codex', match: [/codex\.exe/i, /openai[\\/]codex/i, /codex/i], protocol: 'mcp' },
  { host: 'claude', label: 'Claude Code', match: [/claude/i, /anthropic/i], protocol: 'mcp' },
  { host: 'minimax', label: 'MiniMax Code', match: [/minimax code/i, /minimax.*codex/i], protocol: 'mcp' },
  { host: 'gemini', label: 'Gemini / Antigravity', match: [/antigravity/i, /gemini/i], protocol: 'mcp' },
  { host: 'workbuddy', label: 'WorkBuddy', match: [/workbuddy/i], protocol: 'mcp' },
  { host: 'cursor', label: 'Cursor', match: [/cursor\.exe/i, /cursor/i], protocol: 'mcp' },
  { host: 'qoder', label: 'Qoder', match: [/qoder/i], protocol: 'mcp' }
];

export class AgentService {
  constructor(ctx) {
    this.ctx = ctx;
    this.db = ctx.db;
    this.bus = ctx.bus;
  }

  async detectProcesses() {
    const list = await listProcesses();
    const found = new Map();
    for (const proc of list) {
      const hay = (proc.name + ' ' + proc.commandLine).toLowerCase();
      for (const sig of HOST_SIGNATURES) {
        if (!sig.match.some((re) => re.test(hay))) continue;
        // 排除中枢自身
        if (/agent-arsenal|arsenal-desktop|electron\.exe/i.test(proc.name) && sig.host !== 'dsh') continue;
        const key = sig.host;
        if (!found.has(key)) found.set(key, { host: key, label: sig.label, protocol: sig.protocol, pids: [], exe: proc.exePath, commandLine: proc.commandLine });
        found.get(key).pids.push(proc.pid);
      }
    }
    return [...found.values()];
  }

  async scan(options) {
    const opts = options || {};
    const procs = await this.detectProcesses();
    const heartbeats = this.readHeartbeats();
    const sessions = this.activeSessions();
    const ts = now();
    const seen = new Set();

    for (const p of procs) {
      const id = 'proc:' + p.host;
      const existing = this.db.get('SELECT * FROM agents WHERE id = ?', [id]);
      const meta = { pids: p.pids, label: p.label };
      if (existing) {
        this.db.run('UPDATE agents SET pid=?, exe_path=?, command_line=?, status=?, last_seen=?, metadata=? WHERE id=?',
          [p.pids[0] || null, p.exe || '', p.commandLine || '', 'running', ts, JSON.stringify(meta), id]);
      } else {
        this.db.run('INSERT INTO agents(id, host, label, kind, pid, exe_path, command_line, status, protocol, first_seen, last_seen, metadata) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
          [id, p.host, p.label, 'process', p.pids[0] || null, p.exe || '', p.commandLine || '', 'running', p.protocol, ts, ts, JSON.stringify(meta)]);
        this.bus.info('agents', '发现运行中的智能体：' + p.label, { agentId: id });
      }
      seen.add(p.host);
    }

    for (const hb of heartbeats) {
      const id = 'hb:' + hb.host;
      const existing = this.db.get('SELECT * FROM agents WHERE id = ?', [id]);
      const label = labelFor(hb.host);
      if (existing) {
        this.db.run('UPDATE agents SET status=?, last_seen=?, last_heartbeat=?, metadata=? WHERE id=?', ['idle', ts, hb.seenAt, JSON.stringify(hb.payload), id]);
      } else {
        this.db.run('INSERT INTO agents(id, host, label, kind, pid, status, protocol, first_seen, last_seen, last_heartbeat, metadata) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
          [id, hb.host, label, 'process', hb.pid || null, 'idle', 'heartbeat', ts, ts, hb.seenAt, JSON.stringify(hb.payload)]);
      }
      seen.add(hb.host);
    }

    for (const s of sessions) {
      const id = 'mcp:' + s.host;
      const existing = this.db.get('SELECT * FROM agents WHERE id = ?', [id]);
      const meta = { sessions: s.count, client: s.client };
      if (existing) {
        this.db.run("UPDATE agents SET status='running', protocol='mcp', endpoint=?, last_seen=?, metadata=? WHERE id=?", [s.endpoint || '', ts, JSON.stringify(meta), id]);
      } else {
        this.db.run('INSERT INTO agents(id, host, label, kind, status, protocol, endpoint, first_seen, last_seen, metadata) VALUES (?,?,?,?,?,?,?,?,?,?)',
          [id, s.host, labelFor(s.host), 'mcp-session', 'running', 'mcp', s.endpoint || '', ts, ts, JSON.stringify(meta)]);
      }
      seen.add(s.host);
    }

    // 超过 5 分钟未见 → stopped
    const stale = this.db.all("SELECT id, host FROM agents WHERE status != 'stopped'");
    for (const a of stale) {
      const hostSeen = [...seen].some((h) => a.id.endsWith(a.host));
      if (!hostSeen && ts - 5 * 60 * 1000 > ts) continue;
    }
    for (const a of stale) {
      const row = this.db.get('SELECT * FROM agents WHERE id = ?', [a.id]);
      if (row.last_seen < ts - 5 * 60 * 1000) {
        this.db.run("UPDATE agents SET status='stopped' WHERE id=?", [a.id]);
        this.bus.info('agents', '智能体已停止：' + row.label, { agentId: a.id });
      }
    }
    return this.list();
  }

  readHeartbeats() {
    const dir = path.join(this.ctx.options.home || '', 'run', 'heartbeats');
    const out = [];
    try {
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
      for (const f of files) {
        const full = path.join(dir, f);
        const payload = jsonParse(readTextSafe(full) || '{}', {});
        const host = payload.host || f.replace(/\.json$/, '');
        const seenAt = payload.heartbeatAt || payload.ts || fs.statSync(full).mtimeMs;
        out.push({ host, pid: payload.pid, payload, seenAt });
        this.db.run('INSERT INTO heartbeat_files(path, host, pid, payload, seen_at) VALUES (?,?,?,?,?) ON CONFLICT(path) DO UPDATE SET payload=excluded.payload, seen_at=excluded.seen_at',
          [full, host, payload.pid || null, JSON.stringify(payload), seenAt]);
      }
    } catch { /* 目录不存在 */ }
    return out;
  }

  activeSessions() {
    const rows = this.db.all("SELECT * FROM agent_sessions WHERE status = 'open' AND last_seen_at > ?", [now() - 10 * 60 * 1000]);
    const byHost = new Map();
    for (const r of rows) {
      if (!byHost.has(r.host)) byHost.set(r.host, { host: r.host, count: 0, client: '', endpoint: '' });
      const e = byHost.get(r.host);
      e.count++;
      try { const info = JSON.parse(r.client_info); e.client = info.name || info.clientInfo?.name || e.client; } catch { /* ignore */ }
    }
    return [...byHost.values()];
  }

  list() {
    const rows = this.db.all("SELECT * FROM agents ORDER BY (status = 'running') DESC, last_seen DESC");
    return rows.map((a) => ({
      id: a.id, host: a.host, label: a.label, kind: a.kind, pid: a.pid, exePath: a.exe_path,
      status: a.status, protocol: a.protocol, endpoint: a.endpoint, firstSeen: a.first_seen,
      lastSeen: a.last_seen, lastHeartbeat: a.last_heartbeat, metadata: jsonParse(a.metadata, {}),
      capabilityCount: this.countForHost(a.host)
    }));
  }

  countForHost(host) {
    const rows = this.db.all('SELECT hosts FROM capabilities');
    let n = 0;
    for (const r of rows) { try { if (JSON.parse(r.hosts).includes(host)) n++; } catch { /* ignore */ } }
    return n;
  }

  registerSession(info) {
    const ts = now();
    const id = info.id || newId('ses');
    this.db.run('INSERT INTO agent_sessions(id, agent_id, host, protocol, client_info, started_at, last_seen_at, status, ip) VALUES (?,?,?,?,?,?,?,?,?)',
      [id, info.agentId || null, info.host || 'unknown', info.protocol || 'mcp', JSON.stringify(info.client || {}), ts, ts, 'open', info.ip || '']);
    return id;
  }

  touchSession(id, deltaRequests) {
    this.db.run('UPDATE agent_sessions SET last_seen_at=?, requests = requests + ? WHERE id=?', [now(), deltaRequests || 0, id]);
  }

  sessions() {
    return this.db.all('SELECT * FROM agent_sessions ORDER BY started_at DESC LIMIT 100').map((s) => ({
      id: s.id, host: s.host, protocol: s.protocol, client: jsonParse(s.client_info, {}), startedAt: s.started_at,
      lastSeenAt: s.last_seen_at, endedAt: s.ended_at, requests: s.requests, toolCalls: jsonParse(s.tool_calls, {}), status: s.status
    }));
  }

  usageSummary() {
    const rows = this.db.all('SELECT host, COUNT(*) AS c, SUM(requests) AS req FROM agent_sessions GROUP BY host');
    return rows;
  }
}

function labelFor(host) {
  const sig = HOST_SIGNATURES.find((s) => s.host === host);
  return sig ? sig.label : host;
}

function listProcesses() {
  return new Promise((resolve) => {
    const cmd = 'powershell.exe';
    const args = ['-NoProfile', '-Command', 'Get-CimInstance Win32_Process | Select-Object ProcessId,Name,ExecutablePath,CommandLine | ConvertTo-Json -Compress'];
    execFile(cmd, args, { timeout: 20000, windowsHide: true, maxBuffer: 24 * 1024 * 1024 }, (err, stdout) => {
      if (err) {
        // 退化：tasklist
        execFile('tasklist', ['/FO', 'CSV', '/NH'], { timeout: 8000, windowsHide: true }, (e2, out2) => {
          if (e2) return resolve([]);
          const items = String(out2).split('\n').map((line) => {
            const m = line.match(/^"([^"]+)","(\d+)"/);
            return m ? { pid: Number(m[2]), name: m[1], exePath: '', commandLine: '' } : null;
          }).filter(Boolean);
          resolve(items);
        });
        return;
      }
      let data;
      try { data = JSON.parse(stdout); } catch { return resolve([]); }
      const arr = Array.isArray(data) ? data : [data];
      resolve(arr.map((p) => ({ pid: p.ProcessId, name: p.Name || '', exePath: p.ExecutablePath || '', commandLine: p.CommandLine || '' })));
    });
  });
}
