import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Unhandled render error:", error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-900 font-sans p-8 text-center gap-4">
          <div className="h-14 w-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center ring-8 ring-rose-50/50">
            <AlertTriangle size={28} />
          </div>
          <h1 className="font-display font-black text-lg tracking-tight">Something went wrong</h1>
          <p className="text-sm text-slate-500 max-w-xs">
            SubsTracker Hub hit an unexpected error. Your data is safe — reloading the app should fix this.
          </p>
          <button
            onClick={this.handleReload}
            className="mt-2 py-3 px-6 bg-slate-900 text-white font-sans text-sm font-bold rounded-xl shadow-lg hover:bg-slate-800 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw size={16} />
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
