
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Mic, MicOff, Sparkles, ShoppingBag, Loader2, Bot, CheckCircle2, TrendingUp, Package, Zap, BrainCircuit } from 'lucide-react';
import { ShoppingItem, IncomeRecord } from '../types';
import { processUserChat } from '../services/geminiService';
import { toPersianDigits } from '../utils/dateUtils';

interface SmartAssistantProps {
  items: ShoppingItem[];
  incomes: IncomeRecord[];
  onAddItems: (items: any[]) => void;
}

interface Message {
    id: string;
    sender: 'USER' | 'AI';
    text: string;
    isAction?: boolean;
}

const SmartAssistant: React.FC<SmartAssistantProps> = ({ items, incomes, onAddItems }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
      { id: '1', sender: 'AI', text: 'سلام! من مشاور هوشمند خانه شما هستم. می‌خواهید وضعیت خریدهای ماهانه را تحلیل کنیم یا کالایی به لیست خرید اضافه کنیم؟' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestionChips = [
    { label: "تحلیل خریدهای ماهانه", icon: TrendingUp },
    { label: "موجودی انبار چیست؟", icon: Package },
    { label: "لیست خرید پیشنهادی", icon: Sparkles },
    { label: "قبض‌های پرداخت نشده", icon: Zap }
  ];

  useEffect(() => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
        alert("مرورگر شما از قابلیت تبدیل گفتار به نوشتار پشتیبانی نمی‌کند.");
        return;
    }

    if (isListening) {
        setIsListening(false);
        return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'fa-IR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
    };

    recognition.start();
  };

  const handleSend = async (textOverride?: string) => {
      const textToSend = textOverride || input;
      if (!textToSend.trim()) return;

      const userMsg: Message = { id: Date.now().toString(), sender: 'USER', text: textToSend };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
      setIsTyping(true);

      try {
          const result = await processUserChat(textToSend, { items, incomes });
          
          let aiText = result.textResponse;

          if (result.type === 'ADD_ITEM' && result.data) {
              onAddItems(result.data);
              aiText += `\n\n✅ ${toPersianDigits(result.data.length)} مورد با موفقیت به لیست خرید شما اضافه شد.`;
          }

          const aiMsg: Message = { 
              id: (Date.now() + 1).toString(), 
              sender: 'AI', 
              text: aiText,
              isAction: result.type !== 'NONE'
          };
          setMessages(prev => [...prev, aiMsg]);

      } catch (e) {
          setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'AI', text: 'در حال حاضر ارتباط من با سرور هوش مصنوعی قطع شده است. لطفا لحظاتی دیگر تلاش کنید.' }]);
      } finally {
          setIsTyping(false);
      }
  };

  return (
    <>
      {/* Ultra Modern Floating Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-10 left-10 z-[100] group flex items-center justify-center w-20 h-20 bg-slate-900 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:scale-110 active:scale-90 transition-all duration-500 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <Sparkles size={36} className="text-white relative z-10 animate-pulse" />
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 rounded-full border-4 border-white animate-bounce"></div>
        </button>
      )}

      {/* Chat UI - Mica/Glass Styling */}
      <div className={`fixed bottom-10 left-10 z-[1000] flex flex-col bg-white/90 backdrop-blur-3xl rounded-[48px] shadow-[0_40px_100px_rgba(0,0,0,0.2)] border border-white/50 transition-all duration-700 origin-bottom-left overflow-hidden ${isOpen ? 'w-[420px] h-[720px] opacity-100 translate-y-0' : 'w-0 h-0 opacity-0 translate-y-20 pointer-events-none'}`}>
          
          {/* Enhanced Header */}
          <div className="bg-slate-900 p-8 pb-12 relative overflow-hidden shrink-0">
              <div className="relative z-10 flex justify-between items-center text-white">
                  <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20">
                          <BrainCircuit size={32} className="text-white" />
                      </div>
                      <div>
                          <h3 className="font-black text-xl tracking-tight">دستیار فوق‌هوشمند</h3>
                          <div className="flex items-center gap-2 mt-1">
                              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Powered by Gemini 3</span>
                          </div>
                      </div>
                  </div>
                  <button onClick={() => setIsOpen(false)} className="bg-white/10 hover:bg-rose-500 p-3 rounded-2xl transition-all group">
                      <X size={24} className="group-hover:rotate-90 transition-transform" />
                  </button>
              </div>
              <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px]"></div>
          </div>

          {/* Chat Content */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/50 custom-scrollbar flex flex-col">
              <div className="space-y-6 flex-1">
                  {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.sender === 'USER' ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[85%] rounded-[32px] p-6 text-sm font-bold leading-relaxed shadow-sm transition-all animate-in fade-in slide-in-from-bottom-2 ${
                              msg.sender === 'USER' 
                              ? 'bg-white text-slate-800 rounded-br-none border border-gray-100' 
                              : 'bg-slate-900 text-white rounded-bl-none'
                          }`}>
                              {msg.text.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                              {msg.isAction && (
                                  <div className="mt-4 flex items-center gap-2 text-[10px] font-black opacity-60 border-t border-white/10 pt-3 uppercase tracking-widest">
                                      <CheckCircle2 size={14} className="text-emerald-400" />
                                      <span>عملیات با موفقیت انجام شد</span>
                                  </div>
                              )}
                          </div>
                      </div>
                  ))}
                  {isTyping && (
                      <div className="flex justify-end animate-pulse">
                          <div className="bg-slate-900 text-white rounded-[32px] rounded-bl-none p-6 shadow-sm flex items-center gap-3">
                              <Loader2 size={24} className="animate-spin text-blue-400" />
                              <span className="text-xs font-black">در حال تحلیل داده‌های خانه...</span>
                          </div>
                      </div>
                  )}
                  <div ref={messagesEndRef} />
              </div>

              {/* Suggestions Grid */}
              <div className="grid grid-cols-2 gap-3 mt-8">
                  {suggestionChips.map((chip, idx) => {
                      const Icon = chip.icon;
                      return (
                          <button 
                            key={idx}
                            onClick={() => handleSend(chip.label)}
                            className="flex flex-col items-center justify-center p-5 rounded-3xl bg-white border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-all group text-center"
                          >
                              <Icon size={24} className="text-slate-400 group-hover:text-blue-600 transition-colors mb-2" />
                              <span className="text-[10px] font-black text-slate-600">{chip.label}</span>
                          </button>
                      );
                  })}
              </div>
          </div>

          {/* Interactive Input Bar */}
          <div className="p-8 bg-white border-t border-gray-100 shadow-[0_-20px_50px_rgba(0,0,0,0.05)]">
              <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                      <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="درخواست خود را اینجا بنویسید..."
                        className="w-full bg-slate-50 border border-gray-100 rounded-[24px] pr-6 pl-14 py-5 text-sm font-bold outline-none focus:bg-white focus:ring-8 focus:ring-blue-500/5 transition-all"
                      />
                      <button 
                        onClick={handleVoiceInput}
                        className={`absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all ${isListening ? 'bg-rose-500 text-white animate-ping' : 'text-slate-300 hover:text-blue-600'}`}
                      >
                          {isListening ? <MicOff size={22} /> : <Mic size={22} />}
                      </button>
                  </div>
                  <button 
                    onClick={() => handleSend()}
                    disabled={!input.trim()}
                    className="bg-blue-600 text-white p-5 rounded-[24px] hover:bg-blue-700 transition-all disabled:opacity-30 shadow-xl shadow-blue-500/20 active:scale-90"
                  >
                      <Send size={24} className="rotate-180" />
                  </button>
              </div>
          </div>
      </div>
    </>
  );
};

export default SmartAssistant;
