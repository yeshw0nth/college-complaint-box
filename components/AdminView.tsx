"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type ComplaintStatus = "pending" | "reviewed";

type Complaint = {
  id: number;
  content: string;
  created_at: string;
  status: ComplaintStatus;
  upvotes: number;
};

const STICKY_NOTE_COLOR = "#fff8b8";
const STICKY_NOTE_ROTATIONS = ["rotate-1", "-rotate-2", "rotate-2", "-rotate-1"];
const PAPER_TEXTURE_STYLE = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E\")",
};

export function AdminView() {
  const sketchButtonClass =
    "font-special-elite rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-black px-4 py-2 text-base font-semibold text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-colors disabled:cursor-not-allowed disabled:opacity-60";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isComplaintsLoading, setIsComplaintsLoading] = useState(false);
  const [activeComplaintId, setActiveComplaintId] = useState<number | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [message, setMessage] = useState("");
  const [dashboardMessage, setDashboardMessage] = useState("");

  async function fetchComplaints() {
    setIsComplaintsLoading(true);
    const { data, error } = await supabase
      .from("complaints")
      .select("id, content, created_at, status, upvotes")
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
    const getCurrentSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setMessage(error.message);
        return;
      }
      setSession(data.session);
    };

    getCurrentSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setComplaints([]);
      setDashboardMessage("");
      return;
    }

    fetchComplaints();
  }, [session]);

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

  return (
    <div
      className="font-special-elite flex flex-1 flex-col items-center justify-center bg-[#faf8f5] px-4 py-8 sm:py-12"
      style={PAPER_TEXTURE_STYLE}
    >
      {session?.user ? (
        <div className="flex w-full max-w-5xl flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-black bg-[#fff8b8] p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="space-y-0.5">
              <h2 className="font-special-elite text-lg font-medium text-neutral-900">
                Admin dashboard
              </h2>
              <p className="text-sm text-neutral-600">{session.user.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isAuthLoading}
              className={`${sketchButtonClass} bg-[#ffe066] hover:bg-[#ffd43b]`}
            >
              {isAuthLoading ? "Processing..." : "Logout"}
            </button>
          </div>

          <div aria-live="polite" className="min-h-5 text-sm text-neutral-600">
            {message ? <p>{message}</p> : null}
          </div>
          <div
            aria-live="polite"
            className={`min-h-5 text-sm ${dashboardMessage ? "text-rose-700" : "text-neutral-600"}`}
          >
            {dashboardMessage ? <p>{dashboardMessage}</p> : null}
          </div>

          {isComplaintsLoading ? (
            <p className="text-sm text-neutral-600">Loading complaints...</p>
          ) : complaints.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-600">
              No complaints found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {complaints.map((complaint, index) => {
                const isProcessing = activeComplaintId === complaint.id;
                const isReviewed = complaint.status === "reviewed";
                const cardRotation =
                  STICKY_NOTE_ROTATIONS[index % STICKY_NOTE_ROTATIONS.length];

                return (
                  <article
                    key={complaint.id}
                    className={`mx-auto flex min-h-52 w-full max-w-md flex-col justify-between rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${cardRotation}`}
                    style={{ backgroundColor: STICKY_NOTE_COLOR }}
                  >
                    <div className="space-y-2">
                      <p className="font-kalam text-sm text-neutral-800">{complaint.content}</p>
                      <div className="font-special-elite space-y-0.5 text-xs text-neutral-500">
                        <p>{formatComplaintDate(complaint.created_at)}</p>
                        <p className="font-medium capitalize">
                          Status: {complaint.status}
                        </p>
                        <p className="inline-block -rotate-1 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-black bg-[#d9f99d] px-2 py-0.5 text-xs font-semibold text-neutral-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                          Upvotes: {complaint.upvotes ?? 0}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleMarkReviewed(complaint.id)}
                        disabled={isReviewed || isProcessing}
                        className={`${sketchButtonClass} bg-[#f8f3e6] px-3 py-1.5 text-sm transition-all duration-150 hover:-translate-y-1 hover:bg-[#f3ebd8] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`}
                      >
                        {isProcessing && !isReviewed ? "Updating..." : "Mark Reviewed"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(complaint.id)}
                        disabled={isProcessing}
                        className={`${sketchButtonClass} bg-[#f8f3e6] px-3 py-1.5 text-sm text-rose-700 transition-all duration-150 hover:-translate-y-1 hover:bg-[#f3ebd8] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`}
                      >
                        {isProcessing ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <form className="flex w-full max-w-sm flex-col gap-4" onSubmit={handleLogin}>
          <h2 className="font-special-elite text-center text-lg font-medium text-neutral-900">
            Admin sign in
          </h2>
          <div className="flex flex-col gap-1">
            <label htmlFor="admin-email" className="font-special-elite text-sm text-neutral-600">
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
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 outline-none ring-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-400/30"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="admin-password" className="font-special-elite text-sm text-neutral-600">
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
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 outline-none ring-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-400/30"
            />
          </div>
          <button
            type="submit"
            disabled={isAuthLoading}
            className={`${sketchButtonClass} mt-1 bg-[#ffe066] hover:bg-[#ffd43b]`}
          >
            {isAuthLoading ? "Logging in..." : "Login"}
          </button>
          <div
            aria-live="polite"
            className={`min-h-5 text-sm ${message ? "text-rose-700" : "text-neutral-600"}`}
          >
            {message ? <p>{message}</p> : null}
          </div>
        </form>
      )}
    </div>
  );
}
