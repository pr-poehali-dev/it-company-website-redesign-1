import { useState } from "react";
import Icon from "@/components/ui/icon";

interface AdminLoginProps {
  loginForm: { username: string; password: string };
  loginError: string;
  loginLoading: boolean;
  onChangeForm: (field: "username" | "password", value: string) => void;
  onLogin: (remember: boolean) => void;
}

export default function AdminLogin({ loginForm, loginError, loginLoading, onChangeForm, onLogin }: AdminLoginProps) {
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-[#080812] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl btn-gradient flex items-center justify-center mx-auto mb-4">
            <span className="font-oswald font-bold text-xl text-white">МЛ</span>
          </div>
          <h1 className="font-oswald text-2xl font-bold gradient-text">Панель администратора</h1>
          <p className="text-white/40 text-sm mt-1">МАТ-Лабс</p>
        </div>
        <div className="glass neon-border rounded-3xl p-6 space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-2">Логин</label>
            <input
              type="text"
              value={loginForm.username}
              onChange={e => onChangeForm("username", e.target.value)}
              onKeyDown={e => e.key === "Enter" && onLogin(remember)}
              placeholder="admin"
              autoComplete="username"
              className="w-full glass border border-white/10 focus:border-violet-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-all bg-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-2">Пароль</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={loginForm.password}
                onChange={e => onChangeForm("password", e.target.value)}
                onKeyDown={e => e.key === "Enter" && onLogin(remember)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full glass border border-white/10 focus:border-violet-500/50 rounded-xl px-4 py-3 pr-11 text-white placeholder-white/30 outline-none transition-all bg-transparent text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
              >
                <Icon name={showPassword ? "EyeOff" : "Eye"} size={16} />
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none group">
            <div
              onClick={() => setRemember(v => !v)}
              className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                remember
                  ? "bg-violet-600 border-violet-500"
                  : "bg-white/5 border-white/20 group-hover:border-white/40"
              }`}
            >
              {remember && <Icon name="Check" size={10} className="text-white" />}
            </div>
            <span className="text-sm text-white/50 group-hover:text-white/70 transition-colors">
              Не выходить 72 часа
            </span>
          </label>

          {loginError && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <Icon name="AlertCircle" size={14} />
              {loginError}
            </div>
          )}

          <button
            onClick={() => onLogin(remember)}
            disabled={loginLoading || !loginForm.username || !loginForm.password}
            className="btn-gradient w-full py-3 rounded-2xl font-semibold text-white text-sm disabled:opacity-50 transition-all"
          >
            {loginLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Icon name="Loader2" size={14} className="animate-spin" />
                Входим...
              </span>
            ) : "Войти"}
          </button>
        </div>
      </div>
    </div>
  );
}
