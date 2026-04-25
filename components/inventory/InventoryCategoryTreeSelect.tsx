'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const SEP = ' > ';
const accent = 'border-[#0d9488] text-[#0d9488] focus-visible:ring-[#0d9488]';

export type CategoryNode = {
  segment: string;
  path: string;
  children: CategoryNode[];
};

function buildCategoryTree(distinctCategories: string[]): CategoryNode[] {
  const roots: CategoryNode[] = [];

  const findOrCreate = (level: CategoryNode[], segment: string, path: string): CategoryNode => {
    let node = level.find((n) => n.segment === segment);
    if (!node) {
      node = { segment, path, children: [] };
      level.push(node);
      level.sort((a, b) => a.segment.localeCompare(b.segment, undefined, { sensitivity: 'base' }));
    }
    return node;
  };

  const sorted = Array.from(new Set(distinctCategories.map((c) => c.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );

  for (const full of sorted) {
    const parts = full.split(SEP).map((s: string) => s.trim()).filter(Boolean);
    if (parts.length === 0) continue;
    let level = roots;
    let acc = '';
    for (let i = 0; i < parts.length; i++) {
      acc = i === 0 ? parts[i]! : acc + SEP + parts[i]!;
      const node = findOrCreate(level, parts[i]!, acc);
      level = node.children;
    }
  }

  return roots;
}

function filterTree(nodes: CategoryNode[], q: string): CategoryNode[] {
  if (!q) return nodes;
  const lower = q.toLowerCase();
  const walk = (n: CategoryNode): CategoryNode | null => {
    const childFiltered = n.children.map(walk).filter(Boolean) as CategoryNode[];
    const selfMatch = n.segment.toLowerCase().includes(lower) || n.path.toLowerCase().includes(lower);
    if (selfMatch || childFiltered.length > 0) {
      return { ...n, children: childFiltered };
    }
    return null;
  };
  return nodes.map(walk).filter(Boolean) as CategoryNode[];
}

function flattenVisible(nodes: CategoryNode[], expanded: Set<string>): CategoryNode[] {
  const out: CategoryNode[] = [];
  for (const n of nodes) {
    out.push(n);
    if (n.children.length > 0 && expanded.has(n.path)) {
      out.push(...flattenVisible(n.children, expanded));
    }
  }
  return out;
}

type Props = {
  label: string;
  placeholder: string;
  distinctCategories: string[];
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
  disabled?: boolean;
};

export function InventoryCategoryTreeSelect({
  label,
  placeholder,
  distinctCategories,
  value,
  onChange,
  className,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const tree = useMemo(() => buildCategoryTree(distinctCategories), [distinctCategories]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const filteredTree = useMemo(() => filterTree(tree, search.trim()), [tree, search]);

  const visibleRows = useMemo(() => {
    const q = search.trim();
    if (q) {
      const all: CategoryNode[] = [];
      const dfs = (nodes: CategoryNode[]) => {
        for (const n of nodes) {
          all.push(n);
          if (n.children.length) dfs(n.children);
        }
      };
      dfs(filteredTree);
      return all;
    }
    return flattenVisible(tree, expanded);
  }, [tree, filteredTree, expanded, search]);

  const visiblePaths = useMemo(() => visibleRows.map((n) => n.path), [visibleRows]);
  const visibleSet = useMemo(() => new Set(visiblePaths), [visiblePaths]);

  const allVisibleSelected =
    visiblePaths.length > 0 && visiblePaths.every((p) => value.includes(p));
  const someVisibleSelected = visiblePaths.some((p) => value.includes(p));

  const togglePath = (path: string) => {
    if (value.includes(path)) onChange(value.filter((x) => x !== path));
    else onChange([...value, path]);
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      onChange(value.filter((v) => !visibleSet.has(v)));
    } else {
      const set = new Set(value);
      visiblePaths.forEach((p) => set.add(p));
      onChange(Array.from(set));
    }
  };

  const summary = useMemo(() => {
    if (value.length === 0) return placeholder;
    if (value.length <= 2) return value.join(', ');
    return `${value.length} seleccionadas`;
  }, [value, placeholder]);

  const depthOf = (path: string) => path.split(SEP).length - 1;

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
              open && 'ring-1 ring-[#0d9488]',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span className={cn('truncate', value.length === 0 && 'text-gray-400')}>{summary}</span>
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
            onChange={(e) => {
              setSearch(e.target.value);
              if (e.target.value.trim()) {
                const next = new Set<string>();
                const expandAll = (nodes: CategoryNode[]) => {
                  for (const n of nodes) {
                    next.add(n.path);
                    if (n.children.length) expandAll(n.children);
                  }
                };
                expandAll(filterTree(tree, e.target.value.trim()));
                setExpanded(next);
              }
            }}
            className={cn('h-8 text-xs mb-2', accent)}
          />
          <button
            type="button"
            onClick={toggleSelectAllVisible}
            className="flex w-full items-center gap-2 rounded px-1 py-1.5 text-left hover:bg-gray-50"
          >
            <Checkbox
              checked={
                allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false
              }
              onCheckedChange={() => toggleSelectAllVisible()}
              className="border-[#0d9488] data-[state=checked]:bg-[#0d9488]"
            />
            <span className="text-xs font-semibold uppercase tracking-wide text-[#0d9488]">
              Seleccionar todo
            </span>
          </button>
          <div className="mt-1 max-h-52 overflow-y-auto border-t border-gray-100 pt-1">
            {visibleRows.length === 0 ? (
              <p className="text-xs text-gray-400 px-1 py-2">Sin categorías en inventario</p>
            ) : (
              visibleRows.map((node) => {
                const depth = depthOf(node.path);
                const hasKids = node.children.length > 0;
                const isOpen = expanded.has(node.path);
                return (
                  <div
                    key={node.path}
                    className="flex items-center gap-0.5 rounded px-0.5 py-0.5 hover:bg-gray-50"
                    style={{ paddingLeft: Math.min(depth, 6) * 10 }}
                  >
                    {hasKids ? (
                      <button
                        type="button"
                        className="p-0.5 text-gray-500 hover:text-gray-800"
                        onClick={() => {
                          setExpanded((prev) => {
                            const n = new Set(prev);
                            if (n.has(node.path)) n.delete(node.path);
                            else n.add(node.path);
                            return n;
                          });
                        }}
                        aria-label={isOpen ? 'Contraer' : 'Expandir'}
                      >
                        {isOpen ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </button>
                    ) : (
                      <span className="w-4 inline-block" />
                    )}
                    <label className="flex flex-1 cursor-pointer items-center gap-2 min-w-0 py-0.5">
                      <Checkbox
                        checked={value.includes(node.path)}
                        onCheckedChange={() => togglePath(node.path)}
                        className="border-[#0d9488] data-[state=checked]:bg-[#0d9488]"
                      />
                      <span className="text-xs text-gray-800 truncate">{node.segment}</span>
                    </label>
                  </div>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function categoryMatchesSelection(category: string, selectedPaths: string[]): boolean {
  if (selectedPaths.length === 0) return true;
  const c = (category || '').trim();
  return selectedPaths.some((p) => c === p || c.startsWith(p + SEP));
}

export { buildCategoryTree };
