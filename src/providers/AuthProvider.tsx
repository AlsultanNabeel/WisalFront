import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { institutionAuthService, type InstitutionLoginPayload } from '@/api/services';
import { setAuthToken } from '@/api/api';
import { isEmployeeRole, type EmployeeRole } from '@/constants/roles';

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(normalized);
    return JSON.parse(decodeURIComponent(escape(decoded)));
  } catch {
    return null;
  }
}

interface JwtClaims {
  sub?: unknown;
  role?: unknown;
  institutionId?: unknown;
  [key: string]: unknown;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  initializing: boolean;
  institutionId: string | null;
  role: EmployeeRole | null;
  employeeId: string | null;
  login: (payload: InstitutionLoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function useAuthProviderState() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [institutionId, setInstitutionId] = useState<string | null>(() =>
    localStorage.getItem('institutionId'),
  );
  const [role, setRole] = useState<EmployeeRole | null>(() => {
    const stored = localStorage.getItem('employeeRole');
    return stored && isEmployeeRole(stored) ? stored : null;
  });
  const [employeeId, setEmployeeId] = useState<string | null>(() =>
    localStorage.getItem('employeeId'),
  );

  const persistInstitutionId = useCallback((value: string | null) => {
    setInstitutionId(value);
    if (value) {
      localStorage.setItem('institutionId', value);
    } else {
      localStorage.removeItem('institutionId');
    }
  }, []);

  const persistRole = useCallback((value: EmployeeRole | null) => {
    setRole(value);
    if (value) {
      localStorage.setItem('employeeRole', value);
    } else {
      localStorage.removeItem('employeeRole');
    }
  }, []);

  const persistEmployeeId = useCallback((value: string | null) => {
    setEmployeeId(value);
    if (value) {
      localStorage.setItem('employeeId', value);
    } else {
      localStorage.removeItem('employeeId');
    }
  }, []);

  const applyAuthResponse = useCallback(
    (response: unknown) => {
      let nextRole: EmployeeRole | null = null;
      let nextInstitutionId: string | null = null;
      let nextEmployeeId: string | null = null;

      if (!response || typeof response !== 'object') {
        return { role: nextRole, institutionId: nextInstitutionId, employeeId: nextEmployeeId };
      }

      const payload = response as Record<string, unknown>;
      const maybeToken = payload.accessToken;
      if (typeof maybeToken === 'string' && maybeToken) {
        setAuthToken(maybeToken);
        const claims = decodeJwt(maybeToken) as JwtClaims | null;
        if (claims) {
          const derivedInstitutionId =
            typeof claims.institutionId === 'string' && claims.institutionId ? claims.institutionId : null;
          if (derivedInstitutionId) {
            persistInstitutionId(derivedInstitutionId);
            nextInstitutionId = derivedInstitutionId;
          }

          const derivedRole = isEmployeeRole(claims.role) ? claims.role : null;
          if (derivedRole) {
            persistRole(derivedRole);
            nextRole = derivedRole;
          }

          const derivedEmployeeId =
            typeof claims.sub === 'string' && claims.sub ? claims.sub : null;
          if (derivedEmployeeId) {
            persistEmployeeId(derivedEmployeeId);
            nextEmployeeId = derivedEmployeeId;
          }
        }
      }

      const maybeInstitutionId =
        payload.institutionId ||
        (payload.institution as { id?: unknown } | undefined)?.id ||
        (payload.user as { institutionId?: unknown } | undefined)?.institutionId;

      if (typeof maybeInstitutionId === 'string' && maybeInstitutionId) {
        persistInstitutionId(maybeInstitutionId);
        if (!nextInstitutionId) {
          nextInstitutionId = maybeInstitutionId;
        }
      }

      const maybeRole =
        payload.role || (payload.user as { role?: unknown } | undefined)?.role;
      if (isEmployeeRole(maybeRole) && !nextRole) {
        persistRole(maybeRole);
        nextRole = maybeRole;
      }

      const maybeEmployeeId =
        payload.id ||
        (payload.user as { id?: unknown } | undefined)?.id;
      if (typeof maybeEmployeeId === 'string' && maybeEmployeeId && !nextEmployeeId) {
        persistEmployeeId(maybeEmployeeId);
        nextEmployeeId = maybeEmployeeId;
      }

      return { role: nextRole, institutionId: nextInstitutionId, employeeId: nextEmployeeId };
    },
    [persistEmployeeId, persistInstitutionId, persistRole],
  );

  const refresh = useCallback(async () => {
    try {
      const response = await institutionAuthService.refresh();
      applyAuthResponse(response);
      setIsAuthenticated(true);
    } catch (error) {
      setAuthToken(null);
      setIsAuthenticated(false);
      persistInstitutionId(null);
      persistRole(null);
      persistEmployeeId(null);
      throw error;
    }
  }, [applyAuthResponse, persistEmployeeId, persistInstitutionId, persistRole]);

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } catch (error) {
        console.info('Auth refresh skipped:', error);
      } finally {
        setInitializing(false);
      }
    })();
  }, [refresh]);

  const login = useCallback(
    async (payload: InstitutionLoginPayload) => {
      try {
        const response = await institutionAuthService.login(payload);
        applyAuthResponse(response);
        setIsAuthenticated(true);
      } catch (error) {
        setAuthToken(null);
        setIsAuthenticated(false);
        persistInstitutionId(null);
        persistRole(null);
        persistEmployeeId(null);
        throw error;
      }
    },
    [applyAuthResponse, persistEmployeeId, persistInstitutionId, persistRole],
  );

  const logout = useCallback(async () => {
    try {
      await institutionAuthService.logout();
    } finally {
      setAuthToken(null);
      setIsAuthenticated(false);
      persistInstitutionId(null);
      persistRole(null);
      persistEmployeeId(null);
    }
  }, [persistEmployeeId, persistInstitutionId, persistRole]);

  return useMemo(
    () => ({
      isAuthenticated,
      initializing,
      institutionId,
      role,
      employeeId,
      login,
      logout,
      refresh,
    }),
    [employeeId, institutionId, isAuthenticated, initializing, login, logout, refresh, role],
  );
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const value = useAuthProviderState();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
