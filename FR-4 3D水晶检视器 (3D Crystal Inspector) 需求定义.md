**【FR-4 3D水晶检视器 (3D Crystal Inspector) 需求定义】**：

---

### 新增 PRD 模块定义：FR-4 3D水晶检视器 (Phase 2)

#### 1. 核心定位与 UI 布局 (UI Layout)
*   **1.1 绝对主角布局**：在走到 `RESULT` 阶段时，整个屏幕背景 100% 切换为 3D 渲染画布（Canvas）。
*   **1.2 悬浮数据层 (HUD Overlay)**：原有 `ResultTicket` 中的元素（订单号、倒计时、返回按钮、打印提示等）需进行 UI 重构，采用毛玻璃或半透明面板设计，以悬浮层（Overlay）的形式覆盖在 3D 画布上方。
*   **1.3 交互层级隔离**：除了悬浮按钮外的所有屏幕空白区域，默认全权交由底部 3D 画布接管触控/鼠标拖拽事件。

#### 2. 模型与材质定义 (Model & Material Definition)
*   **2.1 物理尺寸对齐 (Physical Alignment)**：
    *   系统需预设一组标准水晶毛坯长宽高的**物理比例参数**（如 5x8x5 比例）。
    *   不论用户上传的图片属于何种长宽比，前端必须渲染这个固定比例的外部玻璃方块。
    *   系统需通过计算包裹盒（Bounding Box），将解析后的点云进行居中（Center）并等比缩放（Scale），使其完整包裹在玻璃晶体内部，边缘需留出安全物理边距（如 5mm），严禁点云“刺穿”玻璃模型。
*   **2.2 奢华珠宝风定调 (Luxury Jewelry Style)**：
    *   **背景视口**：设定为偏高明度、低饱和度的暖灰/浅灰色系（不可使用纯黑的赛博风）。
    *   **玻璃材质**：启用物理级透射材质（MeshPhysicalMaterial），拉满透光率与清漆感，具备微弱的折射率（IOR 约 1.5），表现出纯净无暇的水晶质感。
    *   **光影映射**：必须引入高光展柜风格的 HDRI 环境贴图（Studio/Jewelry 预设），使玻璃表面及倒角处能折射出柔和的漫反射光斑。
    *   **点云材质**：点云呈纯亮白色，带自发光光晕（Additive Blending）。

#### 3. 状态交互机与页面生命周期 (State & Lifecycle)
*   **3.1 骨架屏加载期 (Loading State)**：
    *   进入 Result 页面后，3D 画布立即挂载，但展示的是一个**不可交互的模糊轮廓**或**唯美的微光矩阵盒子**。
    *   在此期间，屏幕中央展示优雅的 Loading 动效（如“高精度模型解析中...”），后台 Web Worker 异步下载并解析 DXF 文件。
*   **3.2 显现转换 (Transition)**：
    *   当点云数组就绪并注入 GPU 缓冲区后，取消模糊遮罩，通过顺滑的渐现（Fade-in）或闪烁点亮动效（Flash）展示真实的 3D 实体。
*   **3.3 待机展示期 (Idle State)**：
    *   无用户触控介入时，水晶块置于屏幕中央，以特定轴心（通常为 Y 轴）遵循约 `1.5度/秒` 的速度保持匀速自转，配合极微弱的上下悬浮动效。
*   **3.4 用户干预检视 (Active Inspect)**：
    *   用户手指在屏幕滑动时，立刻打断并接管旋转。
    *   **边界限制**：
        1. 开启阻尼惯性（松手后顺滑减速）。
        2. **强制禁用平移（EnablePan = false）**：绝对不允许模型被拖出视口。
        3. **距离钳制**：限制缩放的最远距离（避免看不清）与最近距离（避免穿模进玻璃内部）。

#### 4. 性能与异常降级 (Performance & Fallback)
*   **4.1 独立线程解析**：强制要求 DXF 到点云的三维数据换算必须在 Web Worker 中执行，严禁阻塞 UI 主线程导致屏幕假死。
*   **4.2 显存回收**：生命周期销毁（进入下一单或返回首页）时，必须执行严格的 Three.js 内存清理（Texture, Geometry, Material `dispose`）。
*   **4.3 致命错误降级 (Graceful Degradation)**：
    *   捕捉机制：若检测到设备不支持 WebGL，或因显存溢出导致 WebGL Context Lost。
    *   降级方案：自动关闭 3D 画布模块，画布区域替换为由后端生成的 2D 预览静态图（PNG）。

3. 分步实施步骤 (Step-by-Step Execution Plan)
Step 1: 环境准备与依赖安装
任务: 引入 3D 渲染基础库，并编写 WebGL 检测工具。
动作:
执行安装: npm i three @react-three/fiber @react-three/drei 及对应的 @types/three。
创建 src/utils/webglChecker.ts，实现 checkWebGLSupport() 方法。并在 Store 初始化时调用，更新 webGLSupported 状态。
验证标准: 依赖安装成功，在不支持 WebGL 的浏览器中能够正确捕获拦截信号。
Step 2: UI 容器层级重构 (Minimal Invasive)
任务: 将原本的 2D 结算页面改造为 “3D 底底 + HUD 悬浮” 的布局。
修改点 (index.tsx):
将容器设置为 position: relative; width: 100vw; height: 100vh; overflow: hidden;。
将原有的单号、倒计时、返回按钮等元素包裹在一个新的 div 中，赋予绝对定位及 backdrop-filter: blur(10px)（毛玻璃效果），层级 z-index: 10。
在组件最底层使用绝对定位插入 <CrystalViewer zIndex={1} />，使得后续开发只聚焦在这个独立组件内部。
验证标准: 原有业务逻辑功能无损，页面呈现出毛玻璃面板覆盖在纯色或空背景上的效果。
Step 3: Web Worker 解析层实现
任务: 实现 DXF 到点云的三维数据换算，防止主线程阻塞。
动作:
创建 src/components/CrystalViewer/dxfParser.worker.ts。
实现拉取 DXF 文件并解析的逻辑，提取点云坐标，通过 Bounding Box 算法计算居中偏移量并等比缩放至 5x8x5（扣除 5mm 安全边距）的规范空间内。
通过 postMessage 回传 Float32Array（基于 Transferable Objects 实现零拷贝传递内存）。
验证标准: 传入测试 DXF URL，主线程能在一秒内无卡顿地接收到处理好的顶点数据。
Step 4: 3D 场景与材质渲染 (高定质感)
任务: 实现基于 R3F 的场景、光影与材质。
动作 (src/components/CrystalViewer/CrystalScene.tsx):
环境: 配置 <Environment preset="studio" /> 和暖灰背景 <color attach="background" args={['#e0e0e0']} />。
玻璃晶体: 渲染由 5x8x5 构成的 <boxGeometry>，应用 <meshPhysicalMaterial> (设置 transmission: 1, ior: 1.5, roughness: 0.1, thickness: 2) 模拟透射剥离质感。
点云: 使用 <points> 和 <bufferGeometry> 接收 Worker 传来的顶点，应用 <pointsMaterial>，开启 size={0.05}, color="white", additiveBlending, transparent={true}, depthWrite={false} 呈现发光感。
验证标准: 3D 模型渲染成功，拥有物理级玻璃高光的反射/折射效果，且点云位于玻璃正中心，无“刺穿”现象。
Step 5: 交互状态机与生命周期治理
任务: 实现加载遮罩、动效及交互限制。
动作:
加载期 (Loading): 在 Worker 运算期间，3D Canvas 前叠加 <div className="absolute inset-0 backdrop-blur-md flex items-center...">高精度模型解析中...</div>。
待机动画 (Idle): 在 CrystalScene 中引入 useFrame()，使 Group 呈现 Y 轴自转（rotation.y += delta * (Math.PI / 120)）。
交互干预限制: 引入 <OrbitControls>，设定参数：enablePan={false} (禁平移), enableDamping={true} (惯性), minDistance={10}, maxDistance={20}，并将旋转打断逻辑绑定到控制器事件上。
显存释放: 利用 useEffect的清理函数（cleanup），在组件卸载时手动调用 geometry.dispose() 和 material.dispose() 防显存泄漏。
验证标准: 滑动屏幕时可顺滑检查模型，松手后有阻尼减速；不可平移出视口；页面切换时堆内存正常释放。
Step 6: 异常降级闭环 (Graceful Fallback)
任务: 处理 WebGL Context 失效与不支持的情况。
动作 (src/components/CrystalViewer/index.tsx):
在该入口组件中注入 WebGL 状态判定。
如果 !webGLSupported，则 return <img src={fallbackImgUrl} className="w-full h-full object-cover" />，回退渲染 2D 静态图。
给 Canvas 绑定 onContextLost 事件侦听，触发时自动切换至 fallback 状态。
验证标准: 强行关闭浏览器硬件加速后测试，页面能平滑显示后台下发的 2D 预览图，不出现报错白屏。