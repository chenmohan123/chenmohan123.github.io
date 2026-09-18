"""生成自建确定性检测序列；subject 只供评分，不传入参考算法。"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent


def detection(subject, x, score=0.9, cls=0):
    return dict(subject=subject, class_id=cls, score=score, box=[x, 20, x + 30, 80])


def frame(index, detections, ambiguous=False):
    return dict(frame_index=index, timestamp_ms=round(index * 1000 / 30, 6),
                detections=detections, ambiguous=ambiguous)


def generate():
    scenes = []
    def add(name, frames, note):
        scenes.append(dict(name=name, note=note, frames=frames))
    add('translation', [frame(i, [detection('A', 10 + 2*i)]) for i in range(12)], '匀速平移')
    add('low_score', [frame(i, [detection('A', 10 + 2*i, 0.2 if 3 <= i <= 5 else 0.9)]) for i in range(10)], '低分检测仍传入')
    add('filtered_low_score', [frame(i, [] if 3 <= i <= 5 else [detection('A', 10 + 2*i)]) for i in range(10)], '调用者过滤低分后信息无法找回')
    add('short_occlusion', [frame(i, [] if 4 <= i <= 6 else [detection('A', 10 + 2*i)]) for i in range(12)], '三次空更新后同目标恢复')
    add('long_loss', [frame(i, [] if 4 <= i <= 13 else [detection('A', 10)]) for i in range(19)], '丢失十次，超过本实验五帧保留期')
    add('crossing', [frame(i, [detection('A', 10 + 5*i), detection('B', 110 - 5*i)], i == 10) for i in range(21)], '交叉完全重叠帧不评分')
    add('ambiguous_bounce', [frame(i, [detection('A', 10 + 5*min(i, 20-i)), detection('B', 110 - 5*min(i, 20-i))], i == 10) for i in range(21)], '相遇后掉头；无外观信息存在不可辨识性')
    add('multi_class', [frame(i, [detection('A', 10, cls=0)] if i < 5 else [detection('B', 10, cls=1)]) for i in range(10)], '同位置先后出现不同类别，诊断跨类ID复用')
    add('sparse_gap', [frame(i, [detection('A', 10)]) for i in [0, 1, 2, 20, 21, 22]], '时间戳跳过十七帧；原生与补空更新分别运行')
    add('score_boundary', [frame(i, [detection('A', 10, score)]) for i, score in enumerate([0.9, 0.5, 0.1, 0.100001, 0.499999, 0.500001, 0.6, 0.9])], '显式检测严格阈值边界')
    return scenes


if __name__ == '__main__':
    (HERE / 'inputs.json').write_text(json.dumps(generate(), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
