import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || "Unknown error" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App crashed:", error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, message: "" });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "#0f0a1e",
            color: "#fff",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: 420 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
              Что-то пошло не так
            </h1>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 15, marginBottom: 20, lineHeight: 1.5 }}>
              Страница не смогла загрузиться. Попробуйте обновить — обычно это помогает.
            </p>
            <button
              onClick={this.handleReload}
              style={{
                background: "#7c3aed",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "12px 28px",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Обновить страницу
            </button>
            {this.state.message && (
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 20, wordBreak: "break-word" }}>
                {this.state.message}
              </p>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
