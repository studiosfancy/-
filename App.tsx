
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import Dashboard from './components/Dashboard';
import ShoppingList from './components/ShoppingList';
import ScannerView from './components/ScannerView';
import HistoryView from './components/HistoryView';
import SettingsView from './components/SettingsView';
import FinanceView from './components/FinanceView'; 
import PantryView from './components/PantryView'; 
import MealPlannerView from './components/MealPlannerView';
import TasksView from './components/TasksView';
import SmartAssistant from './components/SmartAssistant';
import { Page, ShoppingItem, ItemStatus, IncomeRecord, MealPlan, BackupData, RecurringItem, HouseTask, UserLevel } from './types';
import { getPersianDate, toPersianDigits } from './utils/dateUtils';
import { saveItemsToDB, loadItemsFromDB, migrateFromLocalStorage } from './services/storageService';
import { ShoppingBag, Loader2, Sparkles, Home, Search, X } from 'lucide-react';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>(Page.DASHBOARD);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlan[]>([]);
  const [tasks, setTasks] = useState<HouseTask[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  const saveTimerRef = useRef<any>(null);

  // Unified Initialization
  useEffect(() => {
    const initData = async () => {
      try {
        let loadedItems = await migrateFromLocalStorage();
        if (!loadedItems) loadedItems = await loadItemsFromDB();
        setItems(loadedItems || []);
        
        const savedIncomes = localStorage.getItem('finance_incomes');
        if (savedIncomes) setIncomes(JSON.parse(savedIncomes));
        
        const savedRecurring = localStorage.getItem('recurring_items');
        if (savedRecurring) setRecurringItems(JSON.parse(savedRecurring));
        
        const savedMealPlan = localStorage.getItem('meal_plan');
        if (savedMealPlan) setMealPlan(JSON.parse(savedMealPlan));
        
        const savedTasks = localStorage.getItem('house_tasks');
        if (savedTasks) setTasks(JSON.parse(savedTasks));
        
      } catch (e) {
        console.error("Initialization error:", e);
      } finally {
        setTimeout(() => setIsLoaded(true), 800);
      }
    };
    initData();
  }, []);

  // Optimized Persistence (Throttled)
  useEffect(() => {
    if (!isLoaded) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      setIsSaving(true);
      try { 
        await saveItemsToDB(items); 
        localStorage.setItem('finance_incomes', JSON.stringify(incomes));
        localStorage.setItem('meal_plan', JSON.stringify(mealPlan));
        localStorage.setItem('house_tasks', JSON.stringify(tasks));
      } catch (e) { console.error("Persistence failed:", e); }
      finally { setIsSaving(false); }
    }, 2000);

    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [items, incomes, mealPlan, tasks, isLoaded]);

  const handleAddItem = useCallback((item: Omit<ShoppingItem, 'id'>) => {
    const newItem: ShoppingItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      dateAdded: item.dateAdded || new Date().toISOString()
    };
    setItems(prev => [newItem, ...prev]);
  }, []);

  const handleAddBulkItems = useCallback((newItemsData: Omit<ShoppingItem, 'id'>[]) => {
    const processedItems = newItemsData.map(item => ({
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      dateAdded: item.dateAdded || new Date().toISOString()
    }));
    setItems(prev => [...processedItems, ...prev]);
  }, []);

  const handleEditItem = useCallback((updatedItem: ShoppingItem) => {
    setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  }, []);

  const handleToggleStatus = useCallback((id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, status: item.status === ItemStatus.PENDING ? ItemStatus.BOUGHT : ItemStatus.PENDING } : item));
  }, []);

  const handleDeleteItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleRestock = useCallback((id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, status: ItemStatus.PENDING, dateAdded: new Date().toISOString() } : item));
  }, []);

  const userLevel: UserLevel = useMemo(() => {
    const xp = items.length * 5 + tasks.filter(t => t.isDoneToday).length * 10;
    const level = Math.floor(xp / 100) + 1;
    return { level, xp: xp % 100, nextLevelXp: 100, title: level > 5 ? 'مدیر ارشد' : 'خانه‌دار فعال' };
  }, [items.length, tasks]);

  if (!isLoaded) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center text-white z-[9999] animate-pro">
        <div className="relative mb-10">
           <div className="w-28 h-28 bg-blue-600 rounded-[40px] flex items-center justify-center animate-bounce shadow-[0_0_60px_rgba(37,99,235,0.4)]">
             <Home size={56} strokeWidth={2.5}/>
           </div>
           <div className="absolute -inset-6 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        </div>
        <h1 className="text-4xl font-black mb-3 tracking-tighter">مدیریت هوشمند منزل</h1>
        <p className="text-slate-500 text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3">
          <Loader2 className="animate-spin text-blue-500" size={16}/> Initializing System Components
        </p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activePage) {
      case Page.DASHBOARD: return <Dashboard items={items} tasks={tasks} userLevel={userLevel} mealPlan={mealPlan} onAddItem={handleAddItem} onAddBulkItems={handleAddBulkItems} />;
      case Page.SHOPPING_LIST: return <ShoppingList items={items} onAddItem={handleAddItem} onAddBulkItems={handleAddBulkItems} onEditItem={handleEditItem} onToggleStatus={handleToggleStatus} onDeleteItem={handleDeleteItem} globalSearchQuery={globalSearchQuery} />;
      case Page.SCANNER: return <ScannerView onProductFound={(data) => handleAddItem({...data, quantity: 1, unit: 'عدد', status: ItemStatus.PENDING, dateAdded: new Date().toISOString()})} />;
      case Page.FINANCE: return <FinanceView items={items} incomes={incomes} recurringItems={recurringItems} onAddIncome={(inc) => setIncomes([...incomes, {...inc, id: Math.random().toString(36).substr(2, 9)}])} onDeleteIncome={(id) => setIncomes(incomes.filter(i => i.id !== id))} onUpdateRecurring={setRecurringItems} onAddExpenseToHistory={handleAddItem} />;
      case Page.HISTORY: return <HistoryView items={items} />;
      case Page.SETTINGS: return <SettingsView items={items} incomes={incomes} recurringItems={recurringItems} mealPlan={mealPlan} onRestore={(data) => setItems(data.items)} onClearAll={() => setItems([])} hasUndo={false} onUndo={() => {}} />;
      case Page.PANTRY: return <PantryView items={items} onEditItem={handleEditItem} onDeleteItem={handleDeleteItem} onRestock={handleRestock} />;
      case Page.MEAL_PLANNER: return <MealPlannerView pantryItems={items} mealPlan={mealPlan} onUpdateMealPlan={setMealPlan} onAddToShoppingList={() => {}} />;
      case Page.TASKS: return <TasksView tasks={tasks} onUpdateTasks={setTasks} />;
      default: return <Dashboard items={items} tasks={tasks} userLevel={userLevel} mealPlan={mealPlan} onAddItem={handleAddItem} onAddBulkItems={handleAddBulkItems} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-800 selection:bg-blue-100" dir="rtl">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <BottomNav activePage={activePage} onNavigate={setActivePage} />
      <main className="flex-1 md:mr-64 flex flex-col h-screen overflow-hidden">
        <header className="bg-white/90 backdrop-blur-2xl px-6 md:px-10 py-5 border-b border-slate-100 flex justify-between items-center shadow-soft z-30">
          <div className="flex items-center gap-5 shrink-0">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-900 rounded-[14px] md:rounded-[18px] flex items-center justify-center text-white shadow-xl shadow-slate-900/10">
                <Home size={20} className="md:size-6" />
            </div>
            <div className="hidden sm:block">
              <h2 className="text-base md:text-xl font-black text-slate-900 tracking-tight">پنل مدیریت هوشمند</h2>
              <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Control Center Core</p>
            </div>
          </div>

          {/* Global Search Bar */}
          <div className="flex-1 max-w-lg mx-6 relative group">
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <Search size={18} />
              </div>
              <input 
                  type="text" 
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  placeholder="جستجوی سریع بین کالاها، انبار و تاریخچه..." 
                  className="w-full bg-slate-100/50 border border-transparent focus:border-blue-500/20 focus:bg-white rounded-[20px] pr-12 pl-12 py-3 text-xs md:text-sm font-black outline-none transition-all shadow-inner"
              />
              {globalSearchQuery && (
                  <button 
                    onClick={() => setGlobalSearchQuery('')} 
                    className="absolute inset-y-0 left-4 flex items-center text-slate-300 hover:text-rose-500 transition-colors"
                  >
                      <X size={16} />
                  </button>
              )}
          </div>

          <div className="flex items-center gap-3 md:gap-6 shrink-0">
             {isSaving && <div className="hidden md:flex items-center gap-3 text-[10px] font-black text-emerald-600 bg-emerald-50 px-5 py-2 rounded-full border border-emerald-100 animate-pro"><Sparkles size={14} className="animate-pulse"/> ذخیره هوشمند</div>}
             <div className="hidden lg:block bg-slate-100 px-6 py-2 rounded-2xl border border-slate-200 text-xs font-black tabular-nums text-slate-600">{getPersianDate()}</div>
          </div>
        </header>
        <div className="flex-1 overflow-auto custom-scrollbar bg-[#fcfcfd]">{renderContent()}</div>
      </main>
      <SmartAssistant items={items} incomes={incomes} onAddItems={handleAddBulkItems} />
    </div>
  );
};

export default App;
