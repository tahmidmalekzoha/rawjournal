"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_TAGS } from "@/lib/constants";
import type { Tag } from "@/types";

const COLORS = ["#6366f1", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

export default function TagsSettingsPage() {
  const supabase = createClient();
  const [tags, setTags] = useState<Tag[]>([]);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("tags").select("*").order("created_at");
      setTags(data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function addTag() {
    if (!newName.trim()) return;
    const { data } = await supabase
      .from("tags")
      .insert({ name: newName.trim(), color: newColor })
      .select()
      .single();
    if (data) {
      setTags([...tags, data]);
      setNewName("");
    }
  }

  async function deleteTag(id: string) {
    await supabase.from("tags").delete().eq("id", id);
    setTags(tags.filter((t) => t.id !== id));
  }

  async function seedDefaults() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const toInsert = DEFAULT_TAGS.map((t) => ({ ...t, user_id: user.id }));
    const { data } = await supabase.from("tags").upsert(toInsert, { onConflict: "user_id,name" }).select();
    if (data) setTags([...tags, ...data.filter((d: Tag) => !tags.some((t) => t.id === d.id))]);
  }

  if (loading) return <div className="py-12 text-center text-text-secondary">Loading...</div>;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Manage Tags</h1>

      {/* Add new tag */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTag()}
          placeholder="New tag name"
          className="input flex-1"
        />
        <div className="flex gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setNewColor(c)}
              className={`h-9 w-9 rounded-lg transition-all ${newColor === c ? "ring-2 ring-white ring-offset-2 ring-offset-background" : ""}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <button onClick={addTag} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">
          Add
        </button>
      </div>

      {/* Tag list */}
      {tags.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-text-secondary">No tags yet.</p>
          <button onClick={seedDefaults} className="mt-3 text-sm text-accent hover:underline">
            Add starter tags
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center justify-between rounded-lg border border-border bg-surface p-3">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full" style={{ backgroundColor: tag.color }} />
                <span className="font-medium">{tag.name}</span>
              </div>
              <button onClick={() => deleteTag(tag.id)} className="text-xs text-text-secondary hover:text-loss">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
