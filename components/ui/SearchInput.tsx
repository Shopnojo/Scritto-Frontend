"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { Input } from "./Field";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
}

/** Search box that debounces before reporting changes (avoids an API call per keystroke). */
export function SearchInput({ value, onChange, placeholder, label }: SearchInputProps) {
  const [draft, setDraft] = useState(value);
  const debounced = useDebouncedValue(draft, 350);

  useEffect(() => setDraft(value), [value]);

  useEffect(() => {
    if (debounced.trim() !== value) onChange(debounced.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className="relative w-full sm:w-72">
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-cream-faint" />
      <Input
        type="search"
        aria-label={label}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className="pr-8 pl-9 [&::-webkit-search-cancel-button]:hidden"
        maxLength={120}
      />
      {draft && (
        <button
          type="button"
          onClick={() => setDraft("")}
          className="focus-ring absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-cream-faint hover:text-cream"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
