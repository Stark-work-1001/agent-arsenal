const { contextBridge, ipcRenderer } = require('electron');

// 预加载桥：渲染进程只能通过白名单调用主进程方法（无 nodeIntegration）。
const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('arsenal', {
  status: () => invoke('status'),
  dbStats: () => invoke('db.stats'),

  capabilities: (filter) => invoke('capabilities.list', filter),
  capability: (id) => invoke('capabilities.get', id),
  capabilityAction: (id, action, value) => invoke('capabilities.action', { id, action, value }),
  readCapability: (id) => invoke('capabilities.read', id),
  importCapability: (sourcePath, options) => invoke('capabilities.import', { sourcePath, options }),
  previewImport: (sourcePath) => invoke('capabilities.importPreview', sourcePath),
  pickDirectory: () => invoke('dialog.pickDirectory'),
  pickFiles: () => invoke('dialog.pickFiles'),

  search: (query, options) => invoke('search.query', { query, options }),
  reindex: () => invoke('search.reindex'),

  sources: () => invoke('sources.list'),
  scan: (options) => invoke('scan.run', options),
  addSource: (payload) => invoke('sources.add', payload),
  toggleSource: (id, enabled) => invoke('sources.toggle', { id, enabled }),
  removeSource: (id) => invoke('sources.remove', id),

  agents: () => invoke('agents.list'),
  scanAgents: () => invoke('agents.scan'),
  sessions: () => invoke('agents.sessions'),

  faults: (filter) => invoke('faults.list', filter),
  diagnose: () => invoke('faults.diagnose'),
  autoFix: (id) => invoke('faults.autofix', id),
  dispatchFault: (id, agentId, note) => invoke('faults.dispatch', { id, agentId, note }),
  repairs: (faultId) => invoke('faults.repairs', faultId),
  faultStats: () => invoke('faults.stats'),

  duplicates: (decision) => invoke('duplicates.list', decision),
  scanDuplicates: () => invoke('duplicates.scan'),
  decideDuplicate: (id, action, chosenId) => invoke('duplicates.decide', { id, action, chosenId }),

  updates: (status) => invoke('updates.list', status),
  catalog: (query, options) => invoke('updates.catalog', { query, options }),
  importCatalog: () => invoke('updates.importCatalog'),
  checkUpdates: (options) => invoke('updates.check', options),
  applyUpdate: (capabilityId) => invoke('updates.apply', capabilityId),

  workflows: () => invoke('workflows.list'),
  runWorkflow: (id) => invoke('workflows.run', id),
  workflowRuns: () => invoke('workflows.runs'),

  events: (limit) => invoke('events.recent', limit),
  scanBusy: () => invoke('scan.busy'),
  onEvent: (cb) => {
    const listener = (_e, evt) => cb(evt);
    ipcRenderer.on('arsenal:event', listener);
    return () => ipcRenderer.removeListener('arsenal:event', listener);
  },

  ecosystemTargets: () => invoke('ecosystem.targets'),
  previewSync: (host) => invoke('ecosystem.preview', host),
  applySync: (host) => invoke('ecosystem.apply', host),
  backups: () => invoke('ecosystem.backups'),
  restoreBackup: (id) => invoke('ecosystem.restore', id),

  settings: () => invoke('settings.get'),
  saveSettings: (patch) => invoke('settings.set', patch),
  openExternal: (url) => invoke('shell.openExternal', url),
  openPath: (p) => invoke('shell.openPath', p),
  exportCapability: (id) => invoke('capabilities.export', id),
  trash: () => invoke('lifecycle.trash'),
  serverInfo: () => invoke('server.info'),
  restartServer: () => invoke('server.restart')
});
