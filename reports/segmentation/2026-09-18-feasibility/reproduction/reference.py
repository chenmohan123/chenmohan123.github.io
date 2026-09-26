"""比较官方Paddle与ONNX的原始输出、类别框和原图二值mask；小样本不等于COCO AP。"""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import platform
import sys
import time

import cv2
import numpy as np
import onnxruntime as ort


def select(values, threshold=0.5):
    boxes, scores, _, _ = values
    boxes, scores = boxes[0], scores[0]
    result = []
    for label, confidence in enumerate(scores):
        indices = np.where(confidence > threshold)[0]
        indices = indices[np.argsort(-confidence[indices], kind='stable')][:1000]
        while len(indices):
            idx = indices[0]
            result.append({'label': label, 'score': float(confidence[idx]), 'index': int(idx), 'box640': boxes[idx].tolist()})
            others = indices[1:]
            if not len(others):
                break
            inter = np.prod(np.maximum(0, np.minimum(boxes[idx, 2:], boxes[others, 2:]) - np.maximum(boxes[idx, :2], boxes[others, :2])), axis=1)
            area = np.prod(np.maximum(0, boxes[idx, 2:] - boxes[idx, :2]))
            areas = np.prod(np.maximum(0, boxes[others, 2:] - boxes[others, :2]), axis=1)
            iou = inter / np.maximum(area + areas - inter, 1e-12)
            indices = others[iou <= 0.7]
    return sorted(result, key=lambda row: -row['score'])[:300]


def masks_for(values, rows, width, height):
    coeff, proto = values[2][0], values[3][0]
    masks = []
    for row in rows:
        logits = coeff[:, row['index']] @ proto.reshape(32, -1)
        prob = (1 / (1 + np.exp(-np.clip(logits, -80, 80)))).reshape(160, 160)
        mask = cv2.resize(prob, (640, 640), interpolation=cv2.INTER_LINEAR)
        x1, y1, x2, y2 = row['box640']
        mask *= ((np.arange(640)[None, :] >= x1) & (np.arange(640)[None, :] < x2)
                 & (np.arange(640)[:, None] >= y1) & (np.arange(640)[:, None] < y2))
        mask = cv2.resize(mask, (width, height), interpolation=cv2.INTER_LINEAR) > 0.5
        masks.append(mask.astype(np.uint8))
    return np.stack(masks) if masks else np.zeros((0, height, width), np.uint8)


def mask_iou(a, b):
    union = np.count_nonzero(a | b)
    return float(np.count_nonzero(a & b) / union) if union else 1.0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--upstream', type=Path, required=True)
    parser.add_argument('--work', type=Path, required=True)
    parser.add_argument('--images', type=Path, required=True)
    args = parser.parse_args()
    work = args.work.resolve()
    report = Path(__file__).resolve().parents[1]
    conversion = json.loads((report / 'conversion.json').read_text(encoding='utf8'))
    model_path = work / conversion['model']['file']
    assert hashlib.sha256(model_path.read_bytes()).hexdigest() == conversion['model']['sha256']
    os.environ['OMP_NUM_THREADS'] = '4'
    os.environ['MPLCONFIGDIR'] = str(work / 'matplotlib')
    sys.path.insert(0, str(args.upstream.resolve()))
    import paddle
    from ppdet.core.workspace import create, load_config
    from ppdet.modeling.bbox_utils import batch_distance2bbox
    paddle.set_device('cpu')
    cfg = load_config(str(args.upstream / 'configs/ppyoloe_seg/ppyoloe_seg_s_80e_coco.yml'))
    model = create(cfg.architecture)
    missing, unexpected = model.set_state_dict(paddle.load(str(work / 'ppyoloe_seg_s_80e_coco.pdparams')))
    assert not missing and not unexpected
    model.eval()
    options = ort.SessionOptions()
    options.intra_op_num_threads = 4
    session = ort.InferenceSession(str(model_path), options, providers=['CPUExecutionProvider'])
    (work / 'inputs').mkdir(exist_ok=True)
    (work / 'reference').mkdir(exist_ok=True)
    samples = sorted(args.images.glob('*.jpg'))[:6]
    assert len(samples) == 6
    cases, comparisons = [], []
    for path in [*samples, None]:
        rgb = cv2.cvtColor(cv2.imread(str(path)), cv2.COLOR_BGR2RGB) if path else np.zeros((480, 640, 3), np.uint8)
        height, width = rgb.shape[:2]
        case_id = path.stem if path else 'blank'
        tensor = (cv2.resize(rgb, (640, 640), interpolation=cv2.INTER_CUBIC).astype(np.float32) / np.float32(255)).transpose(2, 0, 1)[None].copy()
        tensor.tofile(work / 'inputs' / f'{case_id}.f32')
        cases.append({'id': case_id, 'width': width, 'height': height,
                      'imagePath': str(path.resolve()) if path else None,
                      'imageSha256': hashlib.sha256(path.read_bytes()).hexdigest() if path else None,
                      'inputSha256': hashlib.sha256(tensor.tobytes()).hexdigest()})
        inputs = {'image': paddle.to_tensor(tensor), 'im_shape': paddle.to_tensor([[640., 640.]]),
                  'scale_factor': paddle.to_tensor([[640 / height, 640 / width]], dtype='float32')}
        with paddle.no_grad():
            head = model.yolo_head(model.neck(model.backbone(inputs)))
            paddle_raw = [(batch_distance2bbox(head[4], head[1]) * head[5]).numpy(), head[0].numpy(), head[2].numpy(), head[3].numpy()]
            official = model(inputs)
        started = time.perf_counter()
        values = session.run(None, {'image': tensor})
        latency = (time.perf_counter() - started) * 1000
        metrics = []
        for a, b in zip(paddle_raw, values, strict=True):
            assert np.isfinite(a).all() and np.isfinite(b).all()
            metrics.append({'shape': list(a.shape), 'maxAbs': float(np.max(np.abs(a - b))), 'meanAbs': float(np.mean(np.abs(a - b)))})
        rows = select(values)
        masks = masks_for(values, rows, width, height)
        original_boxes = official['bbox'].numpy()
        original_masks = official['mask'].numpy().astype(np.uint8)
        keep = original_boxes[:, 1] > 0.5
        original_boxes, original_masks = original_boxes[keep], original_masks[keep]
        order = np.argsort(-original_boxes[:, 1], kind='stable')
        original_boxes, original_masks = original_boxes[order], original_masks[order]
        assert len(rows) == len(original_boxes), (case_id, len(rows), len(original_boxes))
        ious, box_deltas, score_deltas = [], [], []
        for i, row in enumerate(rows):
            assert row['label'] == int(original_boxes[i, 0])
            box = np.asarray(row['box640']) * np.array([width / 640, height / 640] * 2)
            box_delta = float(np.max(np.abs(box - original_boxes[i, 2:])))
            score_delta = abs(row['score'] - float(original_boxes[i, 1]))
            iou = mask_iou(masks[i], original_masks[i])
            assert box_delta <= 0.05 and score_delta <= 0.0001 and iou >= 0.99, (case_id, box_delta, score_delta, iou)
            ious.append(iou)
            box_deltas.append(box_delta)
            score_deltas.append(score_delta)
            row.update({'box': box.tolist(), 'maskArea': int(masks[i].sum())})
        if path is None:
            assert not rows, '空白图不应产生阈值以上实例'
        np.savez_compressed(work / 'reference' / f'{case_id}.npz', **{f'raw{i}': x for i, x in enumerate(values)}, masks=original_masks)
        (work / 'reference' / f'{case_id}.json').write_text(json.dumps(rows) + '\n', encoding='utf8')
        comparisons.append({'id': case_id, 'instances': len(rows), 'rawOutputDelta': metrics,
                            'minMaskIoU': min(ious, default=1), 'maxBoxDeltaPx': max(box_deltas, default=0),
                            'maxScoreDelta': max(score_deltas, default=0), 'onnxInferenceMs': latency, 'detections': rows})
        print(json.dumps({k: v for k, v in comparisons[-1].items() if k not in ['rawOutputDelta', 'detections']}), flush=True)
    (work / 'cases.json').write_text(json.dumps(cases, indent=2) + '\n', encoding='utf8')
    result = {'status': 'passed', 'verifiedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'environment': {'python': platform.python_version(), 'os': platform.platform(), 'paddle': paddle.__version__, 'onnxruntime': ort.__version__, 'threads': 4},
              'model': conversion['model'], 'preprocessing': 'RGB/OpenCV INTER_CUBIC 640×640直缩，float32 /255；原始张量复用于浏览器，未覆盖浏览器解码/缩放。',
              'thresholds': {'score': 0.5, 'nmsIoU': 0.7, 'boxDeltaPx': 0.05, 'scoreDelta': 0.0001, 'maskIoU': 0.99},
              'cases': cases, 'comparisons': comparisons,
              'scope': '6张固定COCO图片与空白图的官方实现一致性检查，不是GT精度评估或全量COCO AP。'}
    (report / 'python-reference.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf8')


if __name__ == '__main__':
    main()
