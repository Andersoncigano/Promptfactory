import React, { useState } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

export const CyberButton: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  ...props 
}) => {
  const baseStyle = "relative px-6 py-3 font-header font-bold uppercase tracking-wider transition-all duration-200 clip-path-polygon disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden";
  
  const variants = {
    primary: "bg-[#39ff14] text-black hover:bg-white hover:shadow-[0_0_15px_#39ff14]",
    secondary: "bg-transparent border border-[#7b2cbf] text-[#7b2cbf] hover:bg-[#7b2cbf] hover:text-white hover:shadow-[0_0_15px_#7b2cbf]",
    danger: "bg-transparent border border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${className}`}
      disabled={isLoading}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {isLoading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </span>
      {/* Glitch overlay effect on hover */}
      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-100"></div>
    </button>
  );
};

export const CyberPanel: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = '', title }) => {
  return (
    <div className={`relative bg-black/60 border border-[#7b2cbf]/50 backdrop-blur-sm p-1 ${className}`}>
      {/* Corner Accents */}
      <div className="absolute -top-[1px] -left-[1px] w-4 h-4 border-t-2 border-l-2 border-[#39ff14]"></div>
      <div className="absolute -top-[1px] -right-[1px] w-4 h-4 border-t-2 border-r-2 border-[#39ff14]"></div>
      <div className="absolute -bottom-[1px] -left-[1px] w-4 h-4 border-b-2 border-l-2 border-[#39ff14]"></div>
      <div className="absolute -bottom-[1px] -right-[1px] w-4 h-4 border-b-2 border-r-2 border-[#39ff14]"></div>
      
      {title && (
        <div className="absolute -top-3 left-6 bg-[#050505] px-2 text-[#39ff14] text-xs font-header tracking-widest border border-[#39ff14]/30">
          {title}
        </div>
      )}

      <div className="h-full w-full p-4">
        {children}
      </div>
    </div>
  );
};

export const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-6 border-b border-[#7b2cbf]/30 pb-2">
    <h2 className="text-2xl font-header text-[#e0e0e0] uppercase tracking-widest flex items-center gap-2">
      <span className="w-2 h-6 bg-[#39ff14]"></span>
      {title}
    </h2>
    {subtitle && <p className="text-[#7b2cbf] text-sm font-mono-tech mt-1 tracking-wider">{subtitle}</p>}
  </div>
);

export const CyberRange: React.FC<{ 
    label: string; 
    value: number; 
    min: number; 
    max: number; 
    step: number; 
    onChange: (val: number) => void 
}> = ({ label, value, min, max, step, onChange }) => {
    return (
        <div className="w-full">
            <div className="flex justify-between mb-1 font-mono-tech text-xs">
                <span className="text-[#39ff14]">{label}</span>
                <span className="text-[#e0e0e0]">{value}</span>
            </div>
            <input 
                type="range" 
                min={min} 
                max={max} 
                step={step} 
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#39ff14]"
            />
        </div>
    );
};

export const CyberStatCard: React.FC<{ 
    label: string; 
    value: string | number; 
    subValue?: string;
    variant?: 'normal' | 'alert' | 'success'; 
}> = ({ label, value, subValue, variant = 'normal' }) => {
    let colorClass = "text-[#39ff14]";
    if (variant === 'alert') colorClass = "text-red-500";
    if (variant === 'success') colorClass = "text-[#39ff14]";
    if (variant === 'normal') colorClass = "text-[#e0e0e0]";

    return (
        <div className="bg-black/40 border border-[#7b2cbf]/30 p-3 flex flex-col items-center justify-center text-center">
            <span className="text-[#7b2cbf] text-[10px] font-header tracking-widest uppercase mb-1">{label}</span>
            <span className={`text-2xl font-mono-tech font-bold ${colorClass}`}>{value}</span>
            {subValue && <span className="text-xs text-gray-500 font-mono-tech mt-1">{subValue}</span>}
        </div>
    );
};

export const CyberTooltip: React.FC<{ content: string; children: React.ReactNode }> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-black border border-[#39ff14] text-xs text-[#e0e0e0] font-mono-tech z-50 shadow-[0_0_10px_rgba(57,255,20,0.2)]">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-[#39ff14]"></div>
        </div>
      )}
    </div>
  );
};