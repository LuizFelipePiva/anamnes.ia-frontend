import React, { useState } from 'react';
import type { KeyboardEvent, ClipboardEvent } from 'react';
import { X } from 'lucide-react';

interface ChipInputProps {
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  className?: string;
}

const ChipInput: React.FC<ChipInputProps> = ({ value, onChange, placeholder, className }) => {
  const [inputValue, setInputValue] = useState('');
  
  // Converte a string vírgula-separada em array, removendo espaços
  const chips = value ? value.split(',').map(s => s.trim()).filter(s => s !== '') : [];

  const addChips = (newItems: string[]) => {
    const updatedChips = [...chips];
    let changed = false;
    
    newItems.forEach(item => {
      const trimmed = item.trim();
      if (trimmed && !updatedChips.includes(trimmed)) {
        updatedChips.push(trimmed);
        changed = true;
      }
    });

    if (changed) {
      onChange(updatedChips.join(', '));
    }
  };

  const removeChip = (index: number) => {
    const updatedChips = chips.filter((_, i) => i !== index);
    onChange(updatedChips.join(', '));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        addChips([inputValue]);
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && !inputValue && chips.length > 0) {
      removeChip(chips.length - 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const items = pastedText.split(/,|\n/).map(s => s.trim()).filter(s => s !== '');
    if (items.length > 0) {
      addChips(items);
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-1 p-1 rounded-xl border border-[#e5e2ef] bg-white transition-all focus-within:ring-2 focus-within:ring-[#7a55ff]/20 focus-within:border-[#7a55ff] ${className}`}>
      {chips.map((chip, index) => (
        <div 
          key={index} 
          className="flex items-center gap-1.5 px-2 py-0.5 bg-[#f3f0ff] text-[#6b35ff] text-xs font-semibold rounded-lg border border-[#e9e4ff] animate-in zoom-in-95 duration-200 max-w-full"
        >
          <span className="break-words leading-5">{chip}</span>
          <button 
            type="button" 
            onClick={() => removeChip(index)}
            className="text-[#a594f9] hover:text-[#6b35ff] transition-colors flex-shrink-0"
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={chips.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[40px] bg-transparent border-none focus:outline-none text-sm text-[#111018] py-0.5 px-1"
      />
    </div>
  );
};

export default ChipInput;
