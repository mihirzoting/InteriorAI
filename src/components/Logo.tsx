export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="h-7 w-7 text-primary" aria-hidden>
        <path d="M4 28V14a12 12 0 0 1 24 0v14" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M11 28V17a5 5 0 0 1 10 0v11" fill="currentColor" opacity="0.25" />
      </svg>
      <span className="font-display text-xl font-medium">
        Interior<span className="italic text-primary">AI</span>
      </span>
    </span>
  );
}
