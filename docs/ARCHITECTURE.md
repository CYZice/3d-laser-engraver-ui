# 三维激光内雕 前端架构设计 (Architecture Design)

## 1. 技术栈选型 (Tech Stack)

| 模块 | 技术 | 版本 | 理由 |
| :--- | :--- | :--- | :--- |
| **Framework** | React | 18+ | 生态丰富，组件化强 |
| **Language** | TypeScript | 5.x | 类型安全，减少运行时错误 |
| **Build Tool** | Vite | 5.x | 极速启动，HMR 体验好 |
| **UI Library** | Ant Design | 5.x | 企业级组件库，自带 Upload/Progress |
| **State Management** | Zustand | 4.x | 轻量级，API 简洁，无 Redux 样板代码 |
| **HTTP Client** | Axios | 1.6+ | 拦截器支持，易于处理上传进度 |
| **Image Editor** | react-cropper | 2.x | 基于 Cropper.js，成熟稳定 |
| **CSS Preprocessor** | Less | - | 配合 Ant Design 样式定制 |

## 2. 目录结构 (Directory Structure)

```text
src/
├── assets/                 // 静态资源 (Logo, Placeholder images)
├── components/             // 通用组件 (Dumb Components)
│   ├── ImageUploader/      // 上传组件
│   ├── ImageEditor/        // 图片裁剪/旋转组件
│   ├── ProcessingStatus/   // 进度展示组件
│   └── ResultPreview/      // 结果展示组件
├── hooks/                  // 自定义 Hooks
│   ├── usePolling.ts       // 轮询逻辑封装
│   └── useImageProcess.ts  // 图片处理逻辑
├── services/               // API 服务层
│   ├── api.ts              // Axios 实例 (拦截器)
│   └── conversion.ts       // 转换相关接口 (upload, getStatus)
├── store/                  // 全局状态管理
│   └── useAppStore.ts      // Zustand Store (单一数据源)
├── utils/                  // 工具函数
│   ├── file.ts             // 文件校验/转换工具
│   └── constant.ts         // 常量定义 (如 API URL)
├── App.tsx                 // 主应用入口 (状态机路由)
└── main.tsx                // 渲染入口
```

## 3. 数据流设计 (Data Flow)

### 3.1 全局状态 (Zustand Store)

```typescript
// store/useAppStore.ts

interface AppState {
  // 核心状态机
  step: 'UPLOAD' | 'EDIT' | 'PROCESSING' | 'RESULT';
  
  // 数据
  originalFile: File | null;      // 原始上传文件
  previewUrl: string | null;      // 用于编辑器的预览URL
  taskId: string | null;          // 后端任务ID
  progress: number;               // 0-100
  result: {
    dxfUrl: string | null;
    previewImgUrl: string | null;
  } | null;
  error: string | null;

  // Actions
  setStep: (step: AppStep) => void;
  setFile: (file: File) => void;
  startTask: (taskId: string) => void;
  updateProgress: (progress: number) => void;
  completeTask: (result: TaskResult) => void;
  failTask: (error: string) => void;
  reset: () => void;
}
```

### 3.2 接口定义 (API Interface)

**Service Layer (`services/conversion.ts`):**

```typescript
// 1. 上传图片并创建任务
// POST /api/v1/image/convert
interface UploadResponse {
  code: number;
  data: {
    taskId: string;
  };
}
function uploadImage(file: Blob): Promise<UploadResponse>;

// 2. 查询任务状态
// GET /api/v1/image/status/:taskId
interface TaskStatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  msg?: string;
  data?: {
    dxfUrl: string;
    previewUrl: string; // SVG or PNG
  };
  error?: string;
}
function getTaskStatus(taskId: string): Promise<TaskStatusResponse>;
```

## 4. 实施步骤 (Implementation Plan)

### Phase 1: 项目初始化 (Project Setup)
1.  **[Step 1.1]**: 初始化 Vite + React + TS 项目。
2.  **[Step 1.2]**: 安装依赖 (`antd`, `zustand`, `axios`, `react-cropper`, `less`).
3.  **[Step 1.3]**: 配置基础样式 (Reset CSS, AntD Config).

### Phase 2: 核心组件开发 (Core Components)
4.  **[Step 2.1]**: 创建 `useAppStore` 并定义状态机逻辑。
5.  **[Step 2.2]**: 开发 `ImageUploader` 组件 (集成 AntD Upload, 实现文件校验).
6.  **[Step 2.3]**: 开发 `ImageEditor` 组件 (集成 react-cropper, 实现裁剪/旋转).
7.  **[Step 2.4]**: 开发 `ProcessingStatus` 组件 (集成 AntD Progress).
8.  **[Step 2.5]**: 开发 `ResultPreview` 组件 (展示结果/下载).

### Phase 3: 业务逻辑串联 (Logic Integration)
9.  **[Step 3.1]**: 实现 `services/conversion.ts` (包含 Mock 数据，以便在无后端情况下开发).
10. **[Step 3.2]**: 实现 `usePolling` Hook (处理轮询、超时、错误).
11. **[Step 3.3]**: 在 `App.tsx` 中根据 `step` 状态渲染对应组件，并串联数据流。

### Phase 4: 验证与优化 (Verification)
12. **[Step 4.1]**: 验证全流程 (Happy Path).
13. **[Step 4.2]**: 验证异常流程 (文件过大、网络错误).
14. **[Step 4.3]**: UI 细节微调 (Loading 状态, 提示文案).

## 5. 影响范围分析 (Impact Analysis)
*   **新文件**: 整个 `src` 目录下的所有文件均为新建。
*   **配置**: `vite.config.ts`, `package.json`, `tsconfig.json` 需要修改/配置。
*   **兼容性**: 依赖库均为成熟版本，无明显冲突风险。
