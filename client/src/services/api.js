/**
 * ============================================
 * API Service - Axios Configuration
 * ============================================
 */

import axios from 'axios';
import { store } from '@/store';
import { refreshTokens, logout } from '@/store/slices/authSlice';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.auth.accessToken;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh token
        const result = await store.dispatch(refreshTokens());
        
        if (refreshTokens.fulfilled.match(result)) {
          // Retry original request with new token
          const state = store.getState();
          originalRequest.headers.Authorization = `Bearer ${state.auth.accessToken}`;
          return api(originalRequest);
        } else {
          // Refresh failed, logout
          store.dispatch(logout());
          window.location.href = '/login';
        }
      } catch (refreshError) {
        store.dispatch(logout());
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

// Helper functions for common API calls
export const apiHelpers = {
  // GET with pagination
  getList: async (endpoint, params = {}) => {
    const response = await api.get(endpoint, { params });
    return response.data;
  },
  
  // GET single item
  getOne: async (endpoint, id) => {
    const response = await api.get(`${endpoint}/${id}`);
    return response.data;
  },
  
  // POST create
  create: async (endpoint, data) => {
    const response = await api.post(endpoint, data);
    return response.data;
  },
  
  // PUT update
  update: async (endpoint, id, data) => {
    const response = await api.put(`${endpoint}/${id}`, data);
    return response.data;
  },
  
  // DELETE
  remove: async (endpoint, id) => {
    const response = await api.delete(`${endpoint}/${id}`);
    return response.data;
  },
};
