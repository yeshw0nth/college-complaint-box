"use client";

import { useState } from "react";
import { AdminView } from "@/components/AdminView";
import { StudentView } from "@/components/StudentView";

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

export default function Home() {
  const [isAdminView, setIsAdminView] = useState(false);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-neutral-50 text-neutral-900">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
        <p className="text-base font-semibold tracking-tight text-neutral-900">
          Complaint box
        </p>
        <button
          type="button"
          onClick={() => setIsAdminView((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
          aria-pressed={isAdminView}
          title={
            isAdminView
              ? "Switch to student submission"
              : "Switch to admin sign-in"
          }
        >
          <LockIcon className="size-4" />
          <span className="hidden sm:inline">
            {isAdminView ? "Student" : "Staff"}
          </span>
        </button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        {isAdminView ? <AdminView /> : <StudentView />}
      </main>
    </div>
  );
}
