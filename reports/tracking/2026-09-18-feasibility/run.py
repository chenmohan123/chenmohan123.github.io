"""运行未修改的参考核心；适配仅限输入布局、输出记录和显式补空/分组。"""
import argparse
import copy
import gzip
import importlib
import importlib.metadata
import json
import platform
import sys
import time
import types
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
import numpy as np
from scipy.optimize import linear_sum_assignment
from prepare_sources import HERE, prepare

ALGORITHMS = ['byte', 'oc', 'oc_byte', 'paddle_byte', 'paddle_oc']
CONFIG = dict(fps=30, retention_updates=5, high_score=0.5, low_score=0.1,
              new_byte_score=0.6, byte_match_cost=0.8, oc_iou=0.3, oc_min_hits=1,
              oc_delta_t=3, oc_inertia=0.2, evaluation_iou=0.5, max_padding=100)
MODULES = {}


def load_sources(cache):
    # 建立命名空间绕过检测器初始化，不伪造依赖或修改参考函数。
    for name, folder in [('yolox', 'byte/yolox'), ('yolox.tracker', 'byte/yolox/tracker'),
                         ('trackers', 'oc/trackers'), ('trackers.ocsort_tracker', 'oc/trackers/ocsort_tracker'),
                         ('mot', 'paddle/deploy/pptracking/python/mot'),
                         ('mot.tracker', 'paddle/deploy/pptracking/python/mot/tracker'),
                         ('mot.motion', 'paddle/deploy/pptracking/python/mot/motion'),
                         ('mot.matching', 'paddle/deploy/pptracking/python/mot/matching')]:
        module = types.ModuleType(name)
        module.__path__ = [str(cache / folder)]
        sys.modules[name] = module
    kalman = importlib.import_module('mot.motion.kalman_filter')
    sys.modules['mot.motion'].KalmanFilter = kalman.KalmanFilter
    for name, path in [('byte', 'yolox.tracker.byte_tracker'), ('oc', 'trackers.ocsort_tracker.ocsort'),
                       ('paddle_byte', 'mot.tracker.jde_tracker'), ('paddle_oc', 'mot.tracker.ocsort_tracker')]:
        MODULES[name] = importlib.import_module(path)


def reset_globals():
    # 只在完整独立场景开始时重置测试进程中的ID计数；并发诊断不重置。
    importlib.import_module('yolox.tracker.basetrack').BaseTrack._count = 0
    importlib.import_module('mot.tracker.base_jde_tracker').BaseTrack.init_count(2)
    MODULES['oc'].KalmanBoxTracker.count = 0
    MODULES['paddle_oc'].KalmanBoxTracker.count = 0


def create(name):
    if name == 'byte':
        return MODULES['byte'].BYTETracker(SimpleNamespace(track_thresh=0.5, track_buffer=5, match_thresh=0.8, mot20=False), frame_rate=30)
    if name == 'paddle_byte':
        tracker = MODULES[name].JDETracker(use_byte=True, num_classes=2, conf_thres=0.5, low_conf_thres=0.1, track_buffer=5, match_thres=0.8)
        # 上游外层调用者负责设置该公开属性；构造器默认值为0。
        tracker.max_time_lost = 5
        return tracker
    module = MODULES['paddle_oc' if name == 'paddle_oc' else 'oc']
    cls = module.OCSORTTracker if name == 'paddle_oc' else module.OCSort
    return cls(det_thresh=0.5, max_age=5, min_hits=1, iou_threshold=0.3,
               delta_t=3, inertia=0.2, use_byte=name in ['oc_byte', 'paddle_oc'])


def input_array(name, detections):
    if name.startswith('paddle'):
        values = [[d['class_id'], d['score'], *d['box']] for d in detections]
        return np.asarray(values, dtype=np.float64).reshape(-1, 6)
    values = [[*d['box'], d['score']] for d in detections]
    return np.asarray(values, dtype=np.float64).reshape(-1, 5)


def update(name, tracker, detections, call_context=None, call_records=None):
    array = input_array(name, detections)
    # 在调用前快照实际数组；上游即便原地修改输入也不会覆盖证据。
    actual_input = dict(shape=list(array.shape), dtype=str(array.dtype), values=array.tolist())
    if name.startswith('paddle'):
        start = time.perf_counter_ns()
        output = tracker.update(array)
    else:
        start = time.perf_counter_ns()
        output = tracker.update(array, (640, 640), (640, 640))
    duration = (time.perf_counter_ns() - start) / 1e6
    if name in ['byte', 'paddle_byte']:
        groups = output.items() if name == 'paddle_byte' else [(None, output)]
        rows = [dict(id=f'{cls}:{t.track_id}' if cls is not None else str(t.track_id),
                     raw_id=int(t.track_id), class_id=cls, box=t.tlbr.tolist(), last_score=float(t.score))
                for cls, tracks in groups for t in tracks]
    else:
        rows = [dict(id=str(int(row[-1])), raw_id=int(row[-1]), class_id=None, box=row[:4].tolist()) for row in output]
    if call_records is not None:
        call_records.append(dict(**call_context, input=actual_input, outputs=copy.deepcopy(rows),
                                 state=state(name, tracker), update_ms=duration))
    return rows, duration


def state(name, tracker):
    if name == 'byte':
        return {key: [int(t.track_id) for t in getattr(tracker, attr)] for key, attr in
                [('tracked', 'tracked_stracks'), ('lost', 'lost_stracks'), ('removed', 'removed_stracks')]}
    if name == 'paddle_byte':
        return {key: [f'{cls}:{t.track_id}' for cls, tracks in getattr(tracker, attr).items() for t in tracks]
                for key, attr in [('tracked', 'tracked_tracks_dict'), ('lost', 'lost_tracks_dict'), ('removed', 'removed_tracks_dict')]}
    return dict(retained=[dict(id=int(t.id + 1), age=int(t.time_since_update)) for t in tracker.trackers])


def iou(a, b):
    intersection = max(0, min(a[2], b[2])-max(a[0], b[0])) * max(0, min(a[3], b[3])-max(a[1], b[1]))
    union = (a[2]-a[0])*(a[3]-a[1]) + (b[2]-b[0])*(b[3]-b[1]) - intersection
    return intersection / union if union else 0.0


def summarize(scene, frames):
    traces, owners = {}, {}
    missing, cross_class_reuse, switches, ambiguous = 0, 0, 0, 0
    for source, result in zip(scene['frames'], frames):
        if source['ambiguous']:
            ambiguous += 1
            continue
        detections, outputs = source['detections'], result['outputs']
        matches = {}
        if detections and outputs:
            scores = np.array([[iou(d['box'], o['box']) if o['class_id'] in [None, d['class_id']] else 0 for o in outputs] for d in detections])
            left, right = linear_sum_assignment(1-scores)
            matches = {int(a): int(b) for a, b in zip(left, right) if scores[a, b] >= CONFIG['evaluation_iou']}
        for index, detection in enumerate(detections):
            subject = detection['subject']
            trace = traces.setdefault(subject, [])
            if index not in matches:
                missing += 1
                trace.append(dict(frame=source['frame_index'], id=None))
                continue
            identity = outputs[matches[index]]['id']
            previous = [row['id'] for row in trace if row['id'] is not None]
            if previous and previous[-1] != identity:
                switches += 1
            if identity in owners and owners[identity] != detection['class_id']:
                cross_class_reuse += 1
            owners[identity] = detection['class_id']
            trace.append(dict(frame=source['frame_index'], id=identity))
    times = [duration for f in frames for duration in f['update_ms']]
    return dict(id_changes=switches, unmatched_detection_frames=missing, cross_class_reuse=cross_class_reuse,
                empty_input_frames=sum(not f['detections'] for f in scene['frames']),
                outputs_on_empty_input=sum(len(r['outputs']) for f, r in zip(scene['frames'], frames) if not f['detections']),
                excluded_ambiguous_frames=ambiguous, traces=traces, calls=len(times),
                update_ms=dict(total=sum(times), median=float(np.median(times)), p95=float(np.percentile(times, 95)), max=max(times)))


def run_scene(name, scene, mode='native'):
    classes = sorted({d['class_id'] for f in scene['frames'] for d in f['detections']}) if mode == 'class_isolated' else [None]
    frames = [dict(frame_index=f['frame_index'], timestamp_ms=f['timestamp_ms'], outputs=[], update_ms=[], states=[], padded_updates=0) for f in scene['frames']]
    call_records = []
    for cls in classes:
        reset_globals()
        tracker = create(name)
        previous = -1
        group_call_index = 0
        def record_update(index, source_index, padding, detections):
            nonlocal group_call_index
            group_call_index += 1
            context = dict(call_index=len(call_records) + 1, group_call_index=group_call_index,
                           frame_index=index, source_frame_index=source_index,
                           is_padding=padding, class_group=cls)
            return update(name, tracker, detections, context, call_records)
        for source, result in zip(scene['frames'], frames):
            padding = source['frame_index'] - previous - 1 if mode == 'pad_empty' else 0
            if padding > CONFIG['max_padding']:
                raise ValueError('补空超过实验上限，应由产品契约决定过期/reset策略')
            for index in range(previous + 1, previous + 1 + padding):
                _, duration = record_update(index, source['frame_index'], True, [])
                result['update_ms'].append(duration)
            result['padded_updates'] += padding
            detections = [d for d in source['detections'] if cls is None or d['class_id'] == cls]
            outputs, duration = record_update(source['frame_index'], source['frame_index'], False, detections)
            if cls is not None:
                for output in outputs:
                    output.update(id=f'c{cls}:{output["id"]}', class_id=cls)
            result['outputs'].extend(outputs)
            result['update_ms'].append(duration)
            result['states'].append(dict(class_id=cls, state=state(name, tracker)))
            previous = source['frame_index']
    summary = summarize(scene, frames)
    padding_records = [record for record in call_records if record['is_padding']]
    summary['padding'] = dict(calls=len(padding_records),
                              empty_input_calls=sum(not record['input']['values'] for record in padding_records),
                              output_count=sum(len(record['outputs']) for record in padding_records))
    return dict(algorithm=name, scenario=scene['name'], mode=mode, frames=frames,
                call_records=call_records, summary=summary)


def diagnose(name):
    reset_globals()
    first = create(name)
    d = lambda x: dict(class_id=0, score=0.9, box=[x, 20, x+30, 80])
    update(name, first, [d(10), d(110)])
    before = state(name, first)
    def counter():
        if name == 'byte':
            return importlib.import_module('yolox.tracker.basetrack').BaseTrack._count
        if name == 'paddle_byte':
            return dict(importlib.import_module('mot.tracker.base_jde_tracker').BaseTrack._count_dict)
        return MODULES['paddle_oc' if name == 'paddle_oc' else 'oc'].KalmanBoxTracker.count
    counter_before = counter()
    second = create(name)
    update(name, second, [d(210)])
    counter_after_second = counter()
    first_add_output, _ = update(name, first, [d(10), d(110), d(310)])
    after_add = state(name, first)
    output, _ = update(name, first, [d(10), d(110), d(310)])
    ids = [o['id'] for o in output]
    after = state(name, first)
    return dict(algorithm=name, first_before_second_instance=before, first_after=after,
                counter_before=counter_before, counter_after_second=counter_after_second,
                first_after_add=after_add, first_add_outputs=first_add_output,
                first_outputs=output, duplicate_output_ids=len(ids) != len(set(ids)),
                note='同进程A已有两轨，构建并更新B后A新增轨；未对并发实例重置全局变量')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', type=Path, default=HERE / 'results.json.gz')
    args = parser.parse_args()
    cache = prepare()
    load_sources(cache)
    scenes = json.loads((HERE / 'inputs.json').read_text(encoding='utf-8'))
    results = []
    for name in ALGORITHMS:
        for scene in scenes:
            modes = ['native'] + (['pad_empty'] if scene['name'] == 'sparse_gap' else []) + (['class_isolated'] if scene['name'] == 'multi_class' else [])
            for mode in modes:
                results.append(run_scene(name, scene, mode))
        print(f'{name}：场景完成')
    document = dict(verified_at=datetime.now(timezone.utc).isoformat(),
                    environment=dict(python=sys.version, platform=platform.platform(), processor=platform.processor(),
                                     packages={d.metadata['Name']: d.version for d in importlib.metadata.distributions()},
                                     timing='perf_counter_ns；只计update，排除导入、数组转换、评分、下载；首个update未预热'),
                    config=CONFIG, results=results, instance_diagnostics=[diagnose(n) for n in ALGORITHMS])
    args.out.parent.mkdir(parents=True, exist_ok=True)
    encoded = (json.dumps(document, ensure_ascii=False, indent=2, allow_nan=False) + '\n').encode('utf-8')
    args.out.write_bytes(gzip.compress(encoded, mtime=0) if args.out.suffix == '.gz' else encoded)
    if args.out == HERE / 'results.json.gz':
        summary = {key: value for key, value in document.items() if key != 'results'}
        summary['results'] = [{**{key: result[key] for key in ['algorithm', 'scenario', 'mode']},
                               'summary': {key: value for key, value in result['summary'].items() if key != 'traces'}}
                              for result in results]
        (HERE / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'已写入 {len(results)} 组实跑结果：{args.out}')


if __name__ == '__main__':
    main()
