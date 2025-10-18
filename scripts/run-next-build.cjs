#!/usr/bin/env node
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const env = { ...process.env };
if (!env.npm_config_user_agent) {
  env.npm_config_user_agent = 'npm';
}

env.COREPACK_ENABLE = '0';
if (env.PATH) {
  const sanitized = env.PATH.split(path.delimiter).filter((segment) => {
    const lower = segment.toLowerCase();
    return !lower.includes('corepack') && !lower.includes('yarn') && !lower.includes('pnpm');
  });
  env.PATH = sanitized.join(path.delimiter);
}
const shimBin = path.join(__dirname, 'bin');
env.PATH = env.PATH ? `${shimBin}${path.delimiter}${env.PATH}` : shimBin;

const nextBinary = process.platform === 'win32' ? 'next.cmd' : 'next';
const executable = path.join(__dirname, '..', 'node_modules', '.bin', nextBinary);
const result = spawnSync(executable, ['build'], {
  stdio: 'inherit',
  env,
});
if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
