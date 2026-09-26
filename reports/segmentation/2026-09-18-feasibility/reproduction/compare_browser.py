"""按类别及框IoU匹配实例，核对浏览器输出与已对齐官方实现的Python基线。"""
import argparse
from collections import Counter
import datetime
import hashlib
import json
from pathlib import Path

import numpy as np


def read_json(path):
    return json.loads(path.read_text(encoding='utf8'))


def fingerprint(path):
    return {'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def box_iou(a, b):
    a, b = np.asarray(a), np.asarray(b)
    inter = np.prod(np.maximum(0, np.minimum(a[2:], b[2:]) - np.maximum(a[:2], b[:2])))
    union = np.prod(np.maximum(0, a[2:] - a[:2])) + np.prod(np.maximum(0, b[2:] - b[:2])) - inter
    return float(inter / max(1e-12, union))


def match_instances(actual, expected):
    assert Counter(row['label'] for row in actual) == Counter(row['label'] for row in expected), '类别数量不一致'
    pairs = sorted([(box_iou(a['box'], b['box']), i, j)
                    for i, a in enumerate(actual) for j, b in enumerate(expected)
                    if a['label'] == b['label']], reverse=True)
    used_actual, used_expected, matched = set(), set(), []
    for iou, i, j in pairs:
        if i in used_actual or j in used_expected:
            continue
        assert iou >= 0.99, ('无法按同类别及框IoU匹配', i, j, iou)
        used_actual.add(i)
        used_expected.add(j)
        matched.append((i, j, iou))
    assert len(matched) == len(actual) == len(expected), '存在未匹配实例'
    return matched


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--work', type=Path, required=True)
    args = parser.parse_args()
    work, report_dir = args.work.resolve(), Path(__file__).resolve().parents[1]
    execution = read_json(report_dir / 'browser-execution.json')
    reference = read_json(report_dir / 'python-reference.json')
    conversion = read_json(report_dir / 'conversion.json')
    assert execution['status'] == 'executed' and reference['status'] == 'passed'
    assert execution['model'] == reference['model'] == conversion['model']
    assert fingerprint(work / conversion['model']['file']) == {k: conversion['model'][k] for k in ['bytes', 'sha256']}
    assert execution['cases'] == [{k: v for k, v in case.items() if k != 'imagePath'} for case in reference['cases']]
    thresholds = reference['thresholds']
    shapes = [item['shape'] for item in conversion['outputs']]
    backends, artifacts = [], {}
    for backend in execution['backends']:
        name, comparisons = backend['backend'], []
        assert not backend['pageErrors'] and backend['sessionReleased']
        assert [row['id'] for row in backend['results']] == [case['id'] for case in execution['cases']]
        for case, result in zip(execution['cases'], backend['results'], strict=True):
            case_id = case['id']
            base = work / 'browser-output' / name / case_id
            expected_file = work / 'reference' / f'{case_id}.npz'
            expected_json = work / 'reference' / f'{case_id}.json'
            assert result['shapes'] == shapes
            rows = read_json(base / 'detections.json')
            expected_rows = read_json(expected_json)
            assert expected_rows == next(row['detections'] for row in reference['comparisons'] if row['id'] == case_id)
            assert len(rows) == result['instances']
            raw_deltas, instance_deltas = [], []
            with np.load(expected_file) as expected:
                for i, shape in enumerate(shapes):
                    actual = np.fromfile(base / f'raw{i}.f32', dtype='<f4').reshape(shape)
                    baseline = expected[f'raw{i}']
                    assert baseline.shape == actual.shape and np.isfinite(actual).all() and np.isfinite(baseline).all()
                    delta = np.abs(actual - baseline)
                    raw_deltas.append({'shape': shape, 'maxAbs': float(delta.max()), 'meanAbs': float(delta.mean())})
                masks = np.fromfile(base / 'masks.u8', dtype=np.uint8).reshape(len(rows), case['height'], case['width'])
                official_masks = expected['masks']
                assert official_masks.shape == masks.shape and np.all(masks <= 1) and np.all(official_masks <= 1)
                for i, j, iou in match_instances(rows, expected_rows):
                    a, b = rows[i], expected_rows[j]
                    assert np.isfinite(a['box']).all() and np.isfinite(a['score'])
                    box_delta = float(np.max(np.abs(np.asarray(a['box']) - b['box'])))
                    score_delta = abs(a['score'] - b['score'])
                    union = np.count_nonzero(masks[i] | official_masks[j])
                    mask_iou = float(np.count_nonzero(masks[i] & official_masks[j]) / union) if union else 1.0
                    assert int(masks[i].sum()) == a['maskArea'] == result['maskAreas'][i]
                    assert box_delta <= thresholds['boxDeltaPx'], (name, case_id, '框', box_delta)
                    assert score_delta <= thresholds['scoreDelta'], (name, case_id, '分数', score_delta)
                    assert mask_iou >= thresholds['maskIoU'], (name, case_id, '掩码', mask_iou)
                    instance_deltas.append({'actualIndex': i, 'referenceIndex': j, 'label': a['label'], 'boxIoU': iou,
                                            'boxDeltaPx': box_delta, 'scoreDelta': score_delta, 'maskIoU': mask_iou})
            if case_id == 'blank':
                assert not rows
            for file in [expected_file, expected_json, *sorted(base.iterdir())]:
                artifacts[file.relative_to(work).as_posix()] = fingerprint(file)
            comparisons.append({'id': case_id, 'instances': len(rows), 'rawOutputDelta': raw_deltas,
                                'matches': instance_deltas, 'minMaskIoU': min((x['maskIoU'] for x in instance_deltas), default=1),
                                'maxBoxDeltaPx': max((x['boxDeltaPx'] for x in instance_deltas), default=0),
                                'maxScoreDelta': max((x['scoreDelta'] for x in instance_deltas), default=0)})
        backends.append({'backend': name, 'instances': sum(x['instances'] for x in comparisons),
                         'minMaskIoU': min(x['minMaskIoU'] for x in comparisons),
                         'maxBoxDeltaPx': max(x['maxBoxDeltaPx'] for x in comparisons),
                         'maxScoreDelta': max(x['maxScoreDelta'] for x in comparisons), 'comparisons': comparisons})
    assert [x['backend'] for x in backends] == ['wasm', 'webgpu']
    report = {'status': 'passed', 'verifiedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'model': conversion['model'], 'thresholds': thresholds,
              'reference': '原始张量、框和分数对照已通过官方一致性检查的Python ONNX；二值掩码直接对照官方Paddle最终输出。按类别及框IoU一一匹配，不依赖实例排序。',
              'evidence': {name: fingerprint(report_dir / name) for name in ['conversion.json', 'python-reference.json', 'browser-execution.json']},
              'backends': backends, 'localArtifacts': artifacts,
              'scope': '6张固定图片加空白图，同预处理张量，桌面main模式CPU/WASM与WebGPU；未覆盖浏览器预处理、Worker、完整SDK或GT mask AP。'}
    (report_dir / 'browser-comparison.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print(json.dumps({'status': report['status'], 'backends': [{k: v for k, v in item.items() if k != 'comparisons'} for item in backends]}, ensure_ascii=False))


if __name__ == '__main__':
    main()
