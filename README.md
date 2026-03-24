# 2D 图片到 OBJ/DXF 并前端渲染：详细使用说明

## 1. 当前能力结论

结论：当前项目已经可以用一张二维图片（2D）在后端完成处理，并在前端完成 DXF 渲染展示。

已打通的主链路如下：

1. 前端上传 2D 图片
2. 后端调用 3DDFA 生成 OBJ
3. 后端执行 OBJ -> PLY -> DXF
4. 前端轮询任务状态并拉取 DXF
5. 前端 DXF 预览组件渲染结果

注意：

- `/api/v1/faces/detect` 目前是占位返回，不是实际多人脸检测。
- 任务状态目前存内存，后端重启后任务记录会丢失。
- Linux 环境下如果仓库自带 `ModelTransformer` 是 macOS 二进制，会自动走 Python 回退（OBJ 顶点转 ASCII PLY）继续生成 DXF。

## 2. 数据流总览

### 2.1 前端触发链路

前端流程（见 App 与服务层）：

1. 拍照/上传进入编辑页
2. 编辑页上传图片：`POST /api/v1/upload`
3. 支付成功后创建任务：`POST /api/v1/tasks`
4. Processing 页轮询：`GET /api/v1/tasks/{taskId}`
5. 状态为 `COMPLETED` 后，读取 `result.dxfUrl` 并渲染

### 2.2 后端处理阶段

任务阶段（`stage`）为：

1. `PROCESSING_DETECT`
2. `PROCESSING_3DDFA`
3. `PROCESSING_OBJ2PLY`
4. `PROCESSING_PLY2DXF`
5. `COMPLETED` 或 `FAILED`

## 3. 2D / OBJ / DXF 分别存在哪里

> 以下路径均为仓库根目录下的相对路径。

### 3.1 2D 图片（上传原图）

1. 上传临时副本：
- `backend/uploads/tmp/<原文件名>`

2. 上传正式落盘（后续任务使用）：
- `backend/uploads/upl_<uploadId>/original.<ext>`

### 3.2 OBJ 数据

1. 3DDFA 生成的中间 OBJ（3DDFA 工作目录）：
- `3DDFA_V2-master/examples/results/result_obj.obj`

2. 任务产物目录中的 OBJ（用于统一对外访问）：
- `backend/artifacts/tsk_<taskId>/result.obj`

### 3.3 DXF 数据

1. 后端落盘 DXF 文件：
- `backend/artifacts/tsk_<taskId>/result_jarvis.dxf`

2. 前端访问 URL：
- `/artifacts/tsk_<taskId>/result_jarvis.dxf`

### 3.4 其他相关产物

- PLY：`backend/artifacts/tsk_<taskId>/result.ply`
- 预览图：`backend/artifacts/tsk_<taskId>/result_preview.png`

## 4. 环境准备（首次）

## 4.1 建议 Python 环境

在仓库根目录创建并激活虚拟环境（示例）：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
```

## 4.2 安装后端 API 依赖

```bash
pip install -r backend/requirements.txt
```

## 4.3 安装真实 pipeline 依赖（3DDFA + 转换链）

```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install opencv-python onnxruntime scipy imageio scikit-image tqdm matplotlib Cython==0.29.36
```

## 4.4 编译 3DDFA 的 Cython 扩展

### FaceBoxes NMS

```bash
cd 3DDFA_V2-master/FaceBoxes/utils
python build.py build_ext --inplace
cd ../../../
```

### Sim3DR

```bash
cd 3DDFA_V2-master/Sim3DR
python setup.py build_ext --inplace
cd ../../
```

## 5. 启动方式

## 5.1 启动后端

在仓库根目录：

```bash
source .venv/bin/activate
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

健康检查：

- `GET http://127.0.0.1:8000/api/v1/health`

## 5.2 启动前端

在仓库根目录：

```bash
npm install
npm run dev
```

说明：

- 首次若遇到 `npm install` 依赖冲突（`@react-three/drei` 与 `@react-three/fiber`），请先拉取最新代码后再安装（已将 `drei` 固定为与 `fiber@8` 兼容的 9.x）。
- 如果 5173 被占用，Vite 会自动切换到 5174/5175 等端口，以终端输出为准。

前端通过 Vite 代理访问：

- `/api/v1` -> `http://localhost:8000`
- `/artifacts` -> `http://localhost:8000`

## 6. 实际操作步骤（UI）

1. 打开前端页面（默认 `http://127.0.0.1:5173`）
2. 进入拍照或上传
3. 在编辑页确认后上传
4. 进入支付页，完成模拟支付
5. 自动进入 Processing 轮询
6. 完成后跳转结果页并渲染 DXF

## 7. API 调用顺序（联调用）

## 7.1 上传图片

`POST /api/v1/upload`（multipart/form-data，字段名 `file`）

返回核心字段：

- `data.uploadId`

## 7.2 创建任务

`POST /api/v1/tasks`

示例请求体：

```json
{
  "uploadId": "upl_xxx",
  "paymentToken": "pay_mock_xxx",
  "faceIndex": 0,
  "options": {
    "modelVersion": "mb1_120x120",
    "dxfResolution": 0.5,
    "pointDensity": 1.0,
    "gamma": 0.5
  }
}
```

返回核心字段：

- `data.taskId`

## 7.3 轮询任务状态

`GET /api/v1/tasks/{taskId}`

当 `status=COMPLETED` 时读取：

- `data.result.dxfUrl`
- `data.result.previewUrl`
- `data.result.objUrl`
- `data.result.plyUrl`

## 8. 如何判断链路成功

满足以下条件即表示“2D -> OBJ -> DXF -> 前端渲染”已成功：

1. 任务状态为 `COMPLETED`
2. `dxfUrl` 可访问且返回 200
3. 结果页显示 DXF 预览
4. `backend/artifacts/tsk_<taskId>/` 下存在 `result.obj`、`result.ply`、`result_jarvis.dxf`

## 9. 常见问题

## 9.1 报 `No module named cv2`

缺少 OpenCV：

```bash
pip install opencv-python
```

## 9.2 报 `No module named FaceBoxes.utils.nms.cpu_nms`

FaceBoxes Cython 扩展未编译，执行第 4.4 节 FaceBoxes 编译步骤。

## 9.3 报 `No module named Sim3DR_Cython`

Sim3DR 扩展未编译，执行第 4.4 节 Sim3DR 编译步骤。

## 9.4 报 `Exec format error: ModelTransformer`

说明二进制与系统架构不匹配（例如 macOS 文件在 Linux 运行）。

当前后端已内置回退逻辑，会自动尝试 OBJ -> ASCII PLY 再继续生成 DXF。

## 9.5 前端看不到结果

按顺序检查：

1. `GET /api/v1/health` 是否 200
2. 任务是否 `COMPLETED`
3. `dxfUrl` 是否 200
4. 前端代理是否生效（`vite.config.ts`）

## 9.6 报 `ENOSPC: System limit for number of file watchers reached`

这是 Linux 的文件监听上限导致，常见于项目目录下存在 `.venv`、大模型依赖或大量产物文件。

本项目已在 Vite 配置中忽略 `.venv` 和产物目录，通常可直接恢复。若仍报错，执行：

```bash
sudo sysctl fs.inotify.max_user_watches=524288
sudo sysctl fs.inotify.max_user_instances=1024
```

要永久生效可写入：`/etc/sysctl.d/99-inotify.conf`。

## 10. 文件与代码参考

- 后端入口：[backend/app/main.py](backend/app/main.py)
- 流程编排：[backend/app/pipeline_orchestrator.py](backend/app/pipeline_orchestrator.py)
- 执行器与回退：[backend/app/pipeline_runner.py](backend/app/pipeline_runner.py)
- 路径配置：[backend/app/config.py](backend/app/config.py)
- 前端 API 封装：[src/services/conversion.ts](src/services/conversion.ts)
- 前端轮询：[src/hooks/usePolling.ts](src/hooks/usePolling.ts)
- 前端流程：[src/App.tsx](src/App.tsx)
- Vite 代理：[vite.config.ts](vite.config.ts)
