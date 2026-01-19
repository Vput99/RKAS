
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
  const variantColors = {
    primary: "from-indigo-600 to-blue-500 shadow-indigo-200 text-indigo-600",
    success: "from-emerald-600 to-teal-500 shadow-emerald-200 text-emerald-600",
    warning: "from-amber-600 to-orange-500 shadow-amber-200 text-amber-600",
    danger: "from-rose-600 to-red-500 shadow-rose-200 text-rose-600"
  };

  const bgLight = {
    primary: "bg-indigo-50",
    success: "bg-emerald-50",
    warning: "bg-amber-50",
    danger: "bg-rose-50"
  };

  return (
    <div className="group relative overflow-hidden bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl bg-gradient-to-br ${variantColors[variant].split(' ')[0]} ${variantColors[variant].split(' ')[1]} text-white shadow-lg shadow-current/20`}>
          {icon}
        </div>
        {trend && (
          <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${bgLight[variant]} ${variantColors[variant].split(' ')[4]}`}>
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
            <span className={variantColors[variant].split(' ')[4]}>{progress}%</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${variantColors[variant].split(' ').slice(0, 2).join(' ')} transition-all duration-1000 ease-out`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Decorative Blur */}
      <div className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-10 ${bgLight[variant]}`}></div>
    </div>
  );
};
