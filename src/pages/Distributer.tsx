import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import CalendarIconSvg from '@/assets/distributor/calender-icon.svg';
import DistributionCyclesIconSvg from '@/assets/distributor/distribution-cycles-icon.svg';
import CouponManageIconSvg from '@/assets/distributor/cupon-manege-icon.svg';
import DropdownIconSvg from '@/assets/distributor/Vector-icon-for-dropdown.svg';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { useAuth } from '@/providers/AuthProvider';
import {
  couponsService,
  distributionsService,
  type Coupon,
  type Distribution,
  type CreateCouponPayload,
  type CreateDistributionPayload,
} from '@/api/services';

const couponTypes = [
  { value: 'FOOD', label: 'غذائية' },
  { value: 'CASH', label: 'نقدية' },
  { value: 'SHOPPING', label: 'كسوة' },
  { value: 'OTHER', label: 'أخرى' },
];

const distributionStatuses = [
  { value: 'DRAFT', label: 'مسودة' },
  { value: 'ACTIVE', label: 'نشطة' },
  { value: 'COMPLETED', label: 'مكتملة' },
  { value: 'CANCELLED', label: 'ملغاة' },
];

export default function Distributer() {
  const queryClient = useQueryClient();
  const { institutionId } = useAuth();

  const [distributionForm, setDistributionForm] = useState({
    title: '',
    startDate: '',
    endDate: '',
    status: 'DRAFT',
    couponTemplateId: '',
    description: '',
  });

  const [couponForm, setCouponForm] = useState({
    name: '',
    type: 'FOOD',
    description: '',
  });

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const couponsQuery = useQuery({
    queryKey: ['coupons', institutionId],
    queryFn: () => couponsService.list(),
    enabled: Boolean(institutionId),
    initialData: [] as Coupon[],
  });

  const distributionsQuery = useQuery({
    queryKey: ['distributions', institutionId],
    queryFn: () => distributionsService.list(),
    enabled: Boolean(institutionId),
    initialData: [] as Distribution[],
  });

  const createCouponMutation = useMutation({
    mutationFn: (payload: CreateCouponPayload) => couponsService.create(payload),
    onMutate: () => setFeedbackMessage(null),
    onSuccess: (createdCoupon) => {
      setFeedbackMessage('تم إنشاء القسيمة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['coupons', institutionId] });
      setCouponForm({ name: '', type: couponForm.type, description: '' });
      if (createdCoupon?.id) {
        setDistributionForm((prev) => ({ ...prev, couponTemplateId: createdCoupon.id as string }));
      }
    },
    onError: (error: unknown) =>
      setFeedbackMessage(toErrorMessage(error, 'تعذر إنشاء القسيمة، حاول مرة أخرى')),
  });

  const createDistributionMutation = useMutation({
    mutationFn: (payload: CreateDistributionPayload) => distributionsService.create(payload),
    onMutate: () => setFeedbackMessage(null),
    onSuccess: () => {
      setFeedbackMessage('تم إنشاء دورة توزيع جديدة');
      queryClient.invalidateQueries({ queryKey: ['distributions', institutionId] });
      setDistributionForm({
        title: '',
        startDate: '',
        endDate: '',
        status: 'DRAFT',
        couponTemplateId: '',
        description: '',
      });
    },
    onError: (error: unknown) =>
      setFeedbackMessage(toErrorMessage(error, 'تعذر إنشاء دورة التوزيع، تحقق من البيانات')),
  });

  const distributions = useMemo(() => distributionsQuery.data ?? [], [distributionsQuery.data]);
  const coupons = useMemo(() => couponsQuery.data ?? [], [couponsQuery.data]);

  function handleDistributionChange(field: keyof typeof distributionForm, value: string) {
    setDistributionForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleCouponChange(field: keyof typeof couponForm, value: string) {
    setCouponForm((prev) => ({ ...prev, [field]: value }));
  }

  function submitDistribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!institutionId) {
      setFeedbackMessage('لا يمكن إنشاء دورة بدون مؤسسة مرتبطة');
      return;
    }
    if (!distributionForm.couponTemplateId) {
      setFeedbackMessage('يرجى اختيار قالب قسيمة قبل إنشاء الدورة');
      return;
    }
    if (
      distributionForm.startDate &&
      distributionForm.endDate &&
      new Date(distributionForm.endDate) < new Date(distributionForm.startDate)
    ) {
      setFeedbackMessage('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
      return;
    }
    createDistributionMutation.mutate({
      title: distributionForm.title,
      startDate: distributionForm.startDate,
      endDate: distributionForm.endDate,
      status: distributionForm.status as CreateDistributionPayload['status'],
      description: distributionForm.description || undefined,
      couponTemplateId: distributionForm.couponTemplateId,
    });
  }

  function submitCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!institutionId) {
      setFeedbackMessage('لا يمكن إنشاء قسيمة بدون مؤسسة مرتبطة');
      return;
    }
    createCouponMutation.mutate({
      name: couponForm.name,
      type: couponForm.type as CreateCouponPayload['type'],
      description: couponForm.description || undefined,
      institutionId,
    });
  }

  function formatDate(date: string | undefined) {
    if (!date) return '—';
    try {
      return new Date(date).toLocaleDateString('ar-EG');
    } catch (error) {
      return date;
    }
  }

  const isSubmittingDistribution = createDistributionMutation.isLoading;
  const isSubmittingCoupon = createCouponMutation.isLoading;

  return (
    <div className="min-h-screen bg-white font-body p-4 md:p-6 lg:p-8">
      <Header className="mb-8" title="مركز توزيع القسائم" subtitle="إدارة دورات إنشاء وتوزيع القسائم" />

      {feedbackMessage && (
        <div className="mb-6 p-3 rounded-lg border border-primary/40 bg-primary/5 text-primary text-sm text-right">
          {feedbackMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <form onSubmit={submitDistribution} className="bg-white rounded-xl shadow-md border border-gray-200 p-6 space-y-4" dir="rtl">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-2">
            <h2 className="font-bold font-heading text-gray-700">دورات التوزيع</h2>
            <img src={DistributionCyclesIconSvg} alt="دورات" className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-bold text-gray-700">عنوان الدورة</label>
            <input
              value={distributionForm.title}
              onChange={(event) => handleDistributionChange('title', event.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-right"
              placeholder="أدخل عنوان الدورة"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-bold text-gray-700">الوصف</label>
            <textarea
              value={distributionForm.description}
              onChange={(event) => handleDistributionChange('description', event.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-right"
              placeholder="تفاصيل إضافية (اختياري)"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 relative">
              <label className="block text-sm font-bold text-gray-700">تاريخ البداية</label>
              <input
                type="date"
                value={distributionForm.startDate}
                onChange={(event) => handleDistributionChange('startDate', event.target.value)}
                className="w-full p-3 pr-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <img src={CalendarIconSvg} alt="التاريخ" className="h-4 w-4 absolute left-3 bottom-3 opacity-70" />
            </div>
            <div className="space-y-1 relative">
              <label className="block text-sm font-bold.text-gray-700">تاريخ النهاية</label>
              <input
                type="date"
                value={distributionForm.endDate}
                onChange={(event) => handleDistributionChange('endDate', event.target.value)}
                className="w-full p-3 pr-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <img src={CalendarIconSvg} alt="التاريخ" className="h-4 w-4 absolute left-3.bottom-3.opacity-70" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 relative">
              <label className="block.text-sm.font-bold.text-gray-700">الحالة</label>
              <select
                value={distributionForm.status}
                onChange={(event) => handleDistributionChange('status', event.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl.focus:outline-none focus:ring-2 focus:ring-primary appearance-none pr-10"
              >
                {distributionStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              <img src={DropdownIconSvg} alt="" className="h-4 w-4 absolute left-3.bottom-3.opacity-60 pointer-events-none" />
            </div>
            <div className="space-y-1 relative">
              <label className="block.text-sm.font-bold.text-gray-700">قالب القسيمة</label>
              <select
                value={distributionForm.couponTemplateId}
                onChange={(event) => handleDistributionChange('couponTemplateId', event.target.value)}
                className="w-full p-3 border border-gray-300.rounded-xl focus:outline-none focus:ring-2 focus:ring-primary appearance-none pr-10"
                required
              >
                <option value="">اختر القسيمة المرتبطة</option>
                {coupons.map((coupon) => (
                  <option key={coupon.id} value={coupon.id as string}>
                    {coupon.name}
                  </option>
                ))}
              </select>
              <img src={DropdownIconSvg} alt="" className="h-4 w-4 absolute left-3.bottom-3.opacity-60 pointer-events-none" />
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmittingDistribution || !institutionId}
            className="w-full bg-brandBlue hover:bg-brandBlue/90 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 flex-row-reverse disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <img src={CalendarIconSvg} alt="تقويم" className="h-5 w-5" />
            {isSubmittingDistribution ? 'جارٍ الإنشاء…' : 'إنشاء دورة توزيع'}
          </button>
        </form>

        <form onSubmit={submitCoupon} className="bg-white rounded-xl shadow-md border border-gray-200 p-6 space-y-4" dir="rtl">
          <div className="flex.items-center.justify-between border-b border-gray-100 pb-3 mb-2">
            <h2 className="font-bold font-heading text-gray-700">إدارة القسائم</h2>
            <img src={CouponManageIconSvg} alt="قسائم" className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <label className="block text-sm.font-bold.text-gray-700">اسم القسيمة</label>
            <input
              value={couponForm.name}
              onChange={(event) => handleCouponChange('name', event.target.value)}
              className="w-full p-3 border border-gray-300.rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-right"
              placeholder="أدخل اسم القسيمة"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="block.text-sm.font-bold.text-gray-700">الوصف</label>
            <textarea
              value={couponForm.description}
              onChange={(event) => handleCouponChange('description', event.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-right"
              placeholder="تفاصيل إضافية (اختياري)"
              rows={3}
            />
          </div>
          <div className="space-y-1 relative">
            <label className="block.text-sm.font-bold.text-gray-700">نوع القسيمة</label>
            <select
              value={couponForm.type}
              onChange={(event) => handleCouponChange('type', event.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary appearance-none pr-10"
            >
              {couponTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <img src={DropdownIconSvg} alt="" className="h-4 w-4 absolute left-3.bottom-3.opacity-60 pointer-events-none" />
          </div>
          <button
            type="submit"
            disabled={isSubmittingCoupon || !institutionId}
            className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold flex-row-reverse disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmittingCoupon ? 'جارٍ الإنشاء…' : 'إنشاء القسيمة'}
          </button>
        </form>
      </div>

      <section className="bg-white rounded-xl shadow-md border border-gray-200 p-6" dir="rtl">
        <header className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-gray-700">الحملات الحالية</h2>
          <span className="text-sm text-gray-500">إجمالي: {distributions.length}</span>
        </header>
        <div className="space-y-4">
          {distributionsQuery.isLoading && <p className="text-sm text-gray-500">جارٍ تحميل الدورات…</p>}
          {!distributionsQuery.isLoading && distributions.length === 0 && (
            <p className="text-sm text-gray-500">لا توجد دورات توزيع محفوظة حتى الآن.</p>
          )}
          {distributions.map((distribution) => (
            <article
              key={distribution.id ?? distribution.title}
              className="border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div>
                <h3 className="font-heading font-bold text-gray-800">
                  {distribution.title ?? 'دورة بدون عنوان'}
                </h3>
                <p className="text-sm text-gray-500">
                  {distribution.description ? String(distribution.description) : 'لا يوجد وصف'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-gray-600 justify-end">
                <span>الحالة: {distribution.status ?? '—'}</span>
                <span>
                  من {formatDate(distribution.startDate)} إلى {formatDate(distribution.endDate)}
                </span>
                <span>
                  عدد الجولات: {Array.isArray((distribution as { rounds?: unknown[] }).rounds)
                    ? (distribution as { rounds?: unknown[] }).rounds!.length
                    : '—'}
                </span>
                {distribution.id && (
                  <Link
                    to={`/distribution/${distribution.id}`}
                    className="text-primary hover:underline"
                  >
                    عرض التفاصيل
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
