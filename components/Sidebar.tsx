
import React from 'react';
import { LayoutDashboard, ShoppingCart, ScanLine, History, LogOut, Settings, Wallet, Package2, CalendarDays, CheckSquare, Home } from 'lucide-react';
import { Page } from '../types';

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  const navItems = [
    { id: Page.DASHBOARD, label: 'مرکز کنترل', icon: LayoutDashboard },
    { id: Page.SHOPPING_LIST, label: 'لیست خرید', icon: ShoppingCart },
    { id: Page.PANTRY, label: 'انبار و یخچال', icon: Package2 },
    { id: Page.MEAL_PLANNER, label: 'برنامه غذایی', icon: CalendarDays },
    { id: Page.TASKS, label: 'امور جاری', icon: CheckSquare },
    { id: Page.SCANNER, label: 'اسکنر هوشمند', icon: ScanLine },
    { id: Page.FINANCE, label: 'مدیریت مالی', icon: Wallet },
    { id: Page.HISTORY, label: 'سوابق خرید', icon: History },
    { id: Page.SETTINGS, label: 'تنظیمات', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex w-72 bg-white h-screen shadow-2xl fixed right-0 top-0 z-50 flex-col transition-all duration-500 border-l border-slate-100">
      <div className="p-10 border-b border-slate-50 flex items-center justify-start gap-4">
        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-900/20">
          <Home size={24} />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">خانه هوشمند</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Control Panel v2.5</p>
        </div>
      </div>

      <nav className="flex-1 p-6 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group relative ${
                isActive
                  ? 'bg-slate-900 text-white font-black shadow-xl shadow-slate-900/10 scale-[1.02]'
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-sky-400' : 'text-slate-300 group-hover:text-slate-900'} />
              <span className="text-sm font-bold tracking-tight">{item.label}</span>
              {isActive && <div className="absolute left-3 w-1.5 h-6 bg-sky-400 rounded-full"></div>}
            </button>
          );
        })}
      </nav>

      <div className="p-8 border-t border-slate-50">
        <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enterprise Mode</span>
           <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
