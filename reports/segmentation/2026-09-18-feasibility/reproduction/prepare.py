"""实例分割选型实验：固定上游来源，仅下载PP-YOLOE_seg_s供本地评估。"""
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
MODELS = {
    'ppyoloe_seg_s_80e_coco': 'ppyoloe_seg',
    'solov2_r50_fpn_1x_coco': 'solov2',
    'solov2_r50_enhance_coco': 'solov2',
    'mask_rcnn_r50_fpn_1x_coco': 'mask_rcnn',
    'mask_rtdetr_hgnetv2_s_6x_coco': 'mask_rtdetr',
}


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
    paths = {'LICENSE', 'README.md', 'deploy/EXPORT_ONNX_MODEL.md',
             'ppdet/modeling/heads/ppyoloe_ins_head.py', 'ppdet/modeling/heads/solov2_head.py',
             'ppdet/modeling/architectures/ppyoloe.py', 'ppdet/modeling/post_process.py',
             'ppdet/modeling/layers.py', 'ppdet/modeling/transformers/mask_rtdetr_transformer.py'}

    def collect(relative):
        if relative in paths:
            return
        paths.add(relative)
        node = yaml.compose((upstream / relative).read_text(encoding='utf8'))
        bases = next((v for k, v in node.value if k.value == '_BASE_'), None)
        for base in ([] if bases is None else [v.value for v in bases.value]):
            collect((upstream / relative).parent.joinpath(base).resolve().relative_to(upstream).as_posix())

    rows = []
    for model, family in MODELS.items():
        doc = f'configs/{family}/README.md'
        paths.add(doc)
        collect(f'configs/{family}/{model}.yml')
        url = f'https://paddledet.bj.bcebos.com/models/{model}.pdparams'
        assert url in (upstream / doc).read_text(encoding='utf8'), model
        response = requests.head(url, allow_redirects=True, timeout=30)
        response.raise_for_status()
        rows.append({'id': model, 'url': url, 'status': response.status_code,
                     'bytes': int(response.headers['Content-Length']),
                     'etag': response.headers.get('ETag'),
                     'lastModified': response.headers.get('Last-Modified')})
    args.work.mkdir(parents=True, exist_ok=True)
    weight = args.work / 'ppyoloe_seg_s_80e_coco.pdparams'
    previous = report / 'sources.lock.json'
    if not weight.exists():
        with requests.get(rows[0]['url'], stream=True, timeout=(20, 60)) as response:
            response.raise_for_status()
            with weight.with_suffix('.part').open('wb') as target:
                for chunk in response.iter_content(1024 * 1024):
                    target.write(chunk)
        weight.with_suffix('.part').rename(weight)
    identity = {'url': rows[0]['url'], 'bytes': weight.stat().st_size, 'sha256': sha(weight.read_bytes())}
    assert identity['bytes'] == rows[0]['bytes']
    if previous.exists():
        assert json.loads(previous.read_text(encoding='utf8'))['weight'] == identity, '已固定权重发生变化'
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
            'extractedFilesVerified': verified, 'files': files, 'candidates': rows, 'weight': identity,
            'license': {'sourceRepository': 'Apache-2.0', 'weightLinkedByOfficialReadme': True,
                        'separateWeightLicenseFoundInReviewedFiles': False,
                        'scope': '本轮仅本地评估；发布前保留上游许可和转换归因，核验双源模型卡与再分发信息。'}}
    previous.write_text(json.dumps(lock, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print(json.dumps({'verifiedFiles': verified, 'sourceSnapshots': len(files), 'weight': identity}, ensure_ascii=False))


if __name__ == '__main__':
    main()
