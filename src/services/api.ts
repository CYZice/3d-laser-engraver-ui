import axios from 'axios';

// Create axios instance
export const api = axios.create({
  baseURL: '/api/v1', // Proxy will handle this in Vite
  timeout: 10000,
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    return Promise.reject(error);
  }
);
