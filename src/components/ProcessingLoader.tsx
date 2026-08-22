import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Check, Cpu, Brain, Film, Layers, Palette, Video } from "lucide-react";

interface ProcessingLoaderProps {
  type: "topics" | "script" | "image-prompts" | "video-prompts";
  theme: "light" | "dark";
}

const STEPS_DATA = {
  topics: {
    title: "Mencari Ide Topik Viral",
    subtitle: "AI sedang melakukan analisis tren pasar dan riset topik dengan performa konversi tinggi.",
    icon: Brain,
    accentColor: "from-blue-600 to-indigo-600",
    glowColor: "shadow-blue-500/10 dark:shadow-blue-500/20",
    steps: [
      "Memindai database tren media sosial terbaru...",
      "Menganalisis minat audiens target...",
      "Memetakan sudut hook (hook angle) berkinerja tinggi...",
      "Menilai skor viralitas dan keunikan ide...",
      "Menghasilkan draf rekomendasi topik pilihan..."
    ]
  },
  script: {
    title: "Merumuskan Skenario AI",
    subtitle: "Sistem sedang mensintesis profil pemirsa dan genre pilihan ke dalam sebuah naskah utuh.",
    icon: Film,
    accentColor: "from-indigo-600 to-violet-600",
    glowColor: "shadow-indigo-500/10 dark:shadow-indigo-500/20",
    steps: [
      "Membaca data demografis audiens...",
      "Merancang struktur hook pembuka 3 detik...",
      "Menyusun visual b-roll per adegan secara beruntun...",
      "Menulis dialog suara latar (voiceover) bahasa Indonesia...",
      "Menyelaraskan atmosfer audio dan instruksi SFX..."
    ]
  },
  "image-prompts": {
    title: "Mengoptimasi Prompt Gambar",
    subtitle: "Sistem membedah instruksi visual dari skenario ke dalam bahasa Inggris deskriptif.",
    icon: Palette,
    accentColor: "from-pink-600 to-rose-600",
    glowColor: "shadow-pink-500/10 dark:shadow-pink-500/20",
    steps: [
      "Menganalisis naskah b-roll tiap adegan...",
      "Menerjemahkan konteks visual ke bahasa Inggris deskriptif...",
      "Menambahkan parameter kamera, lighting, dan lensa...",
      "Mengoptimalkan rasio aspek untuk kecocokan platform...",
      "Finishing format prompt Midjourney / DALL-E..."
    ]
  },
  "video-prompts": {
    title: "Memformulasikan Prompt Video",
    subtitle: "Merancang instruksi pergerakan kamera dinamis untuk model sintesis video AI.",
    icon: Video,
    accentColor: "from-emerald-600 to-teal-600",
    glowColor: "shadow-emerald-500/10 dark:shadow-emerald-500/20",
    steps: [
      "Membaca koordinat kontinuitas antar adegan...",
      "Merancang instruksi pan, zoom, dan kemiringan kamera...",
      "Mengalkulasi kecepatan gerakan (motion rate)...",
      "Menambahkan spesifikasi pengaturan Runway & Luma...",
      "Validasi akhir prompt dinamika sinematik..."
    ]
  }
};

export function ProcessingLoader({ type, theme }: ProcessingLoaderProps) {
  const data = STEPS_DATA[type];
  const Icon = data.icon;
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  // Auto-advance sub-steps for visual stimulation
  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStepIdx((prev) => {
        if (prev < data.steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2200);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 98) {
          // Accelerate at the beginning, slow down near 100
          const increment = prev < 50 ? 3 : prev < 80 ? 1.5 : 0.5;
          return Math.min(100, prev + increment);
        }
        return prev;
      });
    }, 150);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, [data.steps.length]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`w-full max-w-xl mx-auto border rounded-2xl p-6 sm:p-8 text-center relative overflow-hidden shadow-lg ${data.glowColor} ${
          theme === "dark" 
            ? "bg-slate-900 border-slate-800" 
            : "bg-white border-slate-200"
        }`}
      >
      {/* Decorative ambient light */}
      <div className={`absolute -top-24 -left-24 w-48 h-48 rounded-full bg-gradient-to-tr ${data.accentColor} opacity-10 blur-3xl`} />
      <div className={`absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-gradient-to-tr ${data.accentColor} opacity-5 blur-3xl`} />

      {/* Rotating Tech Sphere Visualizer */}
      <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
        {/* Glowing pulse rings */}
        <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${data.accentColor} opacity-10 animate-ping`} />
        
        {/* Tech outer dotted ring */}
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 animate-spin" style={{ animationDuration: '15s' }} />
        
        {/* Double animated circles */}
        <div className={`absolute inset-1.5 rounded-full border border-gradient-to-r ${data.accentColor} opacity-30 animate-spin`} style={{ animationDuration: '8s', animationDirection: 'reverse' }} />
        
        {/* Core glow circle */}
        <div className={`w-16 h-16 rounded-full bg-gradient-to-tr ${data.accentColor} text-white flex items-center justify-center shadow-md relative z-10`}>
          <Icon className="w-8 h-8 animate-pulse" />
        </div>
        
        {/* Small floating sparkles */}
        <div className="absolute top-0 right-1 text-yellow-400 animate-bounce">
          <Sparkles className="w-4 h-4 fill-yellow-400" />
        </div>
      </div>

      {/* Header and Context Text */}
      <div className="space-y-2 mb-6">
        <h3 className={`font-extrabold text-xl tracking-tight leading-snug ${
          theme === "dark" ? "text-white" : "text-slate-900"
        }`}>
          {data.title}
        </h3>
        <p className={`text-xs px-2 leading-relaxed max-w-md mx-auto ${
          theme === "dark" ? "text-slate-400" : "text-slate-500"
        }`}>
          {data.subtitle}
        </p>
      </div>

      {/* Linear Process Bar */}
      <div className="space-y-1.5 mb-6 max-w-sm mx-auto">
        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <span>Persiapan Engine</span>
          <span className="font-mono text-blue-600 dark:text-blue-400">{Math.floor(progress)}%</span>
        </div>
        <div className={`h-2.5 w-full rounded-full overflow-hidden p-0.5 ${
          theme === "dark" ? "bg-slate-950 border border-slate-800" : "bg-slate-100 border border-slate-200"
        }`}>
          <div 
            className={`h-full rounded-full bg-gradient-to-r ${data.accentColor} transition-all duration-300 ease-out`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Animated Task Checklist Feed */}
      <div className={`text-left p-4 rounded-xl border space-y-3 max-w-sm mx-auto transition-colors duration-300 ${
        theme === "dark" ? "bg-slate-950/50 border-slate-800" : "bg-slate-50/50 border-slate-100"
      }`}>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-1 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between">
          <span>Protokol Proses</span>
          <Cpu className="w-3.5 h-3.5 text-slate-400 animate-pulse" />
        </div>
        
        <div className="space-y-2.5">
          {data.steps.map((stepText, idx) => {
            const isCompleted = idx < currentStepIdx;
            const isActive = idx === currentStepIdx;
            
            return (
              <div 
                key={idx} 
                className={`flex items-start gap-2.5 text-xs transition-all duration-300 ${
                  isCompleted 
                    ? "text-emerald-600 dark:text-emerald-400" 
                    : isActive 
                    ? "text-slate-800 dark:text-white font-semibold scale-[1.01]" 
                    : "text-slate-400 dark:text-slate-600"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isCompleted ? (
                    <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  ) : isActive ? (
                    <div className="w-4 h-4 rounded-full border border-blue-600 flex items-center justify-center relative">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping absolute" />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center" />
                  )}
                </div>
                <span className="leading-tight flex-1">{stepText}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Sparkles decorative */}
      <div className="absolute top-10 left-10 opacity-20">
        <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
      </div>
      <div className="absolute bottom-12 right-12 opacity-15">
        <Sparkles className="w-6 h-6 text-pink-500 animate-pulse" />
      </div>
    </motion.div>
    </div>
  );
}
