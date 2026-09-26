"""核对报告、固定来源与本地实验产物，避免摘要或文档链接与实际结果脱节。"""
import argparse
import ast
import datetime
import gzip
import hashlib
import json
from pathlib import Path
import re


def read_json(path):
    return json.loads(path.read_text(encoding='utf8'))


def identity(data):
    return {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--work', type=Path, required=True)
    args = parser.parse_args()
    report, work = Path(__file__).resolve().parents[1], args.work.resolve()
    repo = report.parents[2]
    for path in report.rglob('*.json'):
        read_json(path)
    sources = read_json(report / 'sources.lock.json')
    for item in sources['files']:
        assert identity(gzip.decompress((report / item['snapshot']).read_bytes())) == {k: item[k] for k in ['bytes', 'sha256']}, item['path']
    conversion = read_json(report / 'conversion.json')
    assert identity((work / conversion['model']['file']).read_bytes()) == {k: conversion['model'][k] for k in ['bytes', 'sha256']}
    assert identity((work / 'ppyoloe_seg_s_80e_coco.pdparams').read_bytes()) == {k: sources['weight'][k] for k in ['bytes', 'sha256']}
    comparison = read_json(report / 'browser-comparison.json')
    assert comparison['status'] == 'passed'
    for name, expected in comparison['evidence'].items():
        assert identity((report / name).read_bytes()) == expected, name
    for name, expected in comparison['localArtifacts'].items():
        assert identity((work / name).read_bytes()) == expected, name
    reference = read_json(report / 'python-reference.json')
    dataset = read_json(report / 'dataset.lock.json')
    for case in reference['cases']:
        assert identity((work / 'inputs' / f"{case['id']}.f32").read_bytes())['sha256'] == case['inputSha256']
        if case['imagePath']:
            item = next(row for row in dataset['images'] if row['filename'] == f"{case['id']}.jpg")
            assert identity(Path(case['imagePath']).read_bytes()) == {k: item[k] for k in ['bytes', 'sha256']}
            assert item['sha256'] == case['imageSha256']
    scripts = list((report / 'reproduction').glob('*.py'))
    for path in scripts:
        ast.parse(path.read_text(encoding='utf8'), filename=path.name)
    docs = [*report.rglob('*.md'), repo / 'docs/superpowers/plans/2026-08-17-web-model-sdk-portal-roadmap.md',
            repo / 'docs/superpowers/plans/2026-09-13-pp-detection-multi-model-roadmap.md']
    checked_links = 0
    for path in docs:
        for link in re.findall(r'\]\(([^)]+)\)', path.read_text(encoding='utf8')):
            if re.match(r'^[a-z][a-z0-9+.-]*:', link, re.I) or link.startswith('#'):
                continue
            target = link.split('#', 1)[0]
            resolved = (path.parent / target).resolve()
            # 本次核验报告将在下方生成；其余文件链接必须已经存在。
            assert resolved == report / 'verification.json' or resolved.exists(), (path.name, link)
            checked_links += 1
    files = {file.relative_to(report).as_posix(): identity(file.read_bytes()) for file in sorted(report.rglob('*'))
             if file.is_file() and file.name != 'verification.json'}
    result = {'status': 'passed', 'verifiedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'checks': {'sourceSnapshots': len(sources['files']), 'localArtifacts': len(comparison['localArtifacts']),
                         'pythonScriptsParsed': len(scripts), 'localMarkdownLinks': checked_links},
              'scope': '报告JSON、源码快照、模型/权重/输入/原始输出摘要、Python语法及本地文件链接核验；不替代模型推理或产品测试。',
              'files': files}
    (report / 'verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print(json.dumps({k: v for k, v in result.items() if k != 'files'}, ensure_ascii=False))


if __name__ == '__main__':
    main()
