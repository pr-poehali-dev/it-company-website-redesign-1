interface AdminLoginProps {
  loginForm: { username: string; password: string };
  loginError: string;
  loginLoading: boolean;
  onChangeForm: (field: "username" | "password", value: string) => void;
  onLogin: () => void;
}

export default function AdminLogin({ loginForm, loginError, loginLoading, onChangeForm, onLogin }: AdminLoginProps) {
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
              onKeyDown={e => e.key === "Enter" && onLogin()}
              placeholder="admin"
              className="w-full glass border border-white/10 focus:border-violet-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-all bg-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-2">Пароль</label>
            <input
              type="password"
              value={loginForm.password}
              onChange={e => onChangeForm("password", e.target.value)}
              onKeyDown={e => e.key === "Enter" && onLogin()}
              placeholder="••••••••"
              className="w-full glass border border-white/10 focus:border-violet-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-all bg-transparent text-sm"
            />
          </div>
          {loginError && <p className="text-red-400 text-sm text-center">{loginError}</p>}
          <button
            onClick={onLogin}
            disabled={loginLoading}
            className="btn-gradient w-full py-3 rounded-2xl font-semibold text-white text-sm disabled:opacity-50"
          >
            {loginLoading ? "Входим..." : "Войти"}
          </button>
        </div>
      </div>
    </div>
  );
}
