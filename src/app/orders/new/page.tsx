'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Save } from 'lucide-react';

const orderSchema = z.object({
  order_number: z.string().min(1, '注文番号は必須です'),
  customer_name: z.string().min(1, '顧客名は必須です'),
  customer_phone: z.string().optional(),
  customer_address: z.string().optional(),
  order_date: z.string().min(1, '注文日は必須です'),
  delivery_date: z.string().optional(),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered']),
  memo: z.string().optional(),
  items: z.array(z.object({
    product_name: z.string().min(1, '商品名は必須です'),
    quantity: z.number().min(1, '数量は1以上である必要があります'),
    unit_price: z.number().min(0, '単価は0以上である必要があります'),
  })).min(1, '少なくとも1つの商品が必要です'),
});

type OrderFormData = z.infer<typeof orderSchema>;

export default function NewOrderPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      status: 'pending',
      order_date: new Date().toISOString().split('T')[0],
      items: [{ product_name: '', quantity: 1, unit_price: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const watchedItems = watch('items');
  const totalAmount = watchedItems?.reduce((sum, item) => 
    sum + (item.quantity || 0) * (item.unit_price || 0), 0
  ) || 0;

  const onSubmit = async (data: OrderFormData) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          total_amount: totalAmount,
        }),
      });

      if (response.ok) {
        router.push('/orders');
      } else {
        throw new Error('注文の作成に失敗しました');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('注文の作成に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-semibold text-gray-900">新規注文登録</h1>
          <p className="text-sm text-gray-600 mt-1">
            電話・窓口での注文をシステムに登録します
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900">基本情報</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  注文番号 *
                </label>
                <input
                  {...register('order_number')}
                  className="input-field w-full"
                  placeholder="例: ORD-2024-001"
                />
                {errors.order_number && (
                  <p className="text-red-500 text-sm mt-1">{errors.order_number.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ステータス
                </label>
                <select {...register('status')} className="input-field w-full">
                  <option value="pending">未処理</option>
                  <option value="processing">処理中</option>
                  <option value="shipped">発送済</option>
                  <option value="delivered">配達完了</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                顧客名 *
              </label>
              <input
                {...register('customer_name')}
                className="input-field w-full"
                placeholder="例: 田中太郎"
              />
              {errors.customer_name && (
                <p className="text-red-500 text-sm mt-1">{errors.customer_name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  電話番号
                </label>
                <input
                  {...register('customer_phone')}
                  className="input-field w-full"
                  placeholder="例: 090-1234-5678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  住所
                </label>
                <input
                  {...register('customer_address')}
                  className="input-field w-full"
                  placeholder="例: 東京都渋谷区..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  注文日 *
                </label>
                <input
                  type="date"
                  {...register('order_date')}
                  className="input-field w-full"
                />
                {errors.order_date && (
                  <p className="text-red-500 text-sm mt-1">{errors.order_date.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  到着希望日
                </label>
                <input
                  type="date"
                  {...register('delivery_date')}
                  className="input-field w-full"
                />
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">注文商品</h2>
              <button
                type="button"
                onClick={() => append({ product_name: '', quantity: 1, unit_price: 0 })}
                className="btn-secondary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                商品追加
              </button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-12 gap-3 items-start">
                    <div className="col-span-5">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        商品名 *
                      </label>
                      <input
                        {...register(`items.${index}.product_name`)}
                        className="input-field w-full"
                        placeholder="例: 有機野菜セット"
                      />
                      {errors.items?.[index]?.product_name && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.items[index]?.product_name?.message}
                        </p>
                      )}
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        数量 *
                      </label>
                      <input
                        type="number"
                        min="1"
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                        className="input-field w-full"
                      />
                      {errors.items?.[index]?.quantity && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.items[index]?.quantity?.message}
                        </p>
                      )}
                    </div>

                    <div className="col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        単価 (円) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        {...register(`items.${index}.unit_price`, { valueAsNumber: true })}
                        className="input-field w-full"
                      />
                      {errors.items?.[index]?.unit_price && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.items[index]?.unit_price?.message}
                        </p>
                      )}
                    </div>

                    <div className="col-span-2 flex items-end">
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {errors.items && (
              <p className="text-red-500 text-sm">{errors.items.message}</p>
            )}
          </div>

          {/* Total Amount */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-900">合計金額</span>
              <span className="text-2xl font-bold text-primary-600">
                ¥{totalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Memo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              備考
            </label>
            <textarea
              {...register('memo')}
              className="input-field w-full h-20"
              placeholder="特記事項があれば入力してください"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? '登録中...' : '注文登録'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}