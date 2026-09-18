"""固定旋转框可行性实验的上游源码、配置和两种官方权重。"""
import argparse
import datetime
import gzip
import hashlib
import json
from pathlib import Path
import zipfile
import requests
import yaml

REV = 'b25522a0f4bde8c80603f3ba5e3472059972e3b5'
ARCHIVE_SHA = 'd22c0e8777d749cb967cc71671d1357e1656c76db16f76578a4edb1454d027f6'
MODELS = {'ppyoloe_r_crn_s_3x_dota': 'ppyoloe_r', 'fcosr_x50_3x_dota': 'fcosr'}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, required=True)
    parser.add_argument('--work', type=Path, required=True)
    args = parser.parse_args()
    report = Path(__file__).resolve().parents[1]
    upstream = args.cache.resolve() / ('upstream/PaddleDetection-' + REV)
    archive = args.cache / 'downloads/paddledetection.zip'
    assert sha(archive.read_bytes()) == ARCHIVE_SHA, '源码ZIP摘要不符'
    verified = 0
    with zipfile.ZipFile(archive) as source:
        for entry in source.infolist():
            if not entry.is_dir():
                assert (upstream.parent / entry.filename).read_bytes() == source.read(entry), entry.filename
                verified += 1
    paths = {'LICENSE', 'configs/rotate/README.md', 'configs/rotate/tools/onnx_infer.py',
             'ppdet/modeling/heads/ppyoloe_r_head.py', 'ppdet/modeling/heads/fcosr_head.py',
             'ppdet/modeling/architectures/yolo.py', 'ppdet/modeling/layers.py',
             'ppdet/modeling/ops.py', 'ppdet/modeling/rbox_utils.py'}

    def collect(relative):
        if relative in paths:
            return
        paths.add(relative)
        node = yaml.compose((upstream / relative).read_text(encoding='utf8'))
        bases = next((v for k, v in node.value if k.value == '_BASE_'), None)
        for base in ([] if bases is None else [v.value for v in bases.value]):
            collect((upstream / relative).parent.joinpath(base).resolve().relative_to(upstream).as_posix())

    args.work.mkdir(parents=True, exist_ok=True)
    previous = report / 'sources.lock.json'
    old = json.loads(previous.read_text(encoding='utf8')) if previous.exists() else None
    rows = []
    for model, family in MODELS.items():
        doc = f'configs/rotate/{family}/README.md'
        paths.add(doc)
        collect(f'configs/rotate/{family}/{model}.yml')
        url = f'https://paddledet.bj.bcebos.com/models/{model}.pdparams'
        assert url in (upstream / doc).read_text(encoding='utf8'), model
        response = requests.head(url, allow_redirects=True, timeout=30)
        response.raise_for_status()
        weight = args.work / (model + '.pdparams')
        if not weight.exists():
            with requests.get(url, stream=True, timeout=(20, 60)) as response_get:
                response_get.raise_for_status()
                with weight.with_suffix('.part').open('wb') as target:
                    for chunk in response_get.iter_content(1024 * 1024):
                        target.write(chunk)
            weight.with_suffix('.part').rename(weight)
        row = {'id': model, 'config': f'configs/rotate/{family}/{model}.yml', 'url': url,
               'status': response.status_code, 'bytes': int(response.headers['Content-Length']),
               'etag': response.headers.get('ETag'), 'lastModified': response.headers.get('Last-Modified'),
               'sha256': sha(weight.read_bytes()),
               'availableConfigurations': sorted(p.name for p in (upstream / f'configs/rotate/{family}').glob('*.yml'))}
        assert weight.stat().st_size == row['bytes']
        if old:
            assert next(r for r in old['candidates'] if r['id'] == model)['sha256'] == row['sha256']
        rows.append(row)
        print(json.dumps(row), flush=True)
    files = []
    for relative in sorted(paths):
        data = (upstream / relative).read_bytes()
        snapshot = report / 'upstream' / (relative + '.gz')
        snapshot.parent.mkdir(parents=True, exist_ok=True)
        snapshot.write_bytes(gzip.compress(data, mtime=0))
        files.append({'path': relative, 'bytes': len(data), 'sha256': sha(data),
                      'snapshot': snapshot.relative_to(report).as_posix(),
                      'url': f'https://github.com/PaddlePaddle/PaddleDetection/blob/{REV}/{relative}'})
    lock = {'verifiedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'upstreamRevision': REV, 'archiveSha256': ARCHIVE_SHA,
            'archiveUrl': f'https://github.com/PaddlePaddle/PaddleDetection/archive/{REV}.zip',
            'extractedFilesVerified': verified, 'files': files, 'candidates': rows,
            'license': {'sourceRepository': 'Apache-2.0', 'weightLinkedByOfficialReadme': True,
                        'separateWeightLicenseFoundInReviewedFiles': False,
                        'scope': '以固定上游Apache-2.0项目声明和官方权重表为采用依据；独立权重文本缺失是解释边界，不增加额外授权门槛。'}}
    previous.write_text(json.dumps(lock, ensure_ascii=False, indent=2) + '\n', encoding='utf8')


if __name__ == '__main__':
    main()
