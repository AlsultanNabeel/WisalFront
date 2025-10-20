import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  roundsService,
  roundAllocationsService,
  type Round,
  type Allocation,
} from '@/api/services';
import { toErrorMessage } from '@/utils/error';

function formatDate(value: string | undefined) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('ar-EG');
  } catch (error) {
    return value;
  }
}

export default function RoundDetails() {
  const { distributionId, roundId } = useParams();
  const queryClient = useQueryClient();
  const [allocationInput, setAllocationInput] = useState('');
  const [allocationFeedback, setAllocationFeedback] = useState<string | null>(null);

  const roundQuery = useQuery({
    queryKey: ['distribution', distributionId, 'round', roundId],
    queryFn: () => roundsService.getById(distributionId as string, roundId as string),
    enabled: Boolean(distributionId && roundId),
  });

  const allocationsQuery = useQuery({
    queryKey: ['round', roundId, 'allocations'],
    queryFn: () => roundAllocationsService.list(roundId as string),
    enabled: Boolean(roundId),
    initialData: [] as Allocation[],
  });

  const allocateMutation = useMutation({
    mutationFn: async (beneficiaryIds: string[]) => {
      if (!roundId) throw new Error('معرف الجولة غير متوفر');
      return roundAllocationsService.allocate(roundId, { beneficiaryIds });
    },
    onMutate: () => setAllocationFeedback(null),
    onSuccess: () => {
      setAllocationFeedback('تم تخصيص المستفيدين بنجاح');
      queryClient.invalidateQueries({ queryKey: ['round', roundId, 'allocations'] });
      setAllocationInput('');
    },
    onError: (error: unknown) => {
      setAllocationFeedback(toErrorMessage(error, 'تعذر تخصيص المستفيدين، تحقق من المعرفات'));
    },
  });

  if (!distributionId || !roundId) {
    return (
      <div className="min-h-screen bg-white font-body flex flex-col">
        <Header className="mb-6" title="تفاصيل الجولة" subtitle="المعرفات غير مكتملة" />
        <div className="flex-1 flex items-center justify-center text-gray-500">لا يمكن عرض التفاصيل.</div>
        <Footer />
      </div>
    );
  }

  const round = (roundQuery.data || {}) as Round;

  function handleAllocationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ids = allocationInput
      .split(/[,\s]+/)
      .map((id) => id.trim())
      .filter(Boolean);

    if (!ids.length) {
      setAllocationFeedback('يرجى إدخال معرف مستفيد واحد على الأقل');
      return;
    }
    allocateMutation.mutate(ids);
  }

  return (
    <div className="min-h-screen bg-white font-body p-4 md:p-6 lg:p-8" dir="rtl">
      <Header
        className="mb-6"
        title={`تفاصيل الجولة #${round.roundNumber ?? ''}`}
        subtitle={`الحالة الحالية: ${round.status ?? '—'}`}
      />

      <section className="mb-6 bg-white border border-gray-200 rounded-xl p-4 space-y-2">
        <h2 className="font-heading text-lg font-bold text-gray-800">معلومات الجولة</h2>
        <p className="text-sm text-gray-600">عدد القسائم: {round.couponCount ?? '—'}</p>
        <p className="text-sm text-gray-600">البداية: {formatDate(round.startDate)}</p>
        <p className="text-sm text-gray-600">النهاية: {formatDate(round.endDate)}</p>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-4">
        <header className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-bold text-gray-800">التخصيصات</h2>
          <span className="text-sm text-gray-500">إجمالي: {allocationsQuery.data?.length ?? 0}</span>
        </header>
        <form onSubmit={handleAllocationSubmit} className="mb-4 space-y-2" dir="rtl">
          <label className="block text-sm font-bold text-gray-700">معرفات المستفيدين (مفصولة بفاصلة أو سطر جديد)</label>
          <textarea
            value={allocationInput}
            onChange={(event) => setAllocationInput(event.target.value)}
            rows={3}
            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-right"
            placeholder="مثال: id-1,id-2,id-3"
          ></textarea>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            {allocationFeedback && (
              <span className={`text-xs ${allocateMutation.isError ? 'text-red-500' : 'text-primary'}`}>
                {allocationFeedback}
              </span>
            )}
            <button
              type="submit"
              disabled={allocateMutation.isLoading}
              className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed self-start sm:self-auto"
            >
              {allocateMutation.isLoading ? 'جارٍ التخصيص…' : 'تخصيص للمستفيدين'}
            </button>
          </div>
        </form>
        <div className="space-y-3">
          {allocationsQuery.isLoading && <p className="text-sm text-gray-500">جارٍ تحميل التخصيصات…</p>}
          {!allocationsQuery.isLoading && (allocationsQuery.data ?? []).length === 0 && (
            <p className="text-sm text-gray-500">لا توجد تخصيصات مسجلة بعد.</p>
          )}
          {(allocationsQuery.data ?? []).map((allocation) => (
            <article
              key={allocation.id ?? allocation.couponCode}
              className="border border-gray-200 rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
            >
              <div className="text-right">
                <p className="font-bold text-sm text-gray-800">رمز القسيمة: {allocation.couponCode ?? '—'}</p>
                <p className="text-xs text-gray-500">المستفيد: {allocation.beneficiaryId ?? '—'}</p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-gray-600 justify-end">
                <span>الحالة: {allocation.status ?? '—'}</span>
                <span>التسليم: {formatDate(allocation.deliveredAt)}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
