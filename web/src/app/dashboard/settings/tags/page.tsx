"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_TAGS } from "@/lib/constants";
import { Plus, Trash2, Tag } from "lucide-react";
import { cn } from "@/lib/utils/format";
import type { Tag as TagType } from "@/types";

const COLORS = ["#6366f1", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

export default function TagsSettingsPage() {
  const supabase = createClient();
  const [tags, setTags] = useState<TagType[]>([]);
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
    if (data) setTags([...tags, ...data.filter((d: TagType) => !tags.some((t) => t.id === d.id))]);
  }

  if (loading) return <div className="py-12 text-center text-sm text-text-secondary">Loading...</div>;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Manage Tags</h1>

      {/* Add new tag */}
      <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
        <label className="text-xs font-medium uppercase tracking-wider text-text-secondary">New Tag</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTag()}
            placeholder="Tag name"
            className="input flex-1"
          />
          <button
            onClick={addTag}
            disabled={!newName.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
        <div className="flex gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setNewColor(c)}
              className={cn(
                "h-7 w-7 rounded-lg transition-all",
                newColor === c ? "ring-2 ring-white ring-offset-2 ring-offset-background" : "opacity-60 hover:opacity-100"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Tag list */}
      {tags.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface p-12 text-center">
          <Tag className="mb-3 h-8 w-8 text-text-secondary/40" />
          <p className="text-sm text-text-secondary">No tags yet.</p>
          <button onClick={seedDefaults} className="mt-3 text-sm text-accent transition-colors hover:text-accent-hover">
            Add starter tags
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:bg-surface-hover">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
                <span className="text-sm font-medium text-text-primary">{tag.name}</span>
              </div>
              <button
                onClick={() => deleteTag(tag.id)}
                className="text-text-secondary/40 transition-colors hover:text-loss"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
