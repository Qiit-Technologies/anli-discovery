"use client";

import { useEffect, useState } from "react";
import {
  createReview,
  listReviews,
  type Review,
  type ReviewsResponse,
} from "@/lib/api";
import { displayName, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function Stars({
  value,
  size = 16,
  onPick,
}: {
  value: number;
  size?: number;
  onPick?: (n: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onPick}
          onClick={() => onPick?.(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className={onPick ? "cursor-pointer" : "cursor-default"}
        >
          <span
            style={{ fontSize: size }}
            className={n <= value ? "text-amber-400" : "text-ink-700"}
          >
            ★
          </span>
        </button>
      ))}
    </div>
  );
}

export function ReviewsSection({ slug }: { slug: string }) {
  const { user } = useAuth();
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    listReviews(slug).then(setData);
  }, [slug]);

  useEffect(() => {
    if (user && !name) {
      const n = displayName(user);
      if (n) setName(n);
    }
  }, [user, name]);

  async function submit() {
    setError("");
    if (name.trim().length < 2) {
      setError("Please enter your name.");
      return;
    }
    if (body.trim().length < 10) {
      setError("Tell us a little more (at least 10 characters).");
      return;
    }
    setSubmitting(true);
    try {
      await createReview(slug, {
        rating,
        reviewerName: name.trim(),
        title: title.trim() || undefined,
        body: body.trim(),
        customerId: user ? String(user.id) : undefined,
      });
      setDone(true);
      setShowForm(false);
      listReviews(slug).then(setData);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not submit your review.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const agg = data?.aggregate;
  const reviews: Review[] = data?.data ?? [];

  return (
    <div className="mt-6 rounded-3xl border border-ink-800 bg-ink-900 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-bold text-white">Reviews</h2>
        {!showForm && !done && (
          <button
            onClick={() => setShowForm(true)}
            className="text-[13px] font-bold text-amber-300 hover:text-amber-200"
          >
            Write a review
          </button>
        )}
      </div>

      {agg && agg.count > 0 ? (
        <div className="mt-3 flex items-center gap-4">
          <div className="text-center">
            <p className="text-[32px] font-black text-white">
              {agg.average.toFixed(1)}
            </p>
            <Stars value={Math.round(agg.average)} />
            <p className="mt-1 text-[12px] text-stone-400">
              {agg.count} review{agg.count === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex-1 flex flex-col gap-1">
            {[5, 4, 3, 2, 1].map((n) => {
              const c = agg.distribution[n] ?? 0;
              const pct = agg.count ? Math.round((c / agg.count) * 100) : 0;
              return (
                <div key={n} className="flex items-center gap-2 text-[12px]">
                  <span className="w-3 text-stone-400">{n}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-700">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-stone-500">{c}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-[14px] text-stone-400">
          No reviews yet — be the first to share your experience.
        </p>
      )}

      {showForm && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-ink-700 bg-ink-800/60 p-4">
          <div>
            <p className="mb-1 text-[13px] font-semibold text-stone-300">
              Your rating
            </p>
            <Stars value={rating} size={28} onPick={setRating} />
          </div>
          <Input
            label="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Adaeze O."
          />
          <Input
            label="Headline (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sum it up in a line"
          />
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-stone-300">
              Your review
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="What did you love? What could be better?"
              className="w-full rounded-2xl border border-ink-700 bg-ink-800 px-4 py-3 text-[14px] text-white placeholder:text-stone-500 focus:border-amber-400 focus:outline-none"
            />
          </div>
          {error ? <p className="text-[13px] text-red-300">{error}</p> : null}
          <div className="flex gap-2">
            <Button onClick={submit} disabled={submitting} className="flex-1">
              {submitting ? "Posting…" : "Post review"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowForm(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {done && (
        <p className="mt-3 rounded-2xl bg-emerald-950/50 px-4 py-3 text-[13px] font-semibold text-emerald-300">
          Thanks — your review is live. 🎉
        </p>
      )}

      {reviews.length > 0 && (
        <div className="mt-4 flex flex-col gap-4">
          {reviews.slice(0, 5).map((r) => (
            <div
              key={r.id}
              className="border-t border-ink-800 pt-4 first:border-t-0 first:pt-0"
            >
              <div className="flex items-center justify-between">
                <Stars value={r.rating} size={14} />
                <span className="text-[11px] text-stone-500">
                  {new Date(r.createdAt).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              {r.title && (
                <p className="mt-1 text-[14px] font-bold text-white">
                  {r.title}
                </p>
              )}
              <p className="mt-1 text-[14px] leading-6 text-stone-300">
                {r.body}
              </p>
              <p className="mt-1 text-[12px] text-stone-500">
                — {r.reviewerName}
              </p>
              {r.response && (
                <div className="mt-2 rounded-2xl bg-ink-800/70 px-4 py-3">
                  <p className="text-[12px] font-bold text-amber-300">
                    Response from the restaurant
                  </p>
                  <p className="mt-1 text-[13px] leading-5 text-stone-300">
                    {r.response}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
