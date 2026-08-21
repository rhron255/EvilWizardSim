import re

files = [
    'src/content/offers/any.ts',
    'src/content/offers/ascent.ts',
    'src/content/offers/decline.ts',
    'src/content/offers/scripted.ts',
]
BODY = re.compile(r'body: ("[^"]*"|\'(?:[^\'\\]|\\.)*\')')
for f in files:
    src = open(f, encoding='utf-8').read()
    blocks = re.split(r'\n  \{\n', src)
    for b in blocks[1:]:
        mid = re.search(r"id: '([^']+)'", b)
        if not mid:
            continue
        oid = mid.group(1)
        mb = BODY.search(b)
        body = mb.group(1) if mb else ''
        req = re.search(r'requires: \[(.*?)\]\,', b, re.S)
        reqs = req.group(1) if req else ''
        flags = []
        if re.search(r'apprentice', body, re.I) and 'minApprentices' not in reqs:
            flags.append('APPRENTICE')
        if re.search(r'household|servants|your people|followers|congregation', body, re.I) and 'minFollowers' not in reqs:
            flags.append('FOLLOWERS')
        if re.search(r'\brelic|artifact|vault\b|collection', body, re.I) and 'Artifact' not in reqs:
            flags.append('RELIC')
        if flags:
            print(f, oid, flags)
            print('     ', body[:160])
