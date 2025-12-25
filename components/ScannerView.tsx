
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, AlertCircle, Loader2, Scan, Image as ImageIcon, Zap, ZapOff, Volume2, VolumeX, Maximize } from 'lucide-react';
import { identifyProductFromImage } from '../services/geminiService';
import { ScannedProductData } from '../types';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface ScannerViewProps {
  onProductFound: (data: ScannedProductData & { barcode?: string }) => void;
}

const ScannerView: React.FC<ScannerViewProps> = ({ onProductFound }) => {
  const [mode, setMode] = useState<'AI' | 'BARCODE'>('AI');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  // AI State
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeStreamRef = useRef<MediaStream | null>(null); 
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Torch & Sound State
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Barcode Engine Ref
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const playSuccessFeedback = useCallback(() => {
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      if (soundEnabled) {
          try {
              const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
              if (AudioContext) {
                  const ctx = new AudioContext();
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.type = 'sine';
                  osc.frequency.setValueAtTime(880, ctx.currentTime);
                  gain.gain.setValueAtTime(0.1, ctx.currentTime);
                  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
                  osc.connect(gain);
                  gain.connect(ctx.destination);
                  osc.start();
                  osc.stop(ctx.currentTime + 0.2);
              }
          } catch (e) { console.error(e); }
      }
  }, [soundEnabled]);

  const toggleTorch = async () => {
    const stream = activeStreamRef.current;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    const newStatus = !isTorchOn;
    try {
        await track.applyConstraints({
            advanced: [{ torch: newStatus } as any]
        });
        setIsTorchOn(newStatus);
    } catch (err) {
        console.error("Torch toggle failed", err);
    }
  };

  const cleanupMedia = useCallback(async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        try { await html5QrCodeRef.current.stop(); } catch(e) {}
    }
    if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
    }
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach(track => {
          try { track.stop(); } catch(e) {}
      });
      activeStreamRef.current = null;
    }
    setHasTorch(false);
    setIsTorchOn(false);
  }, []);

  const startAiCamera = useCallback(async (retryCount = 0) => {
    if (!isMountedRef.current) return;
    setError(null);
    await cleanupMedia();
    const delay = retryCount === 0 ? 500 : 1500;
    await new Promise(r => setTimeout(r, delay));
    if (!isMountedRef.current) return;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
        });
        activeStreamRef.current = stream;
        setHasPermission(true);
        const track = stream.getVideoTracks()[0];
        const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
        setHasTorch(!!capabilities.torch);
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
        }
    } catch (err: any) {
        if (retryCount < 2) return startAiCamera(retryCount + 1);
        setError("دسترسی به دوربین مسدود است.");
    }
  }, [cleanupMedia]);

  const initBarcodeScanner = useCallback(async () => {
      setError(null);
      await cleanupMedia();
      if (!isMountedRef.current) return;

      try {
          const html5QrCode = new Html5Qrcode("reader", { verbose: false });
          html5QrCodeRef.current = html5QrCode;
          const config = { 
              fps: 30, 
              qrbox: (w: number, h: number) => ({ width: w * 0.8, height: h * 0.4 }),
              formatsToSupport: [
                  Html5QrcodeSupportedFormats.EAN_13,
                  Html5QrcodeSupportedFormats.EAN_8,
                  Html5QrcodeSupportedFormats.CODE_128,
                  Html5QrcodeSupportedFormats.UPC_A
              ]
          };

          await html5QrCode.start(
              { facingMode: "environment" }, 
              config, 
              (decodedText) => {
                  playSuccessFeedback();
                  // MAP TO BARCODE COLUMN
                  onProductFound({
                      name: `محصول اسکن شده`,
                      barcode: decodedText,
                      category: "سایر",
                      estimatedPrice: 0
                  });
                  setMode('AI');
              },
              () => {}
          );
      } catch (err) { setError("خطا در راه‌اندازی اسکنر."); }
  }, [cleanupMedia, onProductFound, playSuccessFeedback]);

  useEffect(() => {
    if (mode === 'AI') startAiCamera();
    else initBarcodeScanner();
    return () => { cleanupMedia(); };
  }, [mode, startAiCamera, initBarcodeScanner, cleanupMedia]);

  const handleAiCapture = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;
    playSuccessFeedback();
    setIsAnalyzing(true);
    try {
        const context = canvasRef.current.getContext('2d');
        if (context) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            context.drawImage(videoRef.current, 0, 0);
            const imageData = canvasRef.current.toDataURL('image/jpeg', 0.8);
            const productData = await identifyProductFromImage(imageData);
            onProductFound(productData);
        }
    } catch (err) { setError("خطا در تشخیص محصول."); }
    finally { setIsAnalyzing(false); }
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4 max-w-2xl mx-auto">
      <div className="flex bg-white/80 backdrop-blur-md p-1.5 rounded-2xl shadow-lg border border-gray-100 w-full mb-2">
        <button onClick={() => setMode('AI')} className={`flex-1 flex items-center justify-center gap-3 py-3.5 rounded-xl transition-all duration-300 font-black text-sm ${mode === 'AI' ? 'bg-primary-600 text-white shadow-xl scale-[1.02]' : 'text-gray-500 hover:bg-gray-50'}`}>
            <ImageIcon size={20}/> هوش مصنوعی
        </button>
        <button onClick={() => setMode('BARCODE')} className={`flex-1 flex items-center justify-center gap-3 py-3.5 rounded-xl transition-all duration-300 font-black text-sm ${mode === 'BARCODE' ? 'bg-indigo-600 text-white shadow-xl scale-[1.02]' : 'text-gray-500 hover:bg-gray-50'}`}>
            <Scan size={20}/> اسکن بارکد
        </button>
      </div>

      <div className="relative flex-1 min-h-[500px] w-full bg-slate-900 rounded-[40px] overflow-hidden shadow-2xl border-4 border-white/20">
        <div className="absolute inset-0 z-0">
            {mode === 'AI' ? <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" /> : <div id="reader" className="w-full h-full"></div>}
        </div>
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
            <div className={`${mode === 'AI' ? 'w-64 h-64 rounded-[40px]' : 'w-[85%] h-[35%] rounded-2xl'} border-2 border-dashed border-white/40 relative`}>
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary-500 rounded-tl-xl"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary-500 rounded-tr-xl"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary-500 rounded-bl-xl"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary-500 rounded-br-xl"></div>
                {mode === 'BARCODE' && <div className="absolute top-0 left-0 right-0 h-1 bg-red-500/80 shadow-[0_0_15px_red] animate-[scanLine_2s_infinite_ease-in-out]"></div>}
            </div>
        </div>
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20">
            <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-3 rounded-2xl backdrop-blur-xl bg-white/10 text-white transition-all">
                {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
            </button>
            {hasTorch && <button onClick={toggleTorch} className={`p-3 rounded-2xl backdrop-blur-xl transition-all ${isTorchOn ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/50' : 'bg-white/10 text-white'}`}><Zap size={24}/></button>}
        </div>
        {mode === 'AI' && (
            <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-4 z-20">
                <button onClick={handleAiCapture} disabled={isAnalyzing} className="w-24 h-24 rounded-full border-4 border-white/30 flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-90 group relative">
                    <div className="absolute inset-0 rounded-full bg-primary-600/20 animate-ping group-hover:hidden"></div>
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isAnalyzing ? 'bg-white' : 'bg-primary-600'}`}>
                        {isAnalyzing ? <Loader2 className="animate-spin text-primary-600" size={32} /> : <Camera className="text-white" size={36} />}
                    </div>
                </button>
            </div>
        )}
        {error && <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center text-white"><AlertCircle size={64} className="text-red-500 mb-6" /><h3 className="font-black text-xl mb-2">خطا</h3><button onClick={() => mode === 'AI' ? startAiCamera() : initBarcodeScanner()} className="bg-white text-slate-900 px-8 py-3 rounded-2xl font-black">تلاش مجدد</button></div>}
        <canvas ref={canvasRef} className="hidden" />
      </div>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes scanLine { 0%, 100% { transform: translateY(0); opacity: 0.8; } 50% { transform: translateY(180px); opacity: 0.4; } } #reader { border: none !important; } #reader video { width: 100% !important; height: 100% !important; object-fit: cover !important; }`}} />
    </div>
  );
};
export default ScannerView;
