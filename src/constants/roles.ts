export type EmployeeRole = 'ADMIN' | 'DISTRIBUTER' | 'PUBLISHER' | 'DELIVERER';

export const ROLE_DEFAULT_ROUTE: Record<EmployeeRole, string> = {
  ADMIN: '/',
  DISTRIBUTER: '/distribution',
  PUBLISHER: '/posts',
  DELIVERER: '/deliver',
};

export function isEmployeeRole(value: unknown): value is EmployeeRole {
  return (
    value === 'ADMIN' ||
    value === 'DISTRIBUTER' ||
    value === 'PUBLISHER' ||
    value === 'DELIVERER'
  );
}

export function getDefaultRouteForRole(role: EmployeeRole | null | undefined) {
  if (!role) {
    return '/';
  }
  return ROLE_DEFAULT_ROUTE[role] ?? '/';
}
