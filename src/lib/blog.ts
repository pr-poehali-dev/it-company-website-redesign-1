import { useEffect, useState } from "react";
import { type BlogPost } from "@/components/BlogModal";
import { generateSlug } from "@/lib/slug";
import func2url from "../../backend/func2url.json";

export const BLOG_URL = "https://functions.poehali.dev/f6938906-b3c4-4bf7-b1f9-96560e19ef1b";

const SYNC_URL = (func2url as Record<string, string>)["uchispro-sync"];
let syncTicked = false;

function tickSync() {
  if (syncTicked || !SYNC_URL) return;
  syncTicked = true;
  fetch(`${SYNC_URL}?action=tick`).catch(() => undefined);
}

export const blogPath = (title: string) => `/blog/${generateSlug(title)}`;

export function useBlogPosts() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tickSync();
    fetch(`${BLOG_URL}/`)
      .then((r) => r.json())
      .then((data) => setPosts(data.posts || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return { posts, loading };
}