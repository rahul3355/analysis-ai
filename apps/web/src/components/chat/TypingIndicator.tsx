"use client";

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-[5px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-[7px] w-[7px] rounded-[1.5px] bg-slate/40 dark:text-muted animate-typing-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
