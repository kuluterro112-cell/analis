"use client";

import { HORIZON_OPTIONS, type HorizonMinutes } from "@/types/analysis";

interface HorizonSelectorProps {
  value: HorizonMinutes;
  onChange: (value: HorizonMinutes) => void;
  disabled?: boolean;
}

export function HorizonSelector({
  value,
  onChange,
  disabled = false,
}: HorizonSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {HORIZON_OPTIONS.map((minute) => {
        const isActive = value === minute;
        return (
          <button
            key={minute}
            type="button"
            disabled={disabled}
            onClick={() => onChange(minute)}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
              isActive
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {minute} menit
          </button>
        );
      })}
    </div>
  );
}
