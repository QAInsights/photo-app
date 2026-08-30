export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <circle cx="16" cy="16" r="13.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M16 5.5 20.4 13.2 28.5 14.3 22.5 20.1 24.1 28.2 16 24.1 7.9 28.2 9.5 20.1 3.5 14.3 11.6 13.2Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="3.1" fill="currentColor" />
    </svg>
  );
}
