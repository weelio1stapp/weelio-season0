"use client";

import { useState } from "react";

interface SearchInputProps {
  onSearch: (query: string) => void;
}

export default function SearchInput({ onSearch }: SearchInputProps) {
  const [query, setQuery] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  return (
    <div className="mb-8">
      <input
        type="text"
        placeholder="Hledat podle názvu, regionu nebo tagů..."
        value={query}
        onChange={handleChange}
        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-[var(--accent-primary)] focus:outline-none transition-colors"
      />
    </div>
  );
}
