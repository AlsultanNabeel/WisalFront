import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Header from '@/components/Header';
import { useAuth } from '@/providers/AuthProvider';
import { messagesService, type Message } from '@/api/services';
import { toErrorMessage } from '@/utils/error';

function formatDate(value?: string) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('ar-EG');
  } catch (error) {
    return value;
  }
}

const MESSAGE_TYPE_OPTIONS = [
  { value: 'NOTIFICATION', label: 'إشعار' },
  { value: 'ALERT', label: 'تنبيه' },
  { value: 'PROMOTION', label: 'عرض ترويجي' },
  { value: 'REMINDER', label: 'تذكير' },
  { value: 'UPDATE', label: 'تحديث' },
];

const createMessageSchema = z.object({
  title: z.string().trim().min(3, { message: 'العنوان يجب ألا يقل عن 3 أحرف' }),
  content: z.string().trim().min(5, { message: 'المحتوى يجب ألا يقل عن 5 أحرف' }),
  type: z.enum(['NOTIFICATION', 'ALERT', 'PROMOTION', 'REMINDER', 'UPDATE'], {
    errorMap: () => ({ message: 'يرجى اختيار نوع الرسالة' }),
  }),
  roundId: z.string().trim().optional(),
});

type CreateMessageForm = z.infer<typeof createMessageSchema>;

export default function Notifications() {
  const { institutionId } = useAuth();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [beneficiaryIdsInput, setBeneficiaryIdsInput] = useState('');
  const [roundIdInput, setRoundIdInput] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [messageFormError, setMessageFormError] = useState<string | null>(null);

  const {
    register: registerCreateMessage,
    handleSubmit: handleSubmitCreateMessage,
    reset: resetCreateMessageForm,
    formState: { errors: createMessageErrors, isSubmitting: isSubmittingCreateMessage },
  } = useForm<CreateMessageForm>({
    resolver: zodResolver(createMessageSchema),
    defaultValues: {
      title: '',
      content: '',
      type: 'NOTIFICATION',
      roundId: '',
    },
  });

  const messagesQuery = useQuery({
    queryKey: ['messages', institutionId],
    queryFn: () => messagesService.listByInstitution(institutionId as string),
    enabled: Boolean(institutionId),
    initialData: [] as Message[],
  });

  const statsQuery = useQuery({
    queryKey: ['messages', selectedMessageId, 'stats'],
    queryFn: () => messagesService.stats(selectedMessageId as string),
    enabled: Boolean(selectedMessageId),
  });

  const changeStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      messagesService.changeStatus(id, status),
    onMutate: () => setFeedback(null),
    onSuccess: () => {
      setFeedback('تم تحديث حالة الرسالة');
      queryClient.invalidateQueries({ queryKey: ['messages', institutionId] });
    },
    onError: (err) => setFeedback(toErrorMessage(err, 'تعذر تحديث الحالة، حاول مرة أخرى')),
  });

  const sendToBeneficiariesMutation = useMutation({
    mutationFn: ({ id, beneficiaries }: { id: string; beneficiaries: string[] }) =>
      messagesService.sendToBeneficiaries(id, beneficiaries),
    onMutate: () => setFeedback(null),
    onSuccess: () => {
      setFeedback('تم إرسال الرسالة إلى المستفيدين المحددين');
      queryClient.invalidateQueries({ queryKey: ['messages', selectedMessageId, 'stats'] });
      setBeneficiaryIdsInput('');
    },
    onError: (err) => setFeedback(toErrorMessage(err, 'تعذر إرسال الرسالة')),
  });

  const sendToRoundMutation = useMutation({
    mutationFn: ({ id, roundId }: { id: string; roundId: string }) =>
      messagesService.sendToRound(id, roundId),
    onMutate: () => setFeedback(null),
    onSuccess: () => {
      setFeedback('تم إرسال الرسالة إلى جولة التوزيع');
      queryClient.invalidateQueries({ queryKey: ['messages', selectedMessageId, 'stats'] });
      setRoundIdInput('');
    },
    onError: (err) => setFeedback(toErrorMessage(err, 'تعذر إرسال الرسالة للجولة')),
  });

  const createMessageMutation = useMutation({
    mutationFn: async (values: CreateMessageForm) => {
      if (!institutionId) throw new Error('لا يمكن إنشاء رسالة بدون مؤسسة مرتبطة');
      return messagesService.create({
        title: values.title.trim(),
        content: values.content.trim(),
        type: values.type,
        institutionId,
        roundId: values.roundId?.trim() || undefined,
      });
    },
    onMutate: () => {
      setMessageFormError(null);
      setFeedback(null);
    },
    onSuccess: () => {
      setFeedback('تم إنشاء الرسالة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['messages', institutionId] });
      resetCreateMessageForm({ title: '', content: '', type: 'NOTIFICATION', roundId: '' });
      setIsCreateModalOpen(false);
    },
    onError: (err) => setMessageFormError(toErrorMessage(err, 'تعذر إنشاء الرسالة')),
  });

  const submitCreateMessage = handleSubmitCreateMessage((values) => {
    createMessageMutation.mutate(values);
  });

  const messages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data]);
  const messageStats = (statsQuery.data as Record<string, unknown> | undefined) ?? {};

  return (
    <div className="min-h-screen bg-white font-body p-4 md:p-6 lg:p-8" dir="rtl">
      <Header className="mb-6" title="مركز الرسائل" subtitle="متابعة الرسائل والإشعارات المرسلة" />

      {feedback && (
        <div className="mb-4 p-3 rounded-lg border border-primary/30 bg-primary/5 text-primary text-sm text-right">
          {feedback}
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">
            أنشئ رسائل جديدة لإبلاغ المستفيدين أو إرسالها لجولات التوزيع.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetCreateMessageForm({ title: '', content: '', type: 'NOTIFICATION', roundId: '' });
            setMessageFormError(null);
            setIsCreateModalOpen(true);
          }}
          disabled={!institutionId}
          className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed self-start sm:self-auto"
        >
          إنشاء رسالة جديدة
        </button>
      </div>

      <div className="mx-auto bg-white rounded-xl shadow-md border border-gray-100 w-full max-w-4xl text-right">
        <div className="border-b border-gray-200 p-4">
          <h2 className="font-heading font-bold text-lg text-gray-700">الرسائل الأخيرة</h2>
          <p className="text-sm text-gray-500">إجمالي: {messages.length}</p>
        </div>
        <ul className="divide-y divide-gray-100">
          {messagesQuery.isLoading && (
            <li className="p-4 text-center text-sm text-gray-500">جارٍ تحميل الرسائل…</li>
          )}
          {!messagesQuery.isLoading && messages.length === 0 && (
            <li className="p-4.text-center text-sm text-gray-500">لا توجد رسائل مسجلة حتى الآن.</li>
          )}
          {messages.map((message) => (
            <li
              key={message.id ?? message.title}
              className={`p-4 transition border-b border-gray-100 ${
                selectedMessageId === message.id ? 'bg-primary/5' : 'bg-gray-50'
              } hover:bg-gray-100`}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-gray-800">{message.title ?? '—'}</h3>
                  <p className="text-xs text-gray-600">{message.content ?? '—'}</p>
                </div>
                <div className="text-xs text-gray-500 space-y-1 text-left md:text-right">
                  <p>النوع: {message.type ?? '—'}</p>
                  <p>الحالة: {message.status ?? '—'}</p>
                  <p>التاريخ: {formatDate(message.createdAt)}</p>
                </div>
              </div>
              {message.id && (
                <div className="mt-3 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedMessageId(message.id as string)}
                    className="px-3 py-1 rounded-lg border border-primary text-primary text-xs font-bold hover:bg-primary/10"
                  >
                    عرض التفاصيل
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      changeStatusMutation.mutate({
                        id: message.id as string,
                        status: 'SENT',
                      })
                    }
                    disabled={changeStatusMutation.isLoading}
                    className="px-3 py-1 rounded-lg bg-primary text-white text-xs font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    تعليم كمرسل
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {selectedMessageId && (
        <div className="mx-auto mt-6 bg-white rounded-xl.shadow-md border border-gray-100 w-full max-w-4xl text-right p-6 space-y-4">
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <h2 className="font-heading text-lg font-bold text-gray-800">لوحة تحكم الرسالة</h2>
            {statsQuery.isLoading ? (
              <span className="text-xs text-gray-500">جارٍ تحميل الإحصاءات…</span>
            ) : (
              <span className="text-xs text-gray-500">
                تم الإنشاء: {formatDate(messages.find((m) => m.id === selectedMessageId)?.createdAt)}
              </span>
            )}
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(messageStats).map(([key, value]) => (
              <div key={key} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                <p className="text-xs text-gray-500">{key}</p>
                <p className="text-lg font-bold text-gray-800">{String(value)}</p>
              </div>
            ))}
          </div>

          <section className="space-y-3 border-t border-gray-100 pt-4">
            <h3 className="text-sm font-bold text-gray-700">إرسال للمستفيدين</h3>
            <p className="text-xs text-gray-500">أدخل معرفات المستفيدين (مفصولة بفاصلة) لإرسال الرسالة مباشرة.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={beneficiaryIdsInput}
                onChange={(event) => setBeneficiaryIdsInput(event.target.value)}
                placeholder="مثال: id1,id2,id3"
                className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
              />
              <button
                type="button"
                onClick={() => {
                  const ids = beneficiaryIdsInput
                    .split(',')
                    .map((id) => id.trim())
                    .filter(Boolean);
                  if (!ids.length) {
                    setFeedback('يرجى إدخال معرف مستفيد واحد على الأقل');
                    return;
                  }
                  sendToBeneficiariesMutation.mutate({ id: selectedMessageId, beneficiaries: ids });
                }}
                disabled={sendToBeneficiariesMutation.isLoading}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                إرسال الآن
              </button>
            </div>
          </section>

          <section className="space-y-3 border-t border-gray-100 pt-4">
            <h3 className="text-sm font-bold text-gray-700">إرسال لجولة توزيع</h3>
            <p className="text-xs text-gray-500">أدخل معرف الجولة لإرسال الرسالة لكل المستفيدين المرتبطين بها.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={roundIdInput}
                onChange={(event) => setRoundIdInput(event.target.value)}
                placeholder="معرف الجولة"
                className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
              />
              <button
                type="button"
                onClick={() => {
                  const roundId = roundIdInput.trim();
                  if (!roundId) {
                    setFeedback('يرجى إدخال معرف الجولة');
                    return;
                  }
                  sendToRoundMutation.mutate({ id: selectedMessageId, roundId });
                }}
                disabled={sendToRoundMutation.isLoading}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                إرسال للجولة
              </button>
            </div>
          </section>
        </div>
      )}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-xl rounded-xl p-6 relative shadow-lg" role="dialog" aria-modal>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-3 left-3 text-gray-500 hover:text-gray-700"
              aria-label="إغلاق"
            >
              ×
            </button>
            <h2 className="font-heading font-bold text-xl mb-4 text-center">إنشاء رسالة جديدة</h2>
            {messageFormError && (
              <div className="mb-3 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-600 text-right">
                {messageFormError}
              </div>
            )}
            <form onSubmit={submitCreateMessage} className="space-y-4" dir="rtl">
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700">العنوان</label>
                <input
                  type="text"
                  {...registerCreateMessage('title')}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="عنوان الرسالة"
                />
                {createMessageErrors.title && (
                  <span className="text-xs text-red-500">{createMessageErrors.title.message}</span>
                )}
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700">المحتوى</label>
                <textarea
                  rows={4}
                  {...registerCreateMessage('content')}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="اكتب نص الرسالة"
                ></textarea>
                {createMessageErrors.content && (
                  <span className="text-xs text-red-500">{createMessageErrors.content.message}</span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700">نوع الرسالة</label>
                  <select
                    {...registerCreateMessage('type')}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {MESSAGE_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700">معرف الجولة (اختياري)</label>
                  <input
                    type="text"
                    {...registerCreateMessage('roundId')}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="round-id"
                  />
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
                  disabled={isSubmittingCreateMessage || createMessageMutation.isLoading}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {createMessageMutation.isLoading ? 'جارٍ الإنشاء…' : 'نشر الرسالة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
