import React from 'react';
import { LayoutDashboard, ShoppingCart, ScanLine, Wallet, Menu, X, Package2, CalendarDays, History, Settings, CheckSquare } from 'lucide-react';
import { Page } from '../types';

interface BottomNavProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activePage, onNavigate }) => {
  const [showMenu, setShowMenu] = React.useState(false);

  const mainItems = [
    { id: Page.DASHBOARD, label: 'خانه', icon: LayoutDashboard },
    { id: Page.SHOPPING_LIST, label: 'خرید', icon: ShoppingCart },
    { id: Page.SCANNER, label: 'اسکن', icon: ScanLine },
    { id: Page.FINANCE, label: 'مالی', icon: Wallet },
  ];

  const menuItems = [
      { id: Page.TASKS, label: 'امور خانه', icon: CheckSquare }, // New
      { id: Page.PANTRY, label: 'انبار و یخچال', icon: Package2 },
      { id: Page.MEAL_PLANNER, label: 'برنامه غذایی', icon: CalendarDays },
      { id: Page.HISTORY, label: 'سوابق و تاریخچه', icon: History },
      { id: Page.SETTINGS, label: 'تنظیمات و پشتیبان', icon: Settings },
  ];

  return (
    <>
        {/* Main Bottom Bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 pb-safe z-40 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {mainItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
            <button
                key={item.id}
                onClick={() => { onNavigate(item.id); setShowMenu(false); }}
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
                isActive ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
                }`}
            >
                <div className={`mb-1 ${isActive ? '-translate-y-1' : ''} transition-transform duration-200`}>
                    <Icon size={isActive ? 24 : 22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
            </button>
            );
        })}
        
        {/* More Button */}
        <button
            onClick={() => setShowMenu(!showMenu)}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
            showMenu ? 'text-primary-600' : 'text-gray-400'
            }`}
        >
            <div className="mb-1">
                {showMenu ? <X size={22} /> : <Menu size={22} />}
            </div>
            <span className="text-[10px] font-medium">بیشتر</span>
        </button>
        </div>

        {/* Expanded Menu Overlay */}
        {showMenu && (
            <div className="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowMenu(false)}>
                <div className="absolute bottom-20 left-4 right-4 bg-white rounded-3xl p-4 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
                    <div className="grid grid-cols-2 gap-3">
                        {menuItems.map(item => {
                            const Icon = item.icon;
                            const isActive = activePage === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => { onNavigate(item.id); setShowMenu(false); }}
                                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors ${
                                        isActive ? 'bg-primary-50 border-primary-100 text-primary-700' : 'bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100'
                                    }`}
                                >
                                    <div className={`p-2 rounded-xl ${isActive ? 'bg-white' : 'bg-gray-200'}`}>
                                        <Icon size={20} />
                                    </div>
                                    <span className="font-bold text-sm">{item.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>
        )}
    </>
  );
};

export default BottomNav;