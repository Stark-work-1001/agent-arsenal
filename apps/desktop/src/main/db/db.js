import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { SCHEMA, SCHEMA_VERSION } from './schema.js';
import { writeFileAtomic, jsonParse, now } from '../core/util.js';

let instance = null;

export class Database {
  constructor(file, options) {
    this.file = file;
    this.options = options || {};
    fs.mkdirSync(path.dirname(file), { recursive: true });
    this.conn = new DatabaseSync(file, { timeout: 8000 });
    this.conn.exec('PRAGMA busy_timeout = 8000;');
    this._txDepth = 0;
  }

  static open(file, options) {
    if (instance && instance.file === file && !instance.closed) return instance;
    const db = new Database(file, options);
    db.migrate();
    instance = db;
    return db;
  }

  static current() { return instance; }

  migrate() {
    this.conn.exec(SCHEMA);
    const row = this.get('SELECT value FROM meta WHERE key = ?', ['schema_version']);
    const prev = row ? Number(row.value) : 0;
    if (prev === 0) {
      this.setMeta('schema_version', String(SCHEMA_VERSION));
      this.setMeta('created_at', String(now()));
    } else if (prev !== SCHEMA_VERSION) {
      this.setMeta('schema_version', String(SCHEMA_VERSION));
      this.setMeta('migrated_from', String(prev));
    }
    this.setMeta('app_version', '1.0.0');
    this.conn.exec('PRAGMA optimize;');
  }

  setMeta(key, value) {
    this.run('INSERT INTO meta(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, String(value)]);
  }

  getMeta(key, fallback) {
    const row = this.get('SELECT value FROM meta WHERE key = ?', [key]);
    return row ? row.value : fallback;
  }

  prepare(sql) { return this.conn.prepare(sql); }

  all(sql, params) {
    const stmt = this.conn.prepare(sql);
    return params ? stmt.all(...params) : stmt.all();
  }

  get(sql, params) {
    const stmt = this.conn.prepare(sql);
    return params ? stmt.get(...params) : stmt.get();
  }

  run(sql, params) {
    const stmt = this.conn.prepare(sql);
    const res = params ? stmt.run(...params) : stmt.run();
    return res;
  }

  exec(sql) { this.conn.exec(sql); }

  tx(fn) {
    if (this._txDepth > 0) return fn();
    this.conn.exec('BEGIN IMMEDIATE');
    this._txDepth++;
    try {
      const result = fn();
      this.conn.exec('COMMIT');
      this._txDepth--;
      return result;
    } catch (err) {
      this._txDepth--;
      try { this.conn.exec('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    }
  }

  jget(sql, params, key) {
    const row = this.get(sql, params);
    return row ? jsonParse(row[key || 'data'], {}) : null;
  }

  backupTo(target) {
    // 使用 VACUUM INTO 做一致性快照
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (fs.existsSync(target)) fs.rmSync(target);
    this.conn.exec("VACUUM INTO '" + target.replace(/'/g, "''") + "'");
    return target;
  }

  stats() {
    const tables = ['capabilities', 'installations', 'sources', 'faults', 'duplicate_groups', 'agents', 'updates', 'events', 'workflow_runs'];
    const out = {};
    for (const t of tables) {
      try { out[t] = this.get('SELECT COUNT(*) AS c FROM ' + t).c; } catch { out[t] = 0; }
    }
    try {
      const st = fs.statSync(this.file);
      out.dbBytes = st.size;
      out.walBytes = fs.existsSync(this.file + '-wal') ? fs.statSync(this.file + '-wal').size : 0;
    } catch { out.dbBytes = 0; out.walBytes = 0; }
    out.sqliteVersion = this.get('SELECT sqlite_version() AS v').v;
    return out;
  }

  close() {
    if (this.closed) return;
    try { this.conn.exec('PRAGMA wal_checkpoint(TRUNCATE);'); } catch { /* ignore */ }
    try { this.conn.close(); } catch { /* ignore */ }
    this.closed = true;
    if (instance === this) instance = null;
  }
}

export function openDatabase(file, options) {
  return Database.open(file, options);
}
