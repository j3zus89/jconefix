'use client';

import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getTicketFormBrandSelectOptions, isTicketBrandInCategory } from '@/lib/repair-service-device-catalog';

type Props = {
  categoryKey: string;
  brandValue: string;
  onBrandChange: (value: string) => void;
  triggerClassName?: string;
};

export function DeviceBrandSelect({
  categoryKey,
  brandValue,
  onBrandChange,
  triggerClassName = 'mt-1 h-9',
}: Props) {
  const options = useMemo(() => getTicketFormBrandSelectOptions(categoryKey), [categoryKey]);
  const noCategory = !categoryKey?.trim();
  const showLegacy =
    !!brandValue?.trim() &&
    !isTicketBrandInCategory(brandValue, categoryKey) &&
    brandValue.trim().toUpperCase() !== 'OTRO';

  return (
    <Select
      value={brandValue}
      onValueChange={onBrandChange}
      disabled={noCategory}
    >
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={noCategory ? 'Elige categoría primero' : 'Seleccionar…'} />
      </SelectTrigger>
      <SelectContent className="max-h-[min(24rem,70vh)]">
        {showLegacy ? (
          <SelectItem value={brandValue}>{brandValue}</SelectItem>
        ) : null}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
