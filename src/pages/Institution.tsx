import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import UploadIcon from '@/assets/institution/upload-new-post.svg';
import AddIcon from '@/assets/institution/add-icon.svg';
import DeleteIcon from '@/assets/institution/delete-icon.svg';
import PlusWhiteIcon from '@/assets/institution/Vector (1).svg';
import PostersIcon from '@/assets/institution/posters.svg';
import ShareIcon from '@/assets/institution/share-icon.svg';
import TruckIcon from '@/assets/institution/truck.svg';
import EmployeesTotalIcon from '@/assets/institution/employees-total-number.svg';
import EmployeesCodesIcon from '@/assets/institution/employees-codes.svg';
import WaitApproveIcon from '@/assets/institution/wait-to-approve.svg';
import Pic1 from '@/assets/institution/pic1.png';
import Pic2 from '@/assets/institution/pic2.png';
import Pic3 from '@/assets/institution/pic3.png';
import PdfIcon from '@/assets/institution/pdf.svg';
import { useAuth } from '@/providers/AuthProvider';
import {
  institutionsService,
  postsService,
  employeesService,
  uploadsService,
  type Post,
  type Employee,
  type UploadResponse,
  type UpdateInstitutionPayload,
  type CreateEmployeePayload,
  type AssignRolePayload,
  type CreatePostPayload,
} from '@/api/services';
import { toErrorMessage } from '@/utils/error';

const FALLBACK_IMAGES = [Pic1, Pic2, Pic3];
const EMPLOYEE_STATUS = ['ACTIVE', 'INACTIVE'] as const;

type TeamRole = 'PUBLISHER' | 'DISTRIBUTER' | 'DELIVERER';

const ROLE_META: Record<TeamRole, { modalTitle: string; roleLabel: string }> = {
  PUBLISHER: { modalTitle: 'إضافة ناشر جديد', roleLabel: 'الناشر' },
  DISTRIBUTER: { modalTitle: 'إضافة موزع جديد', roleLabel: 'الموزع' },
  DELIVERER: { modalTitle: 'إضافة مسلّم جديد', roleLabel: 'المسلّم' },
};

const employeeSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, { message: 'يجب ألا يقل الاسم عن 3 أحرف' }),
  email: z
    .string()
    .trim()
    .email({ message: 'بريد إلكتروني غير صالح' }),
  password: z
    .string()
    .min(6, { message: 'يجب ألا تقل كلمة المرور عن 6 أحرف' }),
  status: z.enum(EMPLOYEE_STATUS).default('ACTIVE'),
});

type EmployeeForm = z.infer<typeof employeeSchema>;

const postSchema = z.object({
  title: z.string().min(3, { message: 'يجب ألا يقل العنوان عن 3 أحرف' }).max(120),
  summary: z
    .string()
    .max(160, { message: 'الملخص لا يجب أن يتجاوز 160 حرفًا' })
    .optional(),
  details: z.string().min(5, { message: 'يجب ألا يقل المحتوى عن 5 أحرف' }),
});

type PostForm = z.infer<typeof postSchema>;

function formatNumber(value: number | undefined) {
  return typeof value === 'number' ? value.toLocaleString('ar-EG') : '—';
}

function formatChange(value: number | undefined) {
  if (typeof value !== 'number') return undefined;
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value}%`;
}

function formatDate(value: string | undefined) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    return value;
  }
}

export default function Institution() {
  const { institutionId } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState({ name: '', email: '', phone: '' });
  const [localImages, setLocalImages] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [teamModal, setTeamModal] = useState<TeamRole | null>(null);
  const [teamFormError, setTeamFormError] = useState<string | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [postFormError, setPostFormError] = useState<string | null>(null);
  const [postSelectedFile, setPostSelectedFile] = useState<File | null>(null);
  const [postFilePreview, setPostFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deletingImageRef = useRef<string | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const postFileInputRef = useRef<HTMLInputElement>(null);
  const postObjectUrlRef = useRef<string | null>(null);

  const {
    register: registerEmployee,
    handleSubmit: handleSubmitEmployee,
    reset: resetEmployeeForm,
    formState: { errors: employeeErrors },
  } = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { fullName: '', email: '', password: '', status: 'ACTIVE' },
  });

  const {
    register: registerPost,
    handleSubmit: handleSubmitPost,
    reset: resetPostForm,
    formState: { errors: postErrors },
  } = useForm<PostForm>({
    resolver: zodResolver(postSchema),
    defaultValues: { title: '', summary: '', details: '' },
  });

  const institutionQuery = useQuery({
    queryKey: ['institution', institutionId],
    queryFn: () => institutionsService.getById(institutionId as string),
    enabled: Boolean(institutionId),
  });

  const statsQuery = useQuery({
    queryKey: ['institution', institutionId, 'stats'],
    queryFn: () => institutionsService.getStats(institutionId as string),
    enabled: Boolean(institutionId),
  });

  const postsQuery = useQuery({
    queryKey: ['posts', 'institution', institutionId],
    queryFn: () => postsService.listByInstitution(institutionId as string),
    enabled: Boolean(institutionId),
    initialData: [] as Post[],
  });

  const employeesQuery = useQuery({
    queryKey: ['employees', 'institution', institutionId],
    queryFn: () => employeesService.list(),
    enabled: Boolean(institutionId),
    initialData: [] as Employee[],
  });

  const imagesQuery = useQuery<string[]>({
    queryKey: ['institution', institutionId, 'images'],
    queryFn: async () => {
      const response = await uploadsService.listInstitutionImages(institutionId as string);

      if (Array.isArray(response)) {
        return response as string[];
      }

      if (response && typeof response === 'object') {
        const payload = response as UploadResponse;
        if (Array.isArray(payload.urls)) {
          return payload.urls.filter((item): item is string => typeof item === 'string');
        }
        if (typeof payload.url === 'string') {
          return [payload.url];
        }
      }

      return [];
    },
    enabled: Boolean(institutionId),
    initialData: [] as string[],
  });

  const stats = useMemo(() => {
    const rawStats = statsQuery.data ?? {};
    const employees = employeesQuery.data ?? [];

    const pendingApprovals = Number((rawStats as Record<string, unknown>).pendingApprovals) || 0;
    const urgentApprovals = Number((rawStats as Record<string, unknown>).urgentApprovals) || 0;
    const jobCodes = Number((rawStats as Record<string, unknown>).jobCodes) || 0;
    const newJobCodes = Number((rawStats as Record<string, unknown>).newJobCodes) || 0;
    const employeeCount =
      Number((rawStats as Record<string, unknown>).totalEmployees) || employees.length;
    const employeeChange = Number((rawStats as Record<string, unknown>).employeesChange);

    return [
      {
        id: 'pending',
        title: 'الموافقات المعلقة',
        value: formatNumber(pendingApprovals),
        note: urgentApprovals > 0 ? `${urgentApprovals} عاجل يحتاج موافقة` : undefined,
        icon: WaitApproveIcon,
      },
      {
        id: 'jobs',
        title: 'أكواد الوظائف',
        value: formatNumber(jobCodes),
        note: newJobCodes > 0 ? `جديد هذا الأسبوع ${newJobCodes}` : undefined,
        icon: EmployeesCodesIcon,
      },
      {
        id: 'employees',
        title: 'إجمالي عدد الموظفين',
        value: formatNumber(employeeCount),
        note: formatChange(employeeChange),
        icon: EmployeesTotalIcon,
      },
    ];
  }, [statsQuery.data, employeesQuery.data]);

  const team = useMemo(() => {
    const grouped = {
      publishers: [] as Employee[],
      distributors: [] as Employee[],
      delivery: [] as Employee[],
    };

    for (const employee of employeesQuery.data ?? []) {
      const role = String(employee.role || '').toUpperCase();
      if (role === 'PUBLISHER') {
        grouped.publishers.push(employee);
      } else if (role === 'DISTRIBUTER' || role === 'DISTRIBUTOR') {
        grouped.distributors.push(employee);
      } else if (role === 'DELIVERER') {
        grouped.delivery.push(employee);
      }
    }

    return grouped;
  }, [employeesQuery.data]);

  useEffect(() => {
    if (!institutionQuery.data) return;
    const payload = institutionQuery.data as Record<string, unknown>;
    setFormValues({
      name: typeof payload.name === 'string' ? payload.name : '',
      email: typeof payload.email === 'string' ? payload.email : '',
      phone: typeof payload.phone === 'string' ? payload.phone : '',
    });
  }, [institutionQuery.data]);

  useEffect(() => () => {
    objectUrlsRef.current.forEach((url) => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    objectUrlsRef.current = [];
  }, []);

  useEffect(() => () => {
    if (postObjectUrlRef.current) {
      URL.revokeObjectURL(postObjectUrlRef.current);
      postObjectUrlRef.current = null;
    }
  }, []);

  const institutionName = (() => {
    const name = (institutionQuery.data as { name?: unknown } | undefined)?.name;
    return typeof name === 'string' ? name : undefined;
  })();

  const institutionEmail = (() => {
    const email = (institutionQuery.data as { email?: unknown } | undefined)?.email;
    return typeof email === 'string' ? email : undefined;
  })();

  const institutionPhone = (() => {
    const phone = (institutionQuery.data as { phone?: unknown } | undefined)?.phone;
    return typeof phone === 'string' ? phone : undefined;
  })();

  const isLoadingInitial = !institutionId || institutionQuery.isLoading;

  const galleryImages = useMemo(() => {
    if ((imagesQuery.data?.length ?? 0) > 0 || localImages.length > 0) {
      return [...(imagesQuery.data ?? []), ...localImages];
    }
    return FALLBACK_IMAGES;
  }, [imagesQuery.data, localImages]);

  const uploadMutation = useMutation<UploadResponse, unknown, File>({
    mutationFn: (file) => uploadsService.uploadInstitutionImage(file, institutionId ?? undefined),
    onMutate: () => {
      setImageError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institution', institutionId, 'images'] });
    },
    onError: (error, file) => {
      if (file) {
        const fallbackUrl = URL.createObjectURL(file);
        setLocalImages((prev) => [...prev, fallbackUrl]);
        objectUrlsRef.current.push(fallbackUrl);
      }
      setImageError('تعذر رفع الصورة، تم حفظها مؤقتًا محليًا.');
    },
  });

  const deleteMutation = useMutation<UploadResponse, unknown, string>({
    mutationFn: (imageName) => uploadsService.deleteInstitutionImage(imageName, institutionId ?? undefined),
    onMutate: (imageName) => {
      deletingImageRef.current = imageName;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institution', institutionId, 'images'] });
    },
    onError: () => {
      setImageError('تعذر حذف الصورة، حاول مرة أخرى.');
    },
    onSettled: () => {
      deletingImageRef.current = null;
    },
  });

  const createEmployeeMutation = useMutation({
    mutationFn: async (variables: EmployeeForm & { role: TeamRole }) => {
      if (!institutionId) {
        throw new Error('لا توجد مؤسسة مرتبطة بالحساب');
      }

      const payload: CreateEmployeePayload = {
        fullName: variables.fullName.trim(),
        email: variables.email.trim(),
        password: variables.password,
        status: variables.status,
        institutionId,
      };

      const createdEmployee = await employeesService.create(payload);

      if (createdEmployee?.id) {
        const assignPayload: AssignRolePayload = { role: variables.role };
        await employeesService.assignRole(createdEmployee.id, assignPayload);
      }

      return createdEmployee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', 'institution', institutionId] });
      setTeamFormError(null);
      closeTeamModal();
    },
    onError: (error: unknown) => {
      setTeamFormError(toErrorMessage(error, 'تعذر إضافة العضو، حاول مرة أخرى'));
    },
  });

  const createPostMutation = useMutation({
    mutationFn: (payload: CreatePostPayload) => postsService.create(payload),
    onSuccess: async (createdPost) => {
      if (createdPost?.id && postSelectedFile) {
        await uploadsService.uploadPostImages(createdPost.id, [postSelectedFile]);
      }
      setPostFormError(null);
      queryClient.invalidateQueries({ queryKey: ['posts', 'institution', institutionId] });
      closePostModal();
    },
    onError: (error: unknown) => {
      setPostFormError(toErrorMessage(error, 'تعذر إنشاء المنشور'));
    },
  });

  const updateInstitutionMutation = useMutation<unknown, unknown, UpdateInstitutionPayload>({
    mutationFn: (payload) => institutionsService.update(institutionId as string, payload),
    onMutate: () => {
      setUpdateError(null);
    },
    onSuccess: (updatedInstitution, variables) => {
      queryClient.setQueryData(['institution', institutionId], (current) => {
        if (updatedInstitution && typeof updatedInstitution === 'object') {
          return {
            ...(current as Record<string, unknown> | undefined),
            ...(updatedInstitution as Record<string, unknown>),
          };
        }
        if (variables) {
          const entries = Object.entries(variables).filter(
            ([, value]) => value !== undefined && value !== null,
          );
          return {
            ...(current as Record<string, unknown> | undefined),
            ...Object.fromEntries(entries),
          };
        }
        return current;
      });

      setFormValues((prev) => {
        const updatedRecord = updatedInstitution as Record<string, unknown> | undefined;
        const nextName =
          (typeof updatedRecord?.name === 'string' && updatedRecord.name) ||
          (variables?.name as string | undefined) ||
          prev.name;
        const nextEmail =
          (typeof updatedRecord?.email === 'string' && updatedRecord.email) ||
          (variables?.email as string | undefined) ||
          prev.email;
        const nextPhone =
          (typeof updatedRecord?.phone === 'string' && updatedRecord.phone) ||
          (variables?.phone as string | undefined) ||
          prev.phone;

        return {
          name: nextName ?? '',
          email: nextEmail ?? '',
          phone: nextPhone ?? '',
        };
      });

      queryClient.invalidateQueries({ queryKey: ['institution', institutionId] });
      setIsEditing(false);
    },
    onError: () => {
      setUpdateError('تعذر تحديث بيانات المؤسسة، حاول مرة أخرى.');
    },
  });

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadMutation.mutate(file);
    event.target.value = '';
  }

  function handleDeleteImage(image: string) {
    if (image.startsWith('blob:')) {
      setLocalImages((prev) => prev.filter((item) => item !== image));
      URL.revokeObjectURL(image);
      objectUrlsRef.current = objectUrlsRef.current.filter((item) => item !== image);
      return;
    }
    deleteMutation.mutate(image);
  }

  function handleFieldChange(field: keyof typeof formValues, value: string) {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setUpdateError(null);
    setFormValues({
      name: institutionName ?? '',
      email: institutionEmail ?? '',
      phone: institutionPhone ?? '',
    });
  }

  function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload: UpdateInstitutionPayload = {
      name: formValues.name.trim() || undefined,
      email: formValues.email.trim() || undefined,
      phone: formValues.phone.trim() || undefined,
    };
    updateInstitutionMutation.mutate(payload);
  }

  function openTeamModal(role: TeamRole) {
    setTeamFormError(null);
    resetEmployeeForm({ fullName: '', email: '', password: '', status: 'ACTIVE' });
    setTeamModal(role);
  }

  function closeTeamModal() {
    setTeamModal(null);
    setTeamFormError(null);
    resetEmployeeForm({ fullName: '', email: '', password: '', status: 'ACTIVE' });
  }

  const submitEmployeeForm = handleSubmitEmployee((data) => {
    if (!teamModal) return;
    createEmployeeMutation.mutate({ ...data, role: teamModal });
  });

  function openPostModal() {
    setPostFormError(null);
    resetPostForm({ title: '', summary: '', details: '' });
    setPostSelectedFile(null);
    revokePostPreview();
    setIsPostModalOpen(true);
  }

  function closePostModal() {
    setIsPostModalOpen(false);
    setPostFormError(null);
    setPostSelectedFile(null);
    revokePostPreview();
    if (postFileInputRef.current) {
      postFileInputRef.current.value = '';
    }
    resetPostForm({ title: '', summary: '', details: '' });
  }

  function handlePostFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setPostSelectedFile(file);
    revokePostPreview();
    if (file) {
      const url = URL.createObjectURL(file);
      postObjectUrlRef.current = url;
      setPostFilePreview(url);
    } else {
      setPostFilePreview(null);
    }
  }

  function removePostFile() {
    setPostSelectedFile(null);
    revokePostPreview();
    if (postFileInputRef.current) {
      postFileInputRef.current.value = '';
    }
  }

  function revokePostPreview() {
    if (postObjectUrlRef.current) {
      URL.revokeObjectURL(postObjectUrlRef.current);
      postObjectUrlRef.current = null;
    }
    setPostFilePreview(null);
  }

  const submitPostForm = handleSubmitPost((data) => {
    if (!institutionId) {
      setPostFormError('لا يمكن إنشاء منشور بدون مؤسسة مرتبطة');
      return;
    }

    const payload: CreatePostPayload = {
      title: data.title,
      content: data.details,
      summary: data.summary || undefined,
      images: [],
      institutionId,
    };

    createPostMutation.mutate(payload);
  });

  if (!institutionId) {
    return (
      <div className="min-h-screen flex flex-col bg-white font-body">
        <Header className="mb-6" title="إدارة المؤسسة" subtitle="لا يوجد مؤسسة مرتبطة بالحساب" />
        <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
          تأكد من تسجيل الدخول بحساب مؤسسة صالح.
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 md:p-6 lg:p-8 font-body">
      <Header
        className="mb-6"
        title={institutionName ?? 'إدارة المؤسسة'}
        subtitle={institutionEmail ?? 'إدارة الناشرين، الموزعين، المسلِّمين والمنشورات'}
      />

      <section className="mb-8 bg-white border border-gray-200 rounded-[6px] p-4">
        {isEditing ? (
          <form className="space-y-4" onSubmit={handleEditSubmit} dir="rtl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700">اسم المؤسسة</label>
                <input
                  value={formValues.name}
                  onChange={(event) => handleFieldChange('name', event.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-right"
                  placeholder="أدخل اسم المؤسسة"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={formValues.email}
                  onChange={(event) => handleFieldChange('email', event.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-right"
                  placeholder="contact@example.com"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700">رقم الهاتف</label>
                <input
                  value={formValues.phone}
                  onChange={(event) => handleFieldChange('phone', event.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-right"
                  placeholder="00970-000-000"
                />
              </div>
            </div>
            {updateError && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg p-2 text-right">
                {updateError}
              </p>
            )}
            <div className="flex flex-wrap gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={updateInstitutionMutation.isLoading}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {updateInstitutionMutation.isLoading ? 'جارٍ الحفظ…' : 'حفظ التعديلات'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4" dir="rtl">
            <div className="space-y-1 text-right">
              <p className="text-sm text-gray-500">تفاصيل المؤسسة</p>
              <h2 className="font-heading text-xl font-bold text-gray-800">{institutionName ?? '—'}</h2>
              <div className="text-sm text-gray-600">
                <p>{institutionEmail ?? 'لا يوجد بريد إلكتروني'}</p>
                <p>{institutionPhone ?? 'لا يوجد رقم هاتف'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="self-end md:self-auto px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold"
            >
              تعديل بيانات المؤسسة
            </button>
          </div>
        )}
      </section>

      {/* Metrics row */}
      <section className="mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.id}
              className="bg-white rounded-[6px] p-4 flex items-center gap-4 border border-gray-200 justify-between"
            >
              <img src={stat.icon} alt="" className="w-12 h-12" />
              <div className="flex flex-col items-end text-right flex-1">
                <span className="text-sm text-gray-600 mb-1">{stat.title}</span>
                <span className="text-2xl font-bold font-heading text-gray-900">
                  {statsQuery.isLoading && isLoadingInitial ? '…' : stat.value}
                </span>
                {stat.note && (
                  <span className="text-xs text-gray-500 mt-1">{stat.note}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col md:flex-row-reverse gap-6">
        <div className="md:w-1/3 space-y-6">
          {/* Images section */}
          <div className="bg-white rounded-[6px] border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold font-heading text-gray-700">الصور</span>
              <div className="flex items-center gap-2">
                {imageError && <span className="text-xs text-red-500">{imageError}</span>}
                <button
                  className="text-white text-sm rounded-[6px] flex items-center justify-center gap-2 w-[85.98px] h-[32px] flex-row-reverse"
                  style={{ backgroundColor: '#9333EA' }}
                  type="button"
                  onClick={handleUploadClick}
                  disabled={uploadMutation.isLoading}
                >
                  {uploadMutation.isLoading ? 'جارٍ…' : 'تحميل'}
                  <img src={UploadIcon} alt="رفع" className="h-3.5 w-3.5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {galleryImages.map((img, index) => (
                <div key={`${img}-${index}`} className="relative group">
                  <img
                    src={img}
                    alt="صورة"
                    className="rounded-[6px] object-cover h-28 w-full border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(img)}
                    disabled={deleteMutation.isLoading && deletingImageRef.current === img}
                    className="absolute top-2 left-2 bg-white/80 text-accentRed rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition"
                  >
                    <img src={DeleteIcon} alt="حذف" className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleUploadClick}
                className="border-2 border-dashed border-gray-300 rounded-[6px] flex items-center justify-center h-28 cursor-pointer text-primary"
              >
                <img src={AddIcon} alt="إضافة صورة" className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Posts section */}
          <div className="bg-white rounded-[6px] border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold font-heading text-gray-700">المنشورات</span>
              <button
                className="text-white text-sm rounded-[6px] flex items-center justify-center gap-2 w-[127.95px] h-[32px]"
                style={{ backgroundColor: '#4F46E5' }}
                type="button"
                onClick={openPostModal}
              >
                <img src={PlusWhiteIcon} alt="إضافة" className="h-3.5 w-3.5" />
                إضافة منشور
              </button>
            </div>
            <ul className="space-y-3">
              {postsQuery.isLoading && (
                <li className="text-sm text-gray-500">جارٍ تحميل المنشورات…</li>
              )}
              {!postsQuery.isLoading && postsQuery.data.length === 0 && (
                <li className="text-sm text-gray-500">لا توجد منشورات منشورة حتى الآن.</li>
              )}
              {postsQuery.data.map((post) => (
                <li
                  key={post.id ?? post.title}
                  className="flex items-center justify-between bg-gray-50 p-2 rounded-[6px] border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center rounded-[6px] bg-secondary">
                      <img src={post.images?.length ? post.images[0] : PdfIcon} alt="" className="h-5 w-5 object-cover" />
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="font-bold text-sm text-gray-800">{post.title ?? 'منشور بدون عنوان'}</span>
                      <span className="text-xs text-gray-500">
                        {post.summary || formatDate(post.createdAt) || '—'}
                      </span>
                    </div>
                  </div>
                  <button className="text-accentRed text-lg" type="button">
                    <img src={DeleteIcon} alt="حذف" className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            <button
              className="w-full border-2 border-dashed border-gray-300 text-primary text-sm rounded-[6px] mt-3 flex flex-col items-center justify-center gap-1 py-4"
              type="button"
              onClick={openPostModal}
            >
              <img src={UploadIcon} alt="رفع" className="h-5 w-5" />
              <span>تحميل منشور جديد</span>
            </button>
          </div>
        </div>

        {/* Team management */}
        <div className="md:w-2/3">
          <div className="bg-white rounded-[6px] border border-gray-200 p-4">
            <h2 className="font-bold font-heading text-gray-700 mb-4">إدارة الفريق</h2>

            <TeamSection
              title="الناشرون"
              icon={PostersIcon}
              actionLabel="إضافة ناشر"
              actionColor="#2563EB"
              members={team.publishers}
              isLoading={employeesQuery.isLoading}
              onAction={() => openTeamModal('PUBLISHER')}
            />

            <TeamSection
              title="الموزعون"
              icon={ShareIcon}
              actionLabel="إضافة موزع"
              actionColor="#16A34A"
              members={team.distributors}
              isLoading={employeesQuery.isLoading}
              onAction={() => openTeamModal('DISTRIBUTER')}
            />

            <TeamSection
              title="التسليم"
              icon={TruckIcon}
              actionLabel="إضافة مسلّم"
              actionColor="#EA580C"
              members={team.delivery}
              isLoading={employeesQuery.isLoading}
              onAction={() => openTeamModal('DELIVERER')}
            />
          </div>
        </div>
      </section>

      {teamModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-xl p-6 relative shadow-lg" role="dialog" aria-modal>
            <button
              onClick={closeTeamModal}
              className="absolute top-3 left-3 text-gray-500 hover:text-gray-700"
              type="button"
              aria-label="إغلاق"
            >
              ×
            </button>
            <h2 className="font-heading font-bold text-xl mb-4 text-center">
              {ROLE_META[teamModal].modalTitle}
            </h2>
            {teamFormError && (
              <p className="text-red-500 text-center text-sm mb-3 bg-red-50 p-2 rounded-md border border-red-200">
                {teamFormError}
              </p>
            )}
            <form onSubmit={submitEmployeeForm} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700">الاسم الكامل</label>
                <input
                  type="text"
                  {...registerEmployee('fullName')}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="أدخل اسم العضو"
                />
                {employeeErrors.fullName && (
                  <span className="text-red-500 text-xs">{employeeErrors.fullName.message}</span>
                )}
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700">البريد الإلكتروني</label>
                <input
                  type="email"
                  {...registerEmployee('email')}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="example@example.com"
                />
                {employeeErrors.email && (
                  <span className="text-red-500 text-xs">{employeeErrors.email.message}</span>
                )}
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700">كلمة المرور</label>
                <input
                  type="password"
                  {...registerEmployee('password')}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••"
                />
                {employeeErrors.password && (
                  <span className="text-red-500 text-xs">{employeeErrors.password.message}</span>
                )}
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700">الحالة</label>
                <select
                  {...registerEmployee('status')}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="ACTIVE">نشط</option>
                  <option value="INACTIVE">غير نشط</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeTeamModal}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl text-center"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createEmployeeMutation.isLoading}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 rounded-xl text-center disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {createEmployeeMutation.isLoading ? 'جارٍ الإضافة...' : `حفظ ${ROLE_META[teamModal].roleLabel}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPostModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-xl p-6 relative shadow-lg" role="dialog" aria-modal>
            <button
              onClick={closePostModal}
              className="absolute top-3 left-3 text-gray-500 hover:text-gray-700"
              type="button"
              aria-label="إغلاق"
            >
              ×
            </button>
            <h2 className="font-heading font-bold text-xl mb-4 text-center">إنشاء منشور جديد</h2>
            {postFormError && (
              <p className="text-red-500 text-center text-sm mb-3 bg-red-50 p-2 rounded-md border border-red-200">
                {postFormError}
              </p>
            )}
            <form onSubmit={submitPostForm} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700">العنوان</label>
                <input
                  type="text"
                  {...registerPost('title')}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="أدخل عنوان المنشور"
                />
                {postErrors.title && <span className="text-red-500 text-xs">{postErrors.title.message}</span>}
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700">الملخص</label>
                <input
                  type="text"
                  {...registerPost('summary')}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="ملخص قصير (اختياري)"
                />
                {postErrors.summary && (
                  <span className="text-red-500 text-xs">{postErrors.summary.message}</span>
                )}
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700">التفاصيل</label>
                <textarea
                  rows={4}
                  {...registerPost('details')}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="قم بكتابة تفاصيل المنشور"
                ></textarea>
                {postErrors.details && (
                  <span className="text-red-500 text-xs">{postErrors.details.message}</span>
                )}
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700">الصورة المرفقة</label>
                <label className="block border-2 border-dashed border-gray-300 rounded-xl p-6 text-center text-sm text-gray-500 cursor-pointer hover:bg-gray-50">
                  <div className="flex items-center justify-center gap-2">
                    <span>{postSelectedFile ? postSelectedFile.name : 'صورة أو ملف'}</span>
                    <img src={UploadIcon} alt="رفع" className="h-4 w-4" />
                  </div>
                  <input
                    ref={postFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePostFileChange}
                    className="hidden"
                  />
                </label>
                {postSelectedFile && (
                  <button
                    type="button"
                    onClick={removePostFile}
                    className="text-xs text-red-500 hover:underline"
                  >
                    إزالة الملف
                  </button>
                )}
                {postFilePreview && (
                  <div className="mt-2">
                    <img
                      src={postFilePreview}
                      alt="معاينة"
                      className="h-24 w-full object-cover rounded-lg border border-gray-200"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closePostModal}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl text-center"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createPostMutation.isLoading}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 rounded-xl text-center disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {createPostMutation.isLoading ? 'جاري الإضافة...' : 'نشر المنشور'}
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

interface TeamSectionProps {
  title: string;
  icon: string;
  actionLabel: string;
  actionColor: string;
  members: Employee[];
  isLoading: boolean;
  onAction: () => void;
}

function TeamSection({ title, icon, actionLabel, actionColor, members, isLoading, onAction }: TeamSectionProps) {
  return (
    <div className="mb-6 last:mb-0">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-gray-800 flex items-center gap-2">
          <img src={icon} alt="" className="h-4 w-4" /> {title}
        </span>
        <button
          className="text-white text-xs rounded-[6px] w-[127.95px] h-[32px] flex items-center justify-center gap-2"
          style={{ backgroundColor: actionColor }}
          type="button"
          onClick={onAction}
        >
          <img src={PlusWhiteIcon} alt="+" className="h-3.5 w-3.5" />
          {actionLabel}
        </button>
      </div>
      <ul className="space-y-2">
        {isLoading && <li className="text-sm text-gray-500">جارٍ تحميل الفريق…</li>}
        {!isLoading && members.length === 0 && (
          <li className="text-sm text-gray-500">لا يوجد أعضاء في هذا القسم بعد.</li>
        )}
        {members.map((member, index) => (
          <li
            key={member.id ?? member.email ?? member.fullName}
            className="flex items-center justify-between border border-gray-200 rounded-lg p-2"
          >
            <div className="flex items-center gap-3">
              <img
                src={
                  (member as { avatarUrl?: string }).avatarUrl &&
                  typeof (member as { avatarUrl?: string }).avatarUrl === 'string'
                    ? (member as { avatarUrl?: string }).avatarUrl
                    : FALLBACK_IMAGES[index % FALLBACK_IMAGES.length]
                }
                alt=""
                className="w-8 h-8 rounded-full object-cover"
              />
              <div className="text-right">
                <p className="font-bold text-sm text-gray-800">{member.fullName ?? '—'}</p>
                <p className="text-xs text-gray-500">{member.email ?? '—'}</p>
              </div>
            </div>
            <button className="text-accentRed text-lg" type="button">
              <img src={DeleteIcon} alt="حذف" className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
