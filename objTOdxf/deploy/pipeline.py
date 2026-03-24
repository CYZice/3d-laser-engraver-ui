#!/usr/bin/env python3
"""
pipeline.py — PLY 点云 → 激光雕刻 DXF（Jarvis 半色调）

流程:
  1. 解析 ASCII PLY 彩色点云
  2. 投影到 XY 平面，每格取 Z 最大的表面点
  3. RGB → 灰度，gamma 校正（bright→dot，亮区打点）
  4. Jarvis-Judice-Ninke 误差扩散二值化
  5. 导出 DXF（保留真实 3D 坐标）+ 灰度预览 PNG

物理原理（水晶内雕）:
  激光打点 → 白色微裂纹 → 散射 LED 光 → 视觉上呈亮色
  因此亮区（皮肤高光）需要更多打点 → bright→dot（不反转）
  gamma < 1 提升中间调密度（默认 0.5 = 开方）

用法:
  python3 pipeline.py input.ply
  python3 pipeline.py input.ply --resolution 0.5 --gamma 0.5
  python3 pipeline.py input.ply --output output/my_prefix
"""

import sys
import argparse
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from pathlib import Path


# ── 1. PLY 解析 ────────────────────────────────────────────────────────────────

def parse_ply(filepath: Path) -> np.ndarray:
    """解析 ASCII PLY，返回 (N,7) float32: [x,y,z,r,g,b,a]，rgb 为 0~255"""
    in_data, has_color, points = False, False, []
    with open(filepath, encoding='utf-8', errors='ignore') as f:
        for line in f:
            s = line.strip()
            if 'property uchar red' in s:
                has_color = True
            if s == 'end_header':
                in_data = True
                continue
            if not in_data or not s:
                continue
            p = s.split()
            try:
                if has_color and len(p) >= 7:
                    points.append([float(p[0]), float(p[1]), float(p[2]),
                                   float(p[3]), float(p[4]), float(p[5]), float(p[6])])
                elif len(p) >= 3:
                    points.append([float(p[0]), float(p[1]), float(p[2]),
                                   128., 128., 128., 255.])
            except (ValueError, IndexError):
                pass
    return np.array(points, dtype=np.float32)


# ── 2. 表面过滤 + 灰度网格 ─────────────────────────────────────────────────────

def build_gray_grid(pts: np.ndarray, resolution: float):
    """
    将点云投影到 XY 平面：每格只保留 Z 最大的点（最外层表面）。
    返回: gray_grid(H,W), z_grid(H,W), x_min, y_min
    gray_grid 有效格子值 0~255，空格子为 -1。
    """
    x, y, z = pts[:, 0], pts[:, 1], pts[:, 2]
    r, g, b  = pts[:, 3], pts[:, 4], pts[:, 5]
    gray = r * 0.299 + g * 0.587 + b * 0.114

    x_min, y_min = float(x.min()), float(y.min())
    xi = ((x - x_min) / resolution).astype(np.int32)
    yi = ((y - y_min) / resolution).astype(np.int32)
    W, H = int(xi.max()) + 1, int(yi.max()) + 1

    gray_grid = np.full((H, W), -1.0, dtype=np.float32)
    z_grid    = np.full((H, W), -np.inf, dtype=np.float32)

    order    = np.argsort(-z)
    xi_s, yi_s = xi[order], yi[order]
    z_s, gray_s = z[order], gray[order]
    flat_idx = yi_s.astype(np.int64) * W + xi_s.astype(np.int64)
    _, first = np.unique(flat_idx, return_index=True)
    sx, sy   = xi_s[first], yi_s[first]
    gray_grid[sy, sx] = gray_s[first]
    z_grid[sy, sx]    = z_s[first]

    return gray_grid, z_grid, x_min, y_min


# ── 3. Jarvis 半色调（bright→dot + gamma）────────────────────────────────────

def halftone_jarvis(gray_grid: np.ndarray, gamma: float = 0.5) -> np.ndarray:
    """
    Jarvis-Judice-Ninke 误差扩散（亮区打点，bright→dot）。
    先对灰度做 gamma 校正：value = (gray/255)^gamma，亮区值高，优先打点。

    误差扩散权重（除以 48）:
              X   7   5
      3   5   7   5   3
      1   3   5   3   1
    """
    normed = np.power(np.clip(gray_grid, 0, 255) / 255.0, gamma)
    img    = np.where(gray_grid >= 0, normed, -1.0)
    valid  = gray_grid >= 0
    result = np.zeros(gray_grid.shape, dtype=np.uint8)
    H, W   = img.shape

    for y in range(H):
        for x in range(W):
            if not valid[y, x]:
                continue
            old_v = float(img[y, x])
            new_v = 1.0 if old_v >= 0.5 else 0.0
            result[y, x] = int(new_v)
            err = old_v - new_v

            def spread(dy, dx, w):
                ny, nx = y + dy, x + dx
                if 0 <= ny < H and 0 <= nx < W and valid[ny, nx]:
                    img[ny, nx] += err * w

            spread(0,  1, 7/48); spread(0,  2, 5/48)
            spread(1, -2, 3/48); spread(1, -1, 5/48)
            spread(1,  0, 7/48); spread(1,  1, 5/48); spread(1,  2, 3/48)
            spread(2, -2, 1/48); spread(2, -1, 3/48)
            spread(2,  0, 5/48); spread(2,  1, 3/48); spread(2,  2, 1/48)

    return result


# ── 4. 预览 PNG ────────────────────────────────────────────────────────────────

def save_preview(gray_grid: np.ndarray, binary: np.ndarray, out_path: Path):
    """生成灰度图 + Jarvis 半色调对比预览 PNG"""
    fig, axes = plt.subplots(1, 2, figsize=(10, 5))
    display_gray = np.where(gray_grid >= 0, gray_grid, 0).astype(np.uint8)
    axes[0].imshow(display_gray, cmap='gray', origin='lower', vmin=0, vmax=255)
    axes[0].set_title('Grayscale', fontsize=11)
    axes[0].axis('off')
    axes[1].imshow(binary, cmap='gray', origin='lower', vmin=0, vmax=1)
    axes[1].set_title(f'Jarvis Halftone  ({int(binary.sum()):,} pts)', fontsize=11)
    axes[1].axis('off')
    plt.tight_layout()
    plt.savefig(out_path, dpi=150, bbox_inches='tight')
    plt.close(fig)
    print(f'  preview → {out_path.name}')


# ── 5. DXF 导出 ────────────────────────────────────────────────────────────────

def export_dxf(binary: np.ndarray, z_grid: np.ndarray,
               x_min: float, y_min: float, resolution: float,
               out_path: Path):
    """将打点格子导出为 DXF ASCII POINT，保留真实 3D 坐标"""
    ys, xs = np.where(binary == 1)
    zs     = z_grid[ys, xs]
    finite = np.isfinite(zs)
    ys, xs, zs = ys[finite], xs[finite], zs[finite]
    px = x_min + xs * resolution
    py = y_min + ys * resolution
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write("0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n0\nENDSEC\n")
        f.write("0\nSECTION\n2\nENTITIES\n")
        for cx, cy, cz in zip(px, py, zs):
            f.write(f"0\nPOINT\n8\n0\n10\n{cx:.4f}\n20\n{cy:.4f}\n30\n{cz:.4f}\n")
        f.write("0\nENDSEC\n0\nEOF\n")
    print(f'  DXF   → {out_path.name}  ({len(px):,} points)')


# ── 入口 ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='PLY point cloud → laser engraving DXF (Jarvis)')
    parser.add_argument('input',       help='Input PLY file (ASCII with RGB colors)')
    parser.add_argument('--resolution', type=float, default=0.5,
                        help='Grid cell size in model units (default: 0.5)')
    parser.add_argument('--gamma',      type=float, default=0.5,
                        help='Gamma correction, <1 boosts midtones (default: 0.5)')
    parser.add_argument('--output',     default=None,
                        help='Output file prefix (default: same dir as input)')
    args = parser.parse_args()

    ply_path = Path(args.input)
    if not ply_path.exists():
        print(f'File not found: {ply_path}'); sys.exit(1)

    if args.output:
        out_path = Path(args.output)
        out_dir, out_stem = out_path.parent, out_path.name
    else:
        out_dir  = Path(__file__).parent / 'output'
        out_stem = ply_path.stem
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f'[1] Loading {ply_path.name} ...')
    pts = parse_ply(ply_path)
    print(f'    {len(pts):,} points')

    print(f'[2] Surface filter  resolution={args.resolution} ...')
    gray_grid, z_grid, x_min, y_min = build_gray_grid(pts, args.resolution)
    H, W = gray_grid.shape
    valid = int((gray_grid >= 0).sum())
    print(f'    Grid {W}×{H},  valid cells: {valid:,}')

    print(f'[3] Jarvis halftone  gamma={args.gamma} ...')
    binary = halftone_jarvis(gray_grid, args.gamma)
    print(f'    {int(binary.sum()):,} engrave points')

    print('[4] Saving preview ...')
    save_preview(gray_grid, binary, out_dir / f'{out_stem}_preview.png')

    print('[5] Exporting DXF ...')
    export_dxf(binary, z_grid, x_min, y_min, args.resolution,
               out_dir / f'{out_stem}_jarvis.dxf')

    print('\nDone.')


if __name__ == '__main__':
    main()
