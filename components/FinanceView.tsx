
import React, { useState, useMemo } from 'react';
import { ShoppingItem, ItemStatus, IncomeRecord, RecurringItem, BudgetAnalysisResult } from '../types';
import { formatCurrency, formatPersianDateShort, getPersianDate, toPersianDigits } from '../utils/dateUtils';
import { Plus, TrendingUp, TrendingDown, DollarSign, Wallet, ArrowUpCircle, ArrowDownCircle, Trash2, Calendar, Repeat, CheckCircle2, AlertCircle, Sparkles, Brain, Loader2, Target, PieChart as PieIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { CATEGORIES, CATEGORY_COLORS } from '../constants';
import { analyzeBudget } from '../services/geminiService';

interface FinanceViewProps {
  items: ShoppingItem[];
  incomes: IncomeRecord[];
  recurringItems: RecurringItem[];
  onAddIncome: (income: Omit<IncomeRecord, 'id'>) => void;
  onDeleteIncome: (id: string) => void;
  onUpdateRecurring: (items: RecurringItem[]) => void;
  onAddExpenseToHistory: (item: Omit<ShoppingItem, 'id'>) => void;
}

const FinanceView: React.FC<FinanceViewProps> = ({ 
    items, 
    incomes, 
    recurringItems, 
    onAddIncome, 
    onDeleteIncome,
    onUpdateRecurring,
    onAddExpenseToHistory
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState('حقوق و دستمزد');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<BudgetAnalysisResult | null>(null);

  const boughtItems = useMemo(() => items.filter(i => i.status === ItemStatus.BOUGHT), [items]);
  const totalExpenses = useMemo(() => boughtItems.reduce((acc, curr) => acc + (curr.estimatedPrice * curr.quantity), 0), [boughtItems]);
  const totalIncome = useMemo(() => incomes.reduce((acc, curr) => acc + curr.amount, 0), [incomes]);
  const balance = totalIncome - totalExpenses;

  // Pie Chart Data: Group expenses by category
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    boughtItems.forEach(i => {
      counts[i.category] = (counts[i.category] || 0) + (i.estimatedPrice * i.quantity);
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [boughtItems]);

  const transactions = useMemo(() => {
    const expenseList = boughtItems.map(i => ({
      id: i.id, title: i.name, amount: i.estimatedPrice * i.quantity, date: i.dateAdded, type: 'EXPENSE', category: i.category
    }));
    const incomeList = incomes.map(i => ({
      id: i.id, title: i.title, amount: i.amount, date: i.date, type: 'INCOME', category: i.category
    }));
    return [...expenseList, ...incomeList].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [boughtItems, incomes]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newAmount) return;
    onAddIncome({ title: newTitle, amount: parseInt(newAmount), date: new Date().toISOString(), category: newCategory });
    setNewTitle(''); setNewAmount('');
  };

  const handleAiAnalyze = async () => {
      setIsAnalyzing(true);
      const result = await analyzeBudget(incomes, items);
      setAnalysisResult(result);
      setIsAnalyzing(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-32 px-4 animate-in fade-in duration-700">
      
      {/* 1. MAIN CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <div className={`rounded-[48px] p-10 border shadow-2xl transition-all hover:scale-[1.02] ${balance >= 0 ? 'bg-slate-900 text-white border-slate-800' : 'bg-rose-900 text-white border-rose-800'}`}>
           <p className="text-[11px] uppercase font-black opacity-50 mb-3 tracking-widest">تراز کلی حساب</p>
           <h3 className="text-4xl font-black tabular-nums">{formatCurrency(balance)}</h3>
           <Wallet size={48} className="absolute bottom-6 left-6 opacity-10" />
        </div>
        <div className="bg-white rounded-[48px] p-10 border border-gray-100 shadow-xl flex flex-col justify-between">
           <p className="text-[11px] uppercase font-black text-emerald-500 mb-3 tracking-widest">کل درآمدهای ثبت شده</p>
           <h3 className="text-4xl font-black text-slate-900 tabular-nums">{formatCurrency(totalIncome)}</h3>
        </div>
        <div className="bg-white rounded-[48px] p-10 border border-gray-100 shadow-xl flex flex-col justify-between">
           <p className="text-[11px] uppercase font-black text-rose-500 mb-3 tracking-widest">کل مخارج خریده شده</p>
           <h3 className="text-4xl font-black text-slate-900 tabular-nums">{formatCurrency(totalExpenses)}</h3>
        </div>
      </div>

      {/* 2. VISUAL ANALYTICS & AI ADVISOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* AI ADVISOR */}
          <div className="lg:col-span-4 space-y-8">
              <div className="bg-indigo-600 rounded-[48px] p-10 text-white shadow-3xl relative overflow-hidden group">
                  <div className="relative z-10">
                      <h2 className="text-xl font-black flex items-center gap-3 mb-4">
                          <Brain size={24} /> مشاور هوشمند مالی
                      </h2>
                      <p className="text-sm text-indigo-100 mb-8 font-medium leading-relaxed opacity-80">
                          Gemini با بررسی تراکنش‌های شما، نقاط ضعف و قوت مدیریت مالی‌تان را پیدا می‌کند.
                      </p>
                      <button onClick={handleAiAnalyze} disabled={isAnalyzing} className="w-full bg-white text-indigo-700 py-5 rounded-[24px] font-black text-sm shadow-xl hover:bg-indigo-50 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 transition-all">
                          {isAnalyzing ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={20}/>}
                          {isAnalyzing ? 'در حال تحلیل داده‌ها...' : 'تحلیل هوشمند مخارج'}
                      </button>
                  </div>
                  {analysisResult && (
                      <div className="mt-8 bg-white/10 backdrop-blur-3xl rounded-[32px] p-6 border border-white/20 animate-in slide-in-from-top-4">
                          <div className="flex justify-between items-center mb-4">
                              <span className="text-[11px] font-black uppercase tracking-widest">امتیاز سلامت: {toPersianDigits(analysisResult.financialHealthScore)}/۱۰۰</span>
                              <Target size={18} />
                          </div>
                          <p className="text-xs leading-relaxed text-indigo-50 font-bold">{analysisResult.advice}</p>
                      </div>
                  )}
                  <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/5 rounded-full blur-[100px]"></div>
              </div>
              
              <div className="bg-white p-10 rounded-[48px] border border-gray-100 shadow-xl">
                  <h3 className="font-black text-slate-800 text-sm mb-6 flex items-center gap-3">
                      <Plus className="text-emerald-500" size={20}/> ثبت درآمد جدید
                  </h3>
                  <form onSubmit={handleAddSubmit} className="space-y-5">
                      <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="عنوان (حقوق، پاداش...)" className="w-full bg-slate-50 border border-gray-100 rounded-[20px] px-6 py-4 text-xs font-black outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all" />
                      <input type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="مبلغ (تومان)" className="w-full bg-slate-50 border border-gray-100 rounded-[20px] px-6 py-4 text-xs font-black outline-none focus:bg-white transition-all tabular-nums" />
                      <button type="submit" className="w-full bg-emerald-600 text-white font-black py-5 rounded-[24px] text-sm hover:bg-emerald-700 shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all">افزودن به موجودی</button>
                  </form>
              </div>
          </div>

          {/* PIE CHART - CATEGORY BREAKDOWN */}
          <div className="lg:col-span-8 bg-white rounded-[56px] p-12 border border-gray-100 shadow-xl flex flex-col">
              <div className="flex justify-between items-center mb-10">
                  <h3 className="font-black text-slate-900 text-xl flex items-center gap-3">
                    <PieIcon className="text-blue-500" size={28}/> تفکیک هزینه‌ها بر اساس دسته‌بندی
                  </h3>
                  <div className="text-[11px] font-black text-gray-400 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">تحلیل بصری</div>
              </div>
              
              <div className="flex-1 min-h-[400px] flex flex-col xl:flex-row items-center gap-12">
                  <div className="w-full xl:w-1/2 h-full min-h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie
                                  data={categoryData}
                                  cx="50%" cy="50%"
                                  innerRadius={80}
                                  outerRadius={140}
                                  paddingAngle={8}
                                  dataKey="value"
                                  stroke="none"
                              >
                                  {categoryData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || '#cbd5e1'} />
                                  ))}
                              </Pie>
                              <Tooltip 
                                formatter={(value: number) => formatCurrency(value)}
                                contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontFamily: 'Vazirmatn' }}
                              />
                          </PieChart>
                      </ResponsiveContainer>
                  </div>
                  
                  <div className="w-full xl:w-1/2 grid grid-cols-1 gap-4 overflow-y-auto max-h-[350px] pr-4 custom-scrollbar">
                      {categoryData.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-gray-100 hover:bg-white transition-all group">
                              <div className="flex items-center gap-4">
                                  <div className="w-3 h-10 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[item.name] || '#ccc' }}></div>
                                  <span className="font-black text-sm text-slate-700">{item.name}</span>
                              </div>
                              <div className="text-left">
                                  <div className="font-black text-slate-900 tabular-nums">{formatCurrency(item.value)}</div>
                                  <div className="text-[10px] text-gray-400 font-bold uppercase">{toPersianDigits(Math.round((item.value/totalExpenses)*100))}% از مخارج</div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </div>

      {/* 3. TRANSACTION LIST */}
      <div className="bg-white rounded-[56px] border border-gray-100 shadow-xl overflow-hidden">
          <div className="p-10 bg-slate-50/50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-black text-slate-900 text-lg flex items-center gap-3">
                  <ArrowDownCircle className="text-blue-500" size={24}/> تاریخچه تراکنش‌های ماه
              </h3>
              <div className="flex gap-4">
                <span className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-[10px] font-black border border-emerald-100">درآمدها: {toPersianDigits(incomes.length)}</span>
                <span className="bg-rose-50 text-rose-600 px-4 py-2 rounded-xl text-[10px] font-black border border-rose-100">هزینه‌ها: {toPersianDigits(boughtItems.length)}</span>
              </div>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50/80 text-gray-400">
                      <tr>
                          <th className="px-10 py-6 font-black uppercase tracking-widest text-[10px]">تاریخ ثبت</th>
                          <th className="px-10 py-6 font-black uppercase tracking-widest text-[10px]">شرح تراکنش</th>
                          <th className="px-10 py-6 font-black uppercase tracking-widest text-[10px]">مبلغ نهایی</th>
                          <th className="px-10 py-6 font-black uppercase tracking-widest text-[10px]">نوع</th>
                          <th className="px-10 py-6"></th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {transactions.map(t => (
                          <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-10 py-6 text-gray-400 font-bold tabular-nums">{formatPersianDateShort(t.date)}</td>
                              <td className="px-10 py-6">
                                  <div className="font-black text-slate-800">{t.title}</div>
                                  <div className="text-[10px] text-gray-400 font-bold">{t.category}</div>
                              </td>
                              <td className={`px-10 py-6 font-black tabular-nums ${t.type==='INCOME'?'text-emerald-600':'text-rose-500'}`}>{formatCurrency(t.amount)}</td>
                              <td className="px-10 py-6">
                                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black ${t.type==='INCOME'?'bg-emerald-50 text-emerald-600':'bg-rose-50 text-rose-500'}`}>
                                      {t.type==='INCOME'?'درآمد':'هزینه'}
                                  </span>
                              </td>
                              <td className="px-10 py-6 text-left">
                                  {t.type === 'INCOME' && (
                                      <button onClick={() => onDeleteIncome(t.id)} className="p-3 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                          <Trash2 size={18}/>
                                      </button>
                                  )}
                              </td>
                          </tr>
                      ))}
                      {transactions.length === 0 && (
                          <tr>
                              <td colSpan={5} className="py-20 text-center text-gray-400 font-bold italic">تراکنشی یافت نشد.</td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};

export default FinanceView;
