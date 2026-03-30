import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock3,
  FileText,
  Lightbulb,
  ScanSearch,
  Settings2,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { Insight, Suggestion } from '../types';

interface AIViewProps {
  authToken: string;
  gardenApiKey: string;
  gardenBaseUrl: string;
  setInsights: React.Dispatch<React.SetStateAction<Insight[]>>;
}

interface AnalyzeResponse {
  success: boolean;
  message?: string;
  result?: {
    score: number;
    event: string;
    action: string;
    suggestions: Suggestion[];
  };
}

const getScoreTone = (score: number) => {
  if (score >= 85) {
    return { label: '优秀', chip: 'bg-emerald-100 text-emerald-700', ring: 'from-emerald-500 to-teal-400' };
  }

  if (score >= 70) {
    return { label: '良好', chip: 'bg-blue-100 text-blue-700', ring: 'from-blue-500 to-cyan-400' };
  }

  return { label: '待优化', chip: 'bg-amber-100 text-amber-700', ring: 'from-amber-500 to-orange-400' };
};

const AIView: React.FC<AIViewProps> = ({ authToken, gardenApiKey, gardenBaseUrl, setInsights }) => {
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse['result'] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readErrorMessage = async (response: Response) => {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const payload = (await response.json().catch(() => null)) as AnalyzeResponse | null;
      return payload?.message || '分析失败';
    }

    const text = await response.text().catch(() => '');
    return text.trim() || '分析失败';
  };

  const startAnalysis = async () => {
    if (!selectedImage) {
      return;
    }

    setLoading(true);
    setShowResult(false);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          ...(gardenApiKey.trim() ? { 'X-Garden-Api-Key': gardenApiKey.trim() } : {}),
          ...(gardenBaseUrl.trim() ? { 'X-Garden-Base-Url': gardenBaseUrl.trim() } : {}),
        },
        body: JSON.stringify({ image: selectedImage }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const data = (await response.json()) as AnalyzeResponse;

      if (!data.success || !data.result) {
        throw new Error(data.message || '分析失败');
      }

      setAnalysisResult(data.result);

      const newInsight: Insight = {
        id: Date.now().toString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: data.result.score > 80 ? 'success' : data.result.score > 60 ? 'info' : 'warn',
        event: data.result.event,
        action: data.result.action,
        score: data.result.score,
        imageUrl: selectedImage,
        suggestions: data.result.suggestions,
      };

      setInsights((prev) => [newInsight, ...prev]);
      setShowResult(true);
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : '分析失败';
      const message =
        /failed to fetch|fetch failed/i.test(rawMessage)
          ? '无法连接到分析服务。请检查项目后端是否仍在运行，以及 Garden Base URL 是否可从当前电脑访问。'
          : rawMessage;
      console.error('Analysis failed:', error);
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
      setShowResult(false);
      setAnalysisResult(null);
    };
    reader.readAsDataURL(file);
  };

  const scoreTone = analysisResult ? getScoreTone(analysisResult.score) : null;

  return (
    <div className="p-4 space-y-6 pb-24">
      <section className="flex justify-between items-center px-1">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">桌面智能分析</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Garden AI Diagnostics</p>
        </div>
        <button
          type="button"
          onClick={() => setShowConfig((prev) => !prev)}
          className={`p-2 rounded-xl transition-all ${showConfig ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-800'}`}
        >
          <Settings2 size={20} />
        </button>
      </section>

      {showConfig && (
        <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-2 duration-300 space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase">分析说明</p>
          <p className="text-xs text-slate-500">
            图片会先上传到当前项目后端，再由后端调用 Garden 模型服务进行分析。
          </p>
          <p className="text-xs text-slate-500">
            如果你在设置页填写了专用 API Key 和 Base URL，本页会优先使用那组配置。
          </p>
        </div>
      )}

      {!selectedImage ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="aspect-square w-full border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center bg-white dark:bg-slate-900/50 active:scale-95 transition-all group"
        >
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Upload className="text-blue-600 dark:text-blue-400" size={32} />
          </div>
          <span className="text-slate-800 dark:text-slate-200 font-bold">上传或拍摄桌面图片</span>
          <p className="text-slate-400 text-xs mt-2 text-center px-10">Garden 将输出正式分析报告和清洁建议</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-[2.5rem] overflow-hidden border-4 border-white dark:border-slate-800 shadow-2xl aspect-square bg-slate-200">
            <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => {
                setSelectedImage(null);
                setShowResult(false);
                setAnalysisResult(null);
              }}
              className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md text-white rounded-full hover:bg-black/70 transition-colors"
            >
              <X size={20} />
            </button>

            {loading && (
              <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  <Brain className="absolute inset-0 m-auto text-white animate-pulse" size={32} />
                </div>
                <p className="text-white font-bold mt-4 text-sm tracking-widest">GARDEN 正在生成分析报告...</p>
              </div>
            )}
          </div>

          {!loading && !showResult && (
            <button
              type="button"
              onClick={startAnalysis}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-3xl font-black text-lg flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-blue-200 dark:shadow-none"
            >
              <Sparkles size={24} />
              开始生成报告
            </button>
          )}
        </div>
      )}

      {showResult && analysisResult && scoreTone && (
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 space-y-5">
          <section className="rounded-[2rem] overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="px-5 pt-5 pb-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-300">
                    <FileText size={14} />
                    Garden Report
                  </div>
                  <h3 className="mt-3 text-2xl font-black">桌面诊断报告</h3>
                  <p className="mt-2 text-sm text-slate-300 leading-relaxed">{analysisResult.event}</p>
                </div>
                <div className={`px-3 py-1.5 rounded-full text-xs font-black ${scoreTone.chip}`}>{scoreTone.label}</div>
              </div>
            </div>

            <div className="p-5 grid grid-cols-1 gap-4 items-start sm:grid-cols-[110px,1fr] sm:items-center">
              <div className={`aspect-square w-[110px] rounded-[1.75rem] bg-gradient-to-br ${scoreTone.ring} p-[1px] mx-auto sm:mx-0`}>
                <div className="w-full h-full rounded-[1.7rem] bg-white dark:bg-slate-950 flex flex-col items-center justify-center">
                  <span className="text-[11px] uppercase tracking-widest font-bold text-slate-400">Score</span>
                  <span className="text-4xl font-black text-slate-900 dark:text-slate-100 italic">{analysisResult.score}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-4">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest font-bold text-slate-400">
                    <Clock3 size={14} />
                    生成时间
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-100">{new Date().toLocaleString()}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-4">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest font-bold text-slate-400">
                    <ShieldCheck size={14} />
                    模型
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-100">Garden Vision</p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-[1.75rem] border border-blue-100 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-900/40 p-5">
              <div className="flex items-center gap-2 mb-3">
                <ScanSearch size={18} className="text-blue-600" />
                <span className="text-sm font-black text-blue-900 dark:text-blue-100">核心发现</span>
              </div>
              <p className="text-sm leading-relaxed text-blue-800 dark:text-blue-200">{analysisResult.event}</p>
            </div>
            <div className="rounded-[1.75rem] border border-amber-100 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-900/40 p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={18} className="text-amber-600" />
                <span className="text-sm font-black text-amber-900 dark:text-amber-100">建议动作</span>
              </div>
              <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-200">{analysisResult.action}</p>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb size={18} className="text-yellow-500" />
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">优化建议清单</h3>
            </div>
            <div className="space-y-3">
              {analysisResult.suggestions.map((item, i) => (
                <div key={`${item.label}-${i}`} className="rounded-[1.5rem] border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-sm font-black shrink-0">
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">{item.label}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                    <div className="self-start max-w-full break-words px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 text-[11px] font-black sm:max-w-[180px]">
                      {item.impact}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="rounded-[1.75rem] border border-emerald-100 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-900/40 p-4 flex items-start gap-3">
            <CheckCircle2 size={18} className="text-emerald-600 mt-0.5" />
            <p className="text-sm leading-relaxed text-emerald-800 dark:text-emerald-200">
              分析请求由本地项目后端发起。如果这里再次失败，请检查 `npm run dev` 的终端输出，以及设置页里的 Base URL 是否可从本机 Node 服务访问。
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 py-4 rounded-3xl font-bold flex items-center justify-center gap-2"
          >
            重新分析
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      <div className="text-center px-6">
        <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">
          当前分析由后端转发到 Garden 模型服务完成。设置页里的 API Key 和 Base URL 仅作为当前设备的本地覆盖配置。
        </p>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
};

export default AIView;
