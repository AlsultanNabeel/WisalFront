import { BaseService } from './baseService';
import type { components } from '@/types/api';

type CreateEmployeePayload = components['schemas']['CreateEmployeeDto'];
type UpdateEmployeePayload = components['schemas']['UpdateEmployeeDto'];
type ChangePasswordPayload = components['schemas']['ChangePasswordDto'];
type AssignRolePayload = components['schemas']['AssignRolesDto'];

type Employee = {
  id?: string;
  fullName?: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  status?: string;
  institutionId?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

type EmployeeStats = Record<string, unknown>;

class EmployeesService extends BaseService {
  list() {
    return this.get<Employee[]>('/employees');
  }

  stats() {
    return this.get<EmployeeStats>('/employees/stats');
  }

  create(payload: CreateEmployeePayload) {
    return this.post<CreateEmployeePayload, Employee>('/employees', payload);
  }

  update(id: string, payload: UpdateEmployeePayload) {
    return this.put<UpdateEmployeePayload, Employee>(`/employees/${id}`, payload);
  }

  assignRole(id: string, payload: AssignRolePayload) {
    return this.patch<AssignRolePayload, Employee>(`/employees/${id}`, payload);
  }

  activate(id: string) {
    return this.patch<undefined, Employee>(`/employees/${id}/active`, undefined);
  }

  deactivate(id: string) {
    return this.patch<undefined, Employee>(`/employees/${id}/disActive`, undefined);
  }

  changePassword(id: string, payload: ChangePasswordPayload) {
    return this.put<ChangePasswordPayload, void>(`/employees/${id}/change-password`, payload);
  }

  remove(id: string) {
    return this.delete<void>(`/employees/${id}`);
  }
}

export const employeesService = new EmployeesService();
export type {
  Employee,
  EmployeeStats,
  CreateEmployeePayload,
  UpdateEmployeePayload,
  ChangePasswordPayload,
  AssignRolePayload,
};
