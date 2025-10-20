import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-white font-body flex flex-col" dir="rtl">
      <Header className="mb-6" title="وصول غير مسموح" subtitle="ليس لديك الصلاحية لدخول هذه الصفحة" />
      <main className="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-gray-600 max-w-md">
          يرجى التأكد من أن لديك الصلاحية اللازمة، أو تواصل مع مسؤول النظام لمنحك الوصول.
        </p>
        <Link
          to="/"
          className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90"
        >
          العودة للصفحة الرئيسية
        </Link>
      </main>
      <Footer />
    </div>
  );
}
