
import React, { useRef, useState } from 'react';
import { ShoppingItem, IncomeRecord, MealPlan, BackupData, RecurringItem } from '../types';
import { Download, Upload, Database, RefreshCw, AlertTriangle, FileJson, CheckCircle2, XCircle } from 'lucide-react';
import { getPersianDate } from '../utils/dateUtils';

interface SettingsViewProps {
  items: ShoppingItem[];
  incomes: IncomeRecord[];
  recurringItems: RecurringItem[];
  mealPlan: MealPlan[];
  onRestore: (data: BackupData) => void;
  onClearAll: () => void;
  hasUndo: boolean;
  onUndo: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ items, incomes, recurringItems, mealPlan, onRestore, onClearAll, hasUndo, onUndo }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreStatus, setRestoreStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [statusMessage, setStatusMessage] = useState('');

  // --- NEW BACKUP METHOD (Standardized) ---
  const handleBackup = () => {
    try {
        const budget = parseInt(localStorage.getItem('monthly_budget') || '0');
        
        // Create a strictly typed backup object
        const backupData: BackupData = {
            version: 4, // Incremented version
            timestamp: new Date().toISOString(),
            items: items,
            incomes: incomes,
            recurringItems: recurringItems,
            mealPlan: mealPlan,
            budget: budget
        };

        // Convert to JSON with pretty print
        const jsonString = JSON.stringify(backupData, null, 2);
        
        // Add Byte Order Mark (BOM) to force UTF-8 in Excel/Text Editors
        const blob = new Blob(["\uFEFF" + jsonString], { type: "application/json;charset=utf-8" });
        
        // Generate Unique Filename with Date & Time
        const now = new Date();
        const dateStr = now.getFullYear() + "-" + 
                        String(now.getMonth() + 1).padStart(2, '0') + "-" + 
                        String(now.getDate()).padStart(2, '0') + "_" + 
                        String(now.getHours()).padStart(2, '0') + "-" + 
                        String(now.getMinutes()).padStart(2, '0');
        
        const fileName = `HouseManager_Backup_${dateStr}.json`;

        // Trigger Download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Notify User Explicitly
        setTimeout(() => {
            alert(`✅ فایل پشتیبان با موفقیت ساخته شد.\n\n📂 نام فایل: ${fileName}\n📍 محل ذخیره: پوشه دانلودها (Downloads)\n\nبرای بازیابی، لطفا همین فایل را از پوشه دانلودها انتخاب کنید.`);
        }, 300);

    } catch (e) {
        console.error(e);
        alert("خطا در ایجاد فایل پشتیبان.");
    }
  };

  // --- NEW RESTORE METHOD (Strict & Clean) ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreStatus('PROCESSING');
    setStatusMessage('در حال خواندن فایل...');

    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        let result = event.target?.result as string;
        
        // Remove BOM if present (legacy handling just in case)
        if (result.charCodeAt(0) === 0xFEFF) {
            result = result.slice(1);
        }

        const parsedData = JSON.parse(result);

        // Validation: Check for minimal required structure
        if (!parsedData || typeof parsedData !== 'object') {
            throw new Error("فرمت فایل نامعتبر است.");
        }

        // Normalize Data (Ensure arrays exist)
        const cleanData: BackupData = {
            version: parsedData.version || 0,
            timestamp: parsedData.timestamp || new Date().toISOString(),
            items: Array.isArray(parsedData.items) ? parsedData.items : [],
            incomes: Array.isArray(parsedData.incomes) ? parsedData.incomes : [],
            recurringItems: Array.isArray(parsedData.recurringItems) ? parsedData.recurringItems : [],
            mealPlan: Array.isArray(parsedData.mealPlan) ? parsedData.mealPlan : [],
            budget: typeof parsedData.budget === 'number' ? parsedData.budget : 0
        };

        // Check if data is actually empty
        if (cleanData.items.length === 0 && cleanData.incomes.length === 0) {
             const confirmEmpty = window.confirm("این فایل پشتیبان به نظر خالی می‌رسد. آیا مطمئن هستید؟");
             if (!confirmEmpty) {
                 setRestoreStatus('IDLE');
                 return;
             }
        }

        setStatusMessage(`فایل تایید شد: ${cleanData.items.length} آیتم یافت شد.`);
        
        // Execute Restore in App.tsx
        onRestore(cleanData);
        
        setRestoreStatus('SUCCESS');
        setTimeout(() => setRestoreStatus('IDLE'), 3000);

      } catch (error: any) {
        console.error("Restore Failed:", error);
        setRestoreStatus('ERROR');
        setStatusMessage("فایل انتخاب شده خراب یا نامعتبر است.");
      } finally {
        // Reset input so same file can be selected again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
        setRestoreStatus('ERROR');
        setStatusMessage("خطا در خواندن فایل از حافظه.");
    };

    reader.readAsText(file, 'UTF-8');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Undo Section */}
      {hasUndo && (
          <div className="bg-orange-50 rounded-2xl p-4 border border-orange-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                  <div className="bg-orange-100 p-2 rounded-full text-orange-600">
                      <AlertTriangle size={20} />
                  </div>
                  <div>
                      <h4 className="font-bold text-orange-800 text-sm">بازگردانی اضطراری</h4>
                      <p className="text-xs text-orange-600">لغو آخرین عملیات بازیابی و بازگشت به قبل.</p>
                  </div>
              </div>
              <button onClick={onUndo} className="px-4 py-2 bg-white border border-orange-300 text-orange-700 rounded-xl text-sm font-bold hover:bg-orange-100 transition-colors">
                  لغو تغییرات
              </button>
          </div>
      )}

      {/* Main Backup/Restore Card */}
      <div className="bg-white rounded-3xl p-8 shadow-md border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Database className="text-blue-600" /> 
            پشتیبان‌گیری و بازیابی
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Backup Button */}
            <div className="flex flex-col gap-4">
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 h-full flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-blue-700 font-bold">
                            <Download size={20} />
                            <h3>خروجی گرفتن (Backup)</h3>
                        </div>
                        <p className="text-sm text-blue-600/80 leading-relaxed mb-4">
                            یک فایل استاندارد JSON از تمام اطلاعات برنامه (لیست‌ها، مالی، تنظیمات) دانلود کنید.
                        </p>
                    </div>
                    <button 
                        onClick={handleBackup} 
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                    >
                        <FileJson size={18} />
                        دانلود فایل پشتیبان
                    </button>
                </div>
            </div>

            {/* Restore Button */}
            <div className="flex flex-col gap-4">
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 h-full flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-emerald-700 font-bold">
                            <Upload size={20} />
                            <h3>بازیابی اطلاعات (Restore)</h3>
                        </div>
                        <p className="text-sm text-emerald-600/80 leading-relaxed mb-4">
                            فایلی که قبلاً دانلود کرده‌اید را انتخاب کنید تا اطلاعات برنامه جایگزین شود.
                        </p>
                    </div>
                    
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept=".json,application/json" 
                        className="hidden" 
                    />
                    
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={restoreStatus === 'PROCESSING'}
                        className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${
                            restoreStatus === 'ERROR' ? 'bg-red-50 text-white shadow-red-500/20' :
                            restoreStatus === 'SUCCESS' ? 'bg-green-600 text-white shadow-green-500/20' :
                            'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20'
                        }`}
                    >
                        {restoreStatus === 'PROCESSING' ? (
                            <>Wait...</>
                        ) : restoreStatus === 'SUCCESS' ? (
                            <><CheckCircle2 size={18}/> موفقیت‌آمیز</>
                        ) : restoreStatus === 'ERROR' ? (
                            <><XCircle size={18}/> خطا (تلاش مجدد)</>
                        ) : (
                            <><RefreshCw size={18} /> انتخاب فایل و بازیابی</>
                        )}
                    </button>
                </div>
            </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
            <div className={`mt-4 p-3 rounded-xl text-center text-sm font-bold ${
                restoreStatus === 'ERROR' ? 'bg-red-50 text-red-600' : 
                restoreStatus === 'SUCCESS' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-600'
            }`}>
                {statusMessage}
            </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="border-t-2 border-dashed border-gray-200 pt-8">
        <div className="bg-red-50 rounded-3xl p-6 border border-red-100 flex flex-col md:flex-row items-center justify-between gap-6 opacity-90 hover:opacity-100 transition-opacity">
            <div>
                <h3 className="text-lg font-bold text-red-700 flex items-center gap-2">
                    <AlertTriangle size={20} /> منطقه خطر
                </h3>
                <p className="text-red-600/80 text-sm mt-1">
                    حذف تمام اطلاعات و بازگشت به تنظیمات کارخانه. این عملیات برگشت‌پذیر نیست.
                </p>
            </div>
            <button 
                onClick={onClearAll} 
                className="px-6 py-3 bg-white border-2 border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-colors flex items-center gap-2"
            >
                <RefreshCw size={18} /> 
                پاکسازی کامل (Reset)
            </button>
        </div>
      </div>

      <div className="text-center text-gray-400 text-xs">
          <p>تاریخ امروز: {getPersianDate()}</p>
          <p className="mt-1">نسخه پشتیبان‌گیری: ۴.۱ (استاندارد جدید با نام‌گذاری زمانی)</p>
      </div>
    </div>
  );
};

export default SettingsView;
