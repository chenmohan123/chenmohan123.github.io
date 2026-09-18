"""复算场景、来源、依赖与参考输出；已知失败是证据，不能改写为通过。"""
import argparse
import gzip
import hashlib
import importlib.metadata
import json
import subprocess
import sys
from pathlib import Path
import numpy as np
from generate_inputs import generate
from analyze_sources import analyze
from verify_calls import verify_call_records
from prepare_sources import HERE, ROOT, prepare


def canonical(value):
    if isinstance(value, dict):
        return {k: canonical(v) for k, v in value.items() if k not in ['update_ms', 'verified_at', 'environment']}
    if isinstance(value, list):
        return [canonical(v) for v in value]
    return value


def compare(left, right, path='结果'):
    if isinstance(left, dict):
        assert left.keys() == right.keys(), path
        for key in left:
            compare(left[key], right[key], path + '.' + key)
    elif isinstance(left, list):
        assert len(left) == len(right), path
        for index, (a, b) in enumerate(zip(left, right)):
            compare(a, b, f'{path}[{index}]')
    elif isinstance(left, float):
        assert np.isclose(left, right, rtol=1e-9, atol=1e-9), path
    else:
        assert left == right, path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--rerun', action='store_true')
    args = parser.parse_args()
    for name, entry in json.loads((HERE / 'evidence.lock.json').read_text(encoding='utf-8')).items():
        data = (HERE / name).read_bytes()
        assert len(data) == entry['bytes'] and hashlib.sha256(data).hexdigest() == entry['sha256'], f'证据哈希不符：{name}'
    prepare()
    inputs = json.loads((HERE / 'inputs.json').read_text(encoding='utf-8'))
    assert inputs == generate(), '输入与确定性生成器不一致'
    assert analyze() == json.loads((HERE / 'source-analysis.json').read_text(encoding='utf-8')), '来源分析与固定文件不一致'
    evidence = json.loads(gzip.decompress((HERE / 'results.json.gz').read_bytes()))
    summary = json.loads((HERE / 'summary.json').read_text(encoding='utf-8'))
    assert summary['config'] == evidence['config'] and summary['environment'] == evidence['environment']
    assert summary['instance_diagnostics'] == evidence['instance_diagnostics']
    assert summary['verified_at'] == evidence['verified_at']
    assert summary['results'] == [{**{key: r[key] for key in ['algorithm', 'scenario', 'mode']},
                                   'summary': {key: value for key, value in r['summary'].items() if key != 'traces'}}
                                  for r in evidence['results']], '摘要与完整证据不一致'
    assert len(evidence['results']) == 60
    assert len(evidence['instance_diagnostics']) == 5
    coverage = verify_call_records(evidence, inputs)
    for line in (HERE / 'requirements.lock.txt').read_text(encoding='utf-8').splitlines():
        if not line or line.startswith('#'):
            continue
        package, version = line.split('==')
        assert importlib.metadata.version(package) == version, f'依赖版本不同：{package}'
    for result in evidence['results']:
        assert len(result['frames']) == len(next(s for s in inputs if s['name'] == result['scenario'])['frames'])
        if result['scenario'] == 'translation':
            assert result['summary']['id_changes'] == 0
            assert result['summary']['unmatched_detection_frames'] == 0
        if result['scenario'] == 'ambiguous_bounce':
            assert result['summary']['id_changes'] == 2, '应保留掉头身份交换失败证据'
        if result['scenario'] == 'multi_class' and result['mode'] == 'class_isolated':
            assert result['summary']['cross_class_reuse'] == 0
        assert result['summary']['outputs_on_empty_input'] == 0
    diagnostics = {d['algorithm']: d for d in evidence['instance_diagnostics']}
    assert all(diagnostics[n]['duplicate_output_ids'] for n in ['oc', 'oc_byte', 'paddle_oc'])
    subprocess.run([sys.executable, '-m', 'pip', 'check'], check=True)
    if args.rerun:
        target = ROOT / '.tmp/tracking-rerun.json'
        subprocess.run([sys.executable, str(HERE / 'run.py'), '--out', str(target)], check=True)
        rerun = json.loads(target.read_text(encoding='utf-8'))
        assert verify_call_records(rerun, inputs) == coverage
        compare(canonical(evidence), canonical(rerun))
    print('校验通过：60组场景、5组实例诊断、860次调用（含85次补空）、确定性输入、固定源码与依赖；重跑=' + str(args.rerun))


if __name__ == '__main__':
    main()
