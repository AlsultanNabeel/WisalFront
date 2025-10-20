import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import SearchIcon from '@/assets/delivery/Vector (1).svg';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { roundAllocationsService } from '@/api/services';
import { toErrorMessage } from '@/utils/error';

interface DeliveryResult {
  couponCode?: string;
  beneficiaryId?: string;
  status?: string;
  deliveredAt?: string;
}

export default function Delivery() {
  const [roundId, setRoundId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [result, setResult] = useState<DeliveryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deliverMutation = useMutation({
    mutationFn: () =>
      roundAllocationsService.deliver(roundId.trim(), {
        couponCode: couponCode.trim(),
      }),
    onMutate: () => {
      setError(null);
      setResult(null);
    },
    onSuccess: (allocation) => {
      setResult(allocation || {});
    },
    onError: (err: unknown) => {
      setError(toErrorMessage(err, 'تعذر التحقق من الرمز'));
    },
  });

  function handleVerify(event: FormEvent) {
    event.preventDefault();
    if (!roundId.trim() || !couponCode.trim()) {
      setError('يرجى إدخال رقم الجولة ورمز القسيمة');
      return;
    }
    deliverMutation.mutate();
  }

  return (
    <div className="min-h-screen flex flex-col bg-white font-body" dir="rtl">
      <Header className="px-4 py-4 md:px-8 md:py-6" title="تحقق التسليم" subtitle="تأكيد تسليم القسائم للمستفيدين" />

      <main className="flex flex-col items-center flex-grow px-4 py-8 md:py-12">
        <h1 className="text-2xl font-bold font-heading mb-2 text-center">تحقق من رمز التسليم</h1>
        <p className="text-sm text-gray-500 mb-8 text-center max-w-md">
          أدخل رقم الجولة والرمز لتأكيد تسليم القسيمة للمستفيد
        </p>
        <form onSubmit={handleVerify} className="w-full max-w-md space-y-4">
          <div>
            <label className="block text-sm mb-1 font-bold text-gray-700">رقم الجولة</label>
            <input
              type="text"
              value={roundId}
              onChange={(event) => setRoundId(event.target.value)}
              placeholder="أدخل معرف الجولة"
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-right"
            />
          </div>
          <div>
            <label className="block text-sm.mb-1 font-bold text-gray-700">رمز القسيمة</label>
            <input
              type="text"
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value)}
              placeholder="أدخل رمز القسيمة المكوّن من الحروف/الأرقام"
              className="w-full p-3 border border-gray-300.rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-right"
            />
          </div>
          <button
            type="submit"
            disabled={deliverMutation.isLoading}
            className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold flex-row-reverse disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <img src={SearchIcon} alt="بحث" className="h-5 w-5" />
            {deliverMutation.isLoading ? 'جارٍ التحقق…' : 'تحقق من الرمز'}
          </button>
        </form>

        {error && (
          <div className="mt-6 w-full max-w-md text-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-8 w-full max-w-md">
            <div className="bg-white border border-primary rounded-xl p-4 shadow-md">
              <h2 className="font-bold font-heading mb-3 text-primary">تفاصيل التسليم</h2>
              <div className="space-y-2 text-sm text-gray-700">
                <p>
                  <span className="font-bold text-gray-900">رمز القسيمة:</span> {result.couponCode ?? couponCode}
                </p>
                <p>
                  <span className="font-bold text-gray-900">المستفيد:</span> {result.beneficiaryId ?? '—'}
                </p>
                <p>
                  <span className="font-bold text-gray-900">الحالة:</span> {result.status ?? '—'}
                </p>
                <p>
                  <span className="font-bold text-gray-900">وقت التسليم:</span> {result.deliveredAt ? new Date(result.deliveredAt).toLocaleString('ar-EG') : '—'}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
