
import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  variant: 'primary' | 'success' | 'warning' | 'danger';
  trend?: string;
  progress?: number;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, variant, trend, progress }) => {
  const variantMap = {
    primary: {
      gradient: "from-indigo-600 to-blue-500",
      text: "text-indigo-600",
      bg: "bg-indigo-50",
      shadow: "shadow-indigo-200"
    },
    success: {
      gradient: "from-emerald-600 to-teal-500",
      text: "text-emerald-600",
      bg: "bg-emerald-50",
      shadow: "shadow-emerald-200"
    },
    warning: {
      gradient: "from-amber-600 to-orange-500",
      text: "text-amber-600",
      bg: "bg-amber-50",
      shadow: "shadow-amber-200"
    },
    danger: {
      gradient: "from-rose-600 to-red-500",
      text: "text-rose-600",
      bg: "bg-rose-50",
      shadow: "shadow-rose-200"
    }
  };

  const current = variantMap[variant];

  return (
    <div className="group relative overflow-hidden bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl bg-gradient-to-br ${current.gradient} text-white shadow-lg`}>
          {icon}
        </div>
        {trend && (
          <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${current.bg} ${current.text}`}>
            {trend}
          </span>
        )}
      </div>
      
      <div>
        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
      </div>

      {progress !== undefined && (
        <div className="mt-4">
          <div className="flex justify-between text-[10px] font-bold mb-1.5 uppercase tracking-tighter">
            <span className="text-slate-400">Pemanfaatan</span>
            <span className={current.text}>{progress}%</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${current.gradient} transition-all duration-1000 ease-out`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Decorative Blur */}
      <div className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-10 ${current.bg}`}></div>
    </div>
  );
};
