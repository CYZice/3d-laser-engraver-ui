#!/usr/bin/env python3
"""
pipeline.py — 3D 彩色点云 → 激光雕刻 DXF 完整流水线

流程:
  1. 加载 PLY 彩色点云
  2. 表面点过滤（相同 XY 只保留最外层 Z）
  3. RGB → 灰度（标准亮度公式）
  4. 半色调二值化（三种方法可选）
       threshold  : 简单阈值
       bayer      : Bayer 4×4 有序抖动
       floyd      : Floyd-Steinberg 误差扩散
       jarvis     : Jarvis 误差扩散（推荐，人像效果最佳）
  5. 保存预览图（灰度 + 各方法对比）
  6. 导出 DXF（保留真实 3D 坐标）

灰度增强（解决纹理色对比度不足）：
  原始 PLY 中的 RGB 来自神经网络重建的纹理，缺乏光照变化，
  灰度标准差通常仅 ~33（范围 50~180），导致点阵密度均匀无明暗感。
  --shading blend（默认）：40% 均衡化纹理 + 60% 法线着色，标准差可达 ~55+。

物理原理（水晶内雕）：
  激光在打点处产生白色微裂纹 → 散射 LED 光 → 视觉上呈现亮色
  因此：亮区（皮肤高光）需要更多打点 → bright→dot（不反转灰度）
  Gamma < 1 可提升中间调密度，使整体更接近实际雕刻效果。

用法:
  python3 pipeline.py input.ply
  python3 pipeline.py input.ply --resolution 0.5 --method jarvis
  python3 pipeline.py input.ply --method all --gamma 0.5
"""

import sys
import argparse
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
matplotlib.rcParams['font.sans-serif'] = ['PingFang SC', 'Heiti SC', 'SimHei',
                                           'Arial Unicode MS', 'DejaVu Sans']
matplotlib.rcParams['axes.unicode_minus'] = False
from pathlib import Path


# ─── 1. PLY 解析 ──────────────────────────────────────────────────────────────

def parse_ply(filepath: Path) -> np.ndarray:
    """
    解析 ASCII PLY，返回 (N, 7) float32 数组: [x, y, z, r, g, b, a]
    r g b a 为 0~255
    """
    in_data = False
    has_color = False
    points = []

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
            parts = s.split()
            try:
                if has_color and len(parts) >= 7:
                    points.append([float(parts[0]), float(parts[1]), float(parts[2]),
                                   float(parts[3]), float(parts[4]),
                                   float(parts[5]), float(parts[6])])
                elif len(parts) >= 3:
                    points.append([float(parts[0]), float(parts[1]), float(parts[2]),
                                   128.0, 128.0, 128.0, 255.0])
            except (ValueError, IndexError):
                pass

    return np.array(points, dtype=np.float32)


# ─── 2. 表面点过滤 + 灰度网格 ────────────────────────────────────────────────

def build_gray_grid(pts: np.ndarray, resolution: float):
    """
    将 3D 彩色点云投影到 XY 平面网格：
    - 相同 (X, Y) 格子只保留 Z 最大的点（最外层表面）
    - 计算该点的灰度值

    返回:
        gray_grid : (H, W) float32，有效格子为 0~255，空格子为 -1
        z_grid    : (H, W) float32，对应真实 Z 坐标
        x_min, y_min : 网格原点偏移量
    """
    x, y, z = pts[:, 0], pts[:, 1], pts[:, 2]
    r, g, b = pts[:, 3], pts[:, 4], pts[:, 5]

    gray = r * 0.299 + g * 0.587 + b * 0.114  # 标准亮度公式，结果 0~255

    x_min, y_min = float(x.min()), float(y.min())

    xi = ((x - x_min) / resolution).astype(np.int32)
    yi = ((y - y_min) / resolution).astype(np.int32)

    W = int(xi.max()) + 1
    H = int(yi.max()) + 1

    gray_grid = np.full((H, W), -1.0, dtype=np.float32)
    z_grid    = np.full((H, W), -np.inf, dtype=np.float32)

    # 按 Z 降序排列，先处理 Z 最大的点
    order = np.argsort(-z)
    xi_s, yi_s = xi[order], yi[order]
    z_s, gray_s = z[order], gray[order]

    # 把每个格子展平为 1D 线性索引，取首次出现（Z 最大）
    flat_idx = yi_s.astype(np.int64) * W + xi_s.astype(np.int64)
    _, first = np.unique(flat_idx, return_index=True)

    sx, sy = xi_s[first], yi_s[first]
    gray_grid[sy, sx] = gray_s[first]
    z_grid[sy, sx]    = z_s[first]

    return gray_grid, z_grid, x_min, y_min


# ─── 3. 灰度增强（法线着色 / 直方图均衡 / 混合）────────────────────────────

def compute_normal_shading(z_grid: np.ndarray, resolution: float) -> np.ndarray:
    """
    从 Z 深度网格计算表面法线，模拟正面光照，返回 gray_grid 格式（0~255 / -1）。
    法线 = normalize([-dZ/dx, -dZ/dy, 1])，着色 = clamp(dot(n, light), 0, 1) × 255。
    效果：鼻子/额头（朝向正面）→ 亮；眼窝/鼻翼（侧面/凹陷）→ 暗。
    """
    valid  = np.isfinite(z_grid)
    z_mean = float(z_grid[valid].mean()) if valid.any() else 0.0
    z_safe = np.where(valid, z_grid, z_mean)

    # ① Masked 中心差分：只有两侧邻居都 valid 时才计算梯度。
    #    边界格子强制梯度=0，避免 "face Z - z_mean" 轮廓白环。
    both_valid_x = valid[:, :-2] & valid[:, 2:]
    both_valid_y = valid[:-2, :] & valid[2:, :]

    dzdx = np.zeros_like(z_safe)
    dzdy = np.zeros_like(z_safe)
    dzdx[:, 1:-1] = np.where(both_valid_x,
                              (z_safe[:, 2:] - z_safe[:, :-2]) / (2.0 * resolution), 0.0)
    dzdy[1:-1, :] = np.where(both_valid_y,
                              (z_safe[2:, :] - z_safe[:-2, :]) / (2.0 * resolution), 0.0)

    # ② 对真实内部梯度做 p99.5 裁剪，消除 UV 接缝白线。
    interior_x = np.abs(dzdx[dzdx != 0])
    interior_y = np.abs(dzdy[dzdy != 0])
    if interior_x.size > 0:
        th_x = np.percentile(interior_x, 99.5)
        dzdx = np.clip(dzdx, -th_x, th_x)
    if interior_y.size > 0:
        th_y = np.percentile(interior_y, 99.5)
        dzdy = np.clip(dzdy, -th_y, th_y)

    mag = np.sqrt(dzdx**2 + dzdy**2 + 1.0)
    nx, ny, nz = -dzdx / mag, -dzdy / mag, 1.0 / mag

    lx, ly, lz = 0.0, 0.3, 1.0
    ln = np.sqrt(lx**2 + ly**2 + lz**2)
    shade = np.clip(nx*(lx/ln) + ny*(ly/ln) + nz*(lz/ln), 0, 1)

    return np.where(valid, shade * 255.0, -1.0).astype(np.float32)


def equalize_gray(gray_grid: np.ndarray) -> np.ndarray:
    """
    直方图均衡化：将压缩在窄范围内的纹理灰度拉伸到 0~255。
    """
    valid_mask = gray_grid >= 0
    vals = gray_grid[valid_mask]
    hist, _ = np.histogram(vals, bins=256, range=(0, 256))
    cdf = hist.cumsum().astype(np.float64)
    cdf_min = float(cdf[cdf > 0].min())
    total   = float(valid_mask.sum())
    cdf_norm = np.clip((cdf - cdf_min) / (total - cdf_min + 1e-9) * 255.0, 0, 255)

    out = gray_grid.copy()
    idx = np.clip(gray_grid[valid_mask].astype(np.int32), 0, 255)
    out[valid_mask] = cdf_norm[idx].astype(np.float32)
    return out


def apply_shading(gray_grid: np.ndarray, z_grid: np.ndarray,
                  resolution: float, mode: str,
                  blend_alpha: float = 0.4) -> np.ndarray:
    """
    灰度来源选择：
      texture  — 原始 RGB 纹理色转灰度（平坦，对比差）
      equalize — 直方图均衡化后的纹理色
      normal   — 表面法线模拟光照（完全来自 3D 几何）
      blend    — blend_alpha × 均衡纹理 + (1-blend_alpha) × 法线着色（推荐）
    """
    if mode == 'texture':
        return gray_grid
    if mode == 'equalize':
        return equalize_gray(gray_grid)
    if mode == 'normal':
        return compute_normal_shading(z_grid, resolution)

    # blend（默认）
    eq   = equalize_gray(gray_grid)
    norm = compute_normal_shading(z_grid, resolution)
    valid = (eq >= 0) & (norm >= 0)
    out = eq.copy()
    out[valid] = (blend_alpha * eq[valid] +
                  (1.0 - blend_alpha) * norm[valid]).astype(np.float32)
    return out


# ─── 4. 半色调二值化 ──────────────────────────────────────────────────────────

def halftone_threshold(gray_grid: np.ndarray, thresh: float = 0.5,
                       gamma: float = 0.5) -> np.ndarray:
    """
    简单阈值法（亮区打点，bright→dot）：
      (gray / 255) ^ gamma >= thresh → 1（打点，亮区）
      (gray / 255) ^ gamma <  thresh → 0（不打，暗区）
    gamma < 1 可提升中间调密度（默认 0.5 = 开方）。
    """
    valid  = gray_grid >= 0
    result = np.zeros(gray_grid.shape, dtype=np.uint8)
    val = np.power(np.clip(gray_grid[valid], 0, 255) / 255.0, gamma)
    result[valid] = (val >= thresh).astype(np.uint8)
    return result


def halftone_bayer(gray_grid: np.ndarray, gamma: float = 0.5) -> np.ndarray:
    """
    Bayer 4×4 有序抖动（亮区打点，bright→dot）：
    用 4×4 矩阵在图上滑动，逐格比较 gamma 校正后的灰度与模板值。
    """
    bayer = np.array([
        [ 0,  8,  2, 10],
        [12,  4, 14,  6],
        [ 3, 11,  1,  9],
        [15,  7, 13,  5],
    ], dtype=np.float32) / 16.0   # 归一化到 0~1

    H, W = gray_grid.shape
    tiled  = np.tile(bayer, (H // 4 + 1, W // 4 + 1))[:H, :W]

    valid  = gray_grid >= 0
    result = np.zeros(gray_grid.shape, dtype=np.uint8)
    val = np.power(np.clip(gray_grid[valid], 0, 255) / 255.0, gamma)
    result[valid] = (val > tiled[valid]).astype(np.uint8)
    return result


def halftone_floyd_steinberg(gray_grid: np.ndarray, gamma: float = 0.5) -> np.ndarray:
    """
    Floyd-Steinberg 误差扩散（亮区打点，bright→dot）：

    量化误差按如下权重扩散到相邻未处理像素：

              X    7/16
    3/16  5/16  1/16

    先对灰度做 gamma 校正（power(gray/255, gamma)），
    使亮区优先打点，符合水晶内雕物理（微裂纹 = 亮色）。
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

            if x + 1 < W and valid[y, x + 1]:
                img[y, x + 1] += err * 0.4375
            if y + 1 < H:
                if x > 0 and valid[y + 1, x - 1]:
                    img[y + 1, x - 1] += err * 0.1875
                if valid[y + 1, x]:
                    img[y + 1, x]     += err * 0.3125
                if x + 1 < W and valid[y + 1, x + 1]:
                    img[y + 1, x + 1] += err * 0.0625

    return result


def halftone_jarvis(gray_grid: np.ndarray, gamma: float = 0.5) -> np.ndarray:
    """
    Jarvis-Judice-Ninke 误差扩散（亮区打点，bright→dot）：

    误差扩散到 12 个邻居，权重矩阵（除以 48）：

                  X   7   5
          3   5   7   5   3
          1   3   5   3   1

    比 Floyd-Steinberg 扩散范围更大，渐变更平滑，
    更适合人像等复杂图像。先对灰度做 gamma 校正再扩散。
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


# ─── 4. 预览图 ────────────────────────────────────────────────────────────────

def save_preview(gray_grid: np.ndarray,
                 binary_grids: dict,
                 out_path: Path):
    """生成灰度图 + 各二值化方法对比的预览 PNG"""
    n   = 1 + len(binary_grids)
    fig, axes = plt.subplots(1, n, figsize=(5 * n, 5))
    if n == 1:
        axes = [axes]

    # 灰度图
    display_gray = np.where(gray_grid >= 0, gray_grid, 0).astype(np.uint8)
    axes[0].imshow(display_gray, cmap='gray', origin='lower', vmin=0, vmax=255)
    axes[0].set_title('Grayscale', fontsize=11)
    axes[0].axis('off')

    labels = {
        'threshold': 'Threshold',
        'bayer':     'Bayer 4x4',
        'floyd':     'Floyd-Steinberg',
        'jarvis':    'Jarvis',
    }
    for ax, (name, binary) in zip(axes[1:], binary_grids.items()):
        ax.imshow(binary, cmap='gray', origin='lower', vmin=0, vmax=1)
        ax.set_title(f'{labels.get(name, name)}\n({int(binary.sum()):,} pts)', fontsize=10)
        ax.axis('off')

    plt.tight_layout()
    plt.savefig(out_path, dpi=150, bbox_inches='tight')
    plt.close(fig)
    print(f'  preview → {out_path.name}')


# ─── 5. DXF 导出 ──────────────────────────────────────────────────────────────

def export_dxf(binary_grid: np.ndarray,
               z_grid: np.ndarray,
               x_min: float, y_min: float,
               resolution: float,
               out_path: Path):
    """
    将二值网格导出为 DXF ASCII POINT 实体。
    每个"打点"格子的真实 3D 坐标被保留（x, y, z_surface）。
    """
    ys, xs = np.where(binary_grid == 1)
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


# ─── 入口 ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description='3D colored point cloud → laser engraving DXF')
    parser.add_argument('input',
                        help='Input PLY file (ASCII with RGB colors)')
    parser.add_argument('--resolution', type=float, default=0.5,
                        help='Grid cell size in model units (default: 0.5)')
    parser.add_argument('--method',
                        choices=['threshold', 'bayer', 'floyd', 'jarvis', 'all'],
                        default='all',
                        help='Halftone method (default: all — compare all)')
    parser.add_argument('--threshold', type=float, default=0.5,
                        help='Threshold value [0~1] for threshold method (default: 0.5)')
    parser.add_argument('--gamma', type=float, default=0.5,
                        help='Gamma correction for halftone (default: 0.5). '
                             '<1 提升中间调密度，1=线性，>1 收紧中间调')
    parser.add_argument('--shading',
                        choices=['texture', 'equalize', 'normal', 'blend'],
                        default='equalize',
                        help='Grayscale source: texture=原始纹理色, equalize=均衡化纹理(推荐,default), '
                             'normal=法线着色, blend=混合')
    parser.add_argument('--blend-alpha', type=float, default=0.4,
                        help='blend 模式中纹理权重 (default: 0.4，即 40%%纹理+60%%法线)')
    parser.add_argument('--output', default=None,
                        help='Output file prefix (default: same dir as input)')
    args = parser.parse_args()

    ply_path = Path(args.input)
    if not ply_path.exists():
        print(f'File not found: {ply_path}')
        sys.exit(1)

    if args.output:
        out_full = Path(args.output)
        out_dir  = out_full.parent
        out_stem = out_full.name
    else:
        # 默认输出到 output/pipeline/（相对脚本所在目录）
        script_dir = Path(__file__).parent
        out_dir  = script_dir / 'output' / 'pipeline'
        out_stem = ply_path.stem
    out_dir.mkdir(parents=True, exist_ok=True)

    # ── 步骤 1：加载 ──────────────────────────────────────────────────────────
    print(f'[1] Loading {ply_path.name} ...')
    pts = parse_ply(ply_path)
    print(f'    {len(pts):,} points')

    # ── 步骤 2：表面过滤 + 灰度网格 ──────────────────────────────────────────
    print(f'[2] Surface filtering  resolution={args.resolution} ...')
    gray_grid, z_grid, x_min, y_min = build_gray_grid(pts, args.resolution)
    H, W       = gray_grid.shape
    valid_cnt  = int((gray_grid >= 0).sum())
    print(f'    Grid {W}×{H},  valid cells: {valid_cnt:,}')

    # ── 步骤 3：灰度增强 ──────────────────────────────────────────────────────
    print(f'[3] Shading  mode={args.shading}  blend_alpha={args.blend_alpha} ...')
    enhanced = apply_shading(gray_grid, z_grid, args.resolution,
                             args.shading, args.blend_alpha)
    valid_vals = enhanced[enhanced >= 0]
    print(f'    gray range: {valid_vals.min():.1f} ~ {valid_vals.max():.1f}'
          f'  std={valid_vals.std():.1f}')

    # ── 步骤 4：二值化 ────────────────────────────────────────────────────────
    print('[4] Halftone binarization ...')
    methods = ['threshold', 'bayer', 'floyd', 'jarvis'] if args.method == 'all' else [args.method]
    binary_grids = {}

    for m in methods:
        if m == 'threshold':
            binary_grids['threshold'] = halftone_threshold(enhanced, args.threshold, args.gamma)
            print(f'    threshold done  ({int(binary_grids["threshold"].sum()):,} pts)')
        elif m == 'bayer':
            binary_grids['bayer'] = halftone_bayer(enhanced, args.gamma)
            print(f'    bayer done      ({int(binary_grids["bayer"].sum()):,} pts)')
        elif m == 'floyd':
            print(f'    floyd-steinberg (grid {W}×{H}, {valid_cnt:,} cells) ...')
            binary_grids['floyd'] = halftone_floyd_steinberg(enhanced, args.gamma)
            print(f'    floyd done      ({int(binary_grids["floyd"].sum()):,} pts)')
        elif m == 'jarvis':
            print(f'    jarvis (grid {W}×{H}, {valid_cnt:,} cells) ...')
            binary_grids['jarvis'] = halftone_jarvis(enhanced, args.gamma)
            print(f'    jarvis done     ({int(binary_grids["jarvis"].sum()):,} pts)')

    # ── 步骤 5：预览图 ────────────────────────────────────────────────────────
    print('[5] Saving preview ...')
    preview_path = out_dir / f'{out_stem}_{args.shading}_halftone_preview.png'
    save_preview(enhanced, binary_grids, preview_path)

    # ── 步骤 6：导出 DXF ──────────────────────────────────────────────────────
    print('[6] Exporting DXF ...')
    for name, binary in binary_grids.items():
        dxf_path = out_dir / f'{out_stem}_{args.shading}_{name}.dxf'
        export_dxf(binary, z_grid, x_min, y_min, args.resolution, dxf_path)

    print('\nDone.')


if __name__ == '__main__':
    main()
