import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { scanRepository as current } from '../tools/sdk-standard-check/src/check.mjs';
import { scanRepository as baseline } from './tracking-baseline-reference/tools/sdk-standard-check/src/check.mjs';

const roots = ['Detection', 'DocLayoutV3', 'LCNet_x1_0_doc_ori', 'OCRv6', 'RotatedDetection', 'Segmentation', 'TinyPose'].map(x=>'web-sdk-PP-'+x);
const baseStandard = path.resolve('.tmp/tracking-baseline-reference/standards/v1');
const nextStandard = path.resolve('standards/v1');
const records = [];
for (const name of roots) {
  const snapshot = path.resolve('C:/Users/chenm/.codex/tmp/tracking-compat-20260919', name);
  const a = await baseline(snapshot, {standardRoot:baseStandard});
  const b = await current(snapshot, {standardRoot:nextStandard});
  const prior = new Map(a.findings.map(x=>[x.id,x]));
  const changes = b.findings.filter(x=>prior.has(x.id) && x.status!==prior.get(x.id).status).map(x=>({id:x.id,before:prior.get(x.id).status,after:x.status}));
  records.push({repository:name, commit:execFileSync('git',['-C',path.join('F:/git/00_chenmohan/github',name),'rev-parse','HEAD'],{encoding:'utf8'}).trim(), changes,
    baselineFailures:a.findings.filter(x=>x.level==='required'&&x.status==='fail').map(x=>x.id),
    currentFailures:b.findings.filter(x=>x.level==='required'&&x.status==='fail').map(x=>x.id),
    baseline:a.findings,current:b.findings});
}
const report={verifiedAt:new Date().toISOString(),baseline:'df2863e',scope:'仅各仓库HEAD的git archive快照；不包含用户未提交文件或本地临时目录',records};
await fs.writeFile('.tmp/tracking-standard-regression.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(records.map(({repository,changes,baselineFailures,currentFailures})=>({repository,changes,baselineFailures,currentFailures})),null,2));
if(records.some(x=>x.changes.length))process.exitCode=1;
