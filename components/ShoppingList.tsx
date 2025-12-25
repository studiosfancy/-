
import React, { useState, useRef, useMemo } from 'react';
// Added ShoppingBag to imports
import { Plus, Trash2, Check, Pencil, X, Barcode as BarcodeIcon, Image as ImageIcon, Loader2, Minus, Search, FileSpreadsheet, Camera, Sparkles, Save, Globe, DollarSign, SearchIcon, Download, Link2, ExternalLink, ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react';
import readXlsxFile from 'read-excel-file';
import { ShoppingItem, ItemStatus } from '../types';
import { formatCurrency, toPersianDigits } from '../utils/dateUtils';
import { CATEGORIES, UNITS, SUPERMARKET_CATEGORIES, PERSONAL_CATEGORIES, HOME_CATEGORIES } from '../constants';
import { extractItemsFromReceipt, findProductPrice, findProductImageOnline } from '../services/geminiService';

interface ShoppingListProps {
  items: ShoppingItem[];
  onAddItem: (item: Omit<ShoppingItem, 'id'>) => void;
  onAddBulkItems: (items: Omit<ShoppingItem, 'id'>[]) => void;
  onEditItem: (item: ShoppingItem) => void;
  onToggleStatus: (id: string) => void;
  onDeleteItem: (id: string) => void;
  globalSearchQuery?: string; // Prop from App.tsx
}

const ShoppingList: React.FC<ShoppingListProps> = ({ items, onAddItem, onAddBulkItems, onEditItem, onToggleStatus, onDeleteItem, globalSearchQuery = '' }) => {
  const [activeTab, setActiveTab] = useState<'SUPERMARKET' | 'PERSONAL' | 'HOME'>('SUPERMARKET');
  const [localFilter, setLocalFilter] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<ShoppingItem | null>(null);
  const [isSearchingAi, setIsSearchingAi] = useState(false);
  const [manualUrlInputOpen, setManualUrlInputOpen] = useState(false);
  const [showFullList, setShowFullList] = useState(false);

  const [newItemForm, setNewItemForm] = useState<Partial<ShoppingItem>>({
    name: '', estimatedPrice: 0, category: 'خواربار', quantity: 1, unit: 'عدد', barcode: '', imageUrl: ''
  });

  const receiptInputRef = useRef<HTMLInputElement>(null);
  const multiExcelRef = useRef<HTMLInputElement>(null);

  // Advanced Search & Optimization Logic
  const allFilteredItems = useMemo(() => {
    const combinedQuery = (globalSearchQuery + ' ' + localFilter).trim().toLowerCase();
    
    return items
      .filter(i => {
        if (i.status === ItemStatus.BOUGHT) return false; 
        
        // Tab filtering
        let inTab = false;
        if (activeTab === 'SUPERMARKET') inTab = SUPERMARKET_CATEGORIES.includes(i.category as any);
        else if (activeTab === 'PERSONAL') inTab = PERSONAL_CATEGORIES.includes(i.category as any);
        else inTab = HOME_CATEGORIES.includes(i.category as any);
        if (!inTab) return false;

        if (!combinedQuery) return true;
        
        // Advanced multi-field search
        return i.name.toLowerCase().includes(combinedQuery) || 
               (i.barcode && i.barcode.includes(combinedQuery)) ||
               i.category.includes(combinedQuery);
      })
      .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
  }, [items, activeTab, localFilter, globalSearchQuery]);

  // Limit to top 10 for performance if showFullList is false
  const displayedItems = useMemo(() => {
    if (showFullList) return allFilteredItems;
    return allFilteredItems.slice(0, 10);
  }, [allFilteredItems, showFullList]);

  const handleManualAdd = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    if (!newItemForm.name?.trim()) return;
    onAddItem({
      name: newItemForm.name!,
      estimatedPrice: newItemForm.estimatedPrice || 0,
      category: newItemForm.category || 'سایر',
      unit: newItemForm.unit || 'عدد',
      barcode: newItemForm.barcode,
      imageUrl: newItemForm.imageUrl,
      quantity: newItemForm.quantity || 1,
      status: ItemStatus.PENDING,
      dateAdded: new Date().toISOString()
    });
    setNewItemForm({ name: '', estimatedPrice: 0, category: 'خواربار', quantity: 1, unit: 'عدد', barcode: '', imageUrl: '' });
    setShowAddForm(false);
    setManualUrlInputOpen(false);
  };

  const handleUpdateItem = () => {
    if (itemToEdit && itemToEdit.name.trim()) {
      onEditItem(itemToEdit);
      setItemToEdit(null);
      setManualUrlInputOpen(false);
    }
  };

  const aiAction = async (target: 'EDIT' | 'NEW', action: 'PRICE' | 'IMAGE') => {
    const obj = target === 'EDIT' ? itemToEdit : newItemForm;
    if (!obj?.name) return;
    setIsSearchingAi(true);
    try {
        if (action === 'PRICE') {
            const price = await findProductPrice(obj.name);
            if (price > 0) {
                if (target === 'EDIT') setItemToEdit({...itemToEdit!, estimatedPrice: price});
                else setNewItemForm({...newItemForm, estimatedPrice: price});
            }
        } else {
            const url = await findProductImageOnline(obj.name);
            if (url) {
                if (target === 'EDIT') setItemToEdit({...itemToEdit!, imageUrl: url});
                else setNewItemForm({...newItemForm, imageUrl: url});
            }
        }
    } finally { setIsSearchingAi(false); }
  };

  const openGoogleImageSearch = () => {
    const obj = itemToEdit || newItemForm;
    if (!obj?.name) return;
    const query = encodeURIComponent(obj.name);
    window.open(`https://www.google.com/search?q=${query}&tbm=isch`, '_blank');
  };

  const processReceipt = async (base64: string) => {
    setIsProcessing(true);
    try {
      const result = await extractItemsFromReceipt(base64);
      if (result.length > 0) {
        onAddBulkItems(result.map(it => ({ ...it, status: ItemStatus.PENDING, dateAdded: new Date().toISOString() })));
      }
    } catch (e) { alert("خطا در تحلیل فاکتور."); }
    finally { setIsProcessing(false); }
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfcfd] overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 space-y-8 max-w-7xl mx-auto w-full">
        
        {/* Tabs */}
        <div className="flex gap-2 p-2 bg-slate-200 rounded-[32px] shadow-inner">
          {(['SUPERMARKET', 'PERSONAL', 'HOME'] as const).map(tab => (
            <button 
              key={tab}
              onClick={()=>setActiveTab(tab)} 
              className={`flex-1 py-5 rounded-[26px] font-black text-xs md:text-sm transition-all flex items-center justify-center gap-2 ${activeTab===tab ? 'bg-white text-slate-900 shadow-xl scale-[1.02]' : 'text-slate-500 hover:bg-white/50'}`}
            >
              {tab === 'SUPERMARKET' ? '🛒 سوپرمارکت' : tab === 'PERSONAL' ? '👔 شخصی' : '🏠 منزل'}
            </button>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button onClick={() => receiptInputRef.current?.click()} className="bg-slate-900 p-8 rounded-[40px] shadow-pro hover:bg-slate-800 transition-all flex items-center gap-6 group">
            <div className="w-14 h-14 bg-white/10 text-sky-400 rounded-[20px] flex items-center justify-center group-hover:rotate-12 transition-transform"><Camera size={24}/></div>
            <div className="text-right text-white"><h4 className="font-black text-base">اسکن فاکتور</h4><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">AI Scanner</p></div>
          </button>
          <button onClick={() => setShowAddForm(true)} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-soft hover:shadow-pro transition-all flex items-center gap-6 group">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-[20px] flex items-center justify-center group-hover:scale-110 transition-transform"><Plus size={24}/></div>
            <div className="text-right"><h4 className="font-black text-slate-900 text-base">ثبت دستی</h4><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Manual Entry</p></div>
          </button>
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-soft flex items-center gap-6">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-[20px] flex items-center justify-center"><Search size={24}/></div>
            <div className="flex-1">
                <input 
                  value={localFilter} 
                  onChange={e => setLocalFilter(e.target.value)} 
                  placeholder="جستجوی سریع..." 
                  className="w-full bg-transparent outline-none font-black text-sm text-slate-900 placeholder:text-slate-300" 
                />
            </div>
          </div>
        </div>

        <input type="file" ref={receiptInputRef} className="hidden" accept="image/*" onChange={e => {
          const file = e.target.files?.[0]; if(!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => processReceipt(ev.target?.result as string);
          reader.readAsDataURL(file);
        }} />

        {/* List Display */}
        <div className="bg-white rounded-[56px] border border-slate-100 shadow-pro overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <div className="flex items-center gap-3">
                    {/* Fixed: ShoppingBag now imported from lucide-react */}
                    <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><ShoppingBag size={20}/></div>
                    <h3 className="font-black text-slate-900">لیست خریدهای آتی</h3>
                </div>
                <div className="text-[10px] font-black text-slate-400 bg-white px-5 py-2 rounded-full border border-slate-100 tabular-nums">
                    {toPersianDigits(allFilteredItems.length)} کالا مجموعاً
                </div>
            </div>

            <div className="divide-y divide-slate-50">
                {displayedItems.map(item => (
                    <div key={item.id} className="p-6 flex items-center gap-6 hover:bg-slate-50/50 transition-all group animate-in slide-in-from-right-4">
                        <button onClick={() => onToggleStatus(item.id)} className={`w-12 h-12 rounded-[18px] border-2 flex items-center justify-center shrink-0 transition-all ${item.status === ItemStatus.BOUGHT ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-100 hover:border-blue-400 shadow-soft bg-white'}`}>
                            {item.status === ItemStatus.BOUGHT && <Check size={20} strokeWidth={4}/>}
                        </button>
                        
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                           {item.imageUrl ? (
                             <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} />
                           ) : (
                             <ImageIcon className="text-slate-300" size={20} />
                           )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-black text-slate-900 truncate">{item.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[8px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md uppercase tracking-tight">{item.category}</span>
                            </div>
                        </div>

                        <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl p-0.5">
                            <button onClick={() => onEditItem({...item, quantity: Math.max(1, item.quantity - 1)})} className="p-2 text-slate-300 hover:text-rose-500"><Minus size={14}/></button>
                            <span className="w-8 text-center font-black text-slate-900 text-xs tabular-nums">{toPersianDigits(item.quantity)}</span>
                            <button onClick={() => onEditItem({...item, quantity: item.quantity + 1})} className="p-2 text-slate-300 hover:text-emerald-500"><Plus size={14}/></button>
                        </div>
                        
                        <div className="min-w-[100px] text-left text-sm font-black text-slate-900 tabular-nums">{formatCurrency(item.estimatedPrice * item.quantity)}</div>
                        
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => setItemToEdit(item)} className="p-3 text-slate-300 hover:text-blue-600"><Pencil size={18}/></button>
                            <button onClick={() => onDeleteItem(item.id)} className="p-3 text-slate-300 hover:text-rose-600"><Trash2 size={18}/></button>
                        </div>
                    </div>
                ))}
            </div>

            {allFilteredItems.length > 10 && (
                <div className="p-6 bg-slate-50/50 border-t border-slate-50 text-center">
                    <button 
                        onClick={() => setShowFullList(!showFullList)} 
                        className="inline-flex items-center gap-2 text-xs font-black text-blue-600 hover:text-blue-700 transition-colors"
                    >
                        {showFullList ? (
                            <><ChevronUp size={16}/> نمایش فقط ۱۰ قلم اول (بهینه‌سازی)</>
                        ) : (
                            <><ChevronDown size={16}/> نمایش تمام {toPersianDigits(allFilteredItems.length)} کالا</>
                        )}
                    </button>
                </div>
            )}

            {displayedItems.length === 0 && (
                <div className="p-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="text-slate-200" size={32}/>
                    </div>
                    <p className="text-sm font-bold text-slate-400">کالایی یافت نشد.</p>
                </div>
            )}
        </div>

        {/* Edit/Add Modal - Simplified for performance */}
        {(showAddForm || itemToEdit) && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-3xl z-[6000] flex items-center justify-center p-6 animate-in fade-in">
                <div className="bg-white rounded-[48px] w-full max-w-2xl max-h-[90vh] shadow-pro border border-white/20 overflow-hidden flex flex-col relative">
                    <div className="bg-slate-900 p-8 text-white flex justify-between items-center shrink-0">
                        <h3 className="text-xl font-black">{showAddForm ? 'ثبت کالا' : 'ویرایش کالا'}</h3>
                        <button onClick={() => { setShowAddForm(false); setItemToEdit(null); }} className="p-2 hover:bg-rose-500 rounded-xl transition-all"><X size={24}/></button>
                    </div>
                    <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                        <div className="flex items-start gap-8">
                             <div className="w-32 h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] flex items-center justify-center shrink-0 overflow-hidden relative group">
                                {((showAddForm ? newItemForm : itemToEdit)?.imageUrl) ? (
                                    <img src={(showAddForm ? newItemForm : itemToEdit)?.imageUrl} className="w-full h-full object-cover" />
                                ) : (
                                    <ImageIcon className="text-slate-300" size={32} />
                                )}
                                <div className="absolute inset-0 bg-blue-600/90 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all font-black text-[10px] gap-2 p-2 text-center">
                                    <button onClick={() => aiAction(showAddForm ? 'NEW' : 'EDIT', 'IMAGE')} className="w-full py-2 bg-white/20 rounded-xl hover:bg-white/40">هوش مصنوعی</button>
                                    <button onClick={openGoogleImageSearch} className="w-full py-2 bg-white/20 rounded-xl hover:bg-white/40">گوگل</button>
                                </div>
                            </div>
                            <div className="flex-1 space-y-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase mr-3">نام کالا</label>
                                    <input 
                                        value={(showAddForm ? newItemForm : itemToEdit)?.name || ''} 
                                        onChange={e => {
                                            if (showAddForm) setNewItemForm({...newItemForm, name: e.target.value});
                                            else setItemToEdit({...itemToEdit!, name: e.target.value});
                                        }} 
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black outline-none" 
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase mr-3">قیمت واحد</label>
                                        <input 
                                            value={(showAddForm ? newItemForm : itemToEdit)?.estimatedPrice || 0} 
                                            onChange={e => {
                                                const v = parseInt(e.target.value) || 0;
                                                if (showAddForm) setNewItemForm({...newItemForm, estimatedPrice: v});
                                                else setItemToEdit({...itemToEdit!, estimatedPrice: v});
                                            }} 
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black outline-none" 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase mr-3">تعداد</label>
                                        <input 
                                            type="number" 
                                            value={(showAddForm ? newItemForm : itemToEdit)?.quantity || 1} 
                                            onChange={e => {
                                                const v = parseFloat(e.target.value) || 1;
                                                if (showAddForm) setNewItemForm({...newItemForm, quantity: v});
                                                else setItemToEdit({...itemToEdit!, quantity: v});
                                            }} 
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black outline-none" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-8 border-t border-slate-50 bg-white flex justify-end gap-3 shrink-0">
                        <button onClick={() => { setShowAddForm(false); setItemToEdit(null); }} className="px-8 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-xs">لغو</button>
                        <button onClick={showAddForm ? handleManualAdd : handleUpdateItem} className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs shadow-xl active:scale-95 transition-all">تایید و ثبت</button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default ShoppingList;
