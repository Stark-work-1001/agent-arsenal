// 与主进程约定的类型化桥接层。所有界面数据都从这里来。
export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export interface CapabilitySummary {
  id: string;
  kind: 'skill' | 'mcp' | 'plugin' | 'prompt' | 'agent' | string;
  name: string;
  displayName: string;
  summary: string;
  author: string;
  version: string;
  status: string;
  health: string;
  tags: string[];
  protocols: string[];
  hosts: string[];
  usageCount: number;
  updatedAt: number;
  updateStatus?: string;
  latestVersion?: string;
  metadata?: Record<string, any>;
}

export interface CapabilityDetail extends CapabilitySummary {
  description: string;
  authorSource: string;
  homepage: string;
  license: string;
  verifyState: string;
  verifyMessage: string;
  installs?: any[];
  installations: { id: string; path: string; entry: string; host: string; size: number; version: string; content: string; manifest: any }[];
  faults: any[];
  updates: any;
  usage: any[];
}

export interface SearchHit {
  id: string; kind: string; name: string; displayName: string; summary: string; author: string; version: string;
  status: string; health: string; tags: string[]; hosts: { host: string; label: string }[];
  protocols: string[]; score: number; explanation: Record<string, any>; snippet: string;
}

export interface SearchResult { query: string; terms: string[]; took: number; total: number; mode: string; items: SearchHit[] }
export interface SourceRow { id: string; kind: string; host: string; label: string; root_path: string; enabled: number; builtin: number; last_scan_at: number; last_scan_status: string; last_scan_message: string; last_scan_count: number; last_scan_ms: number }
export interface AgentRow { id: string; host: string; label: string; kind: string; pid?: number; status: string; protocol: string; endpoint: string; lastSeen: number; capabilityCount: number; metadata: any }
export interface FaultRow { id: string; capabilityId: string; capabilityName: string; kind: string; severity: string; code: string; title: string; detail: string; evidence: any; status: string; autoFixable: boolean; dispatchAgent?: string; detectedAt: number }
export interface DuplicateGroup { id: string; kind: string; canonicalName: string; similarity: number; reason: string; recommended: string; decision: string; members: { id: string; name: string; displayName: string; version: string; author: string; status: string; path: string; host: string; updatedAt: number }[] }
export interface UpdateRow { id: string; capabilityId: string; name: string; kind: string; sourceKind: string; currentVersion: string; latestVersion: string; status: string; detail: string; checkedAt: number }
export interface WorkflowRow { id: string; name: string; kind: string; description: string; steps: { type: string; label: string }[]; lastRun: { id: string; status: string; startedAt: number; endedAt: number; summary: any; steps: any[] } | null }
export interface EventRow { id: number; ts: number; level: string; topic: string; message: string; capabilityId?: string; agentId?: string; data: any }
export interface StatusInfo { version: string; home: string; dbPath: string; port: number; stats: any; db: any; serverRunning: boolean; dev: boolean; recent: EventRow[] }

declare global {
  interface Window {
    arsenal: any;
  }
}

async function call<T>(channel: string, ...args: any[]): Promise<T> {
  const res = await window.arsenal[channel](...args);
  if (res && res.ok === true) return res.data as T;
  if (res && res.ok === false) throw new Error(res.error || '调用失败');
  return res as T;
}

export const api = {
  status: () => call<StatusInfo>('status'),
  dbStats: () => call<any>('dbStats'),
  capabilities: (filter?: any) => call<CapabilitySummary[]>('capabilities', filter),
  capability: (id: string) => call<CapabilityDetail>('capability', id),
  capabilityAction: (id: string, action: string, value?: any) => call<any>('capabilityAction', id, action, value),
  readCapability: (id: string) => call<{ content: string; path: string; title: string }>('readCapability', id),
  importCapability: (p: string, options?: any) => call<any>('importCapability', p, options),
  previewImport: (p: string) => call<any>('previewImport', p),
  pickDirectory: () => call<string[]>('pickDirectory'),
  pickFiles: () => call<string[]>('pickFiles'),
  search: (q: string, options?: any) => call<SearchResult>('search', q, options),
  reindex: () => call<any>('reindex'),
  sources: () => call<SourceRow[]>('sources'),
  scan: (options?: any) => call<any>('scan', options),
  addSource: (p: any) => call<any>('addSource', p),
  toggleSource: (id: string, enabled: boolean) => call<any>('toggleSource', id, enabled),
  removeSource: (id: string) => call<any>('removeSource', id),
  agents: () => call<AgentRow[]>('agents'),
  scanAgents: () => call<AgentRow[]>('scanAgents'),
  sessions: () => call<any[]>('sessions'),
  faults: (filter?: any) => call<FaultRow[]>('faults', filter),
  diagnose: () => call<any>('diagnose'),
  autoFix: (id: string) => call<any>('autoFix', id),
  dispatchFault: (id: string, agentId: string, note: string) => call<any>('dispatchFault', id, agentId, note),
  repairs: (faultId?: string) => call<any[]>('repairs', faultId),
  faultStats: () => call<any>('faultStats'),
  duplicates: (decision?: string) => call<DuplicateGroup[]>('duplicates', decision),
  scanDuplicates: () => call<any>('scanDuplicates'),
  decideDuplicate: (id: string, action: string, chosenId?: string) => call<any>('decideDuplicate', id, action, chosenId),
  updates: (status?: string) => call<UpdateRow[]>('updates', status),
  checkUpdates: (options?: any) => call<any>('checkUpdates', options),
  catalog: (query?: string, options?: any) => call<any[]>('catalog', query, options),
  importCatalog: () => call<any>('importCatalog'),
  applyUpdate: (id: string) => call<any>('applyUpdate', id),
  workflows: () => call<WorkflowRow[]>('workflows'),
  runWorkflow: (id: string) => call<any>('runWorkflow', id),
  workflowRuns: () => call<any[]>('workflowRuns'),
  events: (limit?: number) => call<EventRow[]>('events', limit),
  scanBusy: () => call<{ busy: boolean }>('scanBusy'),
  onEvent: (cb: (e: EventRow) => void) => window.arsenal.onEvent(cb),
  ecosystemTargets: () => call<any[]>('ecosystemTargets'),
  previewSync: (host: string) => call<any>('previewSync', host),
  applySync: (host: string) => call<any>('applySync', host),
  backups: () => call<any[]>('backups'),
  restoreBackup: (id: string) => call<any>('restoreBackup', id),
  settings: () => call<Record<string, any>>('settings'),
  saveSettings: (patch: any) => call<Record<string, any>>('saveSettings', patch),
  openExternal: (url: string) => call<any>('openExternal', url),
  openPath: (p: string) => call<any>('openPath', p),
  exportCapability: (id: string) => call<any>('exportCapability', id),
  trash: () => call<any[]>('trash'),
  serverInfo: () => call<any>('serverInfo'),
  restartServer: () => call<any>('restartServer')
};

export function fmtTime(ts?: number | null) {
  if (!ts) return '—';
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + ' 分钟前';
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + ' 小时前';
  if (diff < 7 * 86_400_000) return Math.floor(diff / 86_400_000) + ' 天前';
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export function fmtBytes(n?: number) {
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0; let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return (v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)) + ' ' + units[i];
}

export const KIND_LABEL: Record<string, string> = {
  skill: '技能', mcp: 'MCP', plugin: '插件', prompt: '提示词', agent: '智能体', hook: '钩子'
};
export const KIND_ICON: Record<string, string> = { skill: '◆', mcp: '⬡', plugin: '❖', prompt: '¶', agent: '◉', hook: '⇥' };
export const HOST_LABEL: Record<string, string> = {
  dsh: 'DeepSeek Harness', codex: 'Codex', claude: 'Claude Code', minimax: 'MiniMax Code',
  gemini: 'Gemini / Antigravity', workbuddy: 'WorkBuddy', cursor: 'Cursor', qoder: 'Qoder', arsenal: '军械库', custom: '自定义'
};
export const STATUS_LABEL: Record<string, string> = {
  active: '已启用', disabled: '已停用', quarantined: '已隔离', archived: '已归档',
  healthy: '健康', warning: '警告', broken: '故障', unknown: '未检测', untriaged: '待诊断'
};
