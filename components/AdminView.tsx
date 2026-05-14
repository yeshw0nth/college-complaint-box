"use client";

/* eslint-disable @next/next/no-img-element */
import { FormEvent, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  CheckCircle2,
  LogIn,
  LogOut,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { supabase } from "@/lib/supabase";

type ComplaintStatus = "pending" | "reviewed";

type Complaint = {
  id: number;
  content: string;
  created_at: string;
  status: ComplaintStatus;
  image_url: string | null;
  upvotes: number;
  downvotes: number;
};

const STICKY_NOTE_COLOR = "#fff8b8";
const STICKY_NOTE_ROTATIONS = ["rotate-1", "-rotate-2", "rotate-2", "-rotate-1"];
const PAPER_TEXTURE_STYLE = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E\")",
};

export function AdminView() {
  const sketchButtonClass =
    "font-typewriter rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-black px-4 py-2 text-sm font-semibold uppercase tracking-widest text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-colors disabled:cursor-not-allowed disabled:opacity-60";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isComplaintsLoading, setIsComplaintsLoading] = useState(false);
  const [activeComplaintId, setActiveComplaintId] = useState<number | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [message, setMessage] = useState("");
  const [dashboardMessage, setDashboardMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ComplaintStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");

  async function fetchComplaints() {
    setIsComplaintsLoading(true);
    const { data, error } = await supabase
      .from("complaints")
      .select("id, content, created_at, status, image_url, upvotes, downvotes")
      .order("upvotes", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      setDashboardMessage(error.message);
      setIsComplaintsLoading(false);
      return;
    }

    setComplaints((data as Complaint[]) ?? []);
    setIsComplaintsLoading(false);
  }

  function formatComplaintDate(value: string) {
    return new Date(value).toLocaleString();
  }

  useEffect(() => {
    void supabase.auth.getSession().then(({ error }) => {
      if (error) {
        setMessage(error.message);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setComplaints([]);
        setDashboardMessage("");
        return;
      }
      void fetchComplaints();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isAuthLoading) return;

    setIsAuthLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setPassword("");
      setMessage("Logged in successfully.");
    }

    setIsAuthLoading(false);
  }

  async function handleLogout() {
    if (isAuthLoading) return;
    setIsAuthLoading(true);
    setMessage("");
    setDashboardMessage("");

    const { error } = await supabase.auth.signOut();
    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Logged out successfully.");
    }

    setIsAuthLoading(false);
  }

  async function handleMarkReviewed(id: number) {
    if (activeComplaintId !== null) return;

    triggerHaptic(30);

    setActiveComplaintId(id);
    setDashboardMessage("");

    const previousComplaints = complaints;
    setComplaints((current) =>
      current.map((complaint) =>
        complaint.id === id ? { ...complaint, status: "reviewed" } : complaint,
      ),
    );

    const { error } = await supabase
      .from("complaints")
      .update({ status: "reviewed" })
      .eq("id", id);

    if (error) {
      setComplaints(previousComplaints);
      setDashboardMessage(error.message);
    }

    setActiveComplaintId(null);
  }

  async function handleDelete(id: number) {
    if (activeComplaintId !== null) return;

    triggerHaptic(30);

    setActiveComplaintId(id);
    setDashboardMessage("");

    const previousComplaints = complaints;
    setComplaints((current) => current.filter((complaint) => complaint.id !== id));

    const { error } = await supabase.from("complaints").delete().eq("id", id);
    if (error) {
      setComplaints(previousComplaints);
      setDashboardMessage(error.message);
    }

    setActiveComplaintId(null);
  }

  const pendingCount = complaints.filter((item) => item.status === "pending").length;
  const reviewedCount = complaints.filter((item) => item.status === "reviewed").length;
  const totalUpvotes = complaints.reduce((sum, item) => sum + (item.upvotes ?? 0), 0);
  const filteredComplaints = complaints.filter((item) => {
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesSearch = item.content.toLowerCase().includes(searchTerm.trim().toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div
      className="flex h-full min-h-0 w-full flex-1 flex-col items-center justify-start overflow-y-auto bg-[#faf8f5] px-4 pb-24 pt-8 sm:py-12"
      style={PAPER_TEXTURE_STYLE}
    >
      {session?.user ? (
        <div className="flex w-full max-w-5xl flex-col gap-8">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-black bg-[#fff8b8] p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex min-w-0 flex-col gap-2">
              <h2 className="font-typewriter text-sm font-semibold uppercase tracking-widest text-neutral-900">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="size-4" aria-hidden />
                  Admin dashboard
                </span>
              </h2>
              <p className="font-ledger truncate text-xs text-slate-600">{session.user.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isAuthLoading}
              className={`${sketchButtonClass} bg-[#ffe066] hover:bg-[#ffd43b]`}
            >
              <span className="inline-flex items-center gap-2">
                <LogOut className="size-4" aria-hidden />
                {isAuthLoading ? "Processing..." : "Logout"}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 font-ledger text-xs">
            <div className="rounded-md border-2 border-black bg-white/80 p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <p className="font-typewriter text-[10px] uppercase tracking-widest text-slate-500">
                Pending
              </p>
              <p className="mt-1 text-xl font-semibold text-neutral-950">{pendingCount}</p>
            </div>
            <div className="rounded-md border-2 border-black bg-white/80 p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <p className="font-typewriter text-[10px] uppercase tracking-widest text-slate-500">
                Reviewed
              </p>
              <p className="mt-1 text-xl font-semibold text-neutral-950">{reviewedCount}</p>
            </div>
            <div className="rounded-md border-2 border-black bg-white/80 p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <p className="font-typewriter text-[10px] uppercase tracking-widest text-slate-500">
                Upvotes
              </p>
              <p className="mt-1 text-xl font-semibold text-neutral-950">{totalUpvotes}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-md border-2 border-black bg-[#f8f3e6] p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:flex-row">
            <label className="flex flex-1 items-center gap-2 rounded-md border-2 border-black bg-white px-3 py-2 font-ledger text-xs text-slate-700">
              <Search className="size-4 shrink-0" aria-hidden />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search complaint text"
                className="min-w-0 flex-1 bg-transparent outline-none"
              />
            </label>
            <div className="grid grid-cols-3 gap-2 font-ledger text-xs">
              {(["all", "pending", "reviewed"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={`rounded-md border-2 border-black px-3 py-2 capitalize transition-colors ${
                    statusFilter === value
                      ? "bg-[#ffe066] text-black"
                      : "bg-white text-slate-600 hover:bg-[#fff8b8]"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div aria-live="polite" className="min-h-5 font-ledger text-xs text-slate-600">
            {message ? <p className="pt-1">{message}</p> : null}
          </div>
          <div
            aria-live="polite"
            className={`min-h-5 font-ledger text-xs ${dashboardMessage ? "text-rose-700" : "text-slate-600"}`}
          >
            {dashboardMessage ? <p className="pt-1">{dashboardMessage}</p> : null}
          </div>

          {isComplaintsLoading ? (
            <p className="font-typewriter text-sm text-neutral-600">Loading complaints...</p>
          ) : filteredComplaints.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-6 font-typewriter text-sm text-neutral-600">
              No matching complaints found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredComplaints.map((complaint, index) => {
                const isProcessing = activeComplaintId === complaint.id;
                const isReviewed = complaint.status === "reviewed";
                const cardRotation =
                  STICKY_NOTE_ROTATIONS[index % STICKY_NOTE_ROTATIONS.length];

                return (
                  <article
                    key={complaint.id}
                    className={`mx-auto flex min-h-52 w-full max-w-md flex-col justify-between gap-5 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${cardRotation}`}
                    style={{ backgroundColor: STICKY_NOTE_COLOR }}
                  >
                    <div className="flex flex-col gap-4">
                      {complaint.image_url ? (
                        <div className="rotate-1 border-[8px] border-white bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                          <img
                            src={complaint.image_url}
                            alt="Complaint attachment"
                            className="h-36 w-full object-cover"
                          />
                        </div>
                      ) : null}
                      <p className="font-ink text-2xl leading-relaxed text-neutral-800">
                        {complaint.content}
                      </p>
                      <div className="flex flex-col gap-2 border-t border-dashed border-black/15 pt-3 font-ledger text-xs text-slate-600">
                        <p>{formatComplaintDate(complaint.created_at)}</p>
                        <p className="font-medium capitalize tracking-normal">
                          Status: {complaint.status}
                        </p>
                        <p className="inline-block w-fit -rotate-1 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-black bg-[#d9f99d] px-2 py-1 font-ledger text-xs text-slate-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                          Upvotes: {complaint.upvotes ?? 0}
                        </p>
                        <p className="inline-block w-fit rotate-1 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-black bg-rose-100 px-2 py-1 font-ledger text-xs text-slate-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                          Downvotes: {complaint.downvotes ?? 0}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => handleMarkReviewed(complaint.id)}
                        disabled={isReviewed || isProcessing}
                        className={`${sketchButtonClass} bg-[#f8f3e6] px-3 py-2 transition-all duration-150 hover:-translate-y-1 hover:bg-[#f3ebd8] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <CheckCircle2 className="size-4" aria-hidden />
                          {isProcessing && !isReviewed ? "Updating..." : "Mark Reviewed"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(complaint.id)}
                        disabled={isProcessing}
                        className={`${sketchButtonClass} bg-[#f8f3e6] px-3 py-2 text-rose-700 transition-all duration-150 hover:-translate-y-1 hover:bg-[#f3ebd8] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Trash2 className="size-4" aria-hidden />
                          {isProcessing ? "Deleting..." : "Delete"}
                        </span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="flex w-full flex-1 flex-col items-center justify-center px-4 py-12">
          <form className="flex w-full max-w-sm flex-col gap-6" onSubmit={handleLogin}>
          <h2 className="font-typewriter text-center text-sm font-semibold uppercase tracking-widest text-neutral-900">
            Admin sign in
          </h2>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="admin-email"
              className="font-typewriter text-sm font-semibold uppercase tracking-widest text-neutral-600"
            >
              Email
            </label>
            <input
              id="admin-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="font-ledger w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-slate-800 outline-none ring-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-400/30"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="admin-password"
              className="font-typewriter text-sm font-semibold uppercase tracking-widest text-neutral-600"
            >
              Password
            </label>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="font-ledger w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-slate-800 outline-none ring-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-400/30"
            />
          </div>
          <button
            type="submit"
            disabled={isAuthLoading}
            className={`${sketchButtonClass} mt-1 bg-[#ffe066] hover:bg-[#ffd43b]`}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <LogIn className="size-4" aria-hidden />
              {isAuthLoading ? "Logging in..." : "Login"}
            </span>
          </button>
          <div
            aria-live="polite"
            className={`min-h-5 font-ledger text-xs ${message ? "text-rose-700" : "text-slate-600"}`}
          >
            {message ? <p className="pt-1">{message}</p> : null}
          </div>
          </form>
        </div>
      )}
    </div>
  );
}
