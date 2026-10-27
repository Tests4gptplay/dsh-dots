"""Enable Dots-only persistent storage in DSH Desktop's browser guest allocator.
Usage: python enable-desktop-persistence.py <resources/app.asar>
Creates an untouched archive backup. Restart Desktop after applying.
"""
import hashlib
import json
import os
from pathlib import Path
import shutil
import struct
import sys

OLD = 'partition = `dsh-sidebar-browser-${randomUUID()}`;'
NEW = 'partition = workspace === "dsh-dots:personal-browser" ? "persist:dsh-dots-personal-browser" : `dsh-sidebar-browser-${randomUUID()}`;'

def change_source(source):
    start = source.index('var DesktopBrowserGuests = class')
    end = source.index('//#endregion', start)
    segment = source[start:end]
    if NEW in segment:
        return source
    if segment.count(OLD) != 1:
        raise RuntimeError('Desktop browser allocator has changed; no archive was modified.')
    return source[:start] + segment.replace(OLD, NEW, 1) + source[end:]

def copy_range(source, target, start, length):
    source.seek(start)
    while length:
        data = source.read(min(length, 1024 * 1024))
        if not data:
            raise EOFError('Truncated source archive')
        target.write(data)
        length -= len(data)

def apply(path):
    path = Path(path).resolve(strict=True)
    with path.open('rb') as f:
        _, header_size, _, json_size = struct.unpack('<4I', f.read(16))
        header = json.loads(f.read(json_size))
        base = 8 + header_size
        entry = header['files']['lib']['files']['main.js']
        offset, size = int(entry['offset']), entry['size']
        f.seek(base + offset)
        before = f.read(size)
    after = change_source(before.decode('utf-8')).encode('utf-8')
    if after == before:
        print('Dots persistent partition is already enabled.')
        return
    delta = len(after) - size
    def shift(node):
        for child in node.get('files', {}).values():
            if 'files' in child:
                shift(child)
            elif 'offset' in child and int(child['offset']) > offset:
                child['offset'] = str(int(child['offset']) + delta)
    shift(header)
    entry['size'] = len(after)
    if 'integrity' in entry:
        integrity = entry['integrity']
        block_size = integrity['blockSize']
        integrity['hash'] = hashlib.sha256(after).hexdigest()
        integrity['blocks'] = [hashlib.sha256(after[i:i+block_size]).hexdigest() for i in range(0, len(after), block_size)]
    encoded = json.dumps(header, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    padded = (len(encoded) + 3) & ~3
    prefix = struct.pack('<4I', 4, 8 + padded, 4 + padded, len(encoded)) + encoded + bytes(padded-len(encoded))
    backup = path.with_name(path.name + '.before-dots-1.0.4')
    if backup.exists():
        raise FileExistsError(f'Backup already exists: {backup}. Inspect it before another update.')
    shutil.copy2(path, backup)
    temporary = path.with_name(path.name + '.dots-1.0.4.tmp')
    with path.open('rb') as source, temporary.open('xb') as target:
        target.write(prefix)
        copy_range(source, target, base, offset)
        target.write(after)
        remaining_start = base + offset + size
        copy_range(source, target, remaining_start, path.stat().st_size - remaining_start)
        target.flush()
        os.fsync(target.fileno())
    with temporary.open('rb') as f:
        f.seek(len(prefix) + offset)
        if f.read(len(after)) != after:
            raise RuntimeError('Written main module differs; original archive left unchanged.')
    os.replace(temporary, path)
    print(f'Applied Dots-only persistent partition. Backup: {backup}')
    print('Restart DSH Desktop to load the change.')

if __name__ == '__main__':
    apply(sys.argv[1])
