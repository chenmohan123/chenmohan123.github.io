"""初次封存证据摘要；重跑使用verify.py，不能重新封存来掩盖差异。"""
import hashlib
import json
from prepare_sources import HERE

FILES = ['.gitattributes', 'prepare_sources.py', 'generate_inputs.py', 'run.py', 'verify.py', 'analyze_sources.py',
         'seal_evidence.py', 'sources.lock.json', 'requirements.lock.txt', 'inputs.json',
         'results.json.gz', 'summary.json', 'source-analysis.json']

if __name__ == '__main__':
    entries = {name: dict(bytes=len(data := (HERE / name).read_bytes()), sha256=hashlib.sha256(data).hexdigest()) for name in FILES}
    (HERE / 'evidence.lock.json').write_text(json.dumps(entries, indent=2) + '\n', encoding='utf-8')
