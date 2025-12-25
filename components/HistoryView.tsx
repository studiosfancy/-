
import React, { useMemo, useState, memo, useCallback } from 'react';
import { ShoppingItem, ItemStatus } from '../types';
import { formatCurrency, formatPersianDateShort, toPersianDigits } from '../utils/dateUtils';
import { 
  ShoppingBag, Ticket, Wrench, Calendar, Receipt, 
  ArrowLeftRight, Filter, Search, Stethoscope, Scissors, Car 
} from 'lucide-react';

interface HistoryViewProps {
  items: ShoppingItem[];
}

const TransactionSession = memo(({ store, sessionItems, sessionTotal, mainCategory }: any) => {
  const getSessionIcon = (category: string, storeName: string) => {
    if (category === 'تفریح و رستوران' || storeName.includes('سینما')) return <Ticket size={20} className="text-pink-500" />;
    if (category === 'خدمات و تعمیرات') return <Wrench size={20} className="text-orange-500" />;
    if (category === 'بهداشت و درمان') return <Stethoscope size={20} className="text-red-500" />;
    if (category === 'آرایشگاه و زیبایی') return <Scissors size={20} className="text-rose-500" />;
    return <ShoppingBag size={20} className="text-emerald-500" />;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:border-blue-200 transition-all">
      <div className="p-4 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center">
            {getSessionIcon(mainCategory, store)}
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-800">{store}</h4>
            <p className="text-[10px] text-gray-400 font-medium">{toPersianDigits(sessionItems.length)} قلم کالا</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-black text-blue-700 tabular-nums">{formatCurrency(sessionTotal)}</div>
        </div>
      </div>
      <div className="p-2 space-y-1 bg-white">
        {sessionItems.map((item: any) => (
          <div key={item.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-700">{item.name}</span>
              <span className="text-[10px] text-gray-400">({toPersianDigits(item.quantity)} {item.unit})</span>
            </div>
            <div className="text-xs font-bold text-gray-500 tabular-nums">
              {formatCurrency(item.estimatedPrice * item.quantity).replace('تومان','')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

const HistoryView: React.FC<HistoryViewProps> = ({ items }) => {
  const [filterQuery, setFilterQuery] = useState('');

  const groupedSessions = useMemo(() => {
    const query = filterQuery.toLowerCase();
    const boughtItems = items.filter(i => 
      i.status === ItemStatus.BOUGHT && 
      (i.name.toLowerCase().includes(query) || (i.storeName || '').toLowerCase().includes(query))
    );

    const groups: Record<string, Record<string, ShoppingItem[]>> = {};

    boughtItems.forEach(item => {
      const dateKey = formatPersianDateShort(item.dateAdded).split('|')[0].trim();
      const storeKey = item.storeName || 'خرید متفرقه';

      if (!groups[dateKey]) groups[dateKey] = {};
      if (!groups[dateKey][storeKey]) groups[dateKey][storeKey] = [];
      groups[dateKey][storeKey].push(item);
    });

    return groups;
  }, [items, filterQuery]);

  const dates = useMemo(() => Object.keys(groupedSessions).sort((a, b) => b.localeCompare(a)), [groupedSessions]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 px-4">
      <div className="bg-white p-6 rounded-[32px] shadow-soft border border-gray-100 flex items-center gap-4">
          <Search className="text-gray-300" size={24} />
          <input 
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="جستجو در هزاران تراکنش ثبت شده..." 
            className="flex-1 outline-none text-base font-black text-slate-800 placeholder:text-gray-300 bg-transparent"
          />
      </div>

      {dates.length === 0 ? (
        <div className="py-32 text-center bg-gray-50 rounded-[48px] border-2 border-dashed border-gray-200">
           <Receipt size={64} className="mx-auto text-gray-200 mb-4" />
           <p className="text-gray-400 font-bold">موردی برای نمایش یافت نشد.</p>
        </div>
      ) : (
        dates.map(date => {
          const sessions = groupedSessions[date];
          const stores = Object.keys(sessions);
          const dailyTotal = stores.reduce((acc, store) => acc + sessions[store].reduce((s, it) => s + (it.estimatedPrice * it.quantity), 0), 0);

          return (
            <div key={date} className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between px-4 pt-4">
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-blue-600" />
                  <span className="text-base font-black text-gray-900">{toPersianDigits(date)}</span>
                </div>
                <div className="text-[10px] font-black text-gray-500 bg-slate-100 px-4 py-2 rounded-full tabular-nums">
                  مجموع روز: {formatCurrency(dailyTotal)}
                </div>
              </div>
              <div className="space-y-4">
                {stores.map(store => {
                  const sessionItems = sessions[store];
                  const sessionTotal = sessionItems.reduce((acc, it) => acc + (it.estimatedPrice * it.quantity), 0);
                  return (
                    <TransactionSession 
                      key={`${date}-${store}`} 
                      store={store} 
                      sessionItems={sessionItems} 
                      sessionTotal={sessionTotal} 
                      mainCategory={sessionItems[0].category} 
                    />
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default HistoryView;
