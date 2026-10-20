import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 打包：Vite 构建渲染层 → 复制到 release/ → 附带启动器与说明。
// 说明：本机处于开发自用阶段，不生成安装包；产出为可直接双击运行的绿色目录。
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = path.join(root, 'release');

function run(cmd, args, cwd) {
  // 不使用 shell：避免 Windows 上含空格的程序路径（C:\Program Files\...）被拆词
  const r = spawnSync(cmd, args, { cwd: cwd || root, stdio: 'inherit', shell: false });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(cmd + ' 失败，退出码 ' + r.status);
}

console.log('[1/4] 构建渲染层…');
run(process.execPath, [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'build', '--config', path.join(root, 'apps', 'desktop', 'vite.config.mjs')]);

console.log('[2/4] 准备 release 目录…');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.cpSync(path.join(root, 'apps'), path.join(out, 'apps'), {
  recursive: true,
  filter: (src) => !src.includes('node_modules') && !src.endsWith('.tmp')
});
fs.cpSync(path.join(root, 'apps', 'desktop', 'dist-renderer'), path.join(out, 'apps', 'desktop', 'dist-renderer'), { recursive: true });
fs.cpSync(path.join(root, 'scripts'), path.join(out, 'scripts'), { recursive: true });
fs.copyFileSync(path.join(root, 'package.json'), path.join(out, 'package.json'));

console.log('[3/4] 复制 Electron 运行时…');
const electronDist = path.join(root, 'node_modules', 'electron', 'dist');
fs.cpSync(electronDist, path.join(out, 'runtime'), { recursive: true });
// Electron 目录内可执行文件重命名以便识别
const exeSrc = path.join(out, 'runtime', 'electron.exe');
if (fs.existsSync(exeSrc)) fs.renameSync(exeSrc, path.join(out, 'runtime', 'AgentArsenal.exe'));

console.log('[4/4] 写启动器…');
const launcher = [
  '@echo off',
  'setlocal',
  'set ELECTRON_RUN_AS_NODE=',
  'set ARSENAL_PACKAGED=1',
  'cd /d "%~dp0"',
  'start "" "%~dp0runtime\\AgentArsenal.exe" "%~dp0apps\\desktop"',
  'endlocal',
  ''
].join(String.fromCharCode(13, 10));
fs.writeFileSync(path.join(out, '启动-智能体核武库.cmd'), launcher, 'utf8');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
fs.writeFileSync(path.join(out, 'VERSION.json'), JSON.stringify({ name: pkg.name, version: pkg.version, builtAt: new Date().toISOString(), electron: JSON.parse(fs.readFileSync(path.join(root, 'node_modules', 'electron', 'package.json'), 'utf8')).version }, null, 2));

console.log('完成：' + out);
console.log('双击 release/启动-智能体核武库.cmd 运行；数据保存于 release/arsenal-data。');
