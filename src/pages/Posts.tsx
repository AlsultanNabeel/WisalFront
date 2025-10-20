import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import Footer from '@/components/Footer';
import UploadIcon from '@/assets/add-post/Vector-upload.svg';
import Header from '@/components/Header';
import PlusIconSvg from '@/assets/posts/Vector (1).svg';
import EditPostIconSvg from '@/assets/posts/edit-post-icon.svg';
import DeleteIconSvg from '@/assets/posts/delete-icon.svg';
import { useAuth } from '@/providers/AuthProvider';
import {
  postsService,
  uploadsService,
  type Post,
  type CreatePostPayload,
  type UpdatePostPayload,
} from '@/api/services';
import { toErrorMessage } from '@/utils/error';

const postSchema = z.object({
  title: z.string().min(3, { message: 'يجب ألا يقل العنوان عن 3 أحرف' }).max(120),
  details: z.string().min(5, { message: 'يجب ألا يقل المحتوى عن 5 أحرف' }),
  summary: z.string().max(160, { message: 'الملخص لا يجب أن يتجاوز 160 حرفًا' }).optional(),
});

type PostForm = z.infer<typeof postSchema>;

function formatDate(value?: string) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('ar-EG');
  } catch (error) {
    return value;
  }
}

export default function Posts() {
  const { institutionId } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formError, setFormError] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PostForm>({
    resolver: zodResolver(postSchema),
  });

  const postsQuery = useQuery({
    queryKey: ['posts', institutionId],
    queryFn: () => postsService.listByInstitution(institutionId as string),
    enabled: Boolean(institutionId),
    initialData: [] as Post[],
  });

  const postImagesQuery = useQuery({
    queryKey: ['post-images', editingPost?.id],
    queryFn: () => uploadsService.listPostImages(editingPost?.id as string),
    enabled: Boolean(editingPost?.id && showModal),
    initialData: [] as string[],
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreatePostPayload) => postsService.create(payload),
    onSuccess: async (createdPost) => {
      if (createdPost?.id && selectedFile) {
        await uploadsService.uploadPostImages(createdPost.id, [selectedFile]);
      }
      setFormError(null);
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['posts', institutionId] });
      closeModal();
    },
    onError: (err: unknown) => {
      setFormError(toErrorMessage(err, 'تعذر إنشاء المنشور'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePostPayload }) =>
      postsService.update(id, payload),
    onSuccess: async (updatedPost, variables) => {
      if (variables.id && selectedFile) {
        await uploadsService.uploadPostImages(variables.id, [selectedFile]);
      }
      setFormError(null);
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['posts', institutionId] });
      closeModal();
    },
    onError: (err: unknown) => {
      setFormError(toErrorMessage(err, 'تعذر تعديل المنشور'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => postsService.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts', institutionId] }),
  });

  const deleteImageMutation = useMutation({
    mutationFn: (imageName: string) =>
      uploadsService.deletePostImage(editingPost?.id as string, imageName),
    onSuccess: () => postImagesQuery.refetch(),
  });

  useEffect(() => {
    if (showModal) {
      if (editingPost) {
        reset({
          title: String(editingPost.title ?? ''),
          details: String(editingPost.content ?? ''),
          summary: (editingPost.summary as string | undefined) ?? '',
        });
      } else {
        reset({ title: '', details: '', summary: '' });
      }
    }
  }, [editingPost, reset, showModal]);

  function openCreateModal() {
    setEditingPost(null);
    setFormError(null);
    setSelectedFile(null);
    revokePreview();
    setShowModal(true);
  }

  function openEditModal(post: Post) {
    setEditingPost(post);
    setFormError(null);
    setSelectedFile(null);
    revokePreview();
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingPost(null);
    setSelectedFile(null);
    revokePreview();
    setFormError(null);
    reset({ title: '', details: '', summary: '' });
  }

  async function onSubmit(data: PostForm) {
    if (!institutionId) {
      setFormError('لا يمكن إنشاء منشور بدون مؤسسة مرتبطة');
      return;
    }

    if (editingPost?.id) {
      const payload: UpdatePostPayload = {
        title: data.title,
        content: data.details,
        summary: data.summary || undefined,
      };
      updateMutation.mutate({ id: editingPost.id as string, payload });
    } else {
      const payload: CreatePostPayload = {
        title: data.title,
        content: data.details,
        images: [],
        institutionId,
      };
      createMutation.mutate(payload);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setSelectedFile(file ?? null);
    revokePreview();
    if (file) {
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  }

  function removeFile() {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    revokePreview();
  }

  function revokePreview() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setFilePreview(null);
  }

  useEffect(() => () => revokePreview(), []);

  const posts = useMemo(() => {
    const list = postsQuery.data ?? [];
    const filtered = list.filter((post) => {
      const matchesSearch = searchTerm.trim()
        ? String(post.title ?? '').toLowerCase().includes(searchTerm.trim().toLowerCase())
        : true;
      const status = String((post as { status?: string }).status ?? '').toLowerCase();
      const matchesStatus =
        statusFilter === 'all' || status === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
    return filtered;
  }, [postsQuery.data, searchTerm, statusFilter]);

  return (
    <div className="min-h-screen bg-white font-body p-4 md:p-6 lg:p-8" dir="rtl">
      <Header className="mb-6" title="المنشورات" subtitle="إدارة منشورات المؤسسة" />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <button
          className="flex flex-row-reverse items-center gap-2 bg-primary hover:bg-primary/90 text-white py-2 px-4 rounded-xl"
          onClick={openCreateModal}
        >
          <img src={PlusIconSvg} alt="إضافة" className="h-4 w-4" />
          إنشاء جديد
        </button>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="البحث في المنشورات..."
            className="flex-grow md:flex-none p-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="p-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">جميع الحالات</option>
            <option value="published">منشور</option>
            <option value="draft">مسودة</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead>
            <tr className="bg-gray-50 text-right">
              <th className="px-4 py-3 font-bold text-gray-600">العنوان</th>
              <th className="px-4 py-3 font-bold text-gray-600">الحالة</th>
              <th className="px-4 py-3 font-bold text-gray-600">التاريخ</th>
              <th className="px-4 py-3 font-bold text-gray-600">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {postsQuery.isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                  جارٍ تحميل المنشورات…
                </td>
              </tr>
            )}
            {!postsQuery.isLoading && posts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                  لم يتم العثور على منشورات.
                </td>
              </tr>
            )}
            {posts.map((post) => {
              const status = String((post as { status?: string }).status ?? '—');
              return (
                <tr key={post.id ?? post.title} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-800 font-bold">{post.title ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-md text-xs font-bold bg-gray-100 text-gray-700">
                      {status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(post.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 items-center text-gray-500 justify-end">
                      <button
                        type="button"
                        className="inline-flex"
                        onClick={() => post.id && openEditModal(post)}
                        disabled={!post.id}
                      >
                        <img src={EditPostIconSvg} alt="تعديل" className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex"
                        onClick={() => post.id && deleteMutation.mutate(post.id as string)}
                        disabled={!post.id || deleteMutation.isLoading}
                      >
                        <img src={DeleteIconSvg} alt="حذف" className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-xl p-6 relative shadow-lg" role="dialog" aria-modal>
            <button
              onClick={closeModal}
              className="absolute top-3 left-3 text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
            <h2 className="font-heading font-bold text-xl mb-4 text-center">
              {editingPost ? 'تعديل المنشور' : 'إنشاء منشور جديد'}
            </h2>
            {formError && (
              <p className="text-red-500 text-center text-sm mb-3 bg-red-50 p-2 rounded-md border border-red-200">
                {formError}
              </p>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700">العنوان</label>
                <input
                  type="text"
                  {...register('title')}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="أدخل عنوان المنشور"
                />
                {errors.title && <span className="text-red-500 text-xs">{errors.title.message}</span>}
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700">الملخص</label>
                <input
                  type="text"
                  {...register('summary')}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="ملخص قصير (اختياري)"
                />
                {errors.summary && <span className="text-red-500 text-xs">{errors.summary.message}</span>}
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700">التفاصيل</label>
                <textarea
                  rows={4}
                  {...register('details')}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="قم بكتابة التفاصيل ..."
                ></textarea>
                {errors.details && <span className="text-red-500 text-xs">{errors.details.message}</span>}
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700">الصورة المرفقة</label>
                <label className="block border-2 border-dashed border-gray-300 rounded-xl p-6 text-center text-sm text-gray-500 cursor-pointer hover:bg-gray-50">
                  <div className="flex items-center justify-center gap-2">
                    <span>{selectedFile ? selectedFile.name : 'صورة أو ملف'}</span>
                    <img src={UploadIcon} alt="رفع" className="h-4 w-4" />
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {selectedFile && (
                  <button
                    type="button"
                    onClick={removeFile}
                    className="text-xs text-red-500 hover:underline"
                  >
                    إزالة الملف
                  </button>
                )}
                {filePreview && (
                  <div className="mt-2">
                    <img
                      src={filePreview}
                      alt="معاينة"
                      className="h-24 w-full object-cover rounded-lg border border-gray-200"
                    />
                  </div>
                )}
              </div>
              {editingPost?.id && (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-gray-700">الصور الحالية</p>
                  {postImagesQuery.isLoading ? (
                    <p className="text-xs text-gray-500">جارٍ تحميل الصور…</p>
                  ) : (postImagesQuery.data ?? []).length === 0 ? (
                    <p className="text-xs text-gray-500">لا توجد صور مخزّنة لهذا المنشور.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {(postImagesQuery.data ?? []).map((image) => (
                        <div key={image} className="relative group">
                          <img
                            src={image}
                            alt="صورة المنشور"
                            className="h-24 w-full object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => deleteImageMutation.mutate(image)}
                            disabled={deleteImageMutation.isLoading}
                            className="absolute top-2 left-2 bg-white/85 text-red-500 rounded-full px-2 py-1 text-xs font-bold opacity-0 group-hover:opacity-100 transition disabled:opacity-50"
                          >
                            حذف
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-4 mt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl text-center"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || createMutation.isLoading || updateMutation.isLoading}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 rounded-xl text-center disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {editingPost
                    ? updateMutation.isLoading || isSubmitting
                      ? 'جارٍ التعديل...'
                      : 'حفظ التعديلات'
                    : createMutation.isLoading || isSubmitting
                    ? 'جاري الإضافة...'
                    : 'إضافة منشور'}
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
