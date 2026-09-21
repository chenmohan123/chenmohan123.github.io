import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const exec=promisify(execFile);
const out='.tmp/tracking-02-release/portal-delivery';
const repo='repos/chenmohan123/chenmohan123.github.io';
const queries=[];
await mkdir(out,{recursive:true});
async function query(name,endpoint) {
  const {stdout}=await exec('C:/Program Files/GitHub CLI/gh.exe',['api',endpoint],{maxBuffer:8*1024*1024});
  const result=JSON.parse(stdout);
  await writeFile(`${out}/${name}.json`,JSON.stringify(result,null,2)+'\n');
  queries.push({name,endpoint,observedAt:new Date().toISOString()});
  return result;
}
const pull=await query('pull',`${repo}/pulls/48`);
assert(pull.merged,'门户尚未合并');
const [runs,pages,rules,deployments]=await Promise.all([
  query('runs',`${repo}/actions/runs?head_sha=${pull.merge_commit_sha}&per_page=20`),
  query('pages',`${repo}/pages`),
  query('branchRules',`${repo}/rulesets/20934822`),
  query('deployments',`${repo}/deployments?sha=${pull.merge_commit_sha}&environment=github-pages&per_page=10`)
]);
const deployRun=runs.workflow_runs.find(r=>r.path==='.github/workflows/deploy.yml');
assert.equal(deployRun?.conclusion,'success','门户部署尚未成功');
assert.equal(pages.https_enforced,true);
assert.equal(pages.build_type,'workflow');
assert.equal(rules.enforcement,'active');
assert.deepEqual(rules.bypass_actors,[]);
assert(deployments.length);
const statuses=await query('deploymentStatuses',`${repo}/deployments/${deployments[0].id}/statuses`);
assert.equal(statuses[0].state,'success');
const smoke=JSON.parse(await readFile('.tmp/tracking-02-release/portal-online/report.json','utf8'));
assert(smoke.results.every(r=>r.pageErrors.length===0));
const summary={observedAt:new Date().toISOString(),pr:pull.html_url,head:pull.head.sha,mergeCommit:pull.merge_commit_sha,mergedAt:pull.merged_at,
  ci:'https://github.com/chenmohan123/chenmohan123.github.io/actions/runs/35576448613',deploymentRun:deployRun.html_url,deploymentId:deployments[0].id,
  page:pages.html_url,registryVersion:'0.1.0',previewVersion:'0.2.0-rc.0',smoke,
  boundary:'当前回执固定门户 PR48 发布提交，后续纯文档归档可能生成新部署；不扩展手机或算法兼容性'};
await writeFile(`${out}/delivery.json`,JSON.stringify(summary,null,2)+'\n');
await writeFile(`${out}/queries.json`,JSON.stringify(queries,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
