import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  distributionsService,
  roundsService,
  type Distribution,
  type Round,
} from '@/api/services';
import { toErrorMessage } from '@/utils/error';

function formatDate(value: string | undefined) {
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

const createRoundSchema = z
  .object({
    roundNumber: z.coerce
      .number({ invalid_type_error: 'يرجى إدخال رقم الجولة' })
      .int({ message: 'يجب أن يكون رقم الجولة عددًا صحيحًا' })
      .min(1, { message: 'رقم الجولة يجب أن يكون 1 أو أكثر' }),
    couponCount: z.coerce
      .number({ invalid_type_error: 'يرجى إدخال عدد القسائم' })
      .int({ message: 'عدد القسائم يجب أن يكون عددًا صحيحًا' })
      .min(1, { message: 'عدد القسائم يجب أن يكون 1 أو أكثر' }),
    startDate: z.string().optional(),
    endDate: z.string().min(1, { message: 'يرجى تحديد تاريخ النهاية' }),
  })
  .refine(
    (data) => {
      if (!data.startDate) return true;
      return new Date(data.endDate) > new Date(data.startDate);
    },
    {
      message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية',
      path: ['endDate'],
    },
  );

type CreateRoundForm = z.infer<typeof createRoundSchema>;

export default function DistributionDetails() {
  const { distributionId } = useParams();
  const queryClient = useQueryClient();
  const [isRoundModalOpen, setIsRoundModalOpen] = useState(false);
  const [roundFormError, setRoundFormError] = useState<string | null>(null);
  const [roundFeedback, setRoundFeedback] = useState<string | null>(null);

  const {
    register: registerRound,
    handleSubmit: handleSubmitRound,
    reset: resetRoundForm,
    formState: { errors: roundErrors, isSubmitting: isSubmittingRound },
  } = useForm<CreateRoundForm>({
    resolver: zodResolver(createRoundSchema),
    defaultValues: {
      roundNumber: 1,
      couponCount: 1,
      startDate: '',
      endDate: '',
    },
  });

  const distributionQuery = useQuery({
    queryKey: ['distribution', distributionId],
    queryFn: () => distributionsService.getById(distributionId as string),
    enabled: Boolean(distributionId),
  });

  const roundsQuery = useQuery({
    queryKey: ['distribution', distributionId, 'rounds'],
    queryFn: () => roundsService.list(distributionId as string),
    enabled: Boolean(distributionId),
    initialData: [] as Round[],
  });

  const createRoundMutation = useMutation({
    mutationFn: async (values: CreateRoundForm) => {
      if (!distributionId) throw new Error('لا يمكن إنشاء جولة بدون معرف توزيع');
      const payload = {
        roundNumber: values.roundNumber,
        couponCount: values.couponCount,
        endDate: new Date(values.endDate).toISOString(),
        ...(values.startDate
          ? { startDate: new Date(values.startDate).toISOString() }
          : {}),
      };
      return roundsService.create(distributionId, payload);
    },
    onMutate: () => {
      setRoundFormError(null);
      setRoundFeedback(null);
    },
    onSuccess: () => {
      setRoundFeedback('تم إنشاء الجولة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['distribution', distributionId, 'rounds'] });
      resetRoundForm({ roundNumber: 1, couponCount: 1, startDate: '', endDate: '' });
      setIsRoundModalOpen(false);
    },
    onError: (error: unknown) => {
      setRoundFormError(toErrorMessage(error, 'تعذر إنشاء الجولة، تحقق من البيانات'));
    },
  });

  const submitCreateRound = handleSubmitRound((values) => {
    createRoundMutation.mutate(values);
  });

  if (!distributionId) {
    return (
      <div className="min-h-screen bg-white font-body flex flex-col">
        <Header className="mb-6" title="تفاصيل التوزيع" subtitle="معرّف التوزيع غير متوفر" />
        <div className="flex-1 flex items-center justify-center text-gray-500">لا يمكن عرض التفاصيل.</div>
        <Footer />
      </div>
    );
  }

  const distribution = (distributionQuery.data || {}) as Distribution;

  return (
    <div className="min-h-screen bg-white font-body p-4 md:p-6 lg:p-8" dir="rtl">
      <Header
        className="mb-6"
        title={distribution.title ?? 'تفاصيل التوزيع'}
        subtitle={`حالة التوزيع: ${distribution.status ?? '—'}`}
      />

      <section className="mb-6 bg-white border border-gray-200 rounded-xl p-4 space-y-2">
        <h2 className="font-heading text-lg font-bold text-gray-800">معلومات التوزيع</h2>
        <p className="text-sm text-gray-600">الوصف: {distribution.description ? String(distribution.description) : 'لا يوجد'}</p>
        <p className="text-sm text-gray-600">
          المدة: {formatDate(distribution.startDate)} — {formatDate(distribution.endDate)}
        </p>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-4">
        <header className="flex items-center justify-between mb-4 gap-3">
          <h2 className="font-heading text-lg font-bold text-gray-800">الجولات المرتبطة</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">إجمالي: {roundsQuery.data?.length ?? 0}</span>
            <button
              type="button"
              onClick={() => {
                resetRoundForm({ roundNumber: 1, couponCount: 1, startDate: '', endDate: '' });
                setRoundFormError(null);
                setRoundFeedback(null);
                setIsRoundModalOpen(true);
              }}
              className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90"
            >
              إضافة جولة
            </button>
          </div>
        </header>
        {roundFeedback && (
          <div className="mb-3 p-2.5 rounded-lg border border-primary/30 bg-primary/5 text-primary text-xs text-right">
            {roundFeedback}
          </div>
        )}
        <div className="space-y-3">
          {roundsQuery.isLoading && <p className="text-sm text-gray-500">جارٍ تحميل الجولات…</p>}
          {!roundsQuery.isLoading && (roundsQuery.data ?? []).length === 0 && (
            <p className="text-sm text-gray-500">لا توجد جولات مسجلة حتى الآن.</p>
          )}
          {(roundsQuery.data ?? []).map((round) => (
            <article
              key={round.id ?? round.roundNumber}
              className="border border-gray-200 rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
            >
              <div>
                <h3 className="font-heading font-bold text-gray-800">
                  الجولة #{round.roundNumber ?? '—'}
                </h3>
                <p className="text-sm text-gray-600">عدد القسائم: {round.couponCount ?? '—'}</p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-gray-600 justify-end">
                <span>الحالة: {round.status ?? '—'}</span>
                <span>البداية: {formatDate(round.startDate)}</span>
                <span>النهاية: {formatDate(round.endDate)}</span>
                {round.id && (
                  <Link to={`/distribution/${distributionId}/round/${round.id}`} className="text-primary hover:underline">
                    عرض التفاصيل
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {isRoundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-xl p-6 relative shadow-lg" role="dialog" aria-modal>
            <button
              type="button"
              onClick={() => setIsRoundModalOpen(false)}
              className="absolute top-3 left-3 text-gray-500 hover:text-gray-700"
              aria-label="إغلاق"
            >
              ×
            </button>
            <h2 className="font-heading font-bold text-xl mb-4 text-center">إضافة جولة جديدة</h2>
            {roundFormError && (
              <div className="mb-3 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-600 text-right">
                {roundFormError}
              </div>
            )}
            <form onSubmit={submitCreateRound} className="space-y-4" dir="rtl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700">رقم الجولة</label>
                  <input
                    type="number"
                    min={1}
                    {...registerRound('roundNumber')}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {roundErrors.roundNumber && (
                    <span className="text-xs text-red-500">{roundErrors.roundNumber.message}</span>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700">عدد القسائم</label>
                  <input
                    type="number"
                    min={1}
                    {...registerRound('couponCount')}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {roundErrors.couponCount && (
                    <span className="text-xs text-red-500">{roundErrors.couponCount.message}</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700">تاريخ البداية (اختياري)</label>
                  <input
                    type="datetime-local"
                    {...registerRound('startDate')}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700">تاريخ النهاية</label>
                  <input
                    type="datetime-local"
                    {...registerRound('endDate')}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {roundErrors.endDate && (
                    <span className="text-xs text-red-500">{roundErrors.endDate.message}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRoundModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRound || createRoundMutation.isLoading}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {createRoundMutation.isLoading ? 'جارٍ الإنشاء…' : 'حفظ الجولة'}
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
