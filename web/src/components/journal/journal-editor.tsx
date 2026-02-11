"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { MOODS } from "@/lib/constants";
import type { Journal, Tag, Mood } from "@/types";
import ScreenshotUpload from "./screenshot-upload";

interface Props {
  tradeId: string;
  journal: Journal | null;
  tags: Tag[];
  onUpdate: (journal: Journal) => void;
}

export default function JournalEditor({ tradeId, journal, tags, onUpdate }: Props) {
  const supabase = createClient();
  const [notes, setNotes] = useState(journal?.notes || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(journal?.tags || []);
  const [mood, setMood] = useState<Mood | null>(journal?.mood || null);
  const [setupQuality, setSetupQuality] = useState(journal?.setup_quality || 0);
  const [followedPlan, setFollowedPlan] = useState<boolean | null>(journal?.followed_plan ?? null);
  const [screenshots, setScreenshots] = useState<string[]>(journal?.screenshot_urls || []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newTag, setNewTag] = useState("");
  const debounceRef = useRef<NodeJS.Timeout>();

  // Auto-save with debounce
  const save = useCallback(async () => {
    setSaving(true);
    setSaved(false);

    const payload = {
      trade_id: tradeId,
      notes: notes || null,
      tags: selectedTags,
      mood,
      setup_quality: setupQuality || null,
      followed_plan: followedPlan,
      screenshot_urls: screenshots,
    };

    let result;
    if (journal?.id) {
      result = await supabase
        .from("journals")
        .update(payload)
        .eq("id", journal.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from("journals")
        .insert(payload)
        .select()
        .single();
    }

    if (result.data) onUpdate(result.data);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [tradeId, notes, selectedTags, mood, setupQuality, followedPlan, screenshots, journal?.id]);

  // Debounced auto-save on content change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(save, 2000);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [notes, selectedTags, mood, setupQuality, followedPlan, screenshots]);

  function toggleTag(tagName: string) {
    setSelectedTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    );
  }

  async function addNewTag() {
    if (!newTag.trim()) return;
    const { data } = await supabase
      .from("tags")
      .insert({ name: newTag.trim(), color: "#737373" })
      .select()
      .single();
    if (data) {
      setSelectedTags([...selectedTags, data.name]);
      setNewTag("");
    }
  }

  return (
    <div className="space-y-5">
      {/* Save indicator */}
      <div className="flex justify-end text-xs text-text-secondary">
        {saving && "Saving..."}
        {saved && <span className="text-profit">Saved</span>}
      </div>

      {/* Notes */}
      <div>
        <label className="mb-1.5 block text-sm text-text-secondary">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder="What was your reasoning? What went well? What could improve?"
          className="input resize-y"
        />
      </div>

      {/* Tags */}
      <div>
        <label className="mb-1.5 block text-sm text-text-secondary">Tags</label>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => toggleTag(t.name)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedTags.includes(t.name)
                  ? "text-white"
                  : "border border-border text-text-secondary hover:border-accent"
              }`}
              style={selectedTags.includes(t.name) ? { backgroundColor: t.color } : undefined}
            >
              {t.name}
            </button>
          ))}
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addNewTag())}
              placeholder="+ New tag"
              className="w-24 rounded-full border border-dashed border-border bg-transparent px-3 py-1 text-xs outline-none focus:border-accent"
            />
          </div>
        </div>
      </div>

      {/* Mood */}
      <div>
        <label className="mb-1.5 block text-sm text-text-secondary">Mood</label>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMood(mood === m.value ? null : m.value)}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                mood === m.value
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-text-secondary hover:bg-surface-hover"
              }`}
            >
              {m.emoji} {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Setup Quality */}
      <div>
        <label className="mb-1.5 block text-sm text-text-secondary">Setup Quality</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setSetupQuality(setupQuality === star ? 0 : star)}
              className={`text-2xl transition-colors ${
                star <= setupQuality ? "text-accent" : "text-border hover:text-accent/50"
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      {/* Followed Plan */}
      <div>
        <label className="mb-1.5 block text-sm text-text-secondary">Followed Trading Plan?</label>
        <div className="flex gap-2">
          {([
            { value: true, label: "Yes" },
            { value: false, label: "No" },
          ] as const).map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => setFollowedPlan(followedPlan === opt.value ? null : opt.value)}
              className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                followedPlan === opt.value
                  ? opt.value ? "border-profit bg-profit/10 text-profit" : "border-loss bg-loss/10 text-loss"
                  : "border-border text-text-secondary hover:bg-surface-hover"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Screenshots */}
      <ScreenshotUpload
        tradeId={tradeId}
        screenshots={screenshots}
        onUpdate={setScreenshots}
      />
    </div>
  );
}
