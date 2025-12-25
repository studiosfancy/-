
import React, { useState, useMemo, memo } from 'react';
import { ShoppingItem, ItemStatus } from '../types';
import { getPersianDate, toPersianDigits } from '../utils/dateUtils';
import { Package2, Clock, RefreshCw, Trash2, CheckCircle2, Search, ChevronDown, ChevronUp, Inbox, ShoppingBag, Barcode } from 'lucide-react';
import { CATEGORIES, CATEGORY_COLORS } from '../constants';

interface PantryViewProps {
  items: ShoppingItem[];
  onEditItem: (item: ShoppingItem) => void;
  onDeleteItem: (id: string) => void;
  onRestock: (id: string) => void;
}

const PantryItemRow = memo(({ item, onRestock, onDeleteItem }: any) => (
  <div className="p-4 flex items-center gap-4 hover:bg-gray-50/30 transition-colors group">
    <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-50 flex items-center justify-center overflow-hidden shrink-0">
      {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} /> : <Package2 className="text-gray-300" size={24} />}
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="font-bold text-gray-900 text-sm truncate">{item.name}</h4>
      <div className="flex flex-wrap items-center gap-3 text-gray-400 text-[10px] mt-1">
        <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-bold tabular-nums">موجودی: {toPersianDigits(item.quantity)} {item.unit}</span>
        <span className="flex items-center gap-1 tabular-nums"><Clock size={12}/> خرید: {getPersianDate(new Date(item.dateAdded))}</span>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <button onClick={() => onRestock(item.id)} className="flex items-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-600 hover:text-white transition-all text-[11px] font-bold">
        <RefreshCw size={14} /> تمدید
      </button>
      <button onClick={() => onDeleteItem(item.id)} className="p-2 text-gray-300 hover:text-red-500"><Trash2 size={18}/></button>
    </div>
  </div>
));

const PantryView: React.FC<PantryViewProps> = ({ items, onDeleteItem, onRestock }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const { inventoryGroups, totalCount } = useMemo(() => {
    const groups: Record<string, ShoppingItem[]> = {};
    const filtered = items.filter(item => 
      item.status === ItemStatus.BOUGHT &&
      (item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.category.includes(searchQuery))
    );

    filtered.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });

    // Sort items within each category by dateAdded descending (newest purchases first)
    Object.keys(groups).forEach(cat => {
      groups[cat].sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
    });

    return { inventoryGroups: groups, totalCount: filtered.length };
  }, [items, searchQuery]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 px-4">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
             <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="جستجوی سریع در انبار..." className="w-full bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-sm focus:ring-2 focus:ring-blue-500/20 pr-12 font-bold text-gray-700" />
             <Search className="absolute right-4 top-3.5 text-gray-300" size={20} />
          </div>
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold tabular-nums">{toPersianDigits(totalCount)} کالا موجود است</div>
      </div>

      <div className="space-y-4">
          {totalCount === 0 ? (
              <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-gray-100 flex flex-col items-center gap-6 shadow-sm">
                  <Inbox size={60} className="text-gray-100" />
                  <p className="text-gray-400 font-bold">انبار خانه خالی است.</p>
              </div>
          ) : (
              Object.keys(inventoryGroups).map(category => {
                  const itemsInCat = inventoryGroups[category];
                  const isExpanded = expandedCategories[category] !== false;
                  return (
                      <div key={category} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm animate-in fade-in">
                          <button onClick={() => setExpandedCategories(p => ({...p, [category]: !isExpanded}))} className="w-full flex items-center justify-between p-4 bg-gray-50/50">
                              <div className="flex items-center gap-4">
                                  <div className="w-1.5 h-6 rounded-full" style={{backgroundColor: CATEGORY_COLORS[category] || '#eee'}}></div>
                                  <h3 className="font-bold text-gray-800">{category}</h3>
                                  <span className="bg-white px-2 py-0.5 rounded-lg text-[10px] font-bold text-gray-400 tabular-nums">{toPersianDigits(itemsInCat.length)} مورد</span>
                              </div>
                              {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                          </button>
                          {isExpanded && (
                              <div className="divide-y divide-gray-50">
                                  {itemsInCat.map(item => <PantryItemRow key={item.id} item={item} onRestock={onRestock} onDeleteItem={onDeleteItem} />)}
                              </div>
                          )}
                      </div>
                  );
              })
          )}
      </div>
    </div>
  );
};

export default PantryView;
