"use client";

import { useState } from "react";
import { ShieldCheck, UserRound } from "lucide-react";
import { AdminView } from "@/components/AdminView";
import { StudentView } from "@/components/StudentView";

export default function Home() {
  const [isAdminView, setIsAdminView] = useState(false);
  const ToggleIcon = isAdminView ? UserRound : ShieldCheck;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#fbf7ef] text-neutral-900">
      <header className="z-50 flex shrink-0 items-center justify-between gap-4 border-b-2 border-black bg-[#fff8b8] px-4 py-3 shadow-[0_4px_0px_0px_rgba(0,0,0,1)] sm:px-6">
        <div className="min-w-0">
          <p className="font-typewriter text-base font-semibold uppercase tracking-widest text-neutral-950">
            Complaint Box
          </p>
          <p className="hidden font-ledger text-[11px] text-neutral-600 sm:block">
            Anonymous campus feedback, triaged by staff.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAdminView((v) => !v)}
          className="inline-flex items-center gap-2 rounded-md border-2 border-black bg-[#f8f3e6] px-3 py-2 font-ledger text-xs font-semibold text-neutral-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]"
          aria-pressed={isAdminView}
          title={
            isAdminView
              ? "Switch to student submission"
              : "Switch to admin sign-in"
          }
        >
          <ToggleIcon className="size-4" aria-hidden />
          <span>{isAdminView ? "Student" : "Staff"}</span>
        </button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        {isAdminView ? <AdminView /> : <StudentView />}
      </main>
    </div>
  );
}
