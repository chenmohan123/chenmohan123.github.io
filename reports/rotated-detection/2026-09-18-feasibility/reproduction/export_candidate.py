"""旋转框可行性实验：官方网络输出类别分数与五参数框，宿主执行多边形恢复和NMS。"""
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
import traceback

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--upstream', type=Path, required=True)
parser.add_argument('--work', type=Path, required=True)
parser.add_argument('--candidate', required=True)
args = parser.parse_args()
work = args.work.resolve()
upstream = args.upstream.resolve()
report = Path(__file__).resolve().parents[1]
lock = json.loads((report / 'sources.lock.json').read_text(encoding='utf8'))
candidate = next(r for r in lock['candidates'] if r['id'] == args.candidate)
for item in lock['files']:
    assert hashlib.sha256((upstream / item['path']).read_bytes()).hexdigest() == item['sha256'], item['path']
weight = work / (args.candidate + '.pdparams')
assert hashlib.sha256(weight.read_bytes()).hexdigest() == candidate['sha256']
os.environ['MPLCONFIGDIR'] = str(work / 'matplotlib')
os.environ['OMP_NUM_THREADS'] = '4'
sys.path.insert(0, str(upstream))
import paddle
import paddle.jit.dy2static.utils as translator_utils
import onnx
from ppdet.core.workspace import load_config, create


def local_temp_dir():
    location = work / 'paddle-cache' / str(os.getpid())
    location.mkdir(parents=True, exist_ok=True)
    return str(location)


class RawRotated(paddle.nn.Layer):
    """保留官方backbone、neck及旋转框解码；未引入自定义推理算子。"""
    def __init__(self, original):
        super().__init__()
        self.original = original

    def forward(self, image):
        features = self.original.neck(self.original.backbone({'image': image}))
        return self.original.yolo_head(features)


def info(value):
    return {'name': value.name, 'shape': [d.dim_value or d.dim_param for d in value.type.tensor_type.shape.dim],
            'type': value.type.tensor_type.elem_type}


result = {'status': 'failed', 'verifiedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'candidate': args.candidate, 'upstreamRevision': lock['upstreamRevision'],
          'weightSha256': candidate['sha256'],
          'versions': {k: importlib.metadata.version(k) for k in ['paddlepaddle', 'paddle2onnx', 'onnx', 'onnxruntime', 'numpy']}}
try:
    translator_utils.get_temp_dir = local_temp_dir
    paddle.set_device('cpu')
    cfg = load_config(str(upstream / candidate['config']))
    model = create(cfg.architecture)
    state = paddle.load(str(weight))
    missing, unexpected = model.set_state_dict(state)
    allowed_missing = ['yolo_head.angle_proj_conv.weight'] if args.candidate.startswith('ppyoloe_r_') else []
    assert missing == allowed_missing and not unexpected, (missing, unexpected)
    if allowed_missing:
        import numpy as np
        projection = model.yolo_head.angle_proj_conv.weight.numpy().reshape(-1)
        expected = np.arange(91, dtype=np.float32) * np.float32(np.pi / 180)
        assert np.allclose(projection, expected, atol=3e-7, rtol=0), {'actual': projection.tolist(), 'expected': expected.tolist()}
        result['deterministicMissingBuffer'] = {'name': allowed_missing[0], 'reason': '官方构造器固定初始化0..90度弧度投影，不是未加载的训练参数', 'maxError': float(np.max(np.abs(projection - expected)))}
    model.eval()
    wrapper = RawRotated(model)
    wrapper.eval()
    spec = [paddle.static.InputSpec([1, 3, 1024, 1024], 'float32', 'image')]
    exported = work / args.candidate / 'exported'
    exported.mkdir(parents=True, exist_ok=True)
    static = paddle.jit.to_static(wrapper, input_spec=spec, full_graph=True)
    paddle.jit.save(static, str(exported / 'model'))
    output = work / args.candidate / 'model.onnx'
    command = [sys.executable, '-m', 'paddle2onnx.command', '--model_dir', str(exported),
               '--model_filename', 'model.pdmodel', '--params_filename', 'model.pdiparams',
               '--opset_version', '17', '--save_file', str(output)]
    conversion = subprocess.run(command, check=False, capture_output=True, text=True, encoding='utf8', errors='replace')
    (report / ('conversion-' + args.candidate + '.log')).write_text(conversion.stdout + conversion.stderr, encoding='utf8')
    conversion.check_returncode()
    graph = onnx.load(str(output))
    onnx.checker.check_model(graph)
    result.update({'status': 'converted',
                   'model': {'file': output.relative_to(work).as_posix(), 'bytes': output.stat().st_size,
                             'sha256': hashlib.sha256(output.read_bytes()).hexdigest()},
                   'trainableParameters': sum(p.numel().item() for p in model.parameters() if not p.stop_gradient),
                   'allParameterElements': sum(p.numel().item() for p in model.parameters()),
                   'opsets': [{'domain': p.domain, 'version': p.version} for p in graph.opset_import],
                   'operators': dict(Counter(n.domain + ':' + n.op_type for n in graph.graph.node)),
                   'inputs': [info(v) for v in graph.graph.input], 'outputs': [info(v) for v in graph.graph.output],
                   'scope': '单图1024x1024 FP32；原始分数和cx,cy,w,h,angle。后处理与浏览器兼容性另行验证。'})
except Exception:
    result['error'] = traceback.format_exc()
    raise
finally:
    (report / ('conversion-' + args.candidate + '.json')).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print(json.dumps(result, ensure_ascii=False), flush=True)
