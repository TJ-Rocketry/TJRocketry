"use client";
import { useState, useRef, useEffect } from "react";

export default function InlineEdit({
  value,
  dim,
  editing,
  editValue,
  onStart,
  onChange,
  onSave,
  onCancel,
  placeholder,
}: {
  value: string;
  dim?: boolean;
  editing: boolean;
  editValue: string;
  onStart: () => void;
  onChange: (v: string) => void;
  onSave: (v: string) => void;
  onCancel: () => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && ref.current) { ref.current.focus(); ref.current.select(); }
  }, [editing]);

  if (editing) {
    return (
      <input ref={ref} type="text" value={editValue}
        onChange={e => onChange(e.target.value)}
        onBlur={() => onSave(editValue)}
        onKeyDown={e => {
          if (e.key === "Enter") onSave(editValue);
          if (e.key === "Escape") onCancel();
        }}
        className="bg-neutral-800 border border-neutral-500 px-2 py-1 text-sm text-white w-48 outline-none"
        placeholder={placeholder} />
    );
  }

  return (
    <button onClick={onStart}
      className={`group text-lg text-left transition-colors cursor-text w-full px-1 -mx-1 py-0.5 rounded
        ${dim ? "text-gray-400" : "text-white"}
        hover:bg-neutral-700/50`}>
      <span className="group-hover:underline">{value}</span>
    </button>
  );
}
