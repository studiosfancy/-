
import React, { useState, useMemo } from 'react';
import { HouseTask } from '../types';
import { generateHouseTasks } from '../services/geminiService';
import { CheckSquare, Square, Calendar, Repeat, Sparkles, Plus, Trash2, Brush, Wrench, Flower2, Car, MoreHorizontal, Loader2 } from 'lucide-react';
// Fix: Import missing formatPersianDateShort utility
import { formatPersianDateShort } from '../utils/dateUtils';

interface TasksViewProps {
    tasks: HouseTask[];
    onUpdateTasks: (tasks: HouseTask[]) => void;
}

const TasksView: React.FC<TasksViewProps> = ({ tasks, onUpdateTasks }) => {
    const [filter, setFilter] = useState<'ALL' | 'TODAY'>('TODAY');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newCategory, setNewCategory] = useState<HouseTask['category']>('CLEANING');
    const [newFrequency, setNewFrequency] = useState<HouseTask['frequency']>('WEEKLY');
    const [aiPrompt, setAiPrompt] = useState('نظافت کلی خانه');

    const handleToggleTask = (id: string) => {
        const now = new Date().toISOString();
        const updated = tasks.map(t => {
            if (t.id === id) {
                const isDone = !t.isDoneToday;
                let nextDue = t.nextDue;
                if (isDone && t.frequency !== 'ONCE') {
                    const date = new Date();
                    if (t.frequency === 'DAILY') date.setDate(date.getDate() + 1);
                    if (t.frequency === 'WEEKLY') date.setDate(date.getDate() + 7);
                    if (t.frequency === 'MONTHLY') date.setMonth(date.getMonth() + 1);
                    nextDue = date.toISOString();
                }
                return { ...t, isDoneToday: isDone, lastDone: isDone ? now : t.lastDone, nextDue: isDone ? nextDue : t.nextDue };
            }
            return t;
        });
        onUpdateTasks(updated);
    };

    const handleDelete = (id: string) => { if(window.confirm('حذف شود؟')) onUpdateTasks(tasks.filter(t => t.id !== id)); };

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if(!newTitle) return;
        onUpdateTasks([...tasks, { id: Math.random().toString(36).substr(2, 9), title: newTitle, category: newCategory, frequency: newFrequency, nextDue: new Date().toISOString(), isDoneToday: false }]);
        setNewTitle('');
        setShowForm(false);
    };

    const filteredTasks = useMemo(() => {
        const today = new Date(); today.setHours(0,0,0,0);
        return tasks.filter(t => {
            if (filter === 'ALL') return true;
            if (t.isDoneToday) return true;
            const due = new Date(t.nextDue); due.setHours(0,0,0,0);
            return due <= today;
        }).sort((a, b) => Number(a.isDoneToday) - Number(b.isDoneToday));
    }, [tasks, filter]);

    const completedCount = tasks.filter(t => t.isDoneToday).length;
    const totalToday = tasks.filter(t => { const due = new Date(t.nextDue); due.setHours(0,0,0,0); const today = new Date(); today.setHours(0,0,0,0); return due <= today || t.isDoneToday; }).length;
    const progress = totalToday > 0 ? (completedCount / totalToday) * 100 : 0;

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-24 px-4 animate-in fade-in">
            
            {/* Standardized Header */}
            <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="z-10 relative flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold">امور جاری منزل</h2>
                        <p className="text-[10px] text-slate-400 mt-1">{completedCount} مورد از {totalToday} کار امروز تکمیل شده است.</p>
                    </div>
                    <div className="bg-white/10 px-3 py-1 rounded-lg border border-white/10 text-xs font-bold">
                        {Math.round(progress)}% پیشرفت
                    </div>
                </div>
                <div className="w-full h-1 bg-white/10 rounded-full mt-4 overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-700" style={{width: `${progress}%`}}></div>
                </div>
            </div>

            <div className="flex gap-2">
                <button onClick={() => setFilter('TODAY')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === 'TODAY' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'}`}>کارهای امروز</button>
                <button onClick={() => setFilter('ALL')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === 'ALL' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'}`}>همه کارها</button>
            </div>

            <div className="space-y-2.5">
                {filteredTasks.map(task => (
                    <div key={task.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${task.isDoneToday ? 'bg-gray-50 border-gray-50 opacity-60' : 'bg-white border-gray-100 shadow-sm hover:border-blue-200'}`}>
                        <button onClick={() => handleToggleTask(task.id)} className="shrink-0">
                            {task.isDoneToday ? <CheckSquare size={20} className="text-green-500" /> : <Square size={20} className="text-gray-200" />}
                        </button>
                        <div className="flex-1">
                            <h4 className={`text-sm font-bold text-gray-800 ${task.isDoneToday ? 'line-through text-gray-400' : ''}`}>{task.title}</h4>
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                                <span className="uppercase font-black text-blue-500/60 tracking-wider">{task.frequency}</span>
                                {task.lastDone && <span>آخرین انجام: {formatPersianDateShort(task.lastDone)}</span>}
                            </div>
                        </div>
                        <button onClick={() => handleDelete(task.id)} className="p-2 text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                ))}
            </div>

            <button onClick={() => setShowForm(true)} className="fixed bottom-24 right-6 bg-blue-600 text-white w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
                <Plus size={28} />
            </button>

            {showForm && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="font-bold text-gray-800 mb-4 text-base">ثبت کار جدید</h3>
                        <div className="space-y-4">
                            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-blue-500 bg-gray-50" placeholder="عنوان کار (مثلا آبیاری گیاهان)" />
                            <select value={newFrequency} onChange={e => setNewFrequency(e.target.value as any)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none bg-gray-50">
                                <option value="DAILY">روزانه</option>
                                <option value="WEEKLY">هفتگی</option>
                                <option value="MONTHLY">ماهانه</option>
                                <option value="ONCE">یکبار انجام</option>
                            </select>
                            <div className="flex gap-2 pt-2">
                                <button onClick={handleAddTask} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-xs shadow-md">تایید</button>
                                <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-100 text-gray-500 py-3 rounded-xl font-bold text-xs">لغو</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TasksView;
