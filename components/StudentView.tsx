"use client";

import { FormEvent, useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
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
const SWIPE_THRESHOLD = 100;

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
  const [swipeExitDirections, setSwipeExitDirections] = useState<Record<number, 1 | -1>>({});
  const cardX = useMotionValue(0);
  const cardRotate = useTransform(cardX, [-200, 0, 200], [-12, 0, 12]);
  const upvoteStampOpacity = useTransform(cardX, [0, 200], [0, 1]);
  const downvoteStampOpacity = useTransform(cardX, [-200, 0], [1, 0]);

  useEffect(() => {
    cardX.set(0);
  }, [cardX, pendingComplaints]);

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
    setSwipeExitDirections((current) => ({
      ...current,
      [cardId]: voteType === "upvote" ? 1 : -1,
    }));
    cardX.set(voteType === "upvote" ? 500 : -500);

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
      setSwipeExitDirections((current) => {
        const updated = { ...current };
        delete updated[cardId];
        return updated;
      });
      cardX.set(0);
      return;
    }

    persistSwipeId(cardId);
    setPendingComplaints((current) => current.filter((item) => item.id !== cardId));
    setStampVote(null);
    setActiveSwipeId(null);
    setSwipeExitDirections((current) => {
      const updated = { ...current };
      delete updated[cardId];
      return updated;
    });
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
        setPendingComplaints((current) => [insertedComplaint as Complaint, ...current]);
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

  return (
    <div
      className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-[#faf8f5] px-4 py-8 sm:py-12"
      style={PAPER_TEXTURE_STYLE}
    >
      <div className="relative w-full max-w-md pb-24" style={{ minHeight: "26rem" }}>
        {isLoadingCards ? (
          <p className="font-special-elite text-center text-2xl text-neutral-700">
            Loading complaints...
          </p>
        ) : pendingComplaints.length === 0 ? (
          <p className="font-special-elite text-center text-2xl text-neutral-700">
            No pending complaints.
          </p>
        ) : (
          <AnimatePresence>
            {pendingComplaints.map((card, index) => {
              const isTopCard = index === 0;
              const stampType =
                stampVote && stampVote.complaintId === card.id ? stampVote.type : null;
              const exitDirection = swipeExitDirections[card.id] ?? 1;

              return (
                <motion.article
                  key={card.id}
                  drag={isTopCard && activeSwipeId === null ? "x" : false}
                  dragConstraints={isTopCard ? { left: 0, right: 0 } : undefined}
                  dragElastic={isTopCard ? 0.8 : undefined}
                  dragMomentum={false}
                  dragSnapToOrigin={isTopCard}
                  onDragEnd={(_event, info) => {
                    if (!isTopCard || activeSwipeId !== null) return;
                    if (info.offset.x > SWIPE_THRESHOLD) {
                      handleCardSwipe(card.id, "upvote");
                      return;
                    }
                    if (info.offset.x < -SWIPE_THRESHOLD) {
                      handleCardSwipe(card.id, "downvote");
                      return;
                    }
                    cardX.set(0);
                  }}
                  initial={{ opacity: 0, scale: 0.96, y: 18 }}
                  animate={{
                    opacity: 1,
                    scale: 1 - index * 0.03,
                    y: index * 10,
                    rotate: 0,
                  }}
                  exit={{
                    opacity: 0,
                    x: exitDirection > 0 ? 500 : -500,
                    rotate: exitDirection > 0 ? 18 : -18,
                  }}
                  transition={{ duration: 0.24, ease: "easeOut" }}
                  style={{
                    x: isTopCard ? cardX : undefined,
                    rotate: isTopCard ? cardRotate : undefined,
                    backgroundColor: STICKY_NOTE_COLOR,
                    zIndex: pendingComplaints.length - index,
                  }}
                  className={`absolute inset-x-0 mx-auto flex w-full max-w-md flex-col gap-4 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${CARD_ROTATIONS[index % CARD_ROTATIONS.length]} ${isTopCard ? "cursor-grab active:cursor-grabbing" : ""}`}
                >
                  {stampType ? (
                    <div
                      className={`font-special-elite pointer-events-none absolute right-4 top-4 rotate-12 rounded-full border-[3px] px-3 py-1 text-sm uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                        stampType === "upvote"
                          ? "border-green-700 bg-green-100 text-green-700"
                          : "border-rose-700 bg-rose-100 text-rose-700"
                      }`}
                    >
                      {stampType === "upvote" ? "Upvote" : "Downvote"}
                    </div>
                  ) : isTopCard ? (
                    <>
                      <motion.div
                        style={{ opacity: upvoteStampOpacity }}
                        className="font-special-elite pointer-events-none absolute right-4 top-4 rotate-12 rounded-full border-[3px] border-green-700 bg-green-100 px-3 py-1 text-sm uppercase tracking-wider text-green-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                      >
                        Upvote
                      </motion.div>
                      <motion.div
                        style={{ opacity: downvoteStampOpacity }}
                        className="font-special-elite pointer-events-none absolute left-4 top-4 -rotate-12 rounded-full border-[3px] border-rose-700 bg-rose-100 px-3 py-1 text-sm uppercase tracking-wider text-rose-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                      >
                        Downvote
                      </motion.div>
                    </>
                  ) : null}

                  {card.image_url ? (
                    <div className="mx-auto w-full max-w-[250px] rotate-1 border-[10px] border-white bg-white p-1 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                      <img
                        src={card.image_url}
                        alt="Complaint attachment"
                        className="h-48 w-full object-cover"
                      />
                    </div>
                  ) : null}

                  <p className="font-kalam text-2xl leading-relaxed text-neutral-900">{card.content}</p>

                  <div className="font-special-elite mt-1 space-y-1 text-sm text-neutral-700">
                    <p>{new Date(card.created_at).toLocaleString()}</p>
                    <div className="flex items-center gap-3">
                      <span>Upvotes: {card.upvotes ?? 0}</span>
                      <span>Downvotes: {card.downvotes ?? 0}</span>
                    </div>
                  </div>

                  <div className="mt-1">
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        openCommentsModal(card);
                      }}
                      className="font-special-elite rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-black bg-[#f8f3e6] px-3 py-1 text-sm font-semibold text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#f3ebd8]"
                    >
                      💬 Comments
                    </button>
                  </div>
                </motion.article>
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
        <div className="absolute inset-0 z-[200] flex items-center justify-center backdrop-blur-md bg-black/40 px-4">
          <form
            className="flex w-full max-w-lg flex-col gap-4 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-black bg-[#fff8b8] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
            onSubmit={handleSubmit}
          >
            <label htmlFor="complaint" className="font-special-elite text-2xl text-neutral-900">
              New Complaint
            </label>
            <textarea
              id="complaint"
              name="complaint"
              rows={7}
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder="Enter your complaint securely and anonymously..."
              className="font-kalam min-h-44 w-full resize-y border-none border-b-2 border-dashed border-black/40 bg-transparent px-2 py-3 text-xl text-neutral-900 outline-none focus:ring-0"
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedImage(e.target.files?.[0] ?? null)}
              className="font-special-elite block w-full text-base text-neutral-900 file:mr-3 file:rounded-[255px_15px_225px_15px/15px_225px_15px_255px] file:border-2 file:border-black file:bg-[#f8f3e6] file:px-3 file:py-1.5 file:font-semibold file:text-black file:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="font-special-elite rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-black bg-[#f8f3e6] px-4 py-2 text-lg font-semibold text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 hover:-translate-y-1 hover:bg-[#f3ebd8] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="font-special-elite rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-black bg-[#f8f3e6] px-5 py-2 text-lg font-semibold text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 hover:-translate-y-1 hover:bg-[#f3ebd8] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : "Submit Anonymously"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {isCommentsOpen && activeCommentComplaint ? (
        <div className="absolute inset-0 z-[220] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="flex w-full max-w-xl flex-col gap-4 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-black bg-[#fff8b8] p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-special-elite text-xl text-neutral-900">Comments</h3>
              <button
                type="button"
                onClick={() => {
                  setIsCommentsOpen(false);
                  setActiveCommentComplaint(null);
                  setComments([]);
                  setCommentText("");
                }}
                className="font-special-elite rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-black bg-[#f8f3e6] px-3 py-1 text-sm font-semibold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                Close
              </button>
            </div>

            <p className="font-kalam text-base text-neutral-800">{activeCommentComplaint.content}</p>

            <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border-2 border-dashed border-black/30 bg-[#fffdee] p-3">
              {isCommentsLoading ? (
                <p className="font-special-elite text-sm text-neutral-600">Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="font-special-elite text-sm text-neutral-600">
                  No comments yet. Be the first to post.
                </p>
              ) : (
                comments.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-md border border-black/20 bg-white/80 px-3 py-2"
                  >
                    <p className="font-kalam text-base text-neutral-800">{entry.content}</p>
                    <p className="font-special-elite mt-1 text-xs text-neutral-500">
                      {new Date(entry.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="font-kalam flex-1 rounded-lg border-2 border-black/40 bg-white px-3 py-2 text-base text-neutral-900 outline-none ring-neutral-400 focus:ring-2 focus:ring-neutral-400/40"
              />
              <button
                type="button"
                onClick={handlePostComment}
                disabled={isPostingComment}
                className="font-special-elite rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-black bg-[#ffe066] px-4 py-2 text-sm font-semibold text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:cursor-not-allowed disabled:opacity-60"
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
          setSuccessMessage("");
          setErrorMessage("");
          setIsFormOpen(true);
        }}
        className="font-special-elite fixed bottom-6 z-[150] rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-black bg-[#ffe066] px-6 py-3 text-xl font-semibold text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-colors hover:bg-[#ffd43b]"
      >
        New Complaint
      </button>
    </div>
  );
}
