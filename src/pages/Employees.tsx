import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  employeesService,
  type Employee,
  type AssignRolePayload,
  type CreateEmployeePayload,
} from '@/api/services';
import { useAuth } from '@/providers/AuthProvider';
import { toErrorMessage } from '@/utils/error';

const ROLE_OPTIONS: Array<{ value: AssignRolePayload['role']; label: string }> = [
  { value: 'ADMIN', label: 'مدير' },
  { value: 'DISTRIBUTER', label: 'موزع' },
  { value: 'PUBLISHER', label: 'ناشر' },
  { value: 'DELIVERER', label: 'مسلّم' },
];

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'نشط' },
  { value: 'INACTIVE', label: 'غير نشط' },
];

const employeeCreateSchema = z.object({
  fullName: z.string().trim().min(3, { message: 'يجب ألا يقل الاسم عن 3 أحرف' }),
  email: z
    .string()
    .trim()
    .email({ message: 'يرجى إدخال بريد إلكتروني صالح' }),
  password: z.string().min(6, { message: 'كلمة المرور يجب ألا تقل عن 6 أحرف' }),
  role: z.enum(['ADMIN', 'DISTRIBUTER', 'PUBLISHER', 'DELIVERER'], {
    errorMap: () => ({ message: 'يرجى اختيار دور' }),
  }),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

type EmployeeCreateForm = z.infer<typeof employeeCreateSchema>;

function translateStatus(status?: string) {
  if (!status) return 'غير محدد';
  if (status === 'ACTIVE') return 'نشط';
  if (status === 'INACTIVE') return 'معطل';
  return status;
}

export default function EmployeesPage() {
  const { institutionId } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const employeesQuery = useQuery({
    queryKey: ['employees', institutionId],
    queryFn: () => employeesService.list(),
    enabled: Boolean(institutionId),
    initialData: [] as Employee[],
  });

  const statsQuery = useQuery({
    queryKey: ['employees', institutionId, 'stats'],
    queryFn: () => employeesService.stats(),
    enabled: Boolean(institutionId),
  });

  const {
    register: registerCreateEmployee,
    handleSubmit: handleSubmitCreateEmployee,
    reset: resetCreateEmployeeForm,
    formState: { errors: createEmployeeErrors, isSubmitting: isSubmittingCreateEmployee },
  } = useForm<EmployeeCreateForm>({
    resolver: zodResolver(employeeCreateSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      role: 'DISTRIBUTER',
      status: 'ACTIVE',
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status?: string }) =>
      status === 'ACTIVE' ? employeesService.deactivate(id) : employeesService.activate(id),
    onMutate: () => setFeedback(null),
    onSuccess: () => {
      setFeedback('تم تحديث حالة الموظف بنجاح');
      queryClient.invalidateQueries({ queryKey: ['employees', institutionId] });
    },
    onError: (error: unknown) =>
      setFeedback(toErrorMessage(error, 'تعذر تحديث حالة الموظف، حاول مرة أخرى')),
  });

  const assignRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: AssignRolePayload['role'] }) =>
      employeesService.assignRole(id, { role }),
    onMutate: () => setFeedback(null),
    onSuccess: () => {
      setFeedback('تم تحديث دور الموظف');
      queryClient.invalidateQueries({ queryKey: ['employees', institutionId] });
    },
    onError: (error: unknown) =>
      setFeedback(toErrorMessage(error, 'تعذر تحديث دور الموظف، حاول مرة أخرى')),
  });

  const createEmployeeMutation = useMutation({
    mutationFn: async (values: EmployeeCreateForm) => {
      if (!institutionId) throw new Error('لا يمكن إنشاء موظف بدون مؤسسة مرتبطة');
      const payload: CreateEmployeePayload = {
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        password: values.password,
        status: values.status,
        institutionId,
      };

      const createdEmployee = await employeesService.create(payload);

      if (createdEmployee?.id && values.role) {
        await employeesService.assignRole(createdEmployee.id, { role: values.role });
      }

      return createdEmployee;
    },
    onMutate: () => {
      setFormError(null);
      setFeedback(null);
    },
    onSuccess: () => {
      setFeedback('تم إنشاء الموظف بنجاح');
      queryClient.invalidateQueries({ queryKey: ['employees', institutionId] });
      resetCreateEmployeeForm();
      setIsCreateModalOpen(false);
    },
    onError: (error: unknown) => {
      setFormError(toErrorMessage(error, 'تعذر إنشاء الموظف، حاول مرة أخرى'));
    },
  });

  const submitCreateEmployee = handleSubmitCreateEmployee((values) => {
    createEmployeeMutation.mutate(values);
  });

  const employees = useMemo(() => {
    const list = employeesQuery.data ?? [];
    if (!searchTerm.trim()) return list;
    const term = searchTerm.trim().toLowerCase();
    return list.filter((employee) =>
      `${employee.fullName ?? ''} ${employee.email ?? ''}`.toLowerCase().includes(term),
    );
  }, [employeesQuery.data, searchTerm]);

  const totalEmployees = (statsQuery.data as Record<string, unknown> | undefined)?.total as
    | number
    | undefined;
  const activeEmployees = (statsQuery.data as Record<string, unknown> | undefined)?.active as
    | number
    | undefined;
  const inactiveEmployees = (statsQuery.data as Record<string, unknown> | undefined)?.inactive as
    | number
    | undefined;

  return (
    <div className="min-h-screen bg-white font-body p-4 md:p-6 lg:p-8" dir="rtl">
      <Header
        className="mb-6"
        title="إدارة الموظفين"
        subtitle="إشراف على فريق العمل وأدوارهم وصلاحياتهم"
      />

      {feedback && (
        <div className="mb-4 p-3 rounded-lg border border-primary/30 bg-primary/5 text-primary text-sm text-right">
          {feedback}
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">
            أضف موظفًا جديدًا وحدد دوره وصلاحياته داخل المؤسسة.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetCreateEmployeeForm({
              fullName: '',
              email: '',
              password: '',
              role: 'DISTRIBUTER',
              status: 'ACTIVE',
            });
            setFormError(null);
            setIsCreateModalOpen(true);
          }}
          disabled={!institutionId}
          className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed self-start sm:self-auto"
        >
          إضافة موظف
        </button>
      </div>

      <section className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="إجمالي الموظفين" value={totalEmployees ?? employeesQuery.data?.length ?? 0} />
        <StatCard title="الموظفون النشطون" value={activeEmployees ?? '—'} />
        <StatCard title="الموظفون المعطلون" value={inactiveEmployees ?? '—'} />
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h2 className="font-heading text-lg font-bold text-gray-800">قائمة الموظفين</h2>
            <p className="text-sm text-gray-500">إدارة الأدوار والحالات لكل عضو في الفريق</p>
          </div>
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="ابحث بالاسم أو البريد الإلكتروني"
            className="w-full md:w-64 p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-gray-600 bg-gray-50">
                <th className="p-3">الاسم</th>
                <th className="p-3">البريد الإلكتروني</th>
                <th className="p-3">الدور</th>
                <th className="p-3">الحالة</th>
                <th className="p-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {employeesQuery.isLoading && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    جارٍ تحميل البيانات…
                  </td>
                </tr>
              )}
              {!employeesQuery.isLoading && employees.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    لا يوجد موظفون مطابقون.
                  </td>
                </tr>
              )}
              {employees.map((employee) => (
                <tr key={employee.id ?? employee.email} className="border-b border-gray-100">
                  <td className="p-3 font-bold text-gray-800">{employee.fullName ?? '—'}</td>
                  <td className="p-3 text-gray-600">{employee.email ?? '—'}</td>
                  <td className="p-3">
                    <select
                      value={(employee.role as AssignRolePayload['role']) || ''}
                      onChange={(event) =>
                        assignRoleMutation.mutate({
                          id: employee.id as string,
                          role: event.target.value as AssignRolePayload['role'],
                        })
                      }
                      className="w-40 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary appearance-none text-right"
                      disabled={!employee.id || assignRoleMutation.isLoading}
                    >
                      <option value="">اختر الدور</option>
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3 text-gray-600">{translateStatus(employee.status)}</td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        toggleStatusMutation.mutate({
                          id: employee.id as string,
                          status: employee.status as string | undefined,
                        })
                      }
                      disabled={!employee.id || toggleStatusMutation.isLoading}
                      className="px-3 py-1 rounded-lg border text-xs font-bold"
                      style={{
                        borderColor: employee.status === 'ACTIVE' ? '#EF4444' : '#22C55E',
                        color: employee.status === 'ACTIVE' ? '#EF4444' : '#22C55E',
                      }}
                    >
                      {employee.status === 'ACTIVE' ? 'تعطيل' : 'تفعيل'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-xl p-6 relative shadow-lg" role="dialog" aria-modal>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-3 left-3 text-gray-500 hover:text-gray-700"
              aria-label="إغلاق"
            >
              ×
            </button>
            <h2 className="font-heading font-bold text-xl mb-4 text-center">إضافة موظف جديد</h2>
            {formError && (
              <div className="mb-3 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-600 text-right">
                {formError}
              </div>
            )}
            <form onSubmit={submitCreateEmployee} className="space-y-4" dir="rtl">
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700">الاسم الكامل</label>
                <input
                  type="text"
                  {...registerCreateEmployee('fullName')}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="مثال: محمد أحمد"
                />
                {createEmployeeErrors.fullName && (
                  <span className="text-xs text-red-500">{createEmployeeErrors.fullName.message}</span>
                )}
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700">البريد الإلكتروني</label>
                <input
                  type="email"
                  {...registerCreateEmployee('email')}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="example@email.com"
                />
                {createEmployeeErrors.email && (
                  <span className="text-xs text-red-500">{createEmployeeErrors.email.message}</span>
                )}
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700">كلمة المرور</label>
                <input
                  type="password"
                  {...registerCreateEmployee('password')}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••"
                />
                {createEmployeeErrors.password && (
                  <span className="text-xs text-red-500">{createEmployeeErrors.password.message}</span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700">الدور</label>
                  <select
                    {...registerCreateEmployee('role')}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700">الحالة</label>
                  <select
                    {...registerCreateEmployee('status')}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreateEmployee || createEmployeeMutation.isLoading}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {createEmployeeMutation.isLoading ? 'جارٍ الإضافة…' : 'إضافة الموظف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
}

function StatCard({ title, value }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-right space-y-1">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-heading font-bold text-gray-800">{value}</p>
    </div>
  );
}
