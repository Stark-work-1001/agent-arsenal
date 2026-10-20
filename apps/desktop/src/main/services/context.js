import { openDatabase } from '../db/db.js';
import { EventBus } from '../core/events.js';
import { createLogger } from '../core/logger.js';
import { Registry } from './registry.js';
import { Scanner } from './scanner.js';
import { DedupeService } from './dedupe.js';
import { SearchService } from './search.js';
import { UpdateService } from './updates.js';
import { EcosystemService } from './ecosystem.js';
import { AgentService } from './agents.js';
import { FaultService } from './faults.js';
import { WorkflowService } from './workflows.js';
import { LifecycleService } from './lifecycle.js';
import { ImportService } from './imports.js';
import { DB_PATH, LOG_DIR, HOME, BACKUP_DIR, EXPORT_DIR, RUN_DIR, ARSENAL_DIR, ensureDirs } from '../core/paths.js';
import { ensureArsenalSeed } from './seed.js';

// 组合根：把 db / 事件总线 / 日志 / 服务组装起来，供 Electron 主进程、HTTP 服务、MCP stdio 复用。
export function createContext(options) {
  const opts = options || {};
  ensureDirs();
  const db = openDatabase(opts.dbPath || DB_PATH);
  const bus = new EventBus(db);
  const logger = createLogger(opts.logDir === null ? null : (opts.logDir || LOG_DIR), 'arsenal');
  const arsenalDir = opts.arsenalDir || ARSENAL_DIR;
  ensureArsenalSeed(arsenalDir);
  const ctx = {
    db, bus, logger, options: { home: HOME, arsenalDir, backupDir: BACKUP_DIR, exportDir: EXPORT_DIR, runDir: RUN_DIR, ...opts }
  };
  const services = {};
  ctx.services = services;
  services.registry = new Registry(ctx);
  services.scanner = new Scanner(ctx);
  services.dedupe = new DedupeService(ctx);
  services.search = new SearchService(ctx);
  services.updates = new UpdateService(ctx);
  services.ecosystem = new EcosystemService(ctx);
  services.agents = new AgentService(ctx);
  services.faults = new FaultService(ctx);
  services.workflows = new WorkflowService(ctx, services);
  services.lifecycle = new LifecycleService(ctx, services);
  services.imports = new ImportService(ctx, services);
  // 兼容别名：内部服务间既有调用
  ctx.registry = services.registry;
  ctx.scanner = services.scanner;
  return ctx;
}

export function closeContext(ctx) {
  if (!ctx) return;
  try { ctx.db.close(); } catch { /* ignore */ }
}
