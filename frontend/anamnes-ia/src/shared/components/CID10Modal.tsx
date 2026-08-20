import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, Check, ChevronDown, ChevronUp, ChevronsDown, ChevronsUp } from 'lucide-react';
import { CID10_DATA, CID10_CATEGORIES } from '../data/cid10Data';
import type { CID10Item } from '../data/cid10Data';

interface CID10ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (items: CID10Item[]) => void;
  selectedItems: CID10Item[];
}

const CID10Modal: React.FC<CID10ModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedItems = []
}) => {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [localSelected, setLocalSelected] = useState<CID10Item[]>(selectedItems);

  useEffect(() => {
    if (isOpen) {
      setLocalSelected(selectedItems);
    }
  }, [isOpen, selectedItems]);

  const filteredData = useMemo(() => {
    if (!search.trim()) return CID10_DATA;
    const lower = search.toLowerCase();
    return CID10_DATA.filter(
      item => 
        item.code.toLowerCase().includes(lower) || 
        item.description.toLowerCase().includes(lower)
    );
  }, [search]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, CID10Item[]> = {};
    filteredData.forEach(item => {
      const cat = item.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [filteredData]);

  const visibleCategories = useMemo(() => {
    return CID10_CATEGORIES.filter(cat => groupedByCategory[cat.code]);
  }, [groupedByCategory]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedCategories(new Set(visibleCategories.map(c => c.code)));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  const toggleAll = () => {
    if (expandedCategories.size === visibleCategories.length && visibleCategories.length > 0) {
      collapseAll();
    } else {
      expandAll();
    }
  };

  useEffect(() => {
    if (search.trim()) {
      setExpandedCategories(new Set(visibleCategories.map(c => c.code)));
    } else {
      setExpandedCategories(new Set());
    }
  }, [search, visibleCategories]);

  const toggleItem = (item: CID10Item) => {
    setLocalSelected(prev => {
      const exists = prev.find(i => i.code === item.code);
      if (exists) {
        return prev.filter(i => i.code !== item.code);
      }
      return [...prev, item];
    });
  };

  const handleConfirm = () => {
    onSelect(localSelected);
    onClose();
  };

  const isSelected = (item: CID10Item) => localSelected.some(i => i.code === item.code);

  const allExpanded = expandedCategories.size === visibleCategories.length && visibleCategories.length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl bg-[#1a1b26] border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 border border-amber-500/20">
              <span className="text-2xl font-bold">CID</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Selecionar CID-10</h3>
              <p className="text-sm text-gray-400">{CID10_DATA.length} códigos disponíveis</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-gray-400 flex items-center justify-center transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-white/5 space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar CID-10 (ex: J44.1, Diabetes, Asma...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {visibleCategories.length} categoria(s) · {filteredData.length} código(s)
            </span>
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 text-xs transition-all"
            >
              {allExpanded ? (
                <>
                  <ChevronsUp size={14} />
                  Recolher todas
                </>
              ) : (
                <>
                  <ChevronsDown size={14} />
                  Expandir todas
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {visibleCategories.map((catInfo) => {
            const items = groupedByCategory[catInfo.code];
            const cat = catInfo.code;
            const isExpanded = expandedCategories.has(cat);
            
            return (
              <div key={cat} className="mb-2">
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm font-bold">
                      {cat}
                    </span>
                    <span className="text-gray-200 font-medium text-sm">{catInfo?.name || cat}</span>
                    <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{items.length}</span>
                  </div>
                  {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </button>
                
                {isExpanded && (
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-2">
                    {items.map((item) => (
                      <button
                        key={item.code}
                        onClick={() => toggleItem(item)}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left ${
                          isSelected(item)
                            ? 'bg-amber-500/20 border-amber-500/50 text-white'
                            : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10 hover:border-white/10'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isSelected(item) ? 'bg-amber-500 text-white' : 'border-2 border-gray-500'
                        }`}>
                          {isSelected(item) && <Check size={12} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold text-amber-400">{item.code}</span>
                          <span className="text-xs text-gray-300 ml-1.5 truncate block">{item.description}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          
          {filteredData.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>Nenhum CID-10 encontrado para "{search}"</p>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-white/5 bg-white/2 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            <span className="text-amber-400 font-bold">{localSelected.length}</span> CID(s) selecionado(s)
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2 rounded-xl text-gray-400 hover:text-white transition"
            >
              Cancelar
            </button>
            <button 
              onClick={handleConfirm}
              className="px-8 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg shadow-amber-600/20 transition-all flex items-center gap-2"
            >
              Confirmar
              <Check size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CID10Modal;