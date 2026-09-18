"""固定实验用成熟多边形裁剪库，并生成与Shapely独立对照的几何样例。"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import tarfile
import math
import requests
from shapely.geometry import Polygon

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--work', type=Path, required=True)
args = parser.parse_args()
work = args.work.resolve()
report = Path(__file__).resolve().parents[1]
url = 'https://registry.npmjs.org/polygon-clipping/-/polygon-clipping-0.15.7.tgz'
response = requests.get(url, timeout=30)
response.raise_for_status()
archive_hash = hashlib.sha256(response.content).hexdigest()
with tarfile.open(fileobj=io.BytesIO(response.content), mode='r:gz') as archive:
    data = archive.extractfile('package/dist/polygon-clipping.umd.min.js').read()
    license_text = archive.extractfile('package/LICENSE.md').read().decode('utf8')
identity = {'name': 'polygon-clipping', 'version': '0.15.7', 'url': url,
            'archiveSha256': archive_hash, 'file': 'polygon-clipping.umd.min.js',
            'sha256': hashlib.sha256(data).hexdigest(), 'license': 'MIT'}
lock = report / 'geometry-dependency.lock.json'
if lock.exists():
    assert json.loads(lock.read_text(encoding='utf8')) == identity
work.mkdir(parents=True, exist_ok=True)
(work / identity['file']).write_bytes(data)
lock.write_text(json.dumps(identity, indent=2) + '\n', encoding='utf8')
(report / 'geometry-dependency-LICENSE.txt').write_text(license_text, encoding='utf8')


def corners(box):
    x, y, w, h, angle = box
    matrix = [[math.cos(angle), -math.sin(angle)], [math.sin(angle), math.cos(angle)]]
    return [[x + matrix[0][0] * a + matrix[0][1] * b,
             y + matrix[1][0] * a + matrix[1][1] * b]
            for a, b in [(w / 2, h / 2), (-w / 2, h / 2), (-w / 2, -h / 2), (w / 2, -h / 2)]]


anchor = [100., 100., 80., 20., 0.]
tests = [('identical', anchor, anchor), ('disjoint', anchor, [300., 100., 80., 20., 0.]),
         ('touching', anchor, [180., 100., 80., 20., 0.]),
         ('perpendicular', anchor, [100., 100., 80., 20., math.pi / 2]),
         ('rotated', anchor, [100., 100., 80., 20., math.pi / 4]),
         ('negative-angle', anchor, [100., 100., 80., 20., -math.pi / 4]),
         ('half-turn', anchor, [100., 100., 80., 20., math.pi]),
         ('near-zero', anchor, [100., 100., 80., 20., 1e-8]),
         ('degenerate', anchor, [100., 100., 0., 20., 0.])]
fixtures = []
for name, first, second in tests:
    a, b = corners(first), corners(second)
    pa, pb = Polygon(a), Polygon(b)
    intersection = pa.intersection(pb).area
    fixtures.append({'id': name, 'boxes': [first, second], 'polygons': [a, b],
                     'iou': intersection / (pa.area + pb.area - intersection)})
(report / 'geometry-fixtures.json').write_text(json.dumps(fixtures, indent=2) + '\n', encoding='utf8')
print(json.dumps(identity))
