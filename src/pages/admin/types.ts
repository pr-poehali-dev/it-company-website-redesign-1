export const AUTH_URL = "https://functions.poehali.dev/6f798d48-8951-473b-bde6-f8121977ddf4";
export const BLOG_URL = "https://functions.poehali.dev/f6938906-b3c4-4bf7-b1f9-96560e19ef1b";
export const UPLOAD_URL = "https://functions.poehali.dev/7c0f1ee4-8a7f-469a-a176-8d7654e6031e";
export const CONTACT_REQUESTS_URL = "https://functions.poehali.dev/42921a14-b374-412d-beaf-5b0eea6cc1da";

export const TAGS = ["AI/ML", "DevOps", "Frontend", "Backend", "Безопасность", "Аналитика"];
export const TAG_COLORS: Record<string, string> = {
  "AI/ML": "from-violet-500 to-purple-600",
  "DevOps": "from-cyan-500 to-blue-600",
  "Frontend": "from-pink-500 to-rose-600",
  "Backend": "from-emerald-500 to-teal-600",
  "Безопасность": "from-orange-500 to-amber-600",
  "Аналитика": "from-indigo-500 to-blue-600",
};

export interface Post {
  id: number;
  title: string;
  tag: string;
  read: string;
  color: string;
  content: string;
  published: boolean;
  date: string;
  cover_url?: string | null;
}

export type PostForm = Omit<Post, "id" | "date">;

export const emptyPost = (): PostForm => ({
  title: "",
  tag: "AI/ML",
  read: "5 мин",
  color: TAG_COLORS["AI/ML"],
  content: "",
  published: false,
  cover_url: null,
});

export function renderMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold text-white mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-white mt-8 mb-3">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-white mt-8 mb-4">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-white/80 italic">$1</em>')
    .replace(/^- (.+)$/gm, '<li class="text-white/70 ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="text-white/70 ml-4 list-decimal">$2</li>')
    .replace(/`(.+?)`/g, '<code class="bg-white/10 text-violet-300 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    .replace(/\n\n/g, '</p><p class="text-white/60 leading-relaxed mb-4">')
    .replace(/^(?!<[h|l|p])(.+)$/gm, '<p class="text-white/60 leading-relaxed mb-4">$1</p>');
}