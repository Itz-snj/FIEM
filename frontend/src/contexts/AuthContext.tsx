import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import API from '@/lib/api';

export type UserRole = 'user' | 'driver' | 'hospital' | 'emergency_executive';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth token
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Real API login
    try {
      const resp = await API.UserAPI.login({ email, password });
      // Expecting { user, token }
      const apiUser = (resp as any).user || (resp as any).data || resp;
      const token = (resp as any).token || (resp as any).auth_token || (resp as any).data?.token;

      // Map API user to our AuthContext.User shape
      const mapped: User = {
        id: apiUser?.id || apiUser?._id || apiUser?.userId || String(Date.now()),
        email: apiUser?.email || email,
        role: apiUser?.role || (apiUser?.userRole as any) || 'user',
        name: apiUser?.name || apiUser?.fullName || apiUser?.full_name || 'User',
        phone: apiUser?.phone || undefined
      };

      setUser(mapped);
      localStorage.setItem('user', JSON.stringify(mapped));
      if (token) {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('token', token);
      }
      return;
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  };

  const register = async (email: string, password: string, name: string, role: UserRole) => {
    // Real API register
    try {
      // API.UserAPI.register expects more fields; provide what's available
      const resp = await API.UserAPI.register({
        fullName: name,
        email,
        phone: '',
        password,
        role
      } as any);

      const apiUser = (resp as any).user || resp;
      const token = (resp as any).token || (resp as any).auth_token || (resp as any).data?.token;

      const mapped: User = {
        id: apiUser?.id || apiUser?._id || String(Date.now()),
        email: apiUser?.email || email,
        role: apiUser?.role || role,
        name: apiUser?.name || apiUser?.fullName || name,
        phone: apiUser?.phone || undefined
      };

      setUser(mapped);
      localStorage.setItem('user', JSON.stringify(mapped));
      if (token) {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('token', token);
      }
      return;
    } catch (err) {
      console.error('Registration error:', err);
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('auth_token');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
