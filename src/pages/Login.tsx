import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import EmailIcon from '@/assets/login/email-blue-icon.svg';
import EmailBlackIcon from '@/assets/login/email-black-icon.svg';
import FullNameIcon from '@/assets/login/full-name-icon.svg';
import IdIcon from '@/assets/login/id-icon.svg';
import Header from '@/components/Header';
import ButtonVector from '@/assets/login/Vector.svg';
import PhoneIcon from '@/assets/login/call-us-icon.svg';
import VerifiedIcon from '@/assets/login/security-icon.svg';
import Footer from '@/components/Footer';
import { useAuth } from '@/providers/AuthProvider';
import { getDefaultRouteForRole } from '@/constants/roles';

const loginSchema = z.object({
  fullName: z.string().optional(),
  idNumber: z.string().optional(),
  email: z.string().email({ message: 'بريد إلكتروني غير صالح' }),
  password: z.string().min(6, { message: 'يجب ألا تقل كلمة المرور عن 6 أحرف' }),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, initializing, role } = useAuth();
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const [rememberMe, setRememberMe] = useState(false);
  useEffect(() => {
    const remembered = localStorage.getItem('rememberMe') === 'true';
    const rememberedEmail = localStorage.getItem('rememberEmail') || '';
    if (remembered && rememberedEmail) {
      setValue('email', rememberedEmail);
      setRememberMe(true);
    }
  }, [setValue]);

  useEffect(() => {
    if (!initializing && isAuthenticated) {
      const destination = getDefaultRouteForRole(role);
      navigate(destination, { replace: true });
    }
  }, [initializing, isAuthenticated, role, navigate]);

  async function onSubmit({ email, password }: LoginForm) {
    setError('');
    try {
      await login({ email, password });
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('rememberEmail', email);
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('rememberEmail');
      }
    } catch (err) {
      setError('فشل تسجيل الدخول، تأكد من صحة بياناتك');
    }
  }

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <span className="text-sm text-gray-500">جارٍ التحميل…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white font-body">
      <Header className="px-4 py-4 md:px-8 md:py-6" />
      <main className="flex flex-col items-center flex-1 px-4 pt-4 pb-4 md:py-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="font-heading font-bold text-3xl text-[#3B82F6] mb-1">تسجيل دخول الموظف</h1>
            <p className="text-sm text-gray-500">الوصول إلى مساحة العمل المخصصة لك</p>
          </div>
          {error && (
            <p className="text-red-500 text-center text-sm bg-red-50 p-2 rounded-md border border-red-200">
              {error}
            </p>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 justify-end text-right flex-row-reverse">
                <label className="text-sm font-bold text-gray-700">الاسم الكامل</label>
                <img src={FullNameIcon} alt="الاسم" className="h-4 w-4 opacity-80" />
              </div>
              <input
                type="text"
                {...register('fullName')}
                placeholder="أدخل اسمك الكامل"
                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.fullName && (
                <span className="text-red-500 text-xs">{errors.fullName.message as string}</span>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 justify-end text-right flex-row-reverse">
                <label className="text-sm font-bold text-gray-700">رقم الهوية</label>
                <img src={IdIcon} alt="الهوية" className="h-4 w-4 opacity-80" />
              </div>
              <input
                type="text"
                {...register('idNumber')}
                placeholder="أدخل رقم هويتك"
                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.idNumber && (
                <span className="text-red-500 text-xs">{errors.idNumber.message as string}</span>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 justify-end text-right flex-row-reverse">
                <label className="text-sm font-bold text-gray-700">البريد الإلكتروني</label>
                <img src={EmailBlackIcon} alt="البريد" className="h-4 w-4 opacity-80" />
              </div>
              <input
                type="email"
                {...register('email')}
                placeholder="أدخل البريد الالكتروني الخاص بك"
                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.email && (
                <span className="text-red-500 text-xs">{errors.email.message}</span>
              )}
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-bold text-gray-700">كلمة المرور</label>
              <input
                type="password"
                {...register('password')}
                placeholder="أدخل كلمة المرور الخاص بك"
                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.password && (
                <span className="text-red-500 text-xs">{errors.password.message}</span>
              )}
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <span>تذكرني</span>
              </label>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex flex-row-reverse items-center justify-center gap-2 bg-gradient-to-l from-[#2563EB] to-[#60A5FA] text-white py-3 rounded-xl font-bold"
            >
              <span>{isSubmitting ? 'جارٍ الدخول…' : 'تسجيل الدخول'}</span>
              <img src={ButtonVector} alt="" className="h-4 w-4" />
            </button>
          </form>
          <div className="text-center text-sm text-gray-600 space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex-1 border-t border-[#E5E7EB]"></span>
              <span className="whitespace-nowrap">تحتاج إلى مساعدة؟</span>
              <span className="flex-1 border-t border-[#E5E7EB]"></span>
            </div>
            <p className="text-gray-500">اتصل بمسؤول النظام للحصول على حق الوصول</p>
            <div className="flex items-center justify-center gap-6">
              <a href="mailto:support@example.com" className="flex items-center gap-2 text-primary hover:underline">
                <img src={EmailIcon} alt="Email" className="h-4 w-4" />
                <span>البريد الإلكتروني</span>
              </a>
              <a href="tel:00970-123-456-789" className="flex items-center gap-2 text-primary hover:underline">
                <img src={PhoneIcon} alt="Phone" className="h-4 w-4" />
                <span>الدعم</span>
              </a>
            </div>
            <div className="flex items-center justify-center gap-2 text-green-600 mt-2">
              <img src={VerifiedIcon} alt="موثّق" className="h-4 w-4" />
              <span>اتصالك آمن ومشفّر</span>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
