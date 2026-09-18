"""固定五个输入，核对Paddle、Python ORT与上游Shapely旋转框后处理。"""
import argparse
import datetime
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sys
import time
import traceback

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--upstream', type=Path, required=True)
parser.add_argument('--work', type=Path, required=True)
parser.add_argument('--candidate', required=True)
args = parser.parse_args()
work, upstream = args.work.resolve(), args.upstream.resolve()
report = Path(__file__).resolve().parents[1]
lock = json.loads((report / 'sources.lock.json').read_text(encoding='utf8'))
candidate = next(r for r in lock['candidates'] if r['id'] == args.candidate)
conversion = json.loads((report / ('conversion-' + args.candidate + '.json')).read_text(encoding='utf8'))
os.environ['OMP_NUM_THREADS'] = '4'
os.environ['MPLCONFIGDIR'] = str(work / 'matplotlib')
sys.path.insert(0, str(upstream))
import cv2
import numpy as np
import onnxruntime as ort
import paddle
from ppdet.core.workspace import load_config, create

spec = importlib.util.spec_from_file_location('official_onnx_infer', upstream / 'configs/rotate/tools/onnx_infer.py')
official = importlib.util.module_from_spec(spec)
spec.loader.exec_module(official)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def compare(expected, actual):
    assert len(expected) == len(actual), (len(expected), len(actual))
    remaining = set(range(len(actual)))
    min_iou, max_score, max_corner = 1., 0., 0.
    for row in expected:
        possibilities = [(official.rbox_iou(row[2:], actual[i][2:]), i)
                         for i in remaining if row[0] == actual[i][0]]
        assert possibilities, '缺少同类旋转框'
        iou, index = max(possibilities)
        remaining.remove(index)
        min_iou = min(min_iou, iou)
        max_score = max(max_score, abs(float(row[1]) - float(actual[index][1])))
        max_corner = max(max_corner, float(np.max(np.abs(row[2:] - actual[index][2:]))))
    return {'count': len(actual), 'minimumPolygonIoU': min_iou,
            'maximumScoreError': max_score, 'maximumCornerErrorPx': max_corner,
            'passed': min_iou >= .995 and max_score <= .001 and max_corner <= .1}


sources = []
for name in ['P0072__1.0__0___0.png', 'P0861__1.0__1154___824.png']:
    location = upstream / 'demo' / name
    sources.append({'file': name, 'bytes': location.stat().st_size, 'sha256': sha(location),
                    'url': f"https://github.com/PaddlePaddle/PaddleDetection/blob/{lock['upstreamRevision']}/demo/{name}",
                    'origin': '上游仓库DOTA推理示例；图像许可需与Apache源码许可分别核验，未作产品素材再分发。'})
first = cv2.imread(str(upstream / 'demo' / sources[0]['file']))
second = cv2.imread(str(upstream / 'demo' / sources[1]['file']))
images = [('P0072', first, '上游原图'), ('P0861', second, '上游原图'),
          ('P0072-rot90', cv2.rotate(first, cv2.ROTATE_90_CLOCKWISE), 'P0072顺时针旋转90度'),
          ('P0861-crop', second[:, :768], 'P0861左侧768像素裁剪，测试非方形输入与补零'),
          ('blank', np.zeros((1024, 1024, 3), dtype=np.uint8), '纯黑负例')]
for directory in ['images', 'inputs', args.candidate + '/reference']:
    (work / directory).mkdir(parents=True, exist_ok=True)
transforms = official.Compose([{'type': 'Resize', 'target_size': [1024, 1024], 'keep_ratio': True, 'interp': 2},
                              {'type': 'NormalizeImage', 'mean': [.485, .456, .406], 'std': [.229, .224, .225], 'is_scale': True},
                              {'type': 'Permute'}])
cases = []
for name, image, transform in images:
    image_path = work / 'images' / (name + '.png')
    cv2.imwrite(str(image_path), image)
    feed = transforms(str(image_path))
    tensor = np.zeros((1, 3, 1024, 1024), dtype=np.float32)
    _, h, w = feed['image'].shape
    tensor[0, :, :h, :w] = feed['image']
    input_path = work / 'inputs' / (name + '.f32')
    tensor.tofile(input_path)
    cases.append({'id': name, 'width': image.shape[1], 'height': image.shape[0],
                  'transform': transform, 'scaleFactor': feed['scale_factor'].tolist(),
                  'resizedShape': [h, w], 'inputSha256': sha(input_path), 'imageSha256': sha(image_path)})
(work / 'cases.json').write_text(json.dumps(cases, ensure_ascii=False, indent=2), encoding='utf8')
(report / 'dataset.lock.json').write_text(json.dumps({'sources': sources, 'cases': cases,
    'scope': '2张上游示例及2个确定性变换、1张空白图；无GT/mAP测量，不推断全量DOTA精度。'}, ensure_ascii=False, indent=2) + '\n', encoding='utf8')

assert sha(work / conversion['model']['file']) == conversion['model']['sha256']
assert sha(work / (args.candidate + '.pdparams')) == candidate['sha256']
paddle.set_device('cpu')
cfg = load_config(str(upstream / candidate['config']))
model = create(cfg.architecture)
missing, unexpected = model.set_state_dict(paddle.load(str(work / (args.candidate + '.pdparams'))))
assert missing == (['yolo_head.angle_proj_conv.weight'] if args.candidate.startswith('ppyoloe') else []) and not unexpected
model.eval()
options = ort.SessionOptions()
options.intra_op_num_threads = 4
session = ort.InferenceSession(str(work / conversion['model']['file']), sess_options=options, providers=['CPUExecutionProvider'])
result = {'status': 'failed', 'verifiedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'candidate': args.candidate, 'model': conversion['model'],
          'thresholds': {'score': .1, 'nmsPolygonIoU': .1, 'perClassTopK': 2000,
                         'comparison': {'minimumPolygonIoU': .995, 'maximumScoreError': .001, 'maximumCornerErrorPx': .1}},
          'reference': '固定上游Paddle原始头与官方_box2corners；上游onnx_infer.py Shapely旋转NMS',
          'cases': []}
try:
    for item in cases:
        tensor = np.fromfile(work / 'inputs' / (item['id'] + '.f32'), dtype=np.float32).reshape(1, 3, 1024, 1024)
        with paddle.no_grad():
            start = time.perf_counter()
            raw = model.yolo_head(model.neck(model.backbone({'image': paddle.to_tensor(tensor)})))
            paddle_ms = (time.perf_counter() - start) * 1000
            scores, rboxes = [r.numpy() for r in raw]
            polygons = model.yolo_head._box2corners(raw[1]).numpy()
            sy, sx = item['scaleFactor']
            polygons /= np.array([sx, sy] * 4, dtype=np.float32)
        start = time.perf_counter()
        output = session.run(None, {'image': tensor})
        ort_ms = (time.perf_counter() - start) * 1000
        assert all(np.isfinite(a).all() for a in output)
        assert max((s > .1).sum() for s in scores[0]) <= 2000, '官方ONNX参考没有top_k，超限样本不能直接对齐'
        expected, _ = official.multiclass_nms_rotated(polygons, scores)
        with paddle.no_grad():
            ort_polygons = model.yolo_head._box2corners(paddle.to_tensor(output[1])).numpy()
        ort_polygons /= np.array([sx, sy] * 4, dtype=np.float32)
        actual, _ = official.multiclass_nms_rotated(ort_polygons, output[0])
        match = compare(expected, actual)
        full_paddle = {}
        try:
            with paddle.no_grad():
                final, count, _ = model.yolo_head.post_process(raw, paddle.to_tensor([item['scaleFactor']]))
            full_paddle = {'status': 'executed', 'comparisonWithOfficialOnnxNms': compare(expected, final.numpy())}
        except Exception:
            full_paddle = {'status': 'failed', 'error': traceback.format_exc()}
        target = work / args.candidate / 'reference' / item['id']
        np.savez_compressed(str(target) + '.npz', paddle_scores=scores, paddle_rboxes=rboxes,
                            ort_scores=output[0], ort_rboxes=output[1], official=expected)
        target.with_suffix('.json').write_text(json.dumps(actual.tolist()), encoding='utf8')
        row = {'id': item['id'], 'paddleMs': paddle_ms, 'ortMs': ort_ms,
               'raw': [{'maxAbsoluteError': float(np.max(np.abs(a - b))), 'meanAbsoluteError': float(np.mean(np.abs(a - b))), 'shape': list(a.shape)} for a, b in zip([scores, rboxes], output)],
               'maximumCandidatesPerClass': int(max((s > .1).sum() for s in scores[0])),
               'detections': match, 'fullPaddlePostprocess': full_paddle,
               'artifacts': [{'file': str(target.relative_to(work)) + extension, 'sha256': sha(Path(str(target) + extension))} for extension in ['.npz', '.json']]}
        result['cases'].append(row)
        print(json.dumps(row, ensure_ascii=False), flush=True)
    assert all(r['detections']['passed'] for r in result['cases'])
    result['status'] = 'passed'
finally:
    (report / ('reference-' + args.candidate + '.json')).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
