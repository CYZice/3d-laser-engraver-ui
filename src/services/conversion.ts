import { api } from './api';

export interface UploadResponse {
  code: number;
  data: {
    uploadId: string;
    filename: string;
    sizeBytes: number;
  };
}

export interface CreateTaskRequest {
  uploadId: string;
  paymentToken: string;
  faceIndex?: number;
  options?: {
    modelVersion?: string;
    dxfResolution?: number;
    pointDensity?: number;
    gamma?: number;
  };
}

export interface CreateTaskResponse {
  code: number;
  data: {
    taskId: string;
    status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  };
}

export interface TaskStatusResponse {
  code: number;
  data: {
    taskId: string;
    uploadId: string;
    status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    stage:
    | 'QUEUED'
    | 'PROCESSING_DETECT'
    | 'PROCESSING_3DDFA'
    | 'PROCESSING_OBJ2PLY'
    | 'PROCESSING_PLY2DXF'
    | 'COMPLETED'
    | 'FAILED';
    progress: number;
    message?: string;
    result?: {
      dxfUrl: string;
      previewUrl: string;
      objUrl?: string | null;
      plyUrl?: string | null;
    };
    error?: {
      code: string;
      message: string;
    };
  };
}

export interface DetectFacesResponse {
  code: number;
  data: {
    uploadId: string;
    faceCount: number;
    faces: Array<{
      faceIndex: number;
      confidence: number;
      bbox: number[];
      thumbnailUrl: string;
    }>;
  };
}

export const uploadImage = async (file: Blob): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file, 'capture.jpg');
  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const detectFaces = async (uploadId: string): Promise<DetectFacesResponse> => {
  return api.post('/faces/detect', { uploadId });
};

export const createTask = async (
  payload: CreateTaskRequest
): Promise<CreateTaskResponse> => {
  return api.post('/tasks', payload);
};

export const getTaskStatus = async (taskId: string): Promise<TaskStatusResponse> => {
  return api.get(`/tasks/${taskId}`);
};
