"""复核实验来源、数值证据、原始本地文件及脚本语法；不把摘要复核当作重新推理。"""
import argparse
import ast
import datetime
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess
import onnx

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--work', type=Path, required=True)
parser.add_argument('--upstream', type=Path, required=True)
args = parser.parse_args()
work, upstream = args.work.resolve(), args.upstream.resolve()
report = Path(__file__).resolve().parents[1]


def load(name):
    return json.loads((report / name).read_text(encoding='utf-8-sig'))


def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


lock = load('sources.lock.json')
for item in lock['files']:
    data = gzip.decompress((report / item['snapshot']).read_bytes())
    assert len(data) == item['bytes'] and hashlib.sha256(data).hexdigest() == item['sha256']
    assert (upstream / item['path']).read_bytes() == data
artifacts = []
for candidate in lock['candidates']:
    model = candidate['id']
    assert sha(work / (model + '.pdparams')) == candidate['sha256']
    conversion = load('conversion-' + model + '.json')
    assert conversion['status'] == 'converted'
    assert sha(work / conversion['model']['file']) == conversion['model']['sha256']
    onnx.checker.check_model(str(work / conversion['model']['file']))
    reference = load('reference-' + model + '.json')
    assert reference['status'] == 'passed' and len(reference['cases']) == 5
    for case in reference['cases']:
        assert case['fullPaddlePostprocess']['status'] == 'executed'
        assert case['fullPaddlePostprocess']['comparisonWithOfficialOnnxNms']['passed']
        for item in case['artifacts']:
            assert sha(work / item['file']) == item['sha256']
            artifacts.append(item)
dataset = load('dataset.lock.json')
for case in dataset['cases']:
    assert sha(work / 'inputs' / (case['id'] + '.f32')) == case['inputSha256']
    assert sha(work / 'images' / (case['id'] + '.png')) == case['imageSha256']
for source in dataset['sources']:
    assert sha(upstream / 'demo' / source['file']) == source['sha256']
execution = load('browser-execution.json')
comparison = load('browser-comparison.json')
assert execution['status'] == 'executed' and len(execution['backends']) == 4
assert comparison['status'] == 'passed' and len(comparison['rows']) == 20
for item in comparison['localArtifacts']:
    assert sha(work / item['file']) == item['sha256']
    artifacts.append(item)
summaries = []
for backend in execution['backends']:
    assert backend['sessionReleased'] and not backend['pageErrors']
    assert len(backend['results']) == 5 and len(backend['warm']['runsMs']) == 3
    if backend['backend'] == 'webgpu':
        assert not backend['gpu']['fallback']
        assert all(row['gpuExecution']['commandSubmissions'] > 0 and row['gpuExecution']['computeDispatches'] > 0 for row in backend['results'])
    for name in ['screenshot', 'profiling', 'gpuExecution']:
        item = backend[name]
        assert sha(work / item['file']) == item['sha256']
        artifacts.append({'file': item['file'], 'sha256': item['sha256']})
    selected = [row for row in comparison['rows'] if row['model'] == backend['model'] and row['backend'] == backend['backend']]
    assert len(selected) == 5 and all(row['officialPaddle']['passed'] and row['pythonOrt']['passed'] for row in selected)
    summaries.append({'model': backend['model'], 'backend': backend['backend'], 'warmInferenceMedianMs': backend['warm']['medianMs'],
                      'minimumPolygonIoU': min(row['officialPaddle']['minimumPolygonIoU'] for row in selected),
                      'maximumCornerErrorPx': max(row['officialPaddle']['maximumCornerErrorPx'] for row in selected),
                      'maximumScoreError': max(row['officialPaddle']['maximumScoreError'] for row in selected)})
geometry = load('geometry-dependency.lock.json')
assert sha(work / geometry['file']) == geometry['sha256']
scripts = []
for file in sorted((report / 'reproduction').glob('*')):
    if file.suffix == '.py':
        ast.parse(file.read_text(encoding='utf8'))
    elif file.suffix == '.mjs':
        subprocess.run(['node', '--check', str(file)], check=True)
    else:
        continue
    scripts.append({'file': file.relative_to(report).as_posix(), 'sha256': sha(file)})
for file in report.rglob('*'):
    assert file.suffix.lower() not in {'.png', '.jpg', '.jpeg', '.onnx', '.pdparams', '.npz', '.f32'}, '模型与图片及原始数组仅留忽略目录'
links_checked = 0
for file in report.rglob('*.md'):
    for target in re.findall(r'\]\(([^)]+)\)', file.read_text(encoding='utf8')):
        if '://' in target or target.startswith('#'):
            continue
        destination = file.parent / target.split('#')[0]
        assert destination.exists() or destination == report / 'verification.json', (file, target)
        links_checked += 1
result = {'status': 'passed', 'verifiedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'sourceSnapshots': len(lock['files']), 'modelsChecked': 2, 'browserComparisons': 20,
          'rawArtifactsVerified': len(artifacts), 'localMarkdownLinksChecked': links_checked, 'scripts': scripts, 'summary': summaries,
          'scope': '本机实验文件摘要与脚本语法复核；模型、图片、原始张量、截图不进入Git。报告摘要不能替代原始数组重新计算。'}
(report / 'verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
print(json.dumps(result, ensure_ascii=False, indent=2))
