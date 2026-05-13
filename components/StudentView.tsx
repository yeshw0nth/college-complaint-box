"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { triggerHaptic } from "@/lib/haptics";
import { supabase } from "@/lib/supabase";

type Complaint = {
  id: number;
  content: string;
  created_at: string;
  status: "pending" | "reviewed";
  image_url: string | null;
  upvotes: number;
  downvotes: number;
};

type CommentRecord = {
  id: number;
  complaint_id: number;
  content: string;
  created_at: string;
};

const STICKY_NOTE_COLOR = "#fff8b8";
const PAPER_TEXTURE_STYLE = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E\")",
};
const CARD_ROTATIONS = ["rotate-1", "-rotate-1", "rotate-2", "-rotate-2"];
const SWIPE_STORAGE_KEY = "swiped-complaint-ids";
const SWIPE_DRAG_THRESHOLD = 100;

function getStoredSwipeIds() {
  if (typeof window === "undefined") return new Set<number>();

  try {
    const raw = localStorage.getItem(SWIPE_STORAGE_KEY);
    if (!raw) return new Set<number>();
    const parsed = JSON.parse(raw) as number[];
    return new Set(parsed.filter((id) => Number.isFinite(id)));
  } catch {
    return new Set<number>();
  }
}

function persistSwipeId(id: number) {
  const currentIds = getStoredSwipeIds();
  currentIds.add(id);
  localStorage.setItem(SWIPE_STORAGE_KEY, JSON.stringify(Array.from(currentIds)));
}

type SwipeableCardProps = {
  complaint: Complaint;
  stackIndex: number;
  stackSize: number;
  isTopCard: boolean;
  isSwipeLocked: boolean;
  commitStamp: "upvote" | "downvote" | null;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onCommentsClick: () => void;
};

function SwipeableCard({
  complaint,
  stackIndex,
  stackSize,
  isTopCard,
  isSwipeLocked,
  commitStamp,
  onSwipeRight,
  onSwipeLeft,
  onCommentsClick,
}: SwipeableCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const upvoteOpacity = useTransform(x, [0, 150], [0, 1]);
  const downvoteOpacity = useTransform(x, [0, -150], [0, 1]);

  const prevCommitStamp = useRef<"upvote" | "downvote" | null>(null);

  const distanceFromTop = stackSize - 1 - stackIndex;

  useEffect(() => {
    x.set(0);
  }, [complaint.id, x]);

  useEffect(() => {
    if (!commitStamp) return;
    const target = commitStamp === "upvote" ? 500 : -500;
    const controls = animate(x, target, { type: "tween", duration: 0.28, ease: "easeOut" });
    return () => controls.stop();
  }, [commitStamp, x]);

  useEffect(() => {
    if (prevCommitStamp.current && !commitStamp) {
      animate(x, 0, { type: "tween", duration: 0.22, ease: "easeOut" });
    }
    prevCommitStamp.current = commitStamp;
  }, [commitStamp, x]);

  return (
    <motion.div
      role="article"
      drag={isTopCard && !isSwipeLocked ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      dragMomentum={false}
      whileTap={isTopCard && !isSwipeLocked ? { cursor: "grabbing" } : undefined}
      onDragEnd={(_event, info) => {
        if (!isTopCard || isSwipeLocked) return;
        if (info.offset.x > SWIPE_DRAG_THRESHOLD) {
          triggerHaptic(50);
          onSwipeRight();
          return;
        }
        if (info.offset.x < -SWIPE_DRAG_THRESHOLD) {
          triggerHaptic(50);
          onSwipeLeft();
          return;
        }
      }}
      initial={{ opacity: 0, scale: 0.96, y: 18 }}
      animate={{
        opacity: 1,
        scale: 1 - distanceFromTop * 0.03,
        y: distanceFromTop * 10,
      }}
      exit={{
        opacity: 0,
        scale: 0.94,
      }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      style={{
        x,
        rotate,
        backgroundColor: STICKY_NOTE_COLOR,
        zIndex: stackIndex + 1,
      }}
      className={`touch-none absolute inset-x-0 mx-auto flex w-full max-w-md flex-col gap-5 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${CARD_ROTATIONS[stackIndex % CARD_ROTATIONS.length]} ${isTopCard && !isSwipeLocked ? "cursor-grab" : ""}`}
    >
      {commitStamp ? (
        <div
          className={`font-typewriter pointer-events-none absolute right-4 top-4 rotate-12 rounded-full border-[3px] px-3 py-1 text-sm font-semibold uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
            commitStamp === "upvote"
              ? "border-green-700 bg-green-100 text-green-700"
              : "border-rose-700 bg-rose-100 text-rose-700"
          }`}
        >
          {commitStamp === "upvote" ? "UPVOTE" : "DOWNVOTE"}
        </div>
      ) : isTopCard ? (
        <>
          <motion.div
            style={{ opacity: upvoteOpacity }}
            className="font-typewriter pointer-events-none absolute right-4 top-4 rotate-12 rounded-full border-[3px] border-green-700 bg-green-100 px-3 py-1 text-sm font-semibold uppercase tracking-widest text-green-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
          >
            UPVOTE
          </motion.div>
          <motion.div
            style={{ opacity: downvoteOpacity }}
            className="font-typewriter pointer-events-none absolute left-4 top-4 -rotate-12 rounded-full border-[3px] border-rose-700 bg-rose-100 px-3 py-1 text-sm font-semibold uppercase tracking-widest text-rose-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
          >
            DOWNVOTE
          </motion.div>
        </>
      ) : null}

      {complaint.image_url ? (
        <div className="mx-auto w-full max-w-[250px] rotate-1 border-[10px] border-white bg-white p-1 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <img
            src={complaint.image_url}
            alt="Complaint attachment"
            className="h-48 w-full object-cover"
          />
        </div>
      ) : null}

      <p className="font-ink text-2xl leading-relaxed text-neutral-900">{complaint.content}</p>

      <div className="mt-2 flex flex-col gap-2 border-t border-dashed border-black/15 pt-3">
        <p className="font-ledger text-xs text-slate-600">
          {new Date(complaint.created_at).toLocaleString()}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-ledger text-xs text-slate-600">
          <span>Upvotes: {complaint.upvotes ?? 0}</span>
          <span>Downvotes: {complaint.downvotes ?? 0}</span>
        </div>
      </div>

      <div className="mt-2">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onCommentsClick();
          }}
          className="font-typewriter rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-black bg-[#f8f3e6] px-3 py-2 text-sm font-semibold uppercase tracking-widest text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#f3ebd8]"
        >
          💬 Comments
        </button>
      </div>
    </motion.div>
  );
}

export function StudentView() {
  const [complaint, setComplaint] = useState("");
  const [pendingComplaints, setPendingComplaints] = useState<Complaint[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSwipeId, setActiveSwipeId] = useState<number | null>(null);
  const [stampVote, setStampVote] = useState<{
    complaintId: number;
    type: "upvote" | "downvote";
  } | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [activeCommentComplaint, setActiveCommentComplaint] = useState<Complaint | null>(null);
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function fetchPendingComplaints() {
      setIsLoadingCards(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("complaints")
        .select("id, content, created_at, status, image_url, upvotes, downvotes")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage(error.message);
      } else {
        const swipedIds = getStoredSwipeIds();
        const fetched = (data as Complaint[]) ?? [];
        setPendingComplaints(fetched.filter((item) => !swipedIds.has(item.id)));
      }

      setIsLoadingCards(false);
    }

    fetchPendingComplaints();
  }, []);

  async function handleCardSwipe(cardId: number, voteType: "upvote" | "downvote") {
    if (activeSwipeId !== null) return;
    setActiveSwipeId(cardId);
    setErrorMessage("");
    setStampVote({ complaintId: cardId, type: voteType });

    await new Promise((resolve) => {
      setTimeout(resolve, 320);
    });

    const previousComplaints = pendingComplaints;
    setPendingComplaints((current) =>
      current.map((item) => {
        if (item.id !== cardId) return item;
        return voteType === "upvote"
          ? { ...item, upvotes: (item.upvotes ?? 0) + 1 }
          : { ...item, downvotes: (item.downvotes ?? 0) + 1 };
      }),
    );

    const { error } = await supabase.rpc(
      voteType === "upvote" ? "increment_upvote" : "increment_downvote",
      { row_id: cardId },
    );

    if (error) {
      setPendingComplaints(previousComplaints);
      setErrorMessage(error.message);
      setStampVote(null);
      setActiveSwipeId(null);
      return;
    }

    persistSwipeId(cardId);
    setPendingComplaints((current) => current.filter((item) => item.id !== cardId));
    setStampVote(null);
    setActiveSwipeId(null);
  }

  async function openCommentsModal(targetComplaint: Complaint) {
    setActiveCommentComplaint(targetComplaint);
    setIsCommentsOpen(true);
    setIsCommentsLoading(true);
    setCommentText("");
    setErrorMessage("");

    const { data, error } = await supabase
      .from("comments")
      .select("id, complaint_id, content, created_at")
      .eq("complaint_id", targetComplaint.id)
      .order("created_at", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setComments([]);
    } else {
      setComments(((data as CommentRecord[]) ?? []).filter((item) => !!item.content));
    }

    setIsCommentsLoading(false);
  }

  async function handlePostComment() {
    if (!activeCommentComplaint || isPostingComment) return;

    const trimmed = commentText.trim();
    if (!trimmed) return;

    setIsPostingComment(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("comments")
      .insert({ complaint_id: activeCommentComplaint.id, content: trimmed })
      .select("id, complaint_id, content, created_at")
      .single();

    if (error) {
      setErrorMessage(error.message);
    } else if (data) {
      setComments((current) => [...current, data as CommentRecord]);
      setCommentText("");
    }

    setIsPostingComment(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedComplaint = complaint.trim();
    if (!trimmedComplaint || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    let imageUrl: string | null = null;
    if (selectedImage) {
      const extension = selectedImage.name.split(".").pop() ?? "jpg";
      const filePath = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("complaint-images")
        .upload(filePath, selectedImage);

      if (uploadError) {
        setErrorMessage(uploadError.message);
        setIsSubmitting(false);
        return;
      }

      const { data: publicData } = supabase.storage
        .from("complaint-images")
        .getPublicUrl(filePath);
      imageUrl = publicData.publicUrl;
    }

    const { data: insertedComplaint, error } = await supabase
      .from("complaints")
      .insert({ content: trimmedComplaint, image_url: imageUrl })
      .select("id, content, created_at, status, image_url, upvotes, downvotes")
      .single();

    if (!error) {
      if (insertedComplaint) {
        setPendingComplaints((current) => [...current, insertedComplaint as Complaint]);
      }
      setComplaint("");
      setSelectedImage(null);
      setIsFormOpen(false);
      setSuccessMessage("Complaint submitted successfully.");
    } else {
      setErrorMessage(error.message);
    }

    setIsSubmitting(false);
  }

  const stackSize = pendingComplaints.length;
  const isSwipeLocked = activeSwipeId !== null;

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden bg-[#faf8f5] px-4 py-8 sm:py-12"
      style={PAPER_TEXTURE_STYLE}
    >
      <div className="relative w-full max-w-md pb-24" style={{ minHeight: "26rem" }}>
        {isLoadingCards ? (
          <p className="font-typewriter text-center text-base text-neutral-700">
            Loading complaints...
          </p>
        ) : pendingComplaints.length === 0 ? (
          <p className="font-typewriter text-center text-base text-neutral-700">
            No pending complaints.
          </p>
        ) : (
          <AnimatePresence>
            {pendingComplaints.map((card, stackIndex) => {
              const isTopCard = stackIndex === pendingComplaints.length - 1;
              const commitStamp =
                stampVote && stampVote.complaintId === card.id ? stampVote.type : null;

              return (
                <SwipeableCard
                  key={card.id}
                  complaint={card}
                  stackIndex={stackIndex}
                  stackSize={stackSize}
                  isTopCard={isTopCard}
                  isSwipeLocked={isSwipeLocked}
                  commitStamp={commitStamp}
                  onSwipeRight={() => void handleCardSwipe(card.id, "upvote")}
                  onSwipeLeft={() => void handleCardSwipe(card.id, "downvote")}
                  onCommentsClick={() => void openCommentsModal(card)}
                />
              );
            })}
          </AnimatePresence>
        )}
      </div>

      <div aria-live="polite" className="mt-6 min-h-6 text-center text-lg">
        {successMessage ? (
          <p className="inline-block -rotate-2 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-black bg-[#d9f99d] px-3 py-1 text-emerald-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            {successMessage}
          </p>
        ) : null}
        {!successMessage && errorMessage ? <p className="text-rose-700">{errorMessage}</p> : null}
      </div>

      {isFormOpen ? (
        <div className="fixed inset-0 z-[400] flex h-[100dvh] min-h-[100dvh] items-center justify-center bg-black/40 px-4 backdrop-blur-md">
          <form
            className="flex w-full max-w-lg flex-col gap-6 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-black bg-[#fff8b8] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
            onSubmit={handleSubmit}
          >
            <label
              htmlFor="complaint"
              className="font-typewriter text-sm font-semibold uppercase tracking-widest text-neutral-900"
            >
              New Complaint
            </label>
            <textarea
              id="complaint"
              name="complaint"
              rows={7}
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder="Enter your complaint securely and anonymously..."
              className="font-ink min-h-44 w-full resize-y border-none border-b-2 border-dashed border-black/40 bg-transparent px-2 py-4 text-2xl leading-relaxed text-neutral-900 outline-none focus:ring-0"
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedImage(e.target.files?.[0] ?? null)}
              className="font-ledger block w-full text-xs text-slate-600 file:mr-3 file:rounded-[255px_15px_225px_15px/15px_225px_15px_255px] file:border-2 file:border-black file:bg-[#f8f3e6] file:px-3 file:py-2 file:font-typewriter file:text-sm file:font-semibold file:uppercase file:tracking-widest file:text-black file:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            />
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="font-typewriter rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-black bg-[#f8f3e6] px-4 py-2 text-sm font-semibold uppercase tracking-widest text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 hover:-translate-y-1 hover:bg-[#f3ebd8] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="font-typewriter rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-black bg-[#f8f3e6] px-5 py-2 text-sm font-semibold uppercase tracking-widest text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 hover:-translate-y-1 hover:bg-[#f3ebd8] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : "Submit Anonymously"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {isCommentsOpen && activeCommentComplaint ? (
        <div className="fixed inset-0 z-[420] flex h-[100dvh] min-h-[100dvh] items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="flex w-full max-w-xl flex-col gap-6 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-black bg-[#fff8b8] p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-typewriter text-sm font-semibold uppercase tracking-widest text-neutral-900">
                Comments
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsCommentsOpen(false);
                  setActiveCommentComplaint(null);
                  setComments([]);
                  setCommentText("");
                }}
                className="font-typewriter rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-black bg-[#f8f3e6] px-3 py-2 text-sm font-semibold uppercase tracking-widest text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                Close
              </button>
            </div>

            <p className="font-ink text-2xl leading-relaxed text-neutral-800">
              {activeCommentComplaint.content}
            </p>

            <div className="max-h-56 space-y-3 overflow-y-auto rounded-lg border-2 border-dashed border-black/30 bg-[#fffdee] p-3">
              {isCommentsLoading ? (
                <p className="font-typewriter text-sm text-neutral-600">Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="font-typewriter text-sm text-neutral-600">
                  No comments yet. Be the first to post.
                </p>
              ) : (
                comments.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-md border border-black/20 bg-white/80 px-3 py-3"
                  >
                    <p className="font-ink text-2xl leading-relaxed text-neutral-800">{entry.content}</p>
                    <p className="font-ledger mt-2 text-xs text-slate-600">
                      {new Date(entry.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="font-ledger flex-1 rounded-lg border-2 border-black/40 bg-white px-3 py-2 text-xs text-slate-800 outline-none ring-neutral-400 focus:ring-2 focus:ring-neutral-400/40"
              />
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(30);
                  void handlePostComment();
                }}
                disabled={isPostingComment}
                className="font-typewriter shrink-0 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-black bg-[#ffe066] px-4 py-2 text-sm font-semibold uppercase tracking-widest text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPostingComment ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          triggerHaptic(30);
          setSuccessMessage("");
          setErrorMessage("");
          setIsFormOpen(true);
        }}
        className="font-typewriter fixed bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] left-1/2 z-[300] -translate-x-1/2 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-black bg-[#ffe066] px-6 py-3 text-sm font-semibold uppercase tracking-widest text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-colors hover:bg-[#ffd43b]"
      >
        New Complaint
      </button>
    </div>
  );
}
