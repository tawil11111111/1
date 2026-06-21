import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  FileText, 
  Copy, 
  Check, 
  Trash2, 
  Volume2, 
  RefreshCw, 
  Play, 
  Pause, 
  Sliders, 
  History, 
  ArrowLeft, 
  Zap, 
  Activity, 
  Sparkles,
  Info,
  Layers,
  Languages,
  RotateCcw
} from 'lucide-react';

interface OCRVideoProps {
  onBack?: () => void;
}

interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const OCRVideo: React.FC<OCRVideoProps> = ({ onBack }) => {
  // Source selection: 'webcam' or 'file'
  const [sourceType, setSourceType] = useState<'webcam' | 'file'>('webcam');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  
  const [interval, setIntervalTime] = useState(0.5); // Range: 0.1s - 1.0s
  const [text, setText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Crop & Region Selection States
  const [cropBox, setCropBox] = useState<CropBox | null>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Translation mode states
  const [isTranslateMode, setIsTranslateMode] = useState(true);
  const [targetLang, setTargetLang] = useState<'vi' | 'en' | 'ja' | 'ko'>('vi');

  // Scanning statistics
  const [stats, setStats] = useState({
    totalScans: 0,
    successCount: 0,
    failedCount: 0
  });

  const [lastCapturedImage, setLastCapturedImage] = useState<string>('');
  const [history, setHistory] = useState<Array<{ timestamp: string; original: string; translated?: string; image: string }>>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep references to track running states in the async timer loop and avoid closures stagnation
  const isCapturingRef = useRef(isCapturing);
  const intervalRef = useRef(interval);
  const isProcessingRef = useRef(isProcessing);
  const cropBoxRef = useRef(cropBox);
  const isTranslateModeRef = useRef(isTranslateMode);
  const targetLangRef = useRef(targetLang);

  useEffect(() => {
    isCapturingRef.current = isCapturing;
  }, [isCapturing]);

  useEffect(() => {
    intervalRef.current = interval;
  }, [interval]);

  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  useEffect(() => {
    cropBoxRef.current = cropBox;
  }, [cropBox]);

  useEffect(() => {
    isTranslateModeRef.current = isTranslateMode;
  }, [isTranslateMode]);

  useEffect(() => {
    targetLangRef.current = targetLang;
  }, [targetLang]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllStreams();
    };
  }, []);

  const stopAllStreams = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = "";
    }
  };

  // Toggle Source Types
  const handleSourceTypeChange = (type: 'webcam' | 'file') => {
    stopAllStreams();
    setIsCapturing(false);
    setText('');
    setTranslatedText('');
    setLastCapturedImage('');
    setSourceType(type);
    setVideoFile(null);
    setErrorMessage('');
    setCropBox(null);
  };

  // Request high-resolution Camera Stream
  const startCamera = async () => {
    try {
      setErrorMessage('');
      stopAllStreams();
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1920 }, // Request HD feed for ultra-sharp characters
          height: { ideal: 1080 },
          facingMode: 'environment' // Fits back cameras better if on cellular
        } 
      });
      mediaStreamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.src = "";
        videoRef.current.play();
        setIsCapturing(true);
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setErrorMessage("Không thể kết nối đến camera. Hãy chắc chắn bạn đã kích hoạt quyền máy ảnh và thử lại.");
    }
  };

  // File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadVideoFile(file);
    }
  };

  const loadVideoFile = (file: File) => {
    stopAllStreams();
    setVideoFile(file);
    setErrorMessage('');
    setIsCapturing(false);
    setCropBox(null);
    
    const url = URL.createObjectURL(file);
    if (videoRef.current) {
      videoRef.current.src = url;
      videoRef.current.srcObject = null;
      videoRef.current.muted = true; // Auto-mute to avoid sudden high sounds
      videoRef.current.play().then(() => {
        setIsCapturing(true);
      }).catch(err => {
        console.error("Autoplay missed:", err);
        // User input triggers later, force start capture regardless
        setIsCapturing(true);
      });
    }
  };

  const toggleCapture = () => {
    if (sourceType === 'webcam') {
      if (isCapturing) {
        setIsCapturing(false);
        stopAllStreams();
      } else {
        startCamera();
      }
    } else {
      if (!videoFile) {
        setErrorMessage("Vui lòng tải tệp video trước khi quét.");
        return;
      }
      setIsCapturing(!isCapturing);
    }
  };

  // Interactive mouse handlers for cropping
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !isCapturing) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setStartPos({ x, y });
    setCropBox({ x, y, width: 0, height: 0 });
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPos || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const left = Math.max(0, Math.min(startPos.x, x));
    const top = Math.max(0, Math.min(startPos.y, y));
    const width = Math.min(100 - left, Math.abs(startPos.x - x));
    const height = Math.min(100 - top, Math.abs(startPos.y - y));

    setCropBox({ x: left, y: top, width, height });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    // If drawn crop box is too tiny, reset it (full screen scan)
    if (cropBox && (cropBox.width < 3 || cropBox.height < 3)) {
      setCropBox(null);
    }
  };

  // Touch handlers for mobile ROI selections
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current || !isCapturing || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    
    setStartPos({ x, y });
    setCropBox({ x, y, width: 0, height: 0 });
    setIsDrawing(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPos || !containerRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;

    const left = Math.max(0, Math.min(startPos.x, x));
    const top = Math.max(0, Math.min(startPos.y, y));
    const width = Math.min(100 - left, Math.abs(startPos.x - x));
    const height = Math.min(100 - top, Math.abs(startPos.y - y));

    setCropBox({ x: left, y: top, width, height });
  };

  const handleTouchEnd = () => {
    setIsDrawing(false);
    if (cropBox && (cropBox.width < 3 || cropBox.height < 3)) {
      setCropBox(null);
    }
  };

  // HIGH FREQUENCY CONCURRENCY-LOCKED FRAME EMISSION LOOP
  useEffect(() => {
    let timerId: any = null;

    const tick = async () => {
      // Return early if capture mode is switched off
      if (!isCapturingRef.current) {
        timerId = setTimeout(tick, intervalRef.current * 1000);
        return;
      }

      // Prevents simultaneous pipeline fetches of different frames, avoiding 429 quota locks
      if (isProcessingRef.current) {
        timerId = setTimeout(tick, intervalRef.current * 1000);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas) {
        const isWebcamActive = sourceType === 'webcam' && video.srcObject;
        const isFileActive = sourceType === 'file' && video.src && !video.paused;

        // Verify loaded coordinates and active streaming status
        if (video.readyState >= 2 && (isWebcamActive || isFileActive)) {
          // Use full raw dimensions of stream to preserve crystal text pixel resolution
          const finalWidth = video.videoWidth || 1280;
          const finalHeight = video.videoHeight || 720;
          
          const currentCrop = cropBoxRef.current;

          let sourceX = 0;
          let sourceY = 0;
          let sourceWidth = finalWidth;
          let sourceHeight = finalHeight;

          // If crop region exists, map to absolute source scale coordinate system mapping
          if (currentCrop) {
            sourceX = (currentCrop.x / 100) * finalWidth;
            sourceY = (currentCrop.y / 100) * finalHeight;
            sourceWidth = (currentCrop.width / 100) * finalWidth;
            sourceHeight = (currentCrop.height / 100) * finalHeight;
          }

          // Force positive sizes
          if (sourceWidth > 5 && sourceHeight > 5) {
            canvas.width = sourceWidth;
            canvas.height = sourceHeight;

            const ctx = canvas.getContext('2d');
            if (ctx) {
              try {
                // Draw only the cropped bounding box with high resolution
                ctx.drawImage(
                  video, 
                  sourceX, sourceY, sourceWidth, sourceHeight, // src
                  0, 0, sourceWidth, sourceHeight // dest
                );
                
                // Export with 1.0 (100% quality) to guarantee details aren't blurred by compression
                const base64 = canvas.toDataURL('image/jpeg', 1.0).split(',')[1];
                
                setIsProcessing(true);
                setLastCapturedImage(`data:image/jpeg;base64,${base64}`);

                const hasTranslate = isTranslateModeRef.current;
                const langCode = targetLangRef.current;

                let promptText = `Bạn là trợ lý AI OCR (Nhận Diện Chữ) cao cấp cực kỳ chính xác. Hãy nhận diện TOÀN BỘ văn bản chữ in, chữ viết tay, hay phụ đề có trong vùng ảnh này.
Yêu cầu:
1. Trích xuất chính xác 100% tiếng Việt, tiếng Anh, số, ký tự đặc biệt đầy đủ dấu câu.
2. Giữ nguyên định dạng xuống dòng của chữ gốc.
3. Chỉ trả về duy nhất văn bản đã nhận diện. TUYỆT ĐỐI KHÔNG giải thích, KHÔNG thêm bớt hay bình luận.
4. Nếu hoàn toàn không có chữ nào trên khung hình, hãy phản hồi bằng kết quả chuỗi rỗng.`;

                if (hasTranslate) {
                  const targetLangNames = {
                    vi: 'tiếng Việt',
                    en: 'tiếng Anh (English)',
                    ja: 'tiếng Nhật (Japanese)',
                    ko: 'tiếng Hàn (Korean)'
                  };
                  promptText = `Bạn là chuyên gia OCR và Dịch Thuật cao cấp. Hãy dịch chính xác toàn bộ văn bản có trong hình ảnh này sang ${targetLangNames[langCode]}.
Yêu cầu:
1. Nhận diện chính xác văn bản gốc trong hình.
2. Dịch văn bản đó một cách mượt mà nhất sang ${targetLangNames[langCode]}.
3. Chỉ trả về kết quả định dạng sau:
[Dịch]: <Nội dung đã dịch sang ${targetLangNames[langCode]}>
-------
[Gốc]: <Văn bản gốc đã nhận dạng>
4. Tuyệt đối không thêm lời giải thích nào khác. Nếu không có chữ, trả về chuỗi rỗng.`;
                }

                const res = await fetch('/api/gemini/video-analysis', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    prompt: promptText,
                    fileData: base64,
                    mimeType: 'image/jpeg',
                    config: {
                      responseMimeType: "text/plain"
                    }
                  })
                });

                if (!res.ok) {
                  throw new Error(`Cloud API rejected with status ${res.status}`);
                }

                const resContentType = res.headers.get("content-type") || "";
                if (!resContentType.includes("application/json")) {
                  const rawResText = await res.text();
                  throw new Error(`Phản hồi máy chủ không hợp lệ (Không phải JSON). Vui lòng thử cấu hình API key trong Settings Secrets. Chi tiết: ${rawResText.slice(0, 100)}`);
                }

                const data = await res.json();
                const processedText = (data.text || '').trim();

                if (processedText) {
                  if (hasTranslate && processedText.includes('[Dịch]:')) {
                    // Parse the custom translation format output safely
                    const parts = processedText.split('-------');
                    const transPart = parts[0]?.replace('[Dịch]:', '').trim() || '';
                    const origPart = parts[1]?.replace('[Gốc]:', '').trim() || '';
                    
                    setTranslatedText(transPart);
                    setText(origPart || '(Chưa tìm được văn bản gốc)');
                  } else {
                    setText(processedText);
                    setTranslatedText('');
                  }
                  
                  // Track counts
                  setStats(prev => ({
                    ...prev,
                    successCount: prev.successCount + 1,
                    totalScans: prev.totalScans + 1
                  }));

                  // Keep logs history updated smoothly
                  setHistory(prev => {
                    const finalLogText = hasTranslate ? processedText : processedText;
                    // Bypass identical text to keep clean logs
                    if (prev.length > 0 && prev[0].original === processedText) {
                      return prev;
                    }
                    const stamp = new Date().toLocaleTimeString();
                    return [
                      { 
                        timestamp: stamp, 
                        original: processedText,
                        image: `data:image/jpeg;base64,${base64}` 
                      },
                      ...prev.slice(0, 49) // hold up to 50 entries
                    ];
                  });
                } else {
                  setStats(prev => ({
                    ...prev,
                    totalScans: prev.totalScans + 1
                  }));
                }

              } catch (err) {
                console.error("OCR API scanning step hit an issue:", err);
                setStats(prev => ({
                  ...prev,
                  failedCount: prev.failedCount + 1,
                  totalScans: prev.totalScans + 1
                }));
              } finally {
                setIsProcessing(false);
              }
            }
          }
        }
      }

      // Schedule next trigger sequentially
      timerId = setTimeout(tick, intervalRef.current * 1000);
    };

    timerId = setTimeout(tick, intervalRef.current * 1000);

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [sourceType]);

  const copyToClipboard = (content: string) => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeakText = (txt: string) => {
    if (!txt) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(txt);
      utter.lang = targetLang === 'vi' ? 'vi-VN' : 'en-US';
      utter.onstart = () => setSpeaking(true);
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utter);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    setText('');
    setTranslatedText('');
    setLastCapturedImage('');
    setStats({
      totalScans: 0,
      successCount: 0,
      failedCount: 0
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      loadVideoFile(file);
    } else {
      setErrorMessage("Thẻ tệp không hợp lệ, vui lòng chỉ đăng tải video.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0c0d12] text-gray-900 dark:text-gray-100 font-sans flex flex-col transition-colors duration-200">
      
      {/* Top sticky navbar */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#12141c] px-6 py-4 flex items-center justify-between sticky top-0 z-10 transition-colors duration-200">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all flex items-center gap-1.5 font-bold text-sm cursor-pointer"
              title="Quay lại hệ thống"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Quay lại</span>
            </button>
          )}
          <span className="h-6 w-px bg-gray-200 dark:bg-gray-800" />
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
            <h1 className="font-black text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-505 bg-clip-text text-transparent">AI OCR Real-Time</h1>
          </div>
        </div>

        {/* Source selector toggle bar */}
        <div className="flex p-1 bg-gray-100 dark:bg-gray-900 rounded-2xl border border-gray-205 dark:border-gray-800">
          <button
            onClick={() => handleSourceTypeChange('webcam')}
            className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              sourceType === 'webcam'
                ? 'bg-white dark:bg-[#1a1c26] text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200/40 dark:border-gray-700/30'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Máy ảnh (Webcam)
          </button>
          <button
            onClick={() => handleSourceTypeChange('file')}
            className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              sourceType === 'file'
                ? 'bg-white dark:bg-[#1a1c26] text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200/40 dark:border-gray-700/30'
                : 'text-gray-500 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Tải video lên
          </button>
        </div>
      </header>

      {/* Primary body screen layouts */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 overflow-y-auto no-scrollbar">
        
        {/* Left column: Player viewport and loop controllers */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Main Monitor Aspect Container */}
          <div 
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="bg-white dark:bg-[#12141c] rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col relative group transition-colors duration-200 cursor-crosshair select-none"
          >
            
            {/* Visual notification tags */}
            {isCapturing && (
              <span className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1 bg-red-600 text-white text-[10px] uppercase font-black rounded-full shadow-lg border border-red-500/30 animate-pulse pointer-events-none">
                <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                Live Scan
              </span>
            )}

            {cropBox && (
              <button
                onClick={(e) => { e.stopPropagation(); setCropBox(null); }}
                className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1 bg-gray-900/90 hover:bg-black text-white text-[11px] font-bold rounded-full shadow-lg transition-all active:scale-95 cursor-pointer border border-gray-800"
              >
                <RotateCcw className="w-3 h-3 text-amber-400" />
                Quét toàn màn hình
              </button>
            )}

            {/* Video viewer frame block */}
            <div 
              className="aspect-video bg-black flex items-center justify-center relative overflow-hidden pointer-events-none"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                controls={sourceType === 'file'}
                className={`w-full h-full object-contain ${!videoFile && sourceType === 'file' ? 'hidden' : 'block'}`}
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Glowing horizontal laser scanning animation */}
              {isCapturing && (
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_15px_rgba(59,130,246,0.8)] z-10 pointer-events-none animate-scan-laser" />
              )}

              {/* Webcam passive overlay prompts */}
              {!isCapturing && sourceType === 'webcam' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-gray-950/95 text-white z-10 pointer-events-auto">
                  <Camera className="w-14 h-14 text-gray-500 mb-4 animate-bounce" />
                  <h3 className="text-lg font-bold">Máy ảnh đang tạm nghỉ</h3>
                  <p className="text-xs text-gray-400 max-w-sm mt-1">Kích hoạt nguồn camera để bắt đầu trích xuất chữ viết trực diện.</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); startCamera(); }}
                    className="mt-5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    Bật máy ảnh ngay
                  </button>
                </div>
              )}

              {/* File upload prompt drag Area */}
              {sourceType === 'file' && !videoFile && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-gray-950/90 text-white z-10 pointer-events-auto">
                  <Upload className="w-14 h-14 text-blue-500 mb-4 animate-pulse" />
                  <h3 className="text-lg font-bold">Kéo thả file video vào đây</h3>
                  <p className="text-xs text-gray-400 mt-2 max-w-xs">Hỗ trợ các định dạng MP4, MKV, WebM từ máy tính của bạn.</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="mt-5 px-6 py-2.5 bg-blue-650 hover:bg-blue-700 text-white rounded-full font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    Chọn video từ thiết bị
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {/* Custom interactive Drawing Layer bounding crop highlight box */}
            {cropBox && (
              <div 
                className="absolute border-2 border-dashed border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)] bg-emerald-500/10 pointer-events-none rounded transition-all"
                style={{
                  left: `${cropBox.x}%`,
                  top: `${cropBox.y}%`,
                  width: `${cropBox.width}%`,
                  height: `${cropBox.height}%`
                }}
              >
                <span className="absolute -top-6 left-0 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                  Vùng quét chọn ({Math.round(cropBox.width)}% × {Math.round(cropBox.height)}%)
                </span>
                <div className="absolute top-0 left-0 w-2 h-2 bg-emerald-400 rounded-full -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute top-0 right-0 w-2 h-2 bg-emerald-400 rounded-full translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-0 w-2 h-2 bg-emerald-400 rounded-full -translate-x-1/2 translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 rounded-full translate-x-1/2 translate-y-1/2" />
              </div>
            )}

            {/* Stats info footer strip */}
            <div className="p-4 bg-gray-50 dark:bg-[#161821] border-t border-gray-200/70 dark:border-gray-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none transition-colors duration-200 pointer-events-auto">
              
              <div className="flex flex-wrap items-center gap-4 text-gray-500 dark:text-gray-400 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-500" />
                  Chu kỳ quét: <strong className="text-gray-900 dark:text-white">{stats.totalScans}</strong>
                </span>
                <span className="text-gray-300 dark:text-gray-700">|</span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  Nhận diện: <strong className="text-gray-900 dark:text-white">{stats.successCount}</strong>
                </span>
                {cropBox && (
                  <>
                    <span className="text-gray-300 dark:text-gray-700">|</span>
                    <span className="text-emerald-500 flex items-center gap-1">
                      <Layers className="w-3 h-3" /> Đang chọn vùng
                    </span>
                  </>
                )}
              </div>

              {/* Active loop pulse statuses */}
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isCapturing ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isCapturing ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                </span>
                <span className="font-bold text-gray-700 dark:text-gray-300 text-[11px]">
                  {isProcessing ? 'AI Đang xử lý...' : isCapturing ? 'Đang quét liên tục' : 'Bấm nút Kích hoạt bên dưới'}
                </span>
              </div>
            </div>
          </div>

          {/* Translation and ROI custom widgets panel */}
          <div className="bg-white dark:bg-[#12141c] rounded-3xl border border-gray-200/80 dark:border-gray-800 p-6 shadow-sm transition-colors duration-200 space-y-6">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800/60 pb-5">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-2 select-none">
                <Languages className="w-4 h-4 text-emerald-500" />
                Phiên dịch song hành vùng chọn
              </h3>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Chế độ Dịch:</span>
                <button
                  type="button"
                  onClick={() => setIsTranslateMode(!isTranslateMode)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isTranslateMode ? 'bg-blue-650' : 'bg-gray-250 dark:bg-gray-800'}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isTranslateMode ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {isTranslateMode && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'vi', title: 'Tiếng Việt' },
                  { id: 'en', title: 'English' },
                  { id: 'ja', title: 'Japanese' },
                  { id: 'ko', title: 'Korean' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setTargetLang(item.id as any)}
                    className={`py-2 px-3.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                      targetLang === item.id 
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-350 dark:border-emerald-900/50' 
                        : 'bg-transparent border-gray-150 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    🚀 {item.title}
                  </button>
                ))}
              </div>
            )}

            {/* Time intervals controller sliders */}
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between select-none">
                <div>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Tốc độ trích xuất chữ</span>
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 font-bold mt-1">Dải nhạy từ 0.1s giúp bắt bắt chữ nhanh biến thiên mượt mà</p>
                </div>
                <div className="px-3 py-1.5 bg-blue-50/80 dark:bg-blue-550/10 text-blue-600 dark:text-blue-400 font-black rounded-xl text-xs font-mono border border-blue-105/30 dark:border-blue-900/30">
                  ⚡ {interval}s / lần
                </div>
              </div>

              {/* Slide bar range inputs */}
              <div className="space-y-1.5">
                <input 
                  type="range" 
                  min="0.1" 
                  max="1.0" 
                  step="0.05" 
                  value={interval} 
                  onChange={(e) => setIntervalTime(parseFloat(e.target.value))} 
                  className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full appearance-none cursor-pointer accent-blue-600 transition-all outline-none"
                />
                
                <div className="flex justify-between text-[9px] font-black tracking-wider text-gray-400 font-mono select-none px-1">
                  <span>0.1s (Nhanh bậc nhất)</span>
                  <span>0.3s</span>
                  <span>0.5s (Tiêu chuẩn)</span>
                  <span>0.7s</span>
                  <span>0.9s</span>
                  <span>1.0s (Chậm)</span>
                </div>
              </div>

              {/* Trigger panel action controls */}
              <div className="pt-3 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={toggleCapture}
                  className={`flex-1 py-3 px-5 rounded-2xl font-black text-xs tracking-wider uppercase transition-all shadow-sm flex items-center justify-center gap-2 select-none active:scale-95 cursor-pointer ${
                    isCapturing 
                      ? 'bg-red-500/10 hover:bg-red-500/15 text-red-650 dark:text-red-400 border border-red-200/50 dark:border-red-900/30' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10 shadow-lg'
                  }`}
                >
                  {isCapturing ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      Tạm Dừng Bộ Tìm Chữ
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current animate-pulse" />
                      Kích Hoạt Nhận Diện
                    </>
                  )}
                </button>

                {sourceType === 'file' && videoFile && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-5 py-3 border border-gray-205 dark:border-gray-800 bg-white dark:bg-[#1a1c24] hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 select-none active:scale-95 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    Thay đổi video
                  </button>
                )}
              </div>
            </div>

            {errorMessage && (
              <div className="mt-4 p-3.5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl border border-red-100/60 dark:border-red-900/40">
                {errorMessage}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Extracted outputs and timelines history logs */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Dual output boxes when translating or single when OCR-ing */}
          <div className="flex flex-col gap-4 bg-white dark:bg-[#12141c] rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-sm p-6 relative flex-1 min-h-[380px] transition-colors duration-200">
            
            <div className="flex items-center justify-between border-b border-gray-200/55 dark:border-gray-800/80 pb-4 select-none">
              <div className="flex items-center gap-2">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 text-blue-650 dark:text-blue-400 rounded-2xl">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm leading-none">Kết quả quét AI</h3>
                  <span className="text-[10px] text-gray-400 font-semibold block mt-1">Sử dụng mô hình Gemini xử lý siêu nhanh</span>
                </div>
              </div>

              {/* Utility shortcuts */}
              <div className="flex items-center gap-1.2">
                <button
                  type="button"
                  onClick={() => handleSpeakText(translatedText || text)}
                  disabled={!(translatedText || text)}
                  className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all disabled:opacity-40 cursor-pointer"
                  title="Nghe phát âm việt ngữ"
                >
                  <Volume2 className={`w-4 h-4 ${speaking ? 'text-blue-500 animate-pulse' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(translatedText ? `${translatedText}\n\n[Gốc]:\n${text}` : text)}
                  disabled={!(translatedText || text)}
                  className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all relative disabled:opacity-40 cursor-pointer"
                  title="Sao chép kết quả"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Double Segmented Translator Board layout */}
            <div className="flex-1 flex flex-col gap-4 justify-between h-full">
              
              {isTranslateMode ? (
                <div className="flex-1 grid grid-rows-2 gap-4">
                  {/* Translated block */}
                  <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/30 rounded-2xl overflow-y-auto max-h-[140px] pr-1">
                    <span className="text-[10px] uppercase font-black text-emerald-600 block mb-1">Bản dịch:</span>
                    {translatedText ? (
                      <p className="text-gray-900 dark:text-white font-sans text-sm sm:text-base font-bold select-text break-words">
                        {translatedText}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 italic">Hệ thống đang dịch thơ mộng hoặc chờ text...</p>
                    )}
                  </div>

                  {/* Detected Original block */}
                  <div className="p-4 bg-blue-50/10 dark:bg-blue-950/5 border border-blue-100/20 dark:border-blue-900/20 rounded-2xl overflow-y-auto max-h-[140px] pr-1">
                    <span className="text-[10px] uppercase font-black text-blue-500 block mb-1">Văn bản gốc:</span>
                    {text ? (
                      <p className="text-gray-800 dark:text-gray-300 font-mono text-xs sm:text-sm font-semibold select-text break-words leading-relaxed">
                        {text}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-450 italic">Chưa phát hiện ký tự gốc...</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto max-h-[280px] p-2 pr-1">
                  {text ? (
                    <p className="text-gray-800 dark:text-gray-250 font-mono text-sm leading-relaxed whitespace-pre-wrap select-text break-words">
                      {text}
                    </p>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400/90 select-none">
                      <RefreshCw className={`w-8 h-8 text-gray-300 dark:text-gray-700 mb-3 ${isProcessing ? 'animate-spin text-blue-500' : ''}`} />
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400">Đang chờ ký tự từ khung hình...</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 max-w-[220px] mt-1.5">Khi video phát hoặc có chuyển động chứa chữ viết, văn bản sẽ tự động dịch về đây.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Preview thumbnails strip */}
              {lastCapturedImage && (
                <div className="p-3 bg-gray-54/50 dark:bg-gray-900/40 rounded-2xl border border-gray-205 dark:border-gray-800 flex items-center justify-between transition-colors duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-18 aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-gray-850 bg-black shrink-0 relative">
                      <img src={lastCapturedImage} alt="Crop tracker representation" className="w-full h-full object-cover" />
                      {cropBox && (
                        <div className="absolute inset-0 border-2 border-dashed border-emerald-400 bg-emerald-500/10" />
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider block">ROI Snippet</span>
                      <span className="text-xs font-bold text-gray-650 dark:text-gray-450 block mt-0.5 truncate max-w-[120px]">
                        {isProcessing ? '⚡ Đang gửi sang AI...' : '✓ Khớp thành công'}
                      </span>
                    </div>
                  </div>

                  {cropBox && (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20 px-2 py-1 rounded-xl">
                      CẬP NHẬT KÍNH QUÉT
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Scanned Timeline History Section */}
          <div className="bg-white dark:bg-[#12141c] rounded-3xl border border-gray-200/80 dark:border-gray-800 p-6 flex flex-col gap-4 max-h-[380px] transition-colors duration-200 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80 pb-3 select-none">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-500" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500">Nhật ký quét ({history.length})</h3>
              </div>
              
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-xs font-bold text-red-500 hover:text-red-700 transition flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa tất cả
                </button>
              )}
            </div>

            {/* List scrollbar map view */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 no-scrollbar">
              {history.length > 0 ? (
                history.map((item, index) => (
                  <div 
                    key={index} 
                    className="p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800/80 rounded-2xl flex gap-3 hover:bg-gray-100 dark:hover:bg-gray-850 transition-all group"
                  >
                    {/* Log screen grab thumb image */}
                    <div className="w-16 aspect-video bg-black rounded-lg overflow-hidden shrink-0 border border-gray-200 dark:border-gray-800">
                      <img src={item.image} alt="Log screen grab timeline element" className="w-full h-full object-cover select-none" />
                    </div>

                    {/* Metadata indicators */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-[9px] font-black tracking-widest text-gray-400 mb-1">
                        <span className="font-mono">{item.timestamp}</span>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); copyToClipboard(item.original); }}
                            className="p-1 hover:text-blue-500 rounded bg-gray-200 dark:bg-gray-800 cursor-pointer"
                            title="Copy dòng này"
                          >
                            <Copy className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs font-bold text-gray-850 dark:text-gray-300 truncate font-mono select-text" title={item.original}>
                        {item.original}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-14 text-center text-gray-400 select-none">
                  <p className="text-xs font-bold text-gray-400">Trống nhật ký quét</p>
                  <p className="text-[10px] text-gray-500 mt-1">Dòng chữ trích xuất sẽ tự động xếp vào đây.</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick instructions widget alerts */}
          <div className="p-4 bg-blue-50/70 dark:bg-blue-950/20 rounded-2.5xl border border-blue-150 dark:border-blue-900/30 text-[11px] text-blue-750 dark:text-blue-300 flex gap-2.5 select-none transition-all">
            <Info className="w-4 h-4 shrink-0 text-blue-650 mt-0.5" />
            <div className="space-y-1">
              <p className="leading-relaxed font-bold">
                Mẹo sử dụng vùng chọn siêu tốc:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-gray-600 dark:text-gray-300 font-semibold leading-relaxed">
                <li>Bấm chuột trái (hoặc ngón tay chạm) và rê kéo tạo vùng nhắm bắn phụ đề, nhãn hiệu.</li>
                <li>Hệ thống chỉ quét và dịch các từ ngữ nằm hoàn toàn bên trong hộp xanh này.</li>
                <li>Tần suất siêu nhạy từ 0.1s hỗ trợ chụp lẹ, dịch bám đuổi tuyệt đối.</li>
              </ul>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};
