
import React, { useState, useEffect } from 'react';
import { MealPlan, ShoppingItem, ItemStatus } from '../types';
import { generateWeeklyPlan } from '../services/geminiService';
import { CalendarDays, Utensils, Moon, Sun, Sparkles, Plus, ShoppingCart, Loader2, RefreshCw, Trash2, CheckCircle2, AlertTriangle, X, ArrowDownCircle } from 'lucide-react';
import { CATEGORIES } from '../constants';

interface MealPlannerViewProps {
    pantryItems: ShoppingItem[];
    mealPlan: MealPlan[];
    onUpdateMealPlan: (plan: MealPlan[]) => void;
    onAddToShoppingList: (items: string[]) => void;
    onConsumeIngredients?: (ingredients: string[]) => void; // New prop
}

const MealPlannerView: React.FC<MealPlannerViewProps> = ({ pantryItems, mealPlan, onUpdateMealPlan, onAddToShoppingList, onConsumeIngredients }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [missingIngredients, setMissingIngredients] = useState<string[]>([]);
    const [showMissingModal, setShowMissingModal] = useState(false);

    // Days of the week in Persian order
    const WEEK_DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"];

    const handleGenerateAI = async () => {
        setIsGenerating(true);
        const pantryNames = pantryItems.filter(i => i.status === ItemStatus.BOUGHT).map(i => i.name);
        const newPlan = await generateWeeklyPlan(pantryNames);
        if (newPlan.length > 0) {
            onUpdateMealPlan(newPlan);
        }
        setIsGenerating(false);
    };

    const handleClearPlan = () => {
        if(window.confirm("آیا از حذف کل برنامه غذایی مطمئن هستید؟")) {
            onUpdateMealPlan([]);
        }
    };

    const toggleCooked = (id: string) => {
        const meal = mealPlan.find(m => m.id === id);
        if (meal) {
            const willBeCooked = !meal.isCooked;
            
            // If marking as cooked, offer to deduct from pantry
            if (willBeCooked && onConsumeIngredients && meal.ingredients.length > 0) {
                const confirmed = window.confirm(
                    `غدای "${meal.foodName}" پخته شد.\n\nآیا مواد اولیه (${meal.ingredients.join('، ')}) به طور خودکار از انبار کسر شوند؟`
                );
                if (confirmed) {
                    onConsumeIngredients(meal.ingredients);
                }
            }

            onUpdateMealPlan(mealPlan.map(m => m.id === id ? { ...m, isCooked: willBeCooked } : m));
        }
    };

    const checkMissingIngredients = () => {
        const allIngredients = new Set<string>();
        mealPlan.forEach(meal => {
            if (!meal.isCooked) {
                meal.ingredients.forEach(ing => allIngredients.add(ing));
            }
        });

        const available = new Set(pantryItems.filter(i => i.status === ItemStatus.BOUGHT).map(i => i.name.trim().toLowerCase()));
        
        const missing: string[] = [];
        allIngredients.forEach(ing => {
            // Simple fuzzy check: if pantry doesn't contain the ingredient name
            const ingLower = ing.trim().toLowerCase();
            const hasIt = Array.from(available).some((pantryItem: string) => 
                pantryItem.includes(ingLower) || ingLower.includes(pantryItem)
            );
            if (!hasIt) {
                missing.push(ing);
            }
        });

        setMissingIngredients(missing);
        if (missing.length > 0) {
            setShowMissingModal(true);
        } else {
            alert("تبریک! تمام مواد لازم در انبار موجود است.");
        }
    };

    const handleAddMissingToShopping = () => {
        onAddToShoppingList(missingIngredients);
        setShowMissingModal(false);
        setMissingIngredients([]);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header Actions */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <CalendarDays className="text-orange-500" />
                        برنامه‌ریزی غذایی هوشمند
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">با هوش مصنوعی برنامه بچینید و کسری مواد را به لیست خرید بفرستید.</p>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={handleGenerateAI}
                        disabled={isGenerating}
                        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all disabled:opacity-50"
                    >
                        {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />}
                        {isGenerating ? 'در حال تفکر...' : 'پیشنهاد هوشمند'}
                    </button>
                    
                    <button 
                        onClick={checkMissingIngredients}
                        className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                    >
                        <ShoppingCart size={18} />
                        بررسی کسری مواد
                    </button>

                    {mealPlan.length > 0 && (
                        <button 
                            onClick={handleClearPlan}
                            className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        >
                            <Trash2 size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {WEEK_DAYS.map((day) => {
                    const dayMeals = mealPlan.filter(m => m.day === day);
                    const lunch = dayMeals.find(m => m.type === 'LUNCH');
                    const dinner = dayMeals.find(m => m.type === 'DINNER');

                    return (
                        <div key={day} className="bg-white rounded-3xl border border-gray-100 overflow-hidden flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
                            <div className="bg-gray-50 p-3 border-b border-gray-100 text-center font-bold text-gray-700">
                                {day}
                            </div>
                            <div className="p-4 flex-1 space-y-4 flex flex-col justify-center">
                                {/* Lunch Card */}
                                <div className={`relative rounded-2xl p-3 border-2 ${lunch?.isCooked ? 'bg-green-50 border-green-200' : 'bg-orange-50/50 border-orange-100 border-dashed'} transition-colors`}>
                                    <div className="flex items-center gap-2 text-xs font-bold text-orange-400 mb-1">
                                        <Sun size={14} /> ناهار
                                    </div>
                                    {lunch ? (
                                        <div className="group">
                                            <h4 className={`font-bold text-gray-800 ${lunch.isCooked ? 'line-through opacity-50' : ''}`}>{lunch.foodName}</h4>
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{lunch.ingredients.join('، ')}</p>
                                            <button 
                                                onClick={() => toggleCooked(lunch.id)}
                                                className="absolute top-2 left-2 text-gray-300 hover:text-green-500 transition-colors"
                                                title={lunch.isCooked ? 'علامت به عنوان انجام نشده' : 'غذا پخته شد (کسر از انبار)'}
                                            >
                                                <CheckCircle2 size={18} className={lunch.isCooked ? 'text-green-500' : ''} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center py-2 opacity-30">
                                            <Utensils size={20} />
                                        </div>
                                    )}
                                </div>

                                {/* Dinner Card */}
                                <div className={`relative rounded-2xl p-3 border-2 ${dinner?.isCooked ? 'bg-green-50 border-green-200' : 'bg-indigo-50/50 border-indigo-100 border-dashed'} transition-colors`}>
                                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 mb-1">
                                        <Moon size={14} /> شام
                                    </div>
                                    {dinner ? (
                                        <div className="group">
                                            <h4 className={`font-bold text-gray-800 ${dinner.isCooked ? 'line-through opacity-50' : ''}`}>{dinner.foodName}</h4>
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{dinner.ingredients.join('، ')}</p>
                                            <button 
                                                onClick={() => toggleCooked(dinner.id)}
                                                className="absolute top-2 left-2 text-gray-300 hover:text-green-500 transition-colors"
                                                title={dinner.isCooked ? 'علامت به عنوان انجام نشده' : 'غذا پخته شد (کسر از انبار)'}
                                            >
                                                <CheckCircle2 size={18} className={dinner.isCooked ? 'text-green-500' : ''} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center py-2 opacity-30">
                                            <Utensils size={20} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Empty State */}
            {mealPlan.length === 0 && !isGenerating && (
                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                        <CalendarDays size={32} />
                    </div>
                    <p className="text-gray-500 font-bold">هنوز برنامه‌ای تنظیم نشده است.</p>
                    <button onClick={handleGenerateAI} className="mt-4 text-blue-600 font-bold text-sm hover:underline">
                        ساخت برنامه خودکار با هوش مصنوعی
                    </button>
                </div>
            )}

            {/* Missing Ingredients Modal */}
            {showMissingModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-red-50 flex justify-between items-center">
                             <h3 className="font-bold text-red-700 flex items-center gap-2">
                                <AlertTriangle className="text-red-500"/>
                                مواد مورد نیاز (کسری)
                            </h3>
                            <button onClick={() => setShowMissingModal(false)}><X size={20} className="text-gray-400"/></button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-600 mb-4">
                                مواد زیر در انبار موجود نیستند. آیا می‌خواهید به لیست خرید اضافه شوند؟
                            </p>
                            <div className="bg-gray-50 rounded-xl p-4 max-h-60 overflow-y-auto space-y-2">
                                {missingIngredients.map((ing, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-gray-800 text-sm font-medium">
                                        <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                                        {ing}
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 flex gap-3">
                                <button onClick={() => setShowMissingModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl">بی‌خیال</button>
                                <button 
                                    onClick={handleAddMissingToShopping}
                                    className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-500/20"
                                >
                                    اضافه به لیست خرید
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MealPlannerView;