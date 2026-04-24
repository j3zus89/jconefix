'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const accent = 'border-[#F5C518] text-[#F5C518] focus-visible:ring-[#F5C518]';

export type InventoryMultiOption = {
  value: string;
  label: string;
  badge?: string;
};

type Props = {
  label: string;
  placeholder: string;
  options: InventoryMultiOption[];
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
  disabled?: boolean;
};

export function InventoryMultiSelect({
  label,
  placeholder,
  options,
  value,
  onChange,
  className,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const filteredValues = useMemo(() => new Set(filtered.map((o) => o.value)), [filtered]);
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((o) => value.includes(o.value));
  const someFilteredSelected = filtered.some((o) => value.includes(o.value));

  const toggleValue = (v: string) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  };

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      onChange(value.filter((v) => !filteredValues.has(v)));
    } else {
      const set = new Set(value);
      filtered.forEach((o) => set.add(o.value));
      onChange(Array.from(set));
    }
  };

  const summary = useMemo(() => {
    if (value.length === 0) return placeholder;
    if (value.length <= 2) {
      return value
        .map((v) => options.find((o) => o.value === v)?.label ?? v)
        .join(', ');
    }
    return `${value.length} seleccionados`;
  }, [value, options, placeholder]);

  return (
    <div className={cn('min-w-0', className)}>
      <span className="text-xs text-gray-500 block mb-1">{label}</span>
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setSearch('');
        }}
      >
        <PopoverTrigger asChild disabled={disabled}>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'flex h-8 w-full items-center justify-between rounded border bg-white px-2 text-left text-xs',
              accent,
              open && 'ring-1 ring-[#F5C518]',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span className={cn('truncate', value.length === 0 && 'text-gray-400')}>
              {summary}
            </span>
            {open ? (
              <ChevronUp className="h-3.5 w-3.5 shrink-0 opacity-60" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(100vw-2rem,320px)] min-w-[260px] p-2 !hover:scale-100 hover:scale-100 data-[state=open]:!scale-100"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Input
            placeholder="Buscar"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn('h-8 text-xs mb-2', accent)}
          />
          <button
            type="button"
            onClick={toggleSelectAllFiltered}
            className="flex w-full items-center gap-2 rounded px-1 py-1.5 text-left hover:bg-gray-50"
          >
            <Checkbox
              checked={
                allFilteredSelected ? true : someFilteredSelected ? 'indeterminate' : false
              }
              onCheckedChange={() => toggleSelectAllFiltered()}
              className="border-[#F5C518] data-[state=checked]:bg-[#F5C518]"
            />
            <span className="text-xs font-semibold uppercase tracking-wide text-[#F5C518]">
              Seleccionar todo
            </span>
          </button>
          <div className="mt-1 max-h-52 overflow-y-auto border-t border-gray-100 pt-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 px-1 py-2">Sin resultados</p>
            ) : (
              filtered.map((o) => (
                <label
                  key={o.value}
                  className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 hover:bg-gray-50"
                >
                  <Checkbox
                    checked={value.includes(o.value)}
                    onCheckedChange={() => toggleValue(o.value)}
                    className="border-[#F5C518] data-[state=checked]:bg-[#F5C518]"
                  />
                  <span className="text-xs text-gray-800 flex-1 truncate">{o.label}</span>
                  {o.badge ? (
                    <span className="shrink-0 rounded bg-[#F5C518] px-1.5 py-0 text-[10px] font-medium text-white">
                      {o.badge}
                    </span>
                  ) : null}
                </label>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
