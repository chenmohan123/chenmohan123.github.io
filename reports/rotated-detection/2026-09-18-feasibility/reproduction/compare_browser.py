"""把浏览器全部实例直接与官方Paddle输出、官方Shapely NMS结果按旋转IoU匹配。"""
import argparse
import datetime
import hashlib
import json
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--work', type=Path, required=True)
args = parser.parse_args()
work = args.work.resolve()
report = Path(__file__).resolve().parents[1]
execution = json.loads((report / 'browser-execution.json').read_text(encoding='utf8'))
cases = json.loads((work / 'cases.json').read_text(encoding='utf8'))
assert execution['status'] == 'executed'


def compare(expected, actual):
    remaining = set(range(len(actual)))
    minimum_iou, maximum_score, maximum_corner = 1., 0., 0.
    missing = []
    for row in expected:
        first = Polygon(np.asarray(row[2:]).reshape(4, 2))
        candidates = []
        for index in remaining:
            item = actual[index]
            if item['classId'] != row[0]:
                continue
            second = Polygon(item['polygon'])
            assert second.is_valid and second.area > 0, '无效旋转框'
            intersection = first.intersection(second).area
            candidates.append((intersection / (first.area + second.area - intersection), index))
        if not candidates:
            missing.append(int(row[0]))
            continue
        iou, index = max(candidates)
        remaining.remove(index)
        minimum_iou = min(minimum_iou, iou)
        maximum_score = max(maximum_score, abs(float(row[1]) - actual[index]['score']))
        maximum_corner = max(maximum_corner, float(np.max(np.abs(np.asarray(row[2:]) - np.asarray(actual[index]['polygon']).reshape(-1)))))
    return {'referenceCount': len(expected), 'browserCount': len(actual), 'missingClasses': missing,
            'extraIndices': sorted(remaining), 'minimumPolygonIoU': minimum_iou,
            'maximumScoreError': maximum_score, 'maximumCornerErrorPx': maximum_corner,
            'passed': not missing and not remaining and len(expected) == len(actual)
                      and minimum_iou >= .995 and maximum_score <= .001 and maximum_corner <= .1}


rows = []
artifacts = []
for entry in execution['backends']:
    model, backend = entry['model'], entry['backend']
    conversion = json.loads((report / ('conversion-' + model + '.json')).read_text(encoding='utf8'))
    assert hashlib.sha256((work / conversion['model']['file']).read_bytes()).hexdigest() == conversion['model']['sha256']
    for item in cases:
        base = work / model / 'browser-output' / backend / item['id']
        reference = np.load(work / model / 'reference' / (item['id'] + '.npz'))
        actual = json.loads((base / 'detections.json').read_text(encoding='utf8'))
        floating = []
        for index, key in enumerate(['scores', 'rboxes']):
            data = np.fromfile(base / f'raw{index}.f32', dtype=np.float32)
            assert np.isfinite(data).all()
            data = data.reshape(reference['paddle_' + key].shape)
            floating.append({'tensor': key, 'shape': list(data.shape),
                             'paddleMaximumAbsoluteError': float(np.max(np.abs(data - reference['paddle_' + key]))),
                             'ortMaximumAbsoluteError': float(np.max(np.abs(data - reference['ort_' + key]))),
                             'paddleMeanAbsoluteError': float(np.mean(np.abs(data - reference['paddle_' + key])))})
        result = compare(reference['official'], actual)
        ort_rows = json.loads((work / model / 'reference' / (item['id'] + '.json')).read_text(encoding='utf8'))
        ort_comparison = compare(ort_rows, actual)
        if item['id'] == 'blank':
            assert actual == []
        row = {'model': model, 'backend': backend, 'id': item['id'], 'raw': floating,
               'officialPaddle': result, 'pythonOrt': ort_comparison}
        rows.append(row)
        for file in sorted(base.iterdir()):
            artifacts.append({'file': file.relative_to(work).as_posix(), 'bytes': file.stat().st_size,
                              'sha256': hashlib.sha256(file.read_bytes()).hexdigest()})
        print(json.dumps(row), flush=True)
passed = all(row['officialPaddle']['passed'] and row['pythonOrt']['passed'] for row in rows)
summary = {'status': 'passed' if passed else 'failed', 'verifiedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
           'thresholds': {'minimumPolygonIoU': .995, 'maximumScoreError': .001, 'maximumCornerErrorPx': .1,
                          'sameCountAndClass': True, 'allFinite': True, 'blankMustBeEmpty': True},
           'rows': rows, 'localArtifacts': artifacts,
           'scope': '全部20次浏览器输入结果与官方Paddle逐实例对照；不代表数据集GT精度、全模型库或其他设备兼容。'}
(report / 'browser-comparison.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
assert passed, '存在未通过的浏览器数值对照，详见报告'
