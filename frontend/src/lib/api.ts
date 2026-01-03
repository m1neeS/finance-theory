import axios from 'axios'
import { supabase } from './supabase'

// Use environment variable for API URL, fallback to /api for local dev with proxy
const API_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: API_URL ? `${API_URL}/api` : '/api',
})

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

export default api

// API functions
export const dashboardApi = {
  summary: () => api.get(`/dashboard/summary?_t=${Date.now()}`),
  byCategory: () => api.get(`/dashboard/by-category?_t=${Date.now()}`),
  recent: (limit = 5) => api.get(`/dashboard/recent?limit=${limit}&_t=${Date.now()}`),
  monthlyTrend: (months = 6) => api.get(`/dashboard/monthly-trend?months=${months}&_t=${Date.now()}`),
}

export const transactionApi = {
  list: (skip = 0, limit = 20) => api.get(`/transactions?skip=${skip}&limit=${limit}`),
  get: (id: string) => api.get(`/transactions/${id}`),
  create: (data: any) => api.post('/transactions', data),
  update: (id: string, data: any) => api.put(`/transactions/${id}`, data),
  delete: (id: string) => api.delete(`/transactions/${id}`),
  deleteAll: () => api.delete('/transactions'),
}

export const categoryApi = {
  list: () => api.get('/categories'),
  create: (data: any) => api.post('/categories', data),
  delete: (id: string) => api.delete(`/categories/${id}`),
}

export const ocrApi = {
  scan: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/ocr/process', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  getProvider: () => api.get('/ocr/provider'),
}
