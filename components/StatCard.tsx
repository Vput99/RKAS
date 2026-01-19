
import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  variant: 'primary' | 'success' | 'warning' | 'danger';
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, variant, trend }) => {
  const styles = {
    primary: "bg-indigo-50 text-indigo-600 border-indigo-100",
    success: "bg-emerald-50 text-emerald-600 border-emerald-100",
    warning: "bg-amber-50 text-amber-600 border-amber-100",
    danger: "bg-rose-50 text-rose-600 border-rose-100"
  };

  const iconStyles = {
    primary: "bg-indigo-600 shadow-indigo-200",
    success: "bg-emerald-600 shadow-emerald-200",
    warning: "bg-amber-600 shadow-amber-200",
    danger: "bg-rose-600 shadow-rose-200"
  };

  return (
    <div className={`relative overflow-hidden bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm transition-all hover:shadow-md group`}>
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{title}</p>
          <h3 className="text-2xl font-extrabold text-slate-900 mb-1">{value}</h3>
          {trend && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${styles[variant]} border`}>
                {trend}
              </span>
            </div>
          )}
        </div>
        <div className={`p-4 rounded-2xl text-white shadow-lg transform group-hover:scale-110 transition-transform duration-300 ${iconStyles[variant]}`}>
          {icon}
        </div>
      </div>
      {/* Subtle decorative circle */}
      <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-[0.03] ${styles[variant].split(' ')[0]}`}></div>
    </div>
  );
};
