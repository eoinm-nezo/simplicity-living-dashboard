"""OpenStudio .osm -> compact geometry JSON for the Simplicity 3D viewer.

Reads OS:Space, OS:Surface and OS:SubSurface, transforms each surface's
vertices out of its space's local frame into world coordinates, and writes
polygon loops (not triangles) so the browser can triangulate and outline them.

Usage:
    python tools/osm2json.py "<model.osm>" assets/models/<name>.json "<Display Name>"
"""
import io, json, math, re, sys, os


def parse_objects(text):
    """Yield (type, [field, ...]) for every object in an .osm file."""
    # Objects are separated by blank lines and terminated with ';'
    for chunk in re.split(r'\n\s*\n', text):
        chunk = chunk.strip()
        if not chunk or chunk.startswith('!'):
            continue
        lines = []
        for ln in chunk.split('\n'):
            ln = ln.split('!-')[0].strip()          # strip trailing field comments
            if ln:
                lines.append(ln)
        if not lines:
            continue
        body = ' '.join(lines).rstrip(';')
        parts = [p.strip() for p in body.split(',')]
        if not parts:
            continue
        yield parts[0], parts[1:]


def to_f(v, default=0.0):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def convert(osm_path, name):
    text = io.open(osm_path, encoding='utf-8', errors='replace').read()

    spaces = {}          # handle -> dict
    space_order = []
    surfaces = []
    subsurfaces = []
    surf_handle_to_space = {}

    for otype, f in parse_objects(text):
        if otype == 'OS:Space' and len(f) >= 9:
            # 0 handle, 1 name, 2 space type, 3 construction set, 4 schedule set,
            # 5 direction of relative north, 6/7/8 X/Y/Z origin
            spaces[f[0]] = {
                'name': f[1] or f[0],
                'north': to_f(f[5]),
                'ox': to_f(f[6]), 'oy': to_f(f[7]), 'oz': to_f(f[8]),
                'idx': len(space_order),
            }
            space_order.append(f[0])

        elif otype == 'OS:Surface' and len(f) >= 11:
            # 0 handle, 1 name, 2 surface type, 3 construction, 4 space handle,
            # 5 outside boundary condition, 6 obc object, 7 sun, 8 wind,
            # 9 view factor, 10 number of vertices, 11.. vertices
            surf_handle_to_space[f[0]] = f[4]
            verts = [to_f(x) for x in f[11:] if x != '']
            if len(verts) >= 9:
                surfaces.append({'space': f[4], 'type': f[2] or 'Wall',
                                 'bc': f[5] or 'Outdoors', 'v': verts})

        elif otype == 'OS:SubSurface' and len(f) >= 10:
            # 0 handle, 1 name, 2 sub surface type, 3 construction,
            # 4 parent surface handle, 5 outside boundary object, 6 view factor,
            # 7 frame & divider, 8 multiplier, 9 number of vertices, 10.. verts
            verts = [to_f(x) for x in f[10:] if x != '']
            if len(verts) >= 9:
                subsurfaces.append({'surface': f[4], 'type': f[2] or 'FixedWindow',
                                    'v': verts})

    def world(space_handle, verts):
        """Space-local -> world: rotate by relative north, then translate."""
        sp = spaces.get(space_handle)
        if sp is None:
            return None
        a = math.radians(-sp['north'])          # relative north is clockwise
        ca, sa = math.cos(a), math.sin(a)
        out = []
        for i in range(0, len(verts) - 2, 3):
            x, y, z = verts[i], verts[i + 1], verts[i + 2]
            out.extend((round(x * ca - y * sa + sp['ox'], 3),
                        round(x * sa + y * ca + sp['oy'], 3),
                        round(z + sp['oz'], 3)))
        return out

    out_surfaces, out_subs = [], []
    bbox = [1e18, 1e18, 1e18, -1e18, -1e18, -1e18]

    def grow(v):
        for i in range(0, len(v) - 2, 3):
            for k in range(3):
                bbox[k] = min(bbox[k], v[i + k])
                bbox[k + 3] = max(bbox[k + 3], v[i + k])

    for s in surfaces:
        w = world(s['space'], s['v'])
        if not w:
            continue
        grow(w)
        out_surfaces.append({'s': spaces[s['space']]['idx'], 't': s['type'],
                             'b': s['bc'], 'v': w})

    # SubSurface vertices share their parent surface's space frame
    for ss in subsurfaces:
        sh = surf_handle_to_space.get(ss['surface'])
        w = world(sh, ss['v']) if sh else None
        if not w:
            continue
        grow(w)
        out_subs.append({'s': spaces[sh]['idx'], 't': ss['type'], 'v': w})

    # Storeys, inferred from distinct floor levels (floors within 1.5 m merge)
    floor_z = sorted({round(s['v'][2], 1) for s in out_surfaces if s['t'] == 'Floor'})
    merged = []
    for z in floor_z:
        if not merged or abs(z - merged[-1]) > 1.5:
            merged.append(z)

    return {
        'name': name,
        'bbox': [round(b, 2) for b in bbox],
        'spaces': [{'n': spaces[h]['name']} for h in space_order],
        'storeys': len(merged),
        'surfaces': out_surfaces,
        'subs': out_subs,
    }


if __name__ == '__main__':
    src, dst, name = sys.argv[1], sys.argv[2], sys.argv[3]
    data = convert(src, name)
    io.open(dst, 'w', encoding='utf-8').write(json.dumps(data, separators=(',', ':')))
    print('%-10s spaces=%-4d surfaces=%-5d subs=%-4d storeys=%-3d  %.0f KB'
          % (name, len(data['spaces']), len(data['surfaces']),
             len(data['subs']), data['storeys'], os.path.getsize(dst) / 1024))
