import { type ReactNode } from 'react';

// ===================== INTERFACES =====================

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'dark' | 'accent' | 'clickable';
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

interface PillProps {
  children: ReactNode;
  variant?: 'default' | 'soft' | 'warn' | 'ok' | 'danger';
  className?: string;
}

// ===================== COMPONENTES =====================

/**
 * Card principal - versão dark (original)
 */
export function Card({ title, children, className = '', onClick, variant = 'dark' }: CardProps) {
  const baseClasses = `
    rounded-2xl
    p-4
    sm:p-5
    flex flex-col
    gap-3
  `;

  const variantClasses = {
    dark: 'bg-zinc-900 border border-zinc-800',
    default: 'card',
    accent: 'card card--accent',
    clickable: 'card card--clickable cursor-pointer hover:shadow-lg transition-shadow'
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      onClick={onClick}
    >
      {title && (
        <h3 className="text-base sm:text-lg font-medium">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

/**
 * Header do Card
 */
export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`card__header flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
}

/**
 * Título do Card
 */
export function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <div className={`card__title text-xs font-bold uppercase tracking-wider text-slate-500 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Body do Card
 */
export function CardBody({ children, className = '' }: CardBodyProps) {
  return (
    <div className={`card__body ${className}`}>
      {children}
    </div>
  );
}

/**
 * Pill/Badge para status e labels
 */
export function Pill({ children, variant = 'default', className = '' }: PillProps) {
  const variantClasses = {
    default: 'bg-slate-100 text-slate-600',
    soft: 'bg-slate-100 text-slate-500',
    warn: 'bg-yellow-100 text-yellow-700',
    ok: 'bg-green-100 text-green-700',
    danger: 'bg-red-100 text-red-700'
  };

  return (
    <span className={`
      inline-flex items-center
      px-2 py-0.5
      rounded-full
      text-[10px] font-bold uppercase
      ${variantClasses[variant]}
      ${className}
    `}>
      {children}
    </span>
  );
}

export default Card;
