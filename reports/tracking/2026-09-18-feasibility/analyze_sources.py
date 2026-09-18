"""记录来源线索与依赖元数据；文本相似不构成法律判断。"""
import difflib
import hashlib
import importlib.metadata
import json
from prepare_sources import HERE, prepare


def analyze():
    cache = prepare()
    read = lambda path: (cache / path).read_text(encoding='utf-8')
    byte = read('byte/yolox/tracker/kalman_filter.py').splitlines()
    deep = read('deep/deep_sort/kalman_filter.py').splitlines()
    blocks = difflib.SequenceMatcher(None, byte, deep, autojunk=False).get_matching_blocks()
    def license_files(name):
        distribution = importlib.metadata.distribution(name)
        records = []
        for path in distribution.files or []:
            if '.dist-info/' not in str(path).replace('\\', '/') or not path.name.upper().startswith('LICENSE'):
                continue
            data = distribution.locate_file(path).read_bytes()
            text = data.decode('utf-8', errors='replace')
            records.append(dict(path=str(path), bytes=len(data), sha256=hashlib.sha256(data).hexdigest(),
                                opening=text[:180], mentions_faster_rcnn='Faster R-CNN' in text,
                                mentions_mit='MIT' in text, mentions_caffe='Caffe' in text))
        return records
    return dict(
        byte_deep_kalman_comparison=dict(byte_lines=len(byte), deep_lines=len(deep),
                                         identical_ordered_lines=sum(block.size for block in blocks),
                                         method='difflib.SequenceMatcher，autojunk=False，含空行与注释'),
        source_indicators=dict(
            byte_root_mit='MIT License' in read('byte/LICENSE'),
            oc_root_mit='MIT License' in read('oc/LICENSE'),
            sort_root_gpl3='GNU GENERAL PUBLIC LICENSE' in read('sort/LICENSE'),
            deep_root_gpl3='GNU GENERAL PUBLIC LICENSE' in read('deep/LICENSE'),
            oc_adopted_from_sort='adopted from the SORT' in read('oc/trackers/ocsort_tracker/ocsort.py'),
            paddle_kalman_links_deep_sort='github.com/nwojke/deep_sort' in read('paddle/deploy/pptracking/python/mot/motion/kalman_filter.py'),
            paddle_oc_links_ocsort='github.com/noahcao/OC_SORT' in read('paddle/deploy/pptracking/python/mot/tracker/ocsort_tracker.py')),
        dependencies={name: dict(version=importlib.metadata.version(name),
                                license_metadata_start=importlib.metadata.metadata(name).get('License', '未声明')[:240],
                                license_expression=importlib.metadata.metadata(name).get('License-Expression'),
                                installed_license_files=license_files(name),
                                classifiers=[c for c in importlib.metadata.metadata(name).get_all('Classifier', []) if c.startswith('License')])
                      for name in ['numpy', 'scipy', 'lap', 'cython_bbox', 'filterpy', 'torch', 'opencv-python']},
        limitation='只核对固定文件和已安装包元数据，未完成全部传递依赖/贡献历史法律审查；本轮不再分发上游源码。')


if __name__ == '__main__':
    (HERE / 'source-analysis.json').write_text(json.dumps(analyze(), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
