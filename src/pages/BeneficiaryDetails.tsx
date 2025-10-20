import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  beneficiariesService,
  familyMembersService,
  type Beneficiary,
  type FamilyMember,
  type UpdateBeneficiaryPayload,
  type CreateFamilyMemberPayload,
  type UpdateFamilyMemberPayload,
} from '@/api/services';
import { toErrorMessage } from '@/utils/error';

const beneficiarySchema = z.object({
  fullName: z.string().trim().min(3, { message: 'يجب ألا يقل الاسم عن 3 أحرف' }).optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  healthStatus: z.string().trim().optional(),
  housingStatus: z.string().trim().optional(),
  income: z
    .preprocess((value) => {
      if (value === '' || value === null || value === undefined) return undefined;
      const numeric = Number(value);
      return Number.isNaN(numeric) ? value : numeric;
    }, z.number({ invalid_type_error: 'يرجى إدخال قيمة رقمية صحيحة' }).optional())
    .refine((value) => value === undefined || !Number.isNaN(value), {
      message: 'يرجى إدخال قيمة رقمية صحيحة',
    }),
});

type BeneficiaryFormValues = z.infer<typeof beneficiarySchema>;

const familyMemberSchema = z.object({
  fullName: z.string().trim().min(3, { message: 'يجب ألا يقل الاسم عن 3 أحرف' }),
  nationalId: z
    .string()
    .trim()
    .min(9, { message: 'رقم الهوية يجب ألا يقل عن 9 خانات' })
    .max(20, { message: 'رقم الهوية طويل جدًا' }),
  relationship: z.enum(['SPOUSE', 'CHILD', 'PARENT'], {
    errorMap: () => ({ message: 'يرجى اختيار صلة قرابة صحيحة' }),
  }),
  healthStatus: z.enum(['NORMAL', 'CHRONIC_DISEASE', 'SPECIAL_NEEDS', 'MARTYR'], {
    errorMap: () => ({ message: 'يرجى اختيار الحالة الصحية' }),
  }),
  gender: z.enum(['MALE', 'FEMALE'], {
    errorMap: () => ({ message: 'يرجى اختيار الجنس' }),
  }),
  dateOfBirth: z
    .string()
    .trim()
    .min(4, { message: 'يرجى إدخال تاريخ صالح' }),
});

type FamilyMemberFormValues = z.infer<typeof familyMemberSchema>;

const FAMILY_HEALTH_OPTIONS = [
  { value: 'NORMAL', label: 'طبيعي' },
  { value: 'CHRONIC_DISEASE', label: 'مرض مزمن' },
  { value: 'SPECIAL_NEEDS', label: 'احتياجات خاصة' },
  { value: 'MARTYR', label: 'أسرة شهيد' },
];

const FAMILY_RELATION_OPTIONS = [
  { value: 'SPOUSE', label: 'زوج/زوجة' },
  { value: 'CHILD', label: 'ابن/ابنة' },
  { value: 'PARENT', label: 'أب/أم' },
];

const FAMILY_GENDER_OPTIONS = [
  { value: 'MALE', label: 'ذكر' },
  { value: 'FEMALE', label: 'أنثى' },
];

function formatDate(value?: string) {
  if (!value) return '—';
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

export default function BeneficiaryDetailsPage() {
  const { beneficiaryId } = useParams();
  const queryClient = useQueryClient();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [familyModalMode, setFamilyModalMode] = useState<'create' | 'edit'>('create');
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<FamilyMember | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [familyFeedbackMessage, setFamilyFeedbackMessage] = useState<string | null>(null);

  const beneficiaryQuery = useQuery({
    queryKey: ['beneficiary', beneficiaryId],
    queryFn: () => beneficiariesService.getById(beneficiaryId as string),
    enabled: Boolean(beneficiaryId),
  });

  const familyMembersQuery = useQuery({
    queryKey: ['beneficiary', beneficiaryId, 'family-members'],
    queryFn: () => familyMembersService.list(beneficiaryId as string),
    enabled: Boolean(beneficiaryId),
    initialData: [] as FamilyMember[],
  });

  const couponsQuery = useQuery({
    queryKey: ['beneficiary', beneficiaryId, 'coupons'],
    queryFn: () => beneficiariesService.getCoupons(beneficiaryId as string),
    enabled: Boolean(beneficiaryId),
    initialData: [] as Record<string, unknown>[],
  });

  const {
    register: registerBeneficiary,
    handleSubmit: handleSubmitBeneficiary,
    reset: resetBeneficiaryForm,
    formState: { errors: beneficiaryErrors, isSubmitting: isSubmittingBeneficiary },
  } = useForm<BeneficiaryFormValues>({
    resolver: zodResolver(beneficiarySchema),
    defaultValues: {
      fullName: '',
      phone: '',
      address: '',
      healthStatus: '',
      housingStatus: '',
      income: undefined,
    },
  });

  const {
    register: registerFamilyMember,
    handleSubmit: handleSubmitFamilyMember,
    reset: resetFamilyMemberForm,
    formState: { errors: familyMemberErrors, isSubmitting: isSubmittingFamilyMember },
  } = useForm<FamilyMemberFormValues>({
    resolver: zodResolver(familyMemberSchema),
    defaultValues: {
      fullName: '',
      nationalId: '',
      relationship: 'CHILD',
      healthStatus: 'NORMAL',
      gender: 'MALE',
      dateOfBirth: '',
    },
  });

  useEffect(() => {
    if (!isEditModalOpen) return;
    const data = (beneficiaryQuery.data || {}) as Beneficiary;
    resetBeneficiaryForm({
      fullName: data.fullName ?? '',
      phone: data.phone ?? '',
      address: data.address ?? '',
      healthStatus: data.healthStatus ?? '',
      housingStatus: data.housingStatus ?? '',
      income: typeof data.income === 'number' ? data.income : undefined,
    });
  }, [isEditModalOpen, beneficiaryQuery.data, resetBeneficiaryForm]);

  useEffect(() => {
    if (!isFamilyModalOpen) return;

    if (familyModalMode === 'edit' && selectedFamilyMember) {
      resetFamilyMemberForm({
        fullName: selectedFamilyMember.fullName ?? '',
        nationalId: selectedFamilyMember.nationalId ?? '',
        relationship: (selectedFamilyMember.relationship as FamilyMemberFormValues['relationship']) || 'CHILD',
        healthStatus: (selectedFamilyMember.healthStatus as FamilyMemberFormValues['healthStatus']) || 'NORMAL',
        gender: (selectedFamilyMember.gender as FamilyMemberFormValues['gender']) || 'MALE',
        dateOfBirth: selectedFamilyMember.dateOfBirth
          ? new Date(selectedFamilyMember.dateOfBirth).toISOString().slice(0, 10)
          : '',
      });
    } else {
      resetFamilyMemberForm({
        fullName: '',
        nationalId: '',
        relationship: 'CHILD',
        healthStatus: 'NORMAL',
        gender: 'MALE',
        dateOfBirth: '',
      });
    }
  }, [isFamilyModalOpen, familyModalMode, resetFamilyMemberForm, selectedFamilyMember]);

  const beneficiaryMutation = useMutation({
    mutationFn: async (values: BeneficiaryFormValues) => {
      if (!beneficiaryId) throw new Error('معرف المستفيد غير متوفر');
      const payload: UpdateBeneficiaryPayload = {};

      if (values.fullName && values.fullName.trim()) payload.fullName = values.fullName.trim();
      if (values.phone !== undefined) payload.phone = values.phone?.trim() || undefined;
      if (values.address !== undefined) payload.address = values.address?.trim() || undefined;
      if (values.healthStatus !== undefined)
        payload.healthStatus = values.healthStatus?.trim() || undefined;
      if (values.housingStatus !== undefined)
        payload.housingStatus = values.housingStatus?.trim() || undefined;
      if (values.income !== undefined) payload.income = values.income;

      return beneficiariesService.update(beneficiaryId, payload);
    },
    onMutate: () => setFeedbackMessage(null),
    onSuccess: (updated) => {
      setFeedbackMessage('تم تحديث بيانات المستفيد بنجاح');
      queryClient.setQueryData(['beneficiary', beneficiaryId], (current) => ({
        ...(current as Record<string, unknown> | undefined),
        ...(updated as Record<string, unknown> | undefined),
      }));
      queryClient.invalidateQueries({ queryKey: ['beneficiary', beneficiaryId] });
      setIsEditModalOpen(false);
    },
    onError: (error: unknown) => {
      setFeedbackMessage(toErrorMessage(error, 'تعذر تحديث بيانات المستفيد'));
    },
  });

  const createFamilyMemberMutation = useMutation({
    mutationFn: async (values: FamilyMemberFormValues) => {
      if (!beneficiaryId) throw new Error('معرف المستفيد غير متوفر');
      const payload: CreateFamilyMemberPayload = {
        fullName: values.fullName.trim(),
        nationalId: values.nationalId.trim(),
        relationship: values.relationship,
        healthStatus: values.healthStatus,
        gender: values.gender,
        dateOfBirth: values.dateOfBirth,
      };
      return familyMembersService.create(beneficiaryId, payload);
    },
    onMutate: () => setFamilyFeedbackMessage(null),
    onSuccess: () => {
      setFamilyFeedbackMessage('تم إضافة فرد العائلة بنجاح');
      queryClient.invalidateQueries({
        queryKey: ['beneficiary', beneficiaryId, 'family-members'],
      });
      setIsFamilyModalOpen(false);
      setSelectedFamilyMember(null);
    },
    onError: (error: unknown) => {
      setFamilyFeedbackMessage(toErrorMessage(error, 'تعذر إضافة فرد العائلة'));
    },
  });

  const updateFamilyMemberMutation = useMutation({
    mutationFn: async (values: FamilyMemberFormValues) => {
      if (!beneficiaryId) throw new Error('معرف المستفيد غير متوفر');
      if (!selectedFamilyMember?.id) throw new Error('معرف فرد العائلة غير متوفر');
      const payload: UpdateFamilyMemberPayload = {
        fullName: values.fullName.trim() || undefined,
        nationalId: values.nationalId.trim() || undefined,
        relationship: values.relationship,
        healthStatus: values.healthStatus,
        gender: values.gender,
        dateOfBirth: values.dateOfBirth ? new Date(values.dateOfBirth).toISOString() : undefined,
      };
      return familyMembersService.update(beneficiaryId, selectedFamilyMember.id as string, payload);
    },
    onMutate: () => setFamilyFeedbackMessage(null),
    onSuccess: () => {
      setFamilyFeedbackMessage('تم تحديث بيانات فرد العائلة بنجاح');
      queryClient.invalidateQueries({
        queryKey: ['beneficiary', beneficiaryId, 'family-members'],
      });
      setIsFamilyModalOpen(false);
      setSelectedFamilyMember(null);
    },
    onError: (error: unknown) => {
      setFamilyFeedbackMessage(toErrorMessage(error, 'تعذر تحديث بيانات فرد العائلة'));
    },
  });

  const deleteFamilyMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      if (!beneficiaryId) throw new Error('معرف المستفيد غير متوفر');
      return familyMembersService.remove(beneficiaryId, memberId);
    },
    onMutate: () => setFamilyFeedbackMessage(null),
    onSuccess: () => {
      setFamilyFeedbackMessage('تم حذف فرد العائلة');
      queryClient.invalidateQueries({
        queryKey: ['beneficiary', beneficiaryId, 'family-members'],
      });
    },
    onError: (error: unknown) => {
      setFamilyFeedbackMessage(toErrorMessage(error, 'تعذر حذف فرد العائلة'));
    },
  });

  const submitBeneficiaryForm = handleSubmitBeneficiary((values) => {
    beneficiaryMutation.mutate(values);
  });

  const submitFamilyMemberForm = handleSubmitFamilyMember((values) => {
    if (familyModalMode === 'edit') {
      updateFamilyMemberMutation.mutate(values);
    } else {
      createFamilyMemberMutation.mutate(values);
    }
  });

  if (!beneficiaryId) {
    return (
      <div className="min-h-screen bg-white font-body flex flex-col">
        <Header className="mb-6" title="تفاصيل المستفيد" subtitle="المعرف غير متوفر" />
        <div className="flex-1 flex items-center justify-center text-gray-500">لا يمكن عرض التفاصيل.</div>
        <Footer />
      </div>
    );
  }

  const beneficiary = (beneficiaryQuery.data || {}) as Beneficiary;
  const familyMembers = familyMembersQuery.data ?? [];
  const coupons = couponsQuery.data ?? [];

  return (
    <div className="min-h-screen bg-white font-body p-4 md:p-6 lg:p-8" dir="rtl">
      <Header
        className="mb-6"
        title={beneficiary.fullName ?? 'تفاصيل المستفيد'}
        subtitle={`رقم الهوية: ${beneficiary.nationalId ?? '—'}`}
      />

      {(feedbackMessage || familyFeedbackMessage) && (
        <div className="mb-4 space-y-2">
          {feedbackMessage && (
            <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 text-sm text-primary text-right">
              {feedbackMessage}
            </div>
          )}
          {familyFeedbackMessage && (
            <div className="p-3 rounded-lg border border-green-200 bg-green-50 text-sm text-green-700 text-right">
              {familyFeedbackMessage}
            </div>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">
            يمكنك تعديل بيانات المستفيد وإدارة أفراد عائلته من خلال الأدوات التالية.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsEditModalOpen(true)}
          className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 self-start sm:self-auto"
        >
          تعديل بيانات المستفيد
        </button>
      </div>

      <section className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoCard title="الهاتف" value={beneficiary.phone ?? '—'} />
        <InfoCard title="العنوان" value={beneficiary.address ?? '—'} />
        <InfoCard title="الحالة الصحية" value={beneficiary.healthStatus ?? '—'} />
        <InfoCard title="الحالة السكنية" value={beneficiary.housingStatus ?? '—'} />
        <InfoCard title="الدخل الشهري" value={beneficiary.income ?? '—'} />
        <InfoCard title="عدد أفراد الأسرة" value={beneficiary.familySize ?? '—'} />
      </section>

      <section className="mb-6 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <header className="flex items-center justify-between mb-3 gap-3">
          <h2 className="font-heading text-lg font-bold text-gray-800">أفراد العائلة</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">إجمالي: {familyMembers.length}</span>
            <button
              type="button"
              onClick={() => {
                setFamilyModalMode('create');
                setSelectedFamilyMember(null);
                setIsFamilyModalOpen(true);
              }}
              className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90"
            >
              إضافة فرد جديد
            </button>
          </div>
        </header>
        <div className="space-y-3">
          {familyMembersQuery.isLoading && <p className="text-sm text-gray-500">جارٍ التحميل…</p>}
          {!familyMembersQuery.isLoading && familyMembers.length === 0 && (
            <p className="text-sm text-gray-500">لا يوجد أفراد عائلة مسجلون.</p>
          )}
          {familyMembers.map((member) => (
            <article key={member.id ?? member.nationalId} className="border border-gray-200 rounded-lg p-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h3 className="font-heading font-bold text-gray-800">{member.fullName ?? '—'}</h3>
                  <p className="text-sm text-gray-500">{member.relationship ?? '—'}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-gray-600 justify-end">
                  <span>الهوية: {member.nationalId ?? '—'}</span>
                  <span>الحالة الصحية: {member.healthStatus ?? '—'}</span>
                  <span>النوع: {member.gender ?? '—'}</span>
                  <span>الميلاد: {formatDate(member.dateOfBirth)}</span>
                </div>
              </div>
              {member.id && (
                <div className="mt-3 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setFamilyModalMode('edit');
                      setSelectedFamilyMember(member);
                      setIsFamilyModalOpen(true);
                    }}
                    className="px-3 py-1 rounded-lg border border-primary text-primary text-xs font-bold hover:bg-primary/10"
                  >
                    تعديل
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteFamilyMemberMutation.mutate(member.id as string)}
                    className="px-3 py-1 rounded-lg border border-red-300 text-red-500 text-xs font-bold hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={deleteFamilyMemberMutation.isLoading}
                  >
                    حذف
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <header className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-lg font-bold text-gray-800">القسائم المرتبطة</h2>
          <span className="text-sm text-gray-500">إجمالي: {coupons.length}</span>
        </header>
        <div className="space-y-3">
          {couponsQuery.isLoading && <p className="text-sm text-gray-500">جارٍ التحميل…</p>}
          {!couponsQuery.isLoading && coupons.length === 0 && (
            <p className="text-sm text-gray-500">لا توجد قسائم مرتبطة.</p>
          )}
      {coupons.map((coupon, index) => (
        <article key={String(coupon?.id ?? index)} className="border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
          <p>
            <span className="font-bold text-gray-900">الاسم:</span> {String(coupon?.name ?? '—')}
          </p>
              <p>
                <span className="font-bold text-gray-900">الحالة:</span> {String(coupon?.status ?? '—')}
              </p>
              <p>
                <span className="font-bold text-gray-900">آخر تحديث:</span> {formatDate(coupon?.updatedAt as string | undefined)}
              </p>
            </article>
          ))}
        </div>
      </section>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-xl rounded-xl p-6 relative shadow-lg" role="dialog" aria-modal>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-3 left-3 text-gray-500 hover:text-gray-700"
              aria-label="إغلاق"
            >
              ×
            </button>
            <h2 className="font-heading font-bold text-xl mb-4 text-center">تعديل بيانات المستفيد</h2>
            <form onSubmit={submitBeneficiaryForm} className="space-y-4" dir="rtl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700">الاسم الكامل</label>
                  <input
                    type="text"
                    {...registerBeneficiary('fullName')}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="أدخل الاسم"
                  />
                  {beneficiaryErrors.fullName && (
                    <span className="text-xs text-red-500">{beneficiaryErrors.fullName.message}</span>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700">رقم الهاتف</label>
                  <input
                    type="tel"
                    {...registerBeneficiary('phone')}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="مثال: 0599000000"
                  />
                  {beneficiaryErrors.phone && (
                    <span className="text-xs text-red-500">{beneficiaryErrors.phone.message}</span>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <label className="block.text-sm.font-bold.text-gray-700">العنوان</label>
                <input
                  type="text"
                  {...registerBeneficiary('address')}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="الحي، الشارع، المبنى"
                />
                {beneficiaryErrors.address && (
                  <span className="text-xs text-red-500">{beneficiaryErrors.address.message}</span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700">الحالة الصحية</label>
                  <select
                    {...registerBeneficiary('healthStatus')}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">غير محدد</option>
                    {FAMILY_HEALTH_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700">الحالة السكنية</label>
                  <input
                    type="text"
                    {...registerBeneficiary('housingStatus')}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="مثال: إيجار / ملك"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm.font-bold.text-gray-700">الدخل الشهري</label>
                  <input
                    type="number"
                    step="0.01"
                    {...registerBeneficiary('income', { valueAsNumber: true })}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="بالعملة المحلية"
                  />
                  {beneficiaryErrors.income && (
                    <span className="text-xs text-red-500">{beneficiaryErrors.income.message}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBeneficiary || beneficiaryMutation.isLoading}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {beneficiaryMutation.isLoading ? 'جارٍ الحفظ…' : 'حفظ التغييرات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isFamilyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-xl rounded-xl p-6 relative shadow-lg" role="dialog" aria-modal>
            <button
              type="button"
              onClick={() => {
                setIsFamilyModalOpen(false);
                setSelectedFamilyMember(null);
              }}
              className="absolute top-3 left-3 text-gray-500 hover:text-gray-700"
              aria-label="إغلاق"
            >
              ×
            </button>
            <h2 className="font-heading font-bold text-xl mb-4 text-center">
              {familyModalMode === 'edit' ? 'تعديل فرد العائلة' : 'إضافة فرد جديد'}
            </h2>
            <form onSubmit={submitFamilyMemberForm} className="space-y-4" dir="rtl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700">الاسم الكامل</label>
                  <input
                    type="text"
                    {...registerFamilyMember('fullName')}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="أدخل الاسم"
                  />
                  {familyMemberErrors.fullName && (
                    <span className="text-xs text-red-500">{familyMemberErrors.fullName.message}</span>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="block text-sm.font-bold.text-gray-700">رقم الهوية</label>
                  <input
                    type="text"
                    {...registerFamilyMember('nationalId')}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="123456789"
                  />
                  {familyMemberErrors.nationalId && (
                    <span className="text-xs text-red-500">{familyMemberErrors.nationalId.message}</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700">صلة القرابة</label>
                  <select
                    {...registerFamilyMember('relationship')}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {FAMILY_RELATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700">الحالة الصحية</label>
                  <select
                    {...registerFamilyMember('healthStatus')}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {FAMILY_HEALTH_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700">الجنس</label>
                  <select
                    {...registerFamilyMember('gender')}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {FAMILY_GENDER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="block.text-sm.font-bold.text-gray-700">تاريخ الميلاد</label>
                <input
                  type="date"
                  {...registerFamilyMember('dateOfBirth')}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {familyMemberErrors.dateOfBirth && (
                  <span className="text-xs text-red-500">{familyMemberErrors.dateOfBirth.message}</span>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsFamilyModalOpen(false);
                    setSelectedFamilyMember(null);
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFamilyMember || createFamilyMemberMutation.isLoading || updateFamilyMemberMutation.isLoading}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {familyModalMode === 'edit'
                    ? updateFamilyMemberMutation.isLoading
                      ? 'جارٍ التعديل…'
                      : 'حفظ التعديلات'
                    : createFamilyMemberMutation.isLoading
                    ? 'جارٍ الإضافة…'
                    : 'إضافة الفرد'}
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

interface InfoCardProps {
  title: string;
  value: string | number;
}

function InfoCard({ title, value }: InfoCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-right space-y-1">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-lg font-heading font-bold text-gray-800">{value}</p>
    </div>
  );
}
