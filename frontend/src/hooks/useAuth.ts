import { useState, useEffect, useCallback } from 'react';
import { UserPersona } from '../types/api';
import { fetchPersonas, loginPersona, loginUser, registerUser } from '../api/client';

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('agent_token'));
  const [currentUser, setCurrentUser] = useState<UserPersona | null>(() => {
    const saved = sessionStorage.getItem('agent_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [personas, setPersonas] = useState<UserPersona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const register = useCallback(async (email: string, password: string, department?: string) => {
    setLoading(true);
    setError(null);
    try {
      const { access_token, user } = await registerUser(email, password, department);
      setToken(access_token);
      setCurrentUser(user);
      sessionStorage.setItem('agent_token', access_token);
      sessionStorage.setItem('agent_user', JSON.stringify(user));
    } catch (err: any) {
      setError(err.message || 'Failed to register account');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (identifier: string, password: string = 'devpassword') => {
    setLoading(true);
    setError(null);
    try {
      let res;
      try {
        res = await loginUser(identifier, password);
      } catch (err: any) {
        if (password === 'devpassword') {
          res = await loginPersona(identifier);
        } else {
          throw err;
        }
      }
      setToken(res.access_token);
      setCurrentUser(res.user);
      sessionStorage.setItem('agent_token', res.access_token);
      sessionStorage.setItem('agent_user', JSON.stringify(res.user));
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate user');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setCurrentUser(null);
    sessionStorage.removeItem('agent_token');
    sessionStorage.removeItem('agent_user');
  }, []);

  const switchUser = useCallback(async (username: string) => {
    await login(username, 'devpassword');
  }, [login]);

  useEffect(() => {
    let mounted = true;
    async function initAuth() {
      try {
        const list = await fetchPersonas();
        if (!mounted) return;
        setPersonas(list);

        // If user was previously logged in, refresh token
        const savedToken = sessionStorage.getItem('agent_token');
        const savedUserStr = sessionStorage.getItem('agent_user');
        if (savedToken && savedUserStr) {
          try {
            const savedUser = JSON.parse(savedUserStr);
            await login(savedUser.username || savedUser.email, 'devpassword');
          } catch {
            logout();
          }
        }
      } catch (err: any) {
        if (!mounted) return;
        setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    initAuth();
    return () => {
      mounted = false;
    };
  }, [login, logout]);

  return {
    token,
    currentUser,
    personas,
    loading,
    error,
    isAuthenticated: !!token && !!currentUser,
    register,
    login,
    logout,
    switchUser,
  };
}
