// context/AuthContext.jsx - Authentication state management and API integration
import { createContext, useContext, useState } from 'react';
import api from '../api/client.js';
import { API } from '../api/constants.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('sms_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post(API.AUTH.LOGIN, { email, password });
      const payload = res.data ?? res;
      const { token, user: userData } = payload;
      if (!token || !userData) return { success: false, message: 'Unexpected response from server' };
      localStorage.setItem('sms_token', token);
      localStorage.setItem('sms_user', JSON.stringify(userData));
      setUser(userData);
      return { success: true, role: userData.role };
    } catch (err) {
      return { success: false, message: err.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('sms_token');
    localStorage.removeItem('sms_user');
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('sms_user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
