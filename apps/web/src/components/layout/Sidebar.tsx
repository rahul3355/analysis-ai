"use client";

import { useState, useEffect } from "react";
import { MessageCircleMore, LibraryBig, FlaskConical, ExternalLink, Sun, Moon, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { cn } from "@/lib/cn";
import { Logo } from "./Logo";

export interface SidebarProps {
  currentView: "chat" | "documents";
  onViewChange: (view: "chat" | "documents") => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("theme") === "dark";
    }
    return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  });
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDarkMode(true);
    }
  };

  const navItems = [
    { id: "chat" as const, label: "Chat", icon: MessageCircleMore },
    { id: "documents" as const, label: "Documents", icon: LibraryBig },
  ];

  const labelClasses = collapsed ? "hidden" : "hidden md:inline";

  return (
    <aside
      className={cn(
        "h-full flex flex-col justify-between bg-soft-stone/35 dark:bg-cohere-black/20 transition-all duration-200 select-none",
        collapsed ? "w-16" : "w-16 md:w-64"
      )}
    >
      {/* Top Section */}
      <div className="flex flex-col p-md md:p-lg">
        {/* Collapse/Expand Toggle - dedicated row, always visible on desktop */}
        <div
          className={cn(
            "hidden md:flex items-center h-6 mb-1",
            collapsed ? "justify-center" : "justify-end"
          )}
        >
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className="flex items-center justify-center w-5 h-5 rounded-sm text-slate dark:text-muted hover:bg-soft-stone/50 hover:text-ink dark:hover:bg-white/5 dark:hover:text-on-dark transition-all duration-150 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-focus-blue"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Logo & Nav group */}
        <div className="flex flex-col gap-xl">
          {/* Logo/Header */}
          <div className="logo-container group/logo flex items-center gap-md h-8 md:h-12 px-md select-none cursor-pointer w-full">
            <Logo className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
            <span
              className={cn(
                "font-display text-base font-semibold tracking-tight text-ink dark:text-on-dark transition-colors duration-200 group-hover/logo:text-warm-yellow",
                labelClasses
              )}
            >
              Analysis AI
            </span>
          </div>

          {/* Navigation links */}
          <nav className="flex flex-col gap-xxs" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={cn(
                    "w-full flex items-center gap-md p-md rounded-sm transition-all duration-150 text-left font-body text-sm",
                    "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-focus-blue cursor-pointer",
                    isActive
                      ? "bg-soft-stone/60 text-ink dark:bg-white/10 dark:text-on-dark font-medium"
                      : "text-slate hover:bg-soft-stone/30 hover:text-ink dark:text-muted dark:hover:bg-white/5 dark:hover:text-on-dark"
                  )}
                  aria-label={item.label}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  <span className={labelClasses}>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col gap-md p-md md:p-lg">
        {/* Docs link */}
        <a
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "group w-full flex items-center gap-md p-md rounded-sm transition-all duration-150 text-left font-body text-sm",
            "text-slate hover:bg-soft-stone/30 hover:text-ink dark:text-muted dark:hover:bg-white/5 dark:hover:text-on-dark",
            "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-focus-blue"
          )}
          aria-label="Docs (opens in new tab)"
        >
          <BookOpen className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span className={cn(collapsed ? "hidden" : "hidden md:inline-flex items-center gap-1")}>
            Docs
            <ExternalLink className="w-3 h-3 text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-150" aria-hidden="true" />
          </span>
        </a>

        {/* Test Set link */}
        <a
          href="/golden"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "group w-full flex items-center gap-md p-md rounded-sm transition-all duration-150 text-left font-body text-sm",
            "text-slate hover:bg-soft-stone/30 hover:text-ink dark:text-muted dark:hover:bg-white/5 dark:hover:text-on-dark",
            "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-focus-blue"
          )}
          aria-label="Test Set (opens in new tab)"
        >
          <FlaskConical className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span className={cn(collapsed ? "hidden" : "hidden md:inline-flex items-center gap-1")}>
            Test Set
            <ExternalLink className="w-3 h-3 text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-150" aria-hidden="true" />
          </span>
        </a>

        {/* Theme Toggle Switch */}
        <button
          onClick={toggleDarkMode}
          role="switch"
          aria-checked={isDarkMode}
          className={cn(
            "w-full flex items-center gap-md p-md rounded-sm transition-all duration-150 text-left font-body text-sm cursor-pointer text-slate dark:text-on-dark",
            "hover:bg-soft-stone/50 dark:hover:bg-white/5",
            "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-focus-blue"
          )}
          aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {/* Toggle track */}
          <div
            className={cn(
              "relative w-11 h-6 rounded-full flex-shrink-0 transition-colors duration-200",
              isDarkMode
                ? "bg-cohere-black/30 dark:bg-white/15"
                : "bg-soft-stone/60 dark:bg-white/10"
            )}
          >
            {/* Sun icon */}
            <Sun
              className={cn(
                "absolute left-[5px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-all duration-200",
                isDarkMode ? "text-muted/40" : "text-ink/70"
              )}
              aria-hidden="true"
            />
            {/* Moon icon */}
            <Moon
              className={cn(
                "absolute right-[5px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-all duration-200",
                isDarkMode ? "text-on-dark/80" : "text-muted/40"
              )}
              aria-hidden="true"
            />
            {/* Sliding knob */}
            <div
              className={cn(
                "absolute top-[2px] left-[2px] w-5 h-5 rounded-full bg-white dark:bg-ink shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                isDarkMode ? "translate-x-5" : "translate-x-0"
              )}
            />
          </div>

          {/* Label */}
          <span className={labelClasses}>
            {isDarkMode ? "Light Mode" : "Dark Mode"}
          </span>
        </button>


      </div>
    </aside>
  );
}
