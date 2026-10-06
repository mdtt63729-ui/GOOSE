import React, { useState, useEffect } from 'react';
import { Wifi, Signal, Battery, Smartphone } from 'lucide-react';

interface AndroidFrameProps {
  children: React.ReactNode;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({ children }) => {
  const [time, setTime] = useState<string>('09:41');
  const [batteryLevel] = useState<number>(88);
  const [isSimulatedFrame, setIsSimulatedFrame] = useState<boolean>(true);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#0a0d0e] flex flex-col items-center justify-center sm:py-4 select-none">
      {/* Optional desktop helper bar */}
      <div className="hidden sm:flex items-center justify-between w-full max-w-[430px] mb-2 px-3 text-xs text-slate-400">
        <div className="flex items-center gap-1.5 font-medium">
          <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
          <span>Goose Android Preview</span>
        </div>
        <button
          type="button"
          onClick={() => setIsSimulatedFrame(!isSimulatedFrame)}
          className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
        >
          {isSimulatedFrame ? 'Frame: ON' : 'Frame: Edge-to-Edge'}
        </button>
      </div>

      {/* Main Android Phone Viewport Container */}
      <div
        className={`w-full max-w-[430px] h-[100dvh] sm:h-[860px] flex flex-col overflow-hidden bg-[var(--color-background)] text-[var(--color-on-background)] transition-all duration-200 relative ${
          isSimulatedFrame
            ? 'sm:rounded-[44px] sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] sm:border-[8px] sm:border-[#22272b] sm:ring-1 sm:ring-white/10'
            : 'sm:rounded-none'
        }`}
      >
        {/* Android Status Bar (Cutout & WindowInsets Safe Zone) */}
        <header
          className="shrink-0 h-10 w-full px-5 flex items-center justify-between z-40 bg-[var(--color-background)] select-none"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          aria-label="Android Status Bar"
        >
          {/* Left: Clock */}
          <div className="w-16 flex items-center">
            <span className="text-xs font-semibold tracking-tight text-[var(--color-on-surface)]">
              {time}
            </span>
          </div>

          {/* Center: Camera Punch-Hole Cutout */}
          <div className="flex items-center justify-center">
            <div
              className="w-3.5 h-3.5 rounded-full bg-black ring-1 ring-white/10 shadow-inner"
              title="Camera cutout"
              aria-hidden="true"
            />
          </div>

          {/* Right: Network, Wifi, Battery */}
          <div className="w-16 flex items-center justify-end gap-1.5 text-[var(--color-on-surface)]">
            <Signal className="w-3.5 h-3.5 stroke-[2.2]" aria-label="Cellular signal full" />
            <Wifi className="w-3.5 h-3.5 stroke-[2.2]" aria-label="Wi-Fi connected" />
            <div className="flex items-center gap-0.5">
              <span className="text-[10px] font-medium leading-none">{batteryLevel}%</span>
              <Battery className="w-3.5 h-3.5 stroke-[2.2]" aria-label={`Battery ${batteryLevel}%`} />
            </div>
          </div>
        </header>

        {/* Safe Content Area (No overlap with camera cutout) */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {children}
        </main>

        {/* Android Gesture Safe Area & Gesture Pill at bottom */}
        <div
          className="shrink-0 bg-[var(--color-surface-container)] w-full flex items-center justify-center z-30"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          aria-hidden="true"
        >
          <div className="android-gesture-pill" />
        </div>
      </div>
    </div>
  );
};
