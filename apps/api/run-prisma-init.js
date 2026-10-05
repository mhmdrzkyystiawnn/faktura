import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const cwd = process.cwd();
const prismaBin = join(cwd, 'node_modules/.bin/prisma');
const args = ['orm', 'init', '--yes', '--target', 'postgres', '--authoring', 'psl', '--confirm', 'api'];

const proc = spawn(prismaBin, args, {
  cwd,
  stdio: 'inherit',
  shell: true,
});

proc.on('error', (err) => {
  console.error('spawn error:', err);
  process.exit(1);
});

proc.on('close', (code) => {
  console.log('exit code:', code);
  process.exit(code || 0);
});
