// import { api } from './api';

// Mocking for now since backend doesn't exist
export interface UploadResponse {
  code: number;
  data: {
    taskId: string;
  };
}

export interface TaskStatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  msg?: string;
  data?: {
    dxfUrl: string;
    previewUrl: string;
  };
  error?: string;
}

// Mock implementation
export const uploadImage = async (file: Blob): Promise<UploadResponse> => {
  console.log('Uploading file...', file.size);
  // Simulate upload delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  return {
    code: 200,
    data: {
      taskId: 'task_' + Date.now(),
    },
  };
};

export const getTaskStatus = async (taskId: string): Promise<TaskStatusResponse> => {
  console.log('Checking status for', taskId);
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    status: 'processing',
    progress: 0,
  };
};
