"use client";

import { createContext, useContext, useState, useEffect } from "react";

type ToastType = "success" | "error" | "info";

type Toast = {
  message: string;
  type: ToastType;
};

type ToastContextType = {
  showToast: (message: string, type: ToastType) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [toast]);

  const getToastStyles = () => {
    if (!toast) return "";

    const baseStyles =
      "fixed top-4 right-4 z-[9999] px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slideIn";

    switch (toast.type) {
      case "success":
        return `${baseStyles} bg-green-500 text-white`;
      case "error":
        return `${baseStyles} bg-red-500 text-white`;
      case "info":
        return `${baseStyles} bg-blue-500 text-white`;
      default:
        return baseStyles;
    }
  };

  const getIcon = () => {
    if (!toast) return null;

    switch (toast.type) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "info":
        return "ℹ️";
      default:
        return null;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className={getToastStyles()}>
          <span className="text-lg">{getIcon()}</span>
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </ToastContext.Provider>
  );
}
