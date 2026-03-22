import React, { useState } from 'react';
import { Maximize2, RefreshCw, Radio, Camera as CameraIcon } from 'lucide-react';

const LiveView: React.FC = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="relative aspect-[16/9] bg-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-slate-500 space-y-2">
            <Radio className="mx-auto animate-pulse text-red-500" size={48} />
            <p className="text-sm font-medium">正在连接实时视频流...</p>
          </div>
        </div>

        <div className="absolute top-4 left-4 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          LIVE
        </div>

        <div className="absolute bottom-4 right-4 flex gap-2">
          <button type="button" className="p-2 bg-black/40 backdrop-blur-md rounded-lg text-white">
            <Maximize2 size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={handleRefresh}
          className="flex items-center justify-center gap-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm active:bg-slate-50 transition-colors"
        >
          <RefreshCw size={18} className={`text-blue-500 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium text-slate-700">刷新画面</span>
        </button>
        <button type="button" className="flex items-center justify-center gap-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm active:bg-slate-50 transition-colors">
          <CameraIcon size={18} className="text-blue-500" />
          <span className="text-sm font-medium text-slate-700">截图保存</span>
        </button>
      </div>

      <div className="mt-4 bg-blue-50 border border-blue-100 rounded-2xl p-4">
        <h4 className="text-blue-800 text-sm font-bold mb-2 flex items-center gap-2">
          <span className="p-1 bg-blue-500 rounded-full w-2 h-2" />
          实时监控说明
        </h4>
        <p className="text-xs text-blue-600 leading-relaxed">
          当前页面保留为监控占位页，后续可接入摄像头流、截图和联动分析能力。
        </p>
      </div>

      <div className="mt-2 bg-slate-100 border border-dashed border-slate-300 rounded-2xl p-10 flex flex-col items-center justify-center text-slate-400">
        <p className="text-sm">这里将显示实时识别标签与监控画面</p>
      </div>
    </div>
  );
};

export default LiveView;
