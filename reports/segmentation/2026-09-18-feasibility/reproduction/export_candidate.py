"""选型实验导出：保留原始分割头，NMS与mask恢复独立核对；不是SDK实现。"""
import argparse
from collections import Counter
import datetime
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import subprocess
import sys

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--upstream', type=Path, required=True)
parser.add_argument('--work', type=Path, required=True)
args = parser.parse_args()
work = args.work.resolve()
upstream = args.upstream.resolve()
report = Path(__file__).resolve().parents[1]
lock = json.loads((report / 'sources.lock.json').read_text(encoding='utf8'))
for item in lock['files']:
    assert hashlib.sha256((upstream / item['path']).read_bytes()).hexdigest() == item['sha256'], item['path']
weight = work / 'ppyoloe_seg_s_80e_coco.pdparams'
assert hashlib.sha256(weight.read_bytes()).hexdigest() == lock['weight']['sha256']
os.environ['MPLCONFIGDIR'] = str(work / 'matplotlib')
os.environ['OMP_NUM_THREADS'] = '4'
sys.path.insert(0, str(upstream))
import paddle
import paddle.jit.dy2static.utils as translator_utils
import onnx
from ppdet.core.workspace import load_config, create
from ppdet.modeling.bbox_utils import batch_distance2bbox


def local_temp_dir():
    location = work / 'paddle-cache' / str(os.getpid())
    location.mkdir(parents=True, exist_ok=True)
    return str(location)


translator_utils.get_temp_dir = local_temp_dir
paddle.set_device('cpu')
cfg = load_config(str(upstream / 'configs/ppyoloe_seg/ppyoloe_seg_s_80e_coco.yml'))
model = create(cfg.architecture)
state = paddle.load(str(weight))
missing, unexpected = model.set_state_dict(state)
assert not missing and not unexpected, (missing, unexpected)
model.eval()


class RawSegmentation(paddle.nn.Layer):
    """复用官方backbone/neck/head及框解码，不包含动态NMS和原图mask粘贴。"""
    def __init__(self, original):
        super().__init__()
        self.original = original

    def forward(self, image):
        features = self.original.neck(self.original.backbone({'image': image}))
        scores, distances, coefficients, prototypes, anchors, strides = self.original.yolo_head(features)
        boxes = batch_distance2bbox(anchors, distances) * strides
        return boxes, scores, coefficients, prototypes


wrapper = RawSegmentation(model)
wrapper.eval()
spec = [paddle.static.InputSpec([1, 3, 640, 640], 'float32', 'image')]
exported = work / 'exported'
exported.mkdir(exist_ok=True)
static = paddle.jit.to_static(wrapper, input_spec=spec, full_graph=True)
paddle.jit.save(static, str(exported / 'model'))
output = work / 'ppyoloe-seg-s-640-fp32.onnx'
command = [sys.executable, '-m', 'paddle2onnx.command', '--model_dir', str(exported),
           '--model_filename', 'model.pdmodel', '--params_filename', 'model.pdiparams',
           '--opset_version', '17', '--save_file', str(output)]
print(json.dumps(command), flush=True)
subprocess.run(command, check=True)
graph = onnx.load(str(output))
onnx.checker.check_model(graph)


def info(value):
    return {'name': value.name, 'shape': [d.dim_value or d.dim_param for d in value.type.tensor_type.shape.dim],
            'type': value.type.tensor_type.elem_type}


result = {'verifiedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'upstreamRevision': lock['upstreamRevision'], 'weightSha256': lock['weight']['sha256'],
          'model': {'file': output.name, 'bytes': output.stat().st_size,
                    'sha256': hashlib.sha256(output.read_bytes()).hexdigest()},
          'versions': {k: importlib.metadata.version(k) for k in ['paddlepaddle', 'paddle2onnx', 'onnx', 'onnxruntime', 'numpy']},
          'trainableParameters': sum(p.numel().item() for p in model.parameters() if not p.stop_gradient),
          'allParameterElements': sum(p.numel().item() for p in model.parameters()),
          'opsets': [{'domain': p.domain, 'version': p.version} for p in graph.opset_import],
          'operators': dict(Counter(n.domain + ':' + n.op_type for n in graph.graph.node)),
          'inputs': [info(v) for v in graph.graph.input], 'outputs': [info(v) for v in graph.graph.output],
          'scope': '单图640×640 FP32原始分割头；NMS与原图mask恢复须由宿主实现并与官方后处理核对。'}
(report / 'conversion.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
print(json.dumps(result, ensure_ascii=False), flush=True)
