import { useEffect } from "react";
import Icon from "@/components/ui/icon";

export interface BlogPost {
  title: string;
  date: string;
  tag: string;
  read: string;
  color: string;
  content?: string;
  cover_url?: string | null;
}

interface BlogModalProps {
  post: BlogPost;
  onClose: () => void;
}

export default function BlogModal({ post, onClose }: BlogModalProps) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const lines = post.content?.split("\n") ?? [];

  function renderLine(text: string) {
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
      if (part.startsWith("*") && part.endsWith("*"))
        return <em key={j} className="text-white/80 italic">{part.slice(1, -1)}</em>;
      if (part.startsWith("`") && part.endsWith("`"))
        return <code key={j} className="bg-white/10 text-violet-300 px-1.5 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
      return part;
    });
  }

  function renderContent() {
    return lines.map((line, i) => {
      if (line.startsWith("### "))
        return <h3 key={i} className="font-oswald text-lg font-bold text-white mt-6 mb-2">{line.slice(4)}</h3>;
      if (line.startsWith("## "))
        return <h2 key={i} className="font-oswald text-xl font-bold text-white mt-8 mb-3">{line.slice(3)}</h2>;
      if (line.startsWith("# "))
        return <h1 key={i} className="font-oswald text-2xl font-bold text-white mt-8 mb-4">{line.slice(2)}</h1>;
      if (line.startsWith("- ") || line.startsWith("* "))
        return <li key={i} className="text-white/70 text-sm leading-relaxed ml-4 list-disc">{renderLine(line.slice(2))}</li>;
      if (/^\d+\./.test(line))
        return <li key={i} className="text-white/70 text-sm leading-relaxed ml-4 list-decimal">{renderLine(line.replace(/^\d+\.\s/, ""))}</li>;
      if (line.trim() === "")
        return <div key={i} className="h-2" />;
      return <p key={i} className="text-white/70 text-sm leading-relaxed">{renderLine(line)}</p>;
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl max-h-[90vh] glass neon-border rounded-3xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {post.cover_url ? (
          <div className="relative h-48 flex-shrink-0 overflow-hidden">
            <img src={post.cover_url} alt={post.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-9 h-9 bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl flex items-center justify-center hover:bg-black/60 transition-all"
            >
              <Icon name="X" size={16} className="text-white/80" />
            </button>
            <div className="absolute bottom-4 left-6 right-16">
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-xs px-3 py-1 rounded-full bg-gradient-to-r ${post.color} text-white`}>{post.tag}</span>
                <span className="text-white/60 text-xs">{post.read} чтения</span>
              </div>
              <h2 className="font-oswald text-xl md:text-2xl font-bold text-white leading-snug">{post.title}</h2>
              <div className="text-white/40 text-xs mt-1">{post.date}</div>
            </div>
          </div>
        ) : (
          <>
            <div className={`h-1.5 w-full bg-gradient-to-r ${post.color} flex-shrink-0`} />
            <div className="flex items-start justify-between gap-4 p-6 pb-4 flex-shrink-0">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`text-xs px-3 py-1 rounded-full bg-gradient-to-r ${post.color} text-white`}>{post.tag}</span>
                  <span className="text-white/40 text-xs">{post.read} чтения</span>
                </div>
                <h2 className="font-oswald text-xl md:text-2xl font-bold text-white leading-snug">{post.title}</h2>
                <div className="text-white/40 text-xs mt-2">{post.date}</div>
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 w-9 h-9 glass border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all"
              >
                <Icon name="X" size={16} className="text-white/60" />
              </button>
            </div>
          </>
        )}

        <div className="overflow-y-auto px-6 pb-6 flex-1">
          <div className="space-y-1">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}