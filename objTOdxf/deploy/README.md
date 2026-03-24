# 激光雕刻 DXF 生成工具

## 依赖

```bash
pip install numpy matplotlib
```

C++ 工具需提前编译（见 `../ModelTransformer-main/`）。

## 一键运行

```bash
./run.sh input/demo.obj
```

输出到 `output/`：PLY 点云、Jarvis DXF、预览 PNG、3D HTML。

## 单独使用

```bash
# PLY → DXF + 预览PNG
python3 pipeline.py demo.ply

# DXF → 3D 交互预览 HTML
python3 gen_3d_html.py demo_jarvis.dxf
```

## 流程

```
OBJ → [C++ ModelTransformer] → PLY → [pipeline.py] → DXF
                                                          ↓
                                              [gen_3d_html.py] → HTML
```
