import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useLocation } from 'wouter';

interface UserPreferences {
  tema?: 'light' | 'dark' | 'system';
  idioma?: string;
  notificacoes?: boolean;
  emailNotificacoes?: boolean;
}

interface User {
  id: string;
  nome: string;
  email: string;
  funcao: 'comercial' | 'integracao' | 'onboarding' | 'admin';
  nivelPermissao: 'administrador' | 'operador' | 'analista';
  fotoUrl?: string;
  telefone?: string;
  ativo: boolean;
  googleConnected?: boolean;
  primeiroLogin?: boolean;
  twoFactorEnabled?: boolean;
  preferencias?: UserPreferences;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  // Função para buscar dados atualizados do usuário
  const refreshUser = useCallback(async () => {
    const storedToken = localStorage.getItem('auth_token');
    if (!storedToken) return;

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
      }
    } catch (error) {
      console.error('Erro ao atualizar dados do usuário:', error);
    }
  }, []);

  // Carregar dados do localStorage ao iniciar
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    const storedLoginTime = localStorage.getItem('auth_login_time');

    if (storedToken && storedUser && storedLoginTime) {
      const loginTime = parseInt(storedLoginTime);
      const currentTime = Date.now();
      const hoursPassed = (currentTime - loginTime) / (1000 * 60 * 60);

      // Verificar se passaram mais de 23 horas
      if (hoursPassed < 23) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } else {
        // Token expirado, limpar dados
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_login_time');
      }
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha: password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao fazer login');
      }

      const data = await response.json();

      // Salvar no estado e localStorage
      setToken(data.accessToken);
      setUser(data.user);
      localStorage.setItem('auth_token', data.accessToken);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      localStorage.setItem('auth_login_time', Date.now().toString());

      // Redirecionar para dashboard
      setLocation('/');
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  };

  const logout = async () => {
    // Tentar fazer logout no servidor
    try {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });
      }
    } catch (error) {
      console.error('Erro ao fazer logout no servidor:', error);
    }

    // Limpar estado local
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_login_time');
    setLocation('/login');
  };

  const isAdmin = user?.nivelPermissao === 'administrador';
  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        login,
        logout,
        refreshUser,
        isAdmin,
      }}
    >
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
