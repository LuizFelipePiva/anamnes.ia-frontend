import React, { useState, useEffect, useRef } from 'react';

interface TooltipProps {
  color: string;
  text: string;
}

const Tooltip: React.FC<TooltipProps> = ({ color, text }) => {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
    <div className="relative ml-2 select-none" ref={ref}>
      <div
        className={`w-8 h-8 flex items-center justify-center rounded-full cursor-pointer`}
        style={{ backgroundColor: color }}
        onClick={e => {
          e.stopPropagation();
          setShow((v) => !v);
        }}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        <span className="text-white text-xl font-bold">?</span>
      </div>
      {show && (
        <div className="absolute right-0 top-10 z-50 bg-[#222] text-white text-sm text-left rounded-lg px-4 py-3 shadow-xl w-max max-w-[200px] sm:max-w-[250px] break-words border border-[#4a4556]">
          {text}
        </div>
      )}
    </div>
  );
};

export default Tooltip;