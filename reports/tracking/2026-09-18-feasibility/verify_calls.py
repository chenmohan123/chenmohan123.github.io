"""独立核验每次真实update的覆盖与补空统计，不导入运行器的构造逻辑。"""
import argparse
import copy
import gzip
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent


def verify_call_records(evidence, scenes):
    total_calls, total_padding = 0, 0
    for result in evidence['results']:
        assert 'call_records' in result, '缺少逐次调用记录'
        records = result['call_records']
        scene = next(s for s in scenes if s['name'] == result['scenario'])
        classes = sorted({d['class_id'] for f in scene['frames'] for d in f['detections']}) if result['mode'] == 'class_isolated' else [None]
        expected = []
        for cls in classes:
            previous, group_step = -1, 0
            for source in scene['frames']:
                indices = range(previous + 1, source['frame_index'] + 1) if result['mode'] == 'pad_empty' else [source['frame_index']]
                for index in indices:
                    padding = index != source['frame_index']
                    detections = [] if padding else [d for d in source['detections'] if cls is None or d['class_id'] == cls]
                    paddle = result['algorithm'].startswith('paddle')
                    values = [[d['class_id'], d['score'], *d['box']] if paddle else [*d['box'], d['score']] for d in detections]
                    group_step += 1
                    expected.append(dict(call_index=len(expected) + 1, group_call_index=group_step,
                                         frame_index=index, source_frame_index=source['frame_index'],
                                         is_padding=padding, class_group=cls,
                                         input=dict(shape=[len(values), 6 if paddle else 5], dtype='float64', values=values)))
                previous = source['frame_index']
        assert len(records) == len(expected) == result['summary']['calls'], '调用数量不完整'
        for record, item in zip(records, expected):
            assert {key: record[key] for key in item} == item, '调用序号、源帧、补空标记、类别或实际输入不符'
            assert isinstance(record['outputs'], list) and isinstance(record['state'], dict), '缺少调用输出/状态'
            expected_state_keys = {'tracked', 'lost', 'removed'} if result['algorithm'] in ['byte', 'paddle_byte'] else {'retained'}
            assert record['state'].keys() == expected_state_keys, '调用状态字段不完整'
            assert record['update_ms'] >= 0
        for frame in result['frames']:
            attached = [r for r in records if r['source_frame_index'] == frame['frame_index']]
            source_calls = [r for r in attached if not r['is_padding']]
            assert len(source_calls) == len(classes)
            assert frame['padded_updates'] == sum(r['is_padding'] for r in attached)
            assert frame['update_ms'] == [r['update_ms'] for r in attached]
            assert frame['states'] == [dict(class_id=r['class_group'], state=r['state']) for r in source_calls]
            outputs = []
            for record in source_calls:
                rows = copy.deepcopy(record['outputs'])
                if record['class_group'] is not None:
                    for row in rows:
                        row.update(id=f'c{record["class_group"]}:{row["id"]}', class_id=record['class_group'])
                outputs.extend(rows)
            assert outputs == frame['outputs'], '源帧聚合与原始调用输出不一致'
        padding_records = [r for r in records if r['is_padding']]
        padding_stats = dict(calls=len(padding_records), empty_input_calls=sum(not r['input']['values'] for r in padding_records),
                             output_count=sum(len(r['outputs']) for r in padding_records))
        assert result['summary']['padding'] == padding_stats, '补空摘要与逐次调用不一致'
        assert padding_stats['calls'] == padding_stats['empty_input_calls']
        assert padding_stats['output_count'] == 0, '本批参考补空应无观测输出，不能由源帧指标代替'
        if result['mode'] == 'pad_empty':
            assert [r['frame_index'] for r in records] == list(range(23)), '稀疏补空帧序必须连续'
            assert [r['frame_index'] for r in padding_records] == list(range(3, 20))
            assert all(r['source_frame_index'] == 20 and r['class_group'] is None for r in padding_records)
        if result['algorithm'] == 'byte' and result['mode'] == 'pad_empty':
            states = {r['frame_index']: r['state'] for r in padding_records}
            assert states[3] == states[7] == dict(tracked=[], lost=[1], removed=[])
            assert states[8] == dict(tracked=[], lost=[1], removed=[1])
            assert states[9] == dict(tracked=[], lost=[], removed=[1, 1]), '必须保留原始removed重复项'
        total_calls += len(records)
        total_padding += len(padding_records)
    assert total_calls == 860 and total_padding == 85
    return dict(calls=total_calls, padding_calls=total_padding, source_calls=total_calls-total_padding)


def negative_checks(evidence, scenes):
    # 用不同错误证明校验拒绝不完整证据，不改变封存文件或参考算法。
    for fault in ['missing', 'index', 'input', 'output', 'deduplicate']:
        changed = copy.deepcopy(evidence)
        result = next(r for r in changed['results'] if r['algorithm'] == 'byte' and r['mode'] == 'pad_empty')
        record = next(r for r in result['call_records'] if r['is_padding'] and r['frame_index'] == 9)
        if fault == 'missing':
            result['call_records'].remove(record)
        elif fault == 'index':
            record['frame_index'] = 8
        elif fault == 'input':
            record['input']['values'] = [[0, 0, 1, 1, 0.9]]
        elif fault == 'output':
            record['outputs'] = [dict(id='伪造观测')]
        else:
            record['state']['removed'] = [1]
        try:
            verify_call_records(changed, scenes)
        except AssertionError:
            continue
        raise AssertionError(f'污染证据未被拒绝：{fault}')
    return 5


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--negative-checks', action='store_true')
    args = parser.parse_args()
    evidence = json.loads(gzip.decompress((HERE / 'results.json.gz').read_bytes()))
    scenes = json.loads((HERE / 'inputs.json').read_text(encoding='utf-8'))
    print('逐次覆盖校验通过：' + str(verify_call_records(evidence, scenes)))
    if args.negative_checks:
        print(f'污染负例全部被拒绝：{negative_checks(evidence, scenes)}项')
