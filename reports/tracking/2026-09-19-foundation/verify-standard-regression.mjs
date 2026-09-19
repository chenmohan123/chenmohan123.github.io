import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = path.dirname(fileURLToPath(import.meta.url));
const portal = path.resolve(root, '../../..');
const args = process.argv.slice(2);
const mode = args.shift() ?? 'verify';
assert.ok(['verify', 'rerun'].includes(mode), '模式为 verify 或 rerun');
const options = { 'repo-root': path.resolve(portal, '..'), out: path.join(portal, '.tmp/standard-regression-rerun.json') };
for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace(/^--/, '');
  assert.ok(args[i].startsWith('--') && Object.hasOwn(options, key) && args[i + 1], '参数为 --repo-root 路径、--out 路径');
  options[key] = path.resolve(args[i + 1]);
}
assert.ok(!options.out.startsWith(root + path.sep), '复跑不得覆盖固定报告');
const bytes = await fs.readFile(path.join(root, 'standard-regression.json'));
assert.equal(createHash('sha256').update(bytes).digest('hex'), '3c20f94d6e7f099cfc4e14d1848c120ae259249bfd47237ee1394de86af712d4', '原始标准回归证据已变更');
const report = JSON.parse(bytes);
assert.equal(report.records.length, 7);
for (const record of report.records) {
  assert.match(record.commit, /^[a-f0-9]{40}$/);
  const previous = new Map(record.baseline.map(x => [x.id, x]));
  const changes = record.current.filter(x => previous.has(x.id) && x.status !== previous.get(x.id).status).map(x => ({ id: x.id, before: previous.get(x.id).status, after: x.status }));
  assert.deepEqual(changes, record.changes);
  assert.deepEqual(changes, []);
  for (const side of ['baseline', 'current']) {
    assert.deepEqual(record[side].filter(x => x.level === 'required' && x.status === 'fail').map(x => x.id), record[side + 'Failures']);
    assert.deepEqual(record[side + 'Failures'], []);
  }
}
if (mode === 'verify') {
  console.log('原始报告摘要与7个SDK的既有规则状态核对通过；未重新扫描或修改SDK。');
} else {
  // 全部基于记录中的不可变提交，不读取用户工作目录的未提交内容。
  const work = await fs.mkdtemp(path.join(os.tmpdir(), 'tracking-standards-'));
  const unpack = async (repository, commit, name, paths = []) => {
    const target = path.join(work, name);
    await fs.mkdir(target);
    const archive = path.join(work, name + '.zip');
    execFileSync('git', ['-C', repository, 'archive', '--format=zip', '--output', archive, commit, ...paths]);
    // Windows系统tar对既有中文截图路径报错；Python标准库按ZIP的UTF-8文件名解包。
    execFileSync('python', ['-m', 'zipfile', '-e', archive, target]);
    return target;
  };
  const baselineCommit = 'df2863ec22e73790f35fcf57c673a55afd4a1be0';
  const currentCommit = '063e8c215b1791d43d3ee704bcb83006ddc43611';
  const oldRoot = await unpack(portal, baselineCommit, 'baseline', ['standards/v1', 'tools/sdk-standard-check/src']);
  const newRoot = await unpack(portal, currentCommit, 'current', ['standards/v1', 'tools/sdk-standard-check/src']);
  // 快照检查器复用门户已安装依赖；不复制生产SDK实现到门户。
  await fs.symlink(path.join(portal, 'node_modules'), path.join(oldRoot, 'node_modules'), 'junction');
  await fs.symlink(path.join(portal, 'node_modules'), path.join(newRoot, 'node_modules'), 'junction');
  const oldScan = (await import(pathToFileURL(path.join(oldRoot, 'tools/sdk-standard-check/src/check.mjs')))).scanRepository;
  const newScan = (await import(pathToFileURL(path.join(newRoot, 'tools/sdk-standard-check/src/check.mjs')))).scanRepository;
  const records = [];
  for (const original of report.records) {
    const snapshot = await unpack(path.join(options['repo-root'], original.repository), original.commit, original.repository);
    const baseline = await oldScan(snapshot, { standardRoot: path.join(oldRoot, 'standards/v1') });
    const current = await newScan(snapshot, { standardRoot: path.join(newRoot, 'standards/v1') });
    const statuses = findings => findings.map(({ id, level, status }) => ({ id, level, status }));
    assert.deepEqual(statuses(baseline.findings), statuses(original.baseline), original.repository + '旧规则状态偏离');
    assert.deepEqual(statuses(current.findings), statuses(original.current), original.repository + '新规则状态偏离');
    records.push({ repository: original.repository, commit: original.commit, baseline: baseline.findings, current: current.findings });
  }
  await fs.mkdir(path.dirname(options.out), { recursive: true });
  await fs.writeFile(options.out, JSON.stringify({ verifiedAt: new Date().toISOString(), baselineCommit, currentCommit, snapshots: work, records }, null, 2) + '\n');
  console.log('7个固定提交快照复跑通过：' + options.out + '；临时快照保留于 ' + work);
}
