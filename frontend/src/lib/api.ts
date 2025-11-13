import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Subscription {
  id: string;
  status: string;
  currentPeriodEnd: string;
  leadsPerWeek: number;
  leadsUsedThisWeek: number;
  cancelAtPeriodEnd: boolean;
}

export interface Search {
  id: string;
  query: string;
  category?: string;
  location?: string;
  status: string;
  totalSites: number;
  wpSitesFound: number;
  createdAt: string;
}

export interface Lead {
  id: string;
  url: string;
  businessName?: string;
  isWordPress: boolean;
  wpVersion?: string;
  wpOutdated?: boolean;
  plugins: any[];
  themes: any[];
  woocommerce?: any;
  score?: number;
  createdAt: string;
}

export const authApi = {
  register: (email: string, password: string, name?: string) =>
    api.post<AuthResponse>('/api/auth/register', { email, password, name }),

  login: (email: string, password: string) =>
    api.post<AuthResponse>('/api/auth/login', { email, password }),
};

export const subscriptionApi = {
  createCheckout: () =>
    api.post<{ sessionId: string; url: string }>('/api/subscription/create-checkout'),

  getStatus: () =>
    api.get<Subscription>('/api/subscription/status'),

  cancel: () =>
    api.post('/api/subscription/cancel'),
};

export const searchApi = {
  create: (query: string, category?: string, location?: string) =>
    api.post<{ searchId: string; message: string }>('/api/search', { query, category, location }),

  getAll: () =>
    api.get<Search[]>('/api/search'),

  getOne: (searchId: string) =>
    api.get<Search>(`/api/search/${searchId}`),

  getLeads: (searchId: string) =>
    api.get<Lead[]>(`/api/search/${searchId}/leads`),
};

export default api;
