import { useEffect, useState } from "react";
import { type BlogPost } from "@/components/BlogModal";
import { generateSlug } from "@/lib/slug";
import func2url from "../../backend/func2url.json";
import bundledPosts from "@/data/blog-posts.json";

export const BLOG_URL = "https://functions.poehali.dev/f6938906-b3c4-4bf7-b1f9-96560e19ef1b";

export const BUNDLED_POSTS = bundledPosts as BlogPost[];

const SYNC_URL = (func2url as Record<string, string>)["uchispro-sync"];
let syncTicked = false;

function tickSync() {
  if (syncTicked || !SYNC_URL) return;
  syncTicked = true;
  fetch(`${SYNC_URL}?action=tick`).catch(() => undefined);
}

export const blogPath = (title: string) => `/blog/${generateSlug(title)}`;

function mergePosts(live: BlogPost[]): BlogPost[] {
  const seen = new Set(live.map((p) => generateSlug(p.title)));
  const extra = BUNDLED_POSTS.filter((p) => !seen.has(generateSlug(p.title)));
  return [...live, ...extra].sort((a, b) =>
    (b.created_at || "").localeCompare(a.created_at || ""),
  );
}

let postsPromise: Promise<BlogPost[]> | null = null;

/** Для серверной отрисовки: свежий запрос без общего кэша. reachable=false — источник не ответил. */
export async function findPostBySlug(slug: string): Promise<{ post: BlogPost | null; reachable: boolean }> {
  const bundled = BUNDLED_POSTS.find((p) => generateSlug(p.title) === slug) || null;
  try {
    const r = await fetch(`${BLOG_URL}/`, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return { post: bundled, reachable: false };
    const data = await r.json();
    const live: BlogPost[] = data.posts || [];
    const found = live.find((p) => generateSlug(p.title) === slug) || bundled;
    return { post: found, reachable: true };
  } catch {
    return { post: bundled, reachable: false };
  }
}

export function loadBlogPosts(): Promise<BlogPost[]> {
  if (!postsPromise) {
    postsPromise = fetch(`${BLOG_URL}/`, { signal: AbortSignal.timeout(8000) })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data) => {
        const live: BlogPost[] = data.posts || [];
        return live.length ? mergePosts(live) : BUNDLED_POSTS;
      })
      .catch(() => {
        postsPromise = null;
        return BUNDLED_POSTS;
      });
  }
  return postsPromise;
}

export function useBlogPosts() {
  const [posts, setPosts] = useState<BlogPost[]>(BUNDLED_POSTS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    tickSync();
    let alive = true;
    setLoading(true);
    loadBlogPosts()
      .then((list) => alive && setPosts(list))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return { posts, loading };
}