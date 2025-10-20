import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  beneficiariesService,
  type Beneficiary,
  type BeneficiaryListResponse,
} from '@/api/services';
import { Link } from 'react-router-dom';

const HEALTH_OPTIONS = [
  { value: '', label: 'الحالة الصحية' },
  { value: 'NORMAL', label: 'طبيعي' },
  { value: 'CHRONIC_DISEASE', label: 'مرض مزمن' },
  { value: 'SPECIAL_NEEDS', label: 'احتياجات خاصة' },
  { value: 'MARTYR', label: 'أسرة شهيد' },
];

export default function BeneficiariesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [healthStatus, setHealthStatus] = useState('');

  const beneficiariesQuery = useQuery({
    queryKey: ['beneficiaries', { searchTerm, healthStatus }],
    queryFn: async () => {
      if (searchTerm.trim().length >= 2) {
        return beneficiariesService.search(searchTerm.trim());
      }
      const response = await beneficiariesService.list({
        limit: 25,
        healthStatus: healthStatus || undefined,
      });
      return response;
    },
  });

  const { data, total } = useMemo(() => {
    const payload = beneficiariesQuery.data;
    if (Array.isArray(payload)) {
      return { data: payload as Beneficiary[], total: payload.length };
    }
    const response = (payload as BeneficiaryListResponse) || {};
    const records = (response.data as Beneficiary[]) || [];
    return { data: records, total: (response.total as number | undefined) ?? records.length };
  }, [beneficiariesQuery.data]);

  return (
    <div className="min-h-screen bg-white font-body p-4 md:p-6 lg:p-8" dir="rtl">
      <Header
        className="mb-6"
        title="إدارة المستفيدين"
        subtitle="عرض بيانات المستفيدين وأفراد العائلة والقسائم"
      />

      <section className="mb-6 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h2 className="font-heading text-lg font-bold text-gray-800">قائمة المستفيدين</h2>
            <p className="text-sm text-gray-500">إجمالي النتائج: {total}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ابحث بالاسم"
              className="w-full sm:w-64 p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
            />
            <select
              value={healthStatus}
              onChange={(event) => setHealthStatus(event.target.value)}
              className="w-full sm:w-40 p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
            >
              {HEALTH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-right">
                <th className="p-3">الاسم</th>
                <th className="p-3">رقم الهوية</th>
                <th className="p-3">الهاتف</th>
                <th className="p-3">الحالة الصحية</th>
                <th className="p-3">الدخل</th>
                <th className="p-3 text-center">التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {beneficiariesQuery.isLoading && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500">
                    جارٍ تحميل البيانات…
                  </td>
                </tr>
              )}
              {!beneficiariesQuery.isLoading && (data ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500">
                    لا توجد نتائج مطابقة.
                  </td>
                </tr>
              )}
              {(data ?? []).map((beneficiary) => (
                <tr key={beneficiary.id ?? beneficiary.nationalId} className="border-b border-gray-100">
                  <td className="p-3 font-bold text-gray-800">{beneficiary.fullName ?? '—'}</td>
                  <td className="p-3 text-gray-600">{beneficiary.nationalId ?? '—'}</td>
                  <td className="p-3 text-gray-600">{beneficiary.phone ?? '—'}</td>
                  <td className="p-3 text-gray-600">{beneficiary.healthStatus ?? '—'}</td>
                  <td className="p-3 text-gray-600">{beneficiary.income ?? '—'}</td>
                  <td className="p-3 text-center">
                    {beneficiary.id ? (
                      <Link
                        to={`/beneficiaries/${beneficiary.id}`}
                        className="text-primary hover:underline"
                      >
                        عرض التفاصيل
                      </Link>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Footer />
    </div>
  );
}
