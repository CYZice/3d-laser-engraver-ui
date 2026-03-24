#!/usr/bin/env python3
"""
gen_3d_html.py — DXF 点云 → Three.js 交互式 3D HTML 预览

生成可在浏览器中旋转/缩放的 3D 点云预览，黑底白点，
加法混合使点密度自然呈现灰度（亮区密集=亮，暗区稀疏=暗）。

用法:
  python3 gen_3d_html.py input.dxf
  python3 gen_3d_html.py input.dxf --output my_preview.html
  python3 gen_3d_html.py input.dxf --size 1.5 --opacity 0.18
"""

import sys
import argparse
import numpy as np
import base64
from pathlib import Path


def load_dxf_xyz(path: Path) -> np.ndarray:
    """
    解析 DXF ASCII POINT 实体，返回 (N,3) float32 [x,y,z]。

    DXF POINT 结构（每个实体10行）:
      0 / POINT / 8 / 0 / 10 / X值 / 20 / Y值 / 30 / Z值
    """
    pts = []
    with open(path, encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    i = 0
    while i < len(lines) - 10:
        if lines[i].strip() == '0' and lines[i + 1].strip() == 'POINT':
            try:
                x = float(lines[i + 5].strip())
                y = float(lines[i + 7].strip())
                z = float(lines[i + 9].strip())
                pts.append([x, y, z])
            except (IndexError, ValueError):
                pass
            i += 10
        else:
            i += 1
    return np.array(pts, dtype=np.float32) if pts else np.zeros((0, 3), np.float32)


def generate_html(pts: np.ndarray, n_pts: int,
                  dot_size: float, opacity: float,
                  cam_z: float) -> str:
    pts_c  = (pts - pts.mean(axis=0)).astype(np.float32)
    b64    = base64.b64encode(pts_c.tobytes()).decode('ascii')

    return f"""<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<title>激光雕刻 3D 点云预览</title>
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ background:#000; overflow:hidden; font-family:monospace; }}
canvas {{ display:block; }}
#info {{
  position:fixed; bottom:14px; left:50%; transform:translateX(-50%);
  color:#444; font-size:12px; pointer-events:none;
}}
#panel {{
  position:fixed; top:14px; right:16px;
  color:#aaa; font-size:12px; line-height:2;
  display:flex; flex-direction:column; gap:2px;
}}
#panel label {{ display:flex; align-items:center; gap:8px; }}
#panel input[type=range] {{ width:110px; cursor:pointer; accent-color:#888; }}
#panel span {{ width:36px; display:inline-block; text-align:right; }}
</style>
</head>
<body>
<div id="info">拖动旋转 &nbsp;|&nbsp; 滚轮缩放 &nbsp;|&nbsp; 右键平移 &nbsp;|&nbsp; {n_pts:,} 点</div>
<div id="panel">
  <label>透明度 <input id="op" type="range" min="0.02" max="0.5"  step="0.01" value="{opacity}"><span id="opv">{opacity}</span></label>
  <label>点大小 <input id="sz" type="range" min="0.5"  max="5.0"  step="0.5"  value="{dot_size}"><span id="szv">{dot_size}</span></label>
</div>
<script type="importmap">
{{"imports":{{"three":"https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/"}}}}
</script>
<script type="module">
import * as THREE from 'three';
import {{ OrbitControls }} from 'three/addons/controls/OrbitControls.js';

// 解码点云（base64 → Float32Array）
const b64 = "{b64}";
const bin = atob(b64);
const buf = new Uint8Array(bin.length);
for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
const positions = new Float32Array(buf.buffer);

// 渲染器
const renderer = new THREE.WebGLRenderer({{ antialias: false }});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 5000);
camera.position.set(0, 0, {cam_z:.1f});
camera.lookAt(0, 0, 0);

// 点云
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const mat = new THREE.PointsMaterial({{
  size:        {dot_size},
  color:       0xffffff,
  transparent: true,
  opacity:     {opacity},
  blending:    THREE.AdditiveBlending,
  depthWrite:  false,
  sizeAttenuation: false,
}});

scene.add(new THREE.Points(geo, mat));

// 轨道控制
const ctrl = new OrbitControls(camera, renderer.domElement);
ctrl.target.set(0, 0, 0);
ctrl.enableDamping  = true;
ctrl.dampingFactor  = 0.08;
ctrl.update();

// 滑块
document.getElementById('op').addEventListener('input', e => {{
  mat.opacity = parseFloat(e.target.value);
  document.getElementById('opv').textContent = e.target.value;
}});
document.getElementById('sz').addEventListener('input', e => {{
  mat.size = parseFloat(e.target.value);
  document.getElementById('szv').textContent = e.target.value;
}});

// 渲染循环
(function animate() {{
  requestAnimationFrame(animate);
  ctrl.update();
  renderer.render(scene, camera);
}})();

window.addEventListener('resize', () => {{
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}});
</script>
</body>
</html>"""


def main():
    parser = argparse.ArgumentParser(description='DXF point cloud → Three.js 3D HTML preview')
    parser.add_argument('input',      help='Input DXF file')
    parser.add_argument('--output',   default=None, help='Output HTML path')
    parser.add_argument('--size',     type=float, default=1.5, help='Default dot size in px (default: 1.5)')
    parser.add_argument('--opacity',  type=float, default=0.18, help='Default dot opacity (default: 0.18)')
    args = parser.parse_args()

    dxf_path = Path(args.input)
    if not dxf_path.exists():
        print(f'File not found: {dxf_path}'); sys.exit(1)

    out_html = Path(args.output) if args.output else \
        dxf_path.parent / (dxf_path.stem + '_3d_preview.html')

    print(f'Loading {dxf_path.name} ...')
    pts = load_dxf_xyz(dxf_path)
    print(f'  {len(pts):,} points')
    if len(pts) == 0:
        print('No points found.'); sys.exit(1)

    xr = pts[:, 0].max() - pts[:, 0].min()
    yr = pts[:, 1].max() - pts[:, 1].min()
    cam_z = float(pts[:, 2].max() - pts[:, 2].mean()) + max(xr, yr) * 1.1

    html = generate_html(pts, len(pts), args.size, args.opacity, cam_z)
    with open(out_html, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'  → {out_html}  ({len(html)/1024/1024:.1f} MB)')

    import subprocess
    subprocess.Popen(['open', str(out_html)])
    print('Done.')


if __name__ == '__main__':
    main()
