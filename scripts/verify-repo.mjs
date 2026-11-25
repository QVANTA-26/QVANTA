import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const packageJson = readJson('package.json');
const lockfile = readJson('package-lock.json');

assert(Number(process.versions.node.split('.')[0]) >= 22, 'Node.js 22 or newer is required');
assert(readText('.nvmrc').trim() === '22', '.nvmrc must pin Node.js 22');
assert(lockfile.lockfileVersion === 3, 'package-lock.json must use lockfileVersion 3');
assert(packageJson.private === true, 'the workspace root must remain private');
assert(Array.isArray(packageJson.workspaces), 'the workspace root must declare npm workspaces');
assert(packageJson.workspaces.includes('apps/*'), 'apps/* must remain an npm workspace');
assert(packageJson.workspaces.includes('packages/*'), 'packages/* must remain an npm workspace');

for (const scriptName of ['test', 'prisma:generate', 'typecheck', 'build', 'docker:check']) {
  assert(typeof packageJson.scripts?.[scriptName] === 'string', `root script is missing: ${scriptName}`);
}

for (const workspaceRoot of ['apps', 'packages']) {
  for (const entry of fs.readdirSync(path.join(root, workspaceRoot), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const relativePath = `${workspaceRoot}/${entry.name}`;
    const workspacePackagePath = path.join(root, relativePath, 'package.json');
    if (!fs.existsSync(workspacePackagePath)) continue;

    const workspacePackage = readJson(`${relativePath}/package.json`);
    const lockEntry = lockfile.packages?.[relativePath];
    assert(Boolean(lockEntry), `${relativePath} is missing from package-lock.json`);
    assert(typeof workspacePackage.name === 'string', `${relativePath} must declare a package name`);
  }
}

assert(fs.existsSync(path.join(root, 'infra/web/Dockerfile')), 'infra/web/Dockerfile is required for the Docker check');

const ciWorkflow = readText('.github/workflows/ci.yml');
assert(ciWorkflow.includes('npm ci'), 'CI must install with npm ci');
assert(!ciWorkflow.includes('pnpm'), 'CI must not use pnpm');

if (failures.length > 0) {
  console.error('Repository verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Repository verification passed: npm workspaces, lockfile, Node pin, scripts, and Docker entrypoint are present.');
}
