import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = path.resolve(here, '..', '..', '..', '..', '..');
export const DESKTOP_ROOT = path.resolve(here, '..', '..', '..');
export const IS_PACKAGED = Boolean(process.env.ARSENAL_PACKAGED === '1');

// 数据根：默认在程序目录旁；可通过 ARSENAL_HOME 覆盖（测试/多实例隔离）。
export function resolveHome() {
  if (process.env.ARSENAL_HOME) return path.resolve(process.env.ARSENAL_HOME);
  // 打包后 exe 位于 release/runtime/，数据目录放在 release/arsenal-data（与程序同级、便于备份）
  if (IS_PACKAGED) {
    const exeDir = path.dirname(process.execPath);
    const rootDir = path.basename(exeDir).toLowerCase() === 'runtime' ? path.dirname(exeDir) : exeDir;
    return path.join(rootDir, 'arsenal-data');
  }
  return path.join(APP_ROOT, 'data');
}

export const HOME = resolveHome();
export const DB_PATH = process.env.ARSENAL_DB || path.join(HOME, 'arsenal.db');
export const RUN_DIR = path.join(HOME, 'run');
export const LOG_DIR = path.join(HOME, 'logs');
export const SNAPSHOT_DIR = path.join(HOME, 'snapshots');
export const BACKUP_DIR = path.join(HOME, 'backups');
export const SEARCH_INDEX_DIR = path.join(HOME, 'search');
// 军械库与数据目录同级：开发态是项目根/arsenal，打包态是 release/arsenal
export const ARSENAL_DIR = process.env.ARSENAL_LIBRARY || path.join(path.dirname(HOME), 'arsenal');
export const TRASH_DIR = path.join(ARSENAL_DIR, '.trash');
export const EXPORT_DIR = path.join(HOME, 'exports');
export const USER_HOME = os.homedir();

export function ensureDirs() {
  for (const dir of [HOME, RUN_DIR, LOG_DIR, SNAPSHOT_DIR, BACKUP_DIR, SEARCH_INDEX_DIR, ARSENAL_DIR, TRASH_DIR, EXPORT_DIR,
    path.join(ARSENAL_DIR, 'skill'), path.join(ARSENAL_DIR, 'mcp'), path.join(ARSENAL_DIR, 'plugin'), path.join(ARSENAL_DIR, 'prompt')]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export const HOST_HOME_DIRS = {
  dsh: [path.join(USER_HOME, '.dsh'), path.join(USER_HOME, 'AppData', 'Roaming', '@deepseek-ai', 'dsh-desktop')],
  codex: [path.join(USER_HOME, '.codex')],
  claude: [path.join(USER_HOME, '.claude'), path.join(USER_HOME, '.config', 'claude')],
  minimax: [path.join(USER_HOME, '.minimax')],
  gemini: [path.join(USER_HOME, '.gemini')],
  workbuddy: [path.join(USER_HOME, '.workbuddy')],
  cursor: [path.join(USER_HOME, '.cursor'), path.join(USER_HOME, 'AppData', 'Roaming', 'Cursor')],
  windsurf: [path.join(USER_HOME, '.codeium', 'windsurf')],
  qoder: [path.join(USER_HOME, '.qoder')],
  generic: []
};

export function safeJoin(root, rel) {
  const target = path.resolve(root, rel || '.');
  const normRoot = path.resolve(root);
  if (target !== normRoot && !target.startsWith(normRoot + path.sep)) {
    throw new Error('路径越界: ' + rel);
  }
  return target;
}
