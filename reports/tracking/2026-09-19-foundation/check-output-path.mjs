import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const root = path.dirname(fileURLToPath(import.meta.url));
const scratch = await fs.mkdtemp(path.resolve(root, '../../../.tmp/output-safety-'));
const alias = path.join(scratch, 'archive-alias');
await fs.symlink(root, alias, 'junction');
function run(out) {
  return spawnSync(process.execPath, [path.join(root, 'verify-standard-regression.mjs'), 'verify', '--out', out], { encoding: 'utf8' });
}
function rejected(out) {
  const result = run(out);
  assert.equal(result.status, 1, '归档目标必须在执行复核前拒绝：' + out);
  assert.match(result.stderr, /归档/);
}
test('拒绝规范归档路径及归档目录本身', () => {
  rejected(path.join(root, 'standard-regression.json')); rejected(root);
});
test('拒绝Windows大小写别名', { skip: process.platform !== 'win32' }, () => {
  rejected(path.join(root, 'standard-regression.json').toLowerCase());
});
test('拒绝junction别名及其尚不存在的子目录', () => {
  rejected(path.join(alias, 'standard-regression.json')); rejected(path.join(alias, 'new-directory/new.json'));
});
test('允许.tmp新输出，写入时仍拒绝归档别名且不覆盖既有文件', async () => {
  const output = path.join(scratch, 'new/result.json');
  assert.equal(run(output).status, 0);
  const { writeReport } = await import('./output-path.mjs');
  await writeReport(output, '首份输出', root);
  await assert.rejects(writeReport(output, '覆盖输出', root), /EEXIST/);
  assert.equal(await fs.readFile(output, 'utf8'), '首份输出');
  await assert.rejects(writeReport(path.join(alias, 'new-directory/new.json'), '禁止写入', root), /归档/);
});
