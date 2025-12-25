
import React, { useMemo, useState, useRef, useCallback, memo } from 'react';
import { ShoppingItem, ItemStatus, HouseTask, UserLevel, MealPlan, ScannedProductData } from '../types';
import { formatCurrency, getPersianDate, getJalaliCalendarData, jalaliToIso, toPersianDigits, formatPersianDateShort } from '../utils/dateUtils';
import { 
  TrendingUp, Wallet, ShoppingBag, PieChart as PieIcon, AlertTriangle, 
  Plus, Receipt, Package, CheckCircle2, ShieldAlert, Activity,
  ChevronRight, ChevronLeft, Calendar as CalendarIcon, ArrowUpRight,
  Target, Info, Trash2, Clock, Zap, BarChart3, LineChart, LayoutGrid, ListTodo, Globe, SearchIcon, DollarSign, Save, X, Barcode as BarcodeIcon, ImageIcon, Loader2, Camera, Link2, ExternalLink, ArrowLeftRight, ScanLine, Minimize2, Frame
} from 'lucide-react';
import { CATEGORY_COLORS, CATEGORIES, UNITS } from '../constants';
import { analyzeImageUniversal, findProductPrice, findProductImageOnline } from '../services/geminiService';

// Define Persian Jalali months for the calendar modal
const months = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
];

interface DashboardProps {
  items: ShoppingItem[];
  tasks: HouseTask[];
  userLevel: UserLevel;
  mealPlan: MealPlan[];
  onAddItem: (item: Omit<ShoppingItem, 'id'>) => void;
  onAddBulkItems: (items: Omit<ShoppingItem, 'id'>[]) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ items, tasks, userLevel, mealPlan, onAddItem, onAddBulkItems }) => {
  const [selectedDate, setSelectedDate] = useState<{y: number, m: number, d: number} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLiveScanning, setIsLiveScanning] = useState(false);
  const [monthlyBudget, setMonthlyBudget] = useState(20000000); 
  const [activeUrlInput, setActiveUrlInput] = useState<number | null>(null);
  const [saveToHistory, setSaveToHistory] = useState(false);
  
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentJ = useMemo(() => getJalaliCalendarData(new Date()), []);

  // Optimized calculations with heavy memoization for high performance
  const currentMonthItems = useMemo(() => {
    const { month, year } = currentJ;
    return items.filter(item => {
      const d = getJalaliCalendarData(new Date(item.dateAdded));
      return d.month === month && d.year === year;
    });
  }, [items, currentJ.month, currentJ.year]);

  const boughtItems = useMemo(() => currentMonthItems.filter(i => i.status === ItemStatus.BOUGHT), [currentMonthItems]);
  const totalSpent = useMemo(() => boughtItems.reduce((acc, curr) => acc + (curr.estimatedPrice * curr.quantity), 0), [boughtItems]);
  
  const budgetProgress = useMemo(() => Math.min((totalSpent / monthlyBudget) * 100, 100), [totalSpent, monthlyBudget]);
  const isBudgetCritical = budgetProgress > 85;

  const [entryItems, setEntryItems] = useState<Array<Partial<ShoppingItem>>>([
    { name: '', estimatedPrice: 0, category: 'خواربار', quantity: 1, unit: 'عدد', barcode: '', imageUrl: '' }
  ]);
  const [storeName, setStoreName] = useState('');

  const handleDayClick = useCallback((day: number) => {
    setSelectedDate({ y: currentJ.year, m: currentJ.month, d: day });
    setEntryItems([{ name: '', estimatedPrice: 0, category: 'خواربار', quantity: 1, unit: 'عدد', barcode: '', imageUrl: '' }]);
    setStoreName('');
    setActiveUrlInput(null);
    setSaveToHistory(false);
  }, [currentJ]);

  const startLiveScan = async () => {
    setIsLiveScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("دسترسی به دوربین امکان‌پذیر نیست.");
      setIsLiveScanning(false);
    }
  };

  const stopLiveScan = useCallback(() => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setIsLiveScanning(false);
  }, []);

  const captureLiveFrame = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;
    setIsProcessing(true);
    try {
      const ctx = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx?.drawImage(videoRef.current, 0, 0);
      const base64 = canvasRef.current.toDataURL('image/jpeg', 0.8);
      
      const result = await analyzeImageUniversal(base64);
      
      if (result.items.length > 0) {
        setEntryItems(result.items);
        if (result.storeName) setStoreName(result.storeName);
        // Automatically switch destination to Pantry if AI confirms it's a receipt
        if (result.isReceipt) {
            setSaveToHistory(true);
        }
      } else {
        alert("موردی شناسایی نشد. مجدداً تلاش کنید.");
      }
      
      stopLiveScan();
    } catch (e) {
      alert("خطا در پردازش تصویر.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveTransaction = () => {
    if (!selectedDate) return;
    // Current timestamp ensures latest item is sorted correctly
    const nowTimestamp = new Date().toISOString();
    const validItems = entryItems.filter(it => it.name && it.name.trim() !== '');
    if (validItems.length === 0) return;

    onAddBulkItems(validItems.map(it => ({
      name: it.name!,
      estimatedPrice: it.estimatedPrice || 0,
      category: it.category || 'سایر',
      quantity: it.quantity || 1,
      unit: it.unit || 'عدد',
      barcode: it.barcode,
      imageUrl: it.imageUrl,
      storeName: storeName.trim() || undefined,
      status: saveToHistory ? ItemStatus.BOUGHT : ItemStatus.PENDING,
      dateAdded: nowTimestamp // Use current timestamp for precise sorting
    })));
    setSelectedDate(null);
  };

  const handleAiPriceCheck = async (index: number) => {
    const item = entryItems[index];
    if (!item.name) return;
    setIsProcessing(true);
    try {
        const price = await findProductPrice(item.name);
        const newItems = [...entryItems];
        newItems[index].estimatedPrice = price;
        setEntryItems(newItems);
    } finally { setIsProcessing(false); }
  };

  const openGoogleImageSearch = (index: number) => {
    const item = entryItems[index];
    if (!item.name) return;
    const query = encodeURIComponent(item.name);
    window.open(`https://www.google.com/search?q=${query}&tbm=isch`, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 space-y-10">
        
        {/* Widgets Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Widget icon={TrendingUp} label="مجموع مخارج ماه" value={formatCurrency(totalSpent)} color="blue" />
            <Widget icon={Package} label="کالاهای موجود" value={`${toPersianDigits(items.filter(it=>it.status===ItemStatus.BOUGHT).length)} قلم`} color="emerald" />
            <Widget icon={ListTodo} label="کارهای باقی‌مانده" value={`${toPersianDigits(tasks.filter(t=>!t.isDoneToday).length)} کار`} color="rose" />
            <div className="bg-slate-900 p-6 rounded-[32px] shadow-pro flex items-center gap-5">
                <div className="w-14 h-14 bg-white/10 text-sky-400 rounded-2xl flex items-center justify-center"><Zap size={24}/></div>
                <div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">موتور پردازش</p><h4 className="text-sm font-black text-white">آماده و سریع</h4></div>
            </div>
        </div>

        {/* Budget & Calendar Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 bg-white rounded-[40px] p-8 border border-slate-100 shadow-pro flex flex-col justify-between">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="font-black text-slate-900 text-lg flex items-center gap-3"><Wallet className="text-blue-600" size={24}/> پایش بودجه</h3>
                </div>
                <div className="space-y-6">
                    <div className="flex justify-between items-end">
                        <div><p className="text-[10px] font-bold text-slate-400 mb-1">مصرف شده:</p><div className="text-3xl font-black tabular-nums text-slate-900">{formatCurrency(totalSpent)}</div></div>
                    </div>
                    <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-1">
                        <div className={`h-full rounded-full transition-all duration-1000 ${isBudgetCritical ? 'bg-rose-500' : 'bg-blue-600'}`} style={{width: `${budgetProgress}%`}}></div>
                    </div>
                </div>
                <button onClick={() => handleDayClick(currentJ.day)} className="mt-8 w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-xs flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all">
                    <Plus size={18}/> ثبت خرید هوشمند امروز
                </button>
            </div>

            <div className="lg:col-span-8 bg-white rounded-[40px] p-8 border border-slate-100 shadow-pro">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4"><CalendarIcon className="text-blue-600" size={24}/><h3 className="text-xl font-black text-slate-900">تقویم {getPersianDate(new Date()).split(' ')[2]}</h3></div>
                </div>
                <div className="grid grid-cols-7 gap-2">
                    {["ش", "ی", "د", "س", "چ", "پ", "ج"].map(w => <span key={w} className="text-[11px] text-slate-300 font-black mb-4 text-center">{w}</span>)}
                    {Array.from({ length: 30 }).map((_, i) => {
                        const day = i + 1;
                        const isToday = day === currentJ.day;
                        return (
                            <button key={day} onClick={() => handleDayClick(day)} className={`aspect-square flex items-center justify-center rounded-[20px] text-sm font-black transition-all ${isToday ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-600'}`}>
                                {toPersianDigits(day)}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
      </div>

      {/* TRANSACTION MODAL WITH WIDE-ANGLE LIVE SCAN */}
      {selectedDate && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-3xl z-[6000] flex items-center justify-center p-6 animate-in fade-in">
              <div className="bg-white rounded-[56px] w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-pro flex flex-col border border-white/20">
                  
                  {isProcessing && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-md z-[8000] flex flex-col items-center justify-center space-y-6">
                          <Loader2 className="animate-spin text-blue-600" size={64} />
                          <h2 className="text-xl font-black text-slate-900">هوش مصنوعی در حال تحلیل جامع...</h2>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Universal Vision Processing</p>
                      </div>
                  )}

                  {/* WIDE-ANGLE LIVE SCAN OVERLAY */}
                  {isLiveScanning && (
                      <div className="absolute inset-0 z-[7500] bg-black flex flex-col items-center justify-center">
                          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                          
                          {/* Guide Lines - Wide Angle */}
                          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                              <div className="w-[85%] h-[60%] border-2 border-dashed border-white/40 rounded-[48px] relative">
                                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">Wide-Angle Multi-Item Scanner</div>
                                  <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-blue-500 rounded-tl-3xl"></div>
                                  <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-blue-500 rounded-tr-3xl"></div>
                                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-blue-500 rounded-bl-3xl"></div>
                                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-blue-500 rounded-br-3xl"></div>
                              </div>
                              <p className="mt-8 text-white/70 text-xs font-black">فاکتور یا محصولات را در کادر قرار داده و دکمه را لمس کنید</p>
                          </div>

                          <div className="absolute bottom-16 flex gap-8">
                              <button onClick={stopLiveScan} className="bg-white/10 backdrop-blur-xl text-white px-10 py-5 rounded-3xl font-black text-sm border border-white/10">بستن دوربین</button>
                              <button onClick={captureLiveFrame} className="bg-blue-600 text-white w-24 h-24 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform border-4 border-white/20">
                                  <Camera size={40}/>
                              </button>
                          </div>
                          <canvas ref={canvasRef} className="hidden" />
                      </div>
                  )}

                  <div className="bg-slate-900 p-10 text-white flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-8">
                        <div className="w-16 h-16 bg-blue-600 rounded-[24px] flex items-center justify-center text-white"><Receipt size={32}/></div>
                        <div>
                            <h3 className="font-black text-2xl tracking-tight">مدیریت اقلام: {toPersianDigits(selectedDate.d)} {months[selectedDate.m-1]}</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Wide-Angle Universal AI Analyzer</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button onClick={startLiveScan} className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-2xl transition-all shadow-lg">
                            <Frame size={20}/>
                            <span className="text-xs font-black">اسکن جامع لایو</span>
                        </button>
                        <button onClick={() => setSelectedDate(null)} className="hover:bg-rose-500 p-3 rounded-2xl transition-all"><X size={28} /></button>
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar bg-slate-50/30">
                      <div className="flex flex-col md:flex-row justify-between items-end gap-8 bg-white p-8 rounded-[40px] border border-slate-100 shadow-soft">
                        <div className="space-y-3 flex-1 w-full">
                            <label className="text-[11px] font-black text-slate-400 uppercase mr-3 tracking-widest">فروشگاه شناسایی شده</label>
                            <input placeholder="نام فروشگاه..." value={storeName} onChange={e => setStoreName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-8 py-5 text-sm font-black outline-none" />
                        </div>
                        <div className="flex flex-col items-center gap-3 bg-slate-50 p-6 rounded-[32px] border border-slate-200">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">مقصد ثبت نهایی</label>
                             <div className="flex items-center gap-4">
                                <button onClick={() => setSaveToHistory(false)} className={`px-6 py-3 rounded-2xl text-[10px] font-black transition-all ${!saveToHistory ? 'bg-orange-600 text-white shadow-lg' : 'bg-white text-slate-400'}`}>لیست خرید آتی</button>
                                <button onClick={() => setSaveToHistory(true)} className={`px-6 py-3 rounded-2xl text-[10px] font-black transition-all ${saveToHistory ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400'}`}>سوابق و انبار</button>
                             </div>
                        </div>
                      </div>
                      
                      <div className="space-y-8">
                        {entryItems.map((item, idx) => (
                            <div key={idx} className="bg-white border border-slate-100 rounded-[44px] p-8 flex flex-col gap-10 group relative shadow-soft animate-in slide-in-from-right-4">
                                <div className="flex flex-col xl:flex-row gap-10">
                                    <div className="w-40 h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[36px] flex items-center justify-center shrink-0 overflow-hidden relative group/img">
                                        {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} /> : <ImageIcon className="text-slate-300" size={40} />}
                                        <div className="absolute inset-0 bg-blue-600/95 text-white flex flex-col items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all font-black text-[10px] gap-2 p-4">
                                            <button onClick={() => openGoogleImageSearch(idx)} className="w-full py-2 bg-white/20 rounded-xl hover:bg-white/40 flex items-center justify-center gap-2"><ExternalLink size={16}/> گوگل</button>
                                            <button onClick={() => setActiveUrlInput(activeUrlInput === idx ? null : idx)} className="w-full py-2 bg-white/20 rounded-xl hover:bg-white/40 flex items-center justify-center gap-2"><Link2 size={16}/> لینک</button>
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-8">
                                        {(activeUrlInput === idx || (item.imageUrl && !item.imageUrl.startsWith('blob:'))) && (
                                            <input value={item.imageUrl || ''} onChange={e => { const ni = [...entryItems]; ni[idx].imageUrl = e.target.value; setEntryItems(ni); }} placeholder="Paste image URL..." className="w-full bg-blue-50 border border-blue-200 rounded-2xl px-6 py-4 text-xs font-bold text-blue-800 outline-none" />
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase mr-3">نام کالا</label>
                                                <div className="flex gap-2">
                                                    <input value={item.name} onChange={e => { const ni = [...entryItems]; ni[idx].name = e.target.value; setEntryItems(ni); }} className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none" />
                                                    <button onClick={() => handleAiPriceCheck(idx)} className="p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all"><DollarSign size={20}/></button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase mr-3">قیمت (تومان)</label>
                                                <input value={item.estimatedPrice} onChange={e => { const ni = [...entryItems]; ni[idx].estimatedPrice = parseInt(e.target.value) || 0; setEntryItems(ni); }} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none tabular-nums" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase mr-3">مقدار</label>
                                                <input type="number" value={item.quantity} onChange={e => { const ni = [...entryItems]; ni[idx].quantity = parseFloat(e.target.value) || 1; setEntryItems(ni); }} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none tabular-nums" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase mr-3">بارکد استخراج شده</label>
                                                <div className="relative">
                                                  <input value={item.barcode || ''} onChange={e => { const ni = [...entryItems]; ni[idx].barcode = e.target.value; setEntryItems(ni); }} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none pl-12 tabular-nums" />
                                                  <BarcodeIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase mr-3">دسته‌بندی</label>
                                                <select value={item.category} onChange={e => { const ni = [...entryItems]; ni[idx].category = e.target.value; setEntryItems(ni); }} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none">
                                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {entryItems.length > 1 && (
                                    <button onClick={() => setEntryItems(entryItems.filter((_, i) => i !== idx))} className="absolute top-6 left-6 p-4 text-slate-300 hover:text-rose-500"><Trash2 size={24}/></button>
                                )}
                            </div>
                        ))}
                        <button onClick={() => setEntryItems([...entryItems, { name: '', estimatedPrice: 0, category: 'خواربار', quantity: 1, unit: 'عدد', barcode: '', imageUrl: '' }])} className="w-full py-8 border-2 border-dashed border-slate-200 rounded-[44px] text-slate-400 font-black text-xs hover:bg-blue-50 transition-all flex items-center justify-center gap-4">
                            <Plus size={24}/> افزودن دستی ردیف جدید کالا
                        </button>
                      </div>
                  </div>
                  <div className="p-10 border-t border-slate-100 bg-white flex justify-between items-center shrink-0">
                      <div className="text-right">
                          <p className="text-[11px] font-black text-slate-400 uppercase mb-1 tracking-widest">جمع کل نهایی</p>
                          <div className="text-4xl font-black text-slate-900 tabular-nums">{formatCurrency(entryItems.reduce((acc, it) => acc + ((it.estimatedPrice || 0) * (it.quantity || 1)), 0))}</div>
                      </div>
                      <div className="flex gap-4">
                        <button onClick={() => setSelectedDate(null)} className="px-10 py-5 bg-slate-50 border border-slate-200 text-slate-500 rounded-[28px] font-black text-xs">لغو</button>
                        <button onClick={handleSaveTransaction} className={`px-16 py-5 ${saveToHistory ? 'bg-blue-600 shadow-blue-500/20' : 'bg-orange-600 shadow-orange-500/20'} text-white rounded-[28px] font-black text-xs shadow-2xl active:scale-95 transition-all`}>
                          {saveToHistory ? 'ثبت در مخارج و انبار' : 'ثبت در لیست خرید'}
                        </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

const Widget = memo(({ icon: Icon, label, value, color }: { icon: any, label: string, value: string, color: 'blue' | 'emerald' | 'rose' }) => (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-soft flex items-center gap-5">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color==='blue'?'bg-blue-50 text-blue-600':color==='emerald'?'bg-emerald-50 text-emerald-600':'bg-rose-50 text-rose-600'}`}>
            <Icon size={24}/>
        </div>
        <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p><h4 className="text-lg font-black text-slate-900 tabular-nums">{value}</h4></div>
    </div>
));

export default Dashboard;
