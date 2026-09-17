import React, { useState, useEffect, useRef, useId } from 'react';

interface TooltipProps {
  color: string;
  text: string;
  label: string;
  children: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ color, text, label, children }) => {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  // Fecha o tooltip ao clicar/tocar fora (mobile)
  useEffect(() => {
    if (!show) return;
    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShow(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [show]);

  return (
    <div
      className="relative flex-shrink-0 select-none"
      ref={ref}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <button
        type="button"
        className="w-10 h-10 flex items-center justify-center rounded-lg cursor-help text-2xl font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        style={{ backgroundColor: color }}
        aria-label={label}
        aria-describedby={show ? tooltipId : undefined}
        onClick={e => {
          e.stopPropagation();
          setShow(true);
        }}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        onKeyDown={e => {
          if (e.key === 'Escape') setShow(false);
        }}
      >
        {children}
      </button>
      {show && (
        <div id={tooltipId} role="tooltip" className="absolute left-0 top-10 z-50 bg-[#222] text-white text-sm text-left rounded-lg px-4 py-3 shadow-xl w-max max-w-[200px] sm:max-w-[250px] break-words border border-[#4a4556]">
          {text}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
