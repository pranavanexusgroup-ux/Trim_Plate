import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { UserProfile, Address } from '../types';

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  selectedLocation: string;
  setSelectedLocation: (loc: string) => void;
  login: (identifier: string, password: string) => Promise<UserProfile>;
  register: (data: {
    name: string;
    email: string;
    mobile: string;
    password: string;
    dietary_preference: string;
  }) => Promise<UserProfile>;
  socialLogin: (payload: {
    provider: 'google' | 'facebook';
    email: string;
    name: string;
    avatar_url?: string;
    dietary_preference?: string;
    mobile?: string;
  }) => Promise<UserProfile>;
  quickAccess: (mode: 'customer' | 'admin') => Promise<UserProfile>;
  refreshProfile: () => Promise<void>;
  addAddress: (addr: Omit<Address, 'id' | 'user_id'>) => Promise<void>;
  deleteAddress: (id: number) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocationState] = useState<string>(
    () => localStorage.getItem('tp_location') || 'Kolkata - 700001'
  );

  const setSelectedLocation = useCallback((loc: string) => {
    setSelectedLocationState(loc);
    localStorage.setItem('tp_location', loc);
  }, []);

  const refreshProfile = useCallback(async () => {
    const token = localStorage.getItem('tp_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get<UserProfile>('/auth/me');
      setUser(data);
      if (data.addresses && data.addresses.length > 0) {
        const def = data.addresses[0];
        setSelectedLocation(`${def.city} - ${def.pincode}`);
      }
    } catch {
      localStorage.removeItem('tp_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [setSelectedLocation]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const login = async (identifier: string, password: string) => {
    const { data } = await api.post<{ token: string; user: UserProfile }>('/auth/login', { identifier, password });
    localStorage.setItem('tp_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload: {
    name: string;
    email: string;
    mobile: string;
    password: string;
    dietary_preference: string;
  }) => {
    const { data } = await api.post<{ token: string; user: UserProfile }>('/auth/register', payload);
    localStorage.setItem('tp_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const socialLogin = async (payload: {
    provider: 'google' | 'facebook';
    email: string;
    name: string;
    avatar_url?: string;
    dietary_preference?: string;
    mobile?: string;
  }) => {
    const { data } = await api.post<{ token: string; user: UserProfile }>('/auth/social-login', payload);
    localStorage.setItem('tp_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const quickAccess = async (mode: 'customer' | 'admin') => {
    const { data } = await api.post<{ token: string; user: UserProfile }>('/auth/quick-access', { mode });
    localStorage.setItem('tp_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const addAddress = async (addr: Omit<Address, 'id' | 'user_id'>) => {
    const { data } = await api.post<{ addresses: Address[] }>('/addresses', addr);
    setUser((prev) => (prev ? { ...prev, addresses: data.addresses } : prev));
  };

  const deleteAddress = async (id: number) => {
    const { data } = await api.delete<{ addresses: Address[] }>(`/addresses/${id}`);
    setUser((prev) => (prev ? { ...prev, addresses: data.addresses } : prev));
  };

  const logout = () => {
    localStorage.removeItem('tp_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        selectedLocation,
        setSelectedLocation,
        login,
        register,
        socialLogin,
        quickAccess,
        refreshProfile,
        addAddress,
        deleteAddress,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
