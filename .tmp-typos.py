import re, glob

files = sorted(set(
    glob.glob('src/content/**/*.ts', recursive=True) +
    glob.glob('src/components/**/*.ts', recursive=True) +
    glob.glob('src/components/**/*.tsx', recursive=True) +
    glob.glob('src/screens/**/*.tsx', recursive=True) +
    glob.glob('src/engine/*.ts')
))
dbl = re.compile(r'\b(\w+)\s+\1\b', re.I)
spaces = re.compile(r'[a-z,.]  +[A-Za-z]')
for f in files:
    if '__fixtures__' in f or '.test.' in f:
        continue
    for i, l in enumerate(open(f, encoding='utf-8').read().split('\n'), 1):
        s = l.strip()
        if s.startswith('*') or s.startswith('//') or s.startswith('/*'):
            continue
        m = dbl.search(l)
        if m and m.group(1).lower() not in ('that', 'had'):
            print('DOUBLE', f + ':' + str(i), m.group(0), '|', s[:100])
        if spaces.search(l):
            print('SPACES', f + ':' + str(i), s[:100])
