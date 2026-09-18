"""下载固定参考文件至忽略缓存；仅提交哈希清单，不分发上游代码。"""
import argparse
import hashlib
import json
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
CACHE = ROOT / '.tmp/tracking-reference'
SPECS = [
    ('byte', 'ifzhang/ByteTrack', 'd1bf0191adff59bc8fcfeaa0b33d3d1642552a99', [
        'LICENSE', 'yolox/tracker/byte_tracker.py', 'yolox/tracker/basetrack.py',
        'yolox/tracker/kalman_filter.py', 'yolox/tracker/matching.py']),
    ('oc', 'noahcao/OC_SORT', '8462e7e729a93ccd3bd995c0a79a890336cb3a0b', [
        'LICENSE', 'trackers/ocsort_tracker/ocsort.py',
        'trackers/ocsort_tracker/association.py', 'trackers/ocsort_tracker/kalmanfilter.py']),
    ('paddle', 'PaddlePaddle/PaddleDetection', 'b25522a0f4bde8c80603f3ba5e3472059972e3b5', [
        'LICENSE'] + ['deploy/pptracking/python/mot/' + name for name in [
            'tracker/jde_tracker.py', 'tracker/base_jde_tracker.py', 'tracker/ocsort_tracker.py',
            'motion/kalman_filter.py', 'motion/ocsort_kalman_filter.py',
            'matching/jde_matching.py', 'matching/ocsort_matching.py']]),
    ('sort', 'abewley/sort', '2236dff5019565958b84df7d871d41cc1db58ac7', ['LICENSE', 'sort.py']),
    ('deep', 'nwojke/deep_sort', 'f08cf1dc470eeb1cd2add1cbf077d95ac6c48aab', ['LICENSE', 'deep_sort/kalman_filter.py']),
]


def prepare(create_lock=False):
    if create_lock:
        entries = [dict(folder=folder, repository=repo, revision=rev, path=path,
                        url=f'https://raw.githubusercontent.com/{repo}/{rev}/{path}')
                   for folder, repo, rev, paths in SPECS for path in paths]
    else:
        entries = json.loads((HERE / 'sources.lock.json').read_text(encoding='utf-8'))
    for entry in entries:
        target = CACHE / entry['folder'] / entry['path']
        data = target.read_bytes() if target.exists() else urllib.request.urlopen(entry['url'], timeout=60).read()
        digest = hashlib.sha256(data).hexdigest()
        if not create_lock and (digest != entry['sha256'] or len(data) != entry['bytes']):
            raise ValueError(f"源码哈希不符：{entry['path']}")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        entry.update(sha256=digest, bytes=len(data))
    if create_lock:
        (HERE / 'sources.lock.json').write_text(json.dumps(entries, indent=2) + '\n', encoding='utf-8')
    print(f'已校验 {len(entries)} 个固定源码/许可文件；缓存不进入提交。')
    return CACHE


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--create-lock', action='store_true', help='仅首次建立证据时使用；重跑不得重建锁')
    prepare(parser.parse_args().create_lock)
