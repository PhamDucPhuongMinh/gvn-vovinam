"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
type ToastType = "error" | "success";
const ToastContext = createContext<(message: string, type?: ToastType) => void>(
  () => {},
);
export const useToast = () => useContext(ToastContext);
export function useErrorToast(error: string) {
  const notify = useToast();
  useEffect(() => {
    if (error) notify(error, "error");
  }, [error, notify]);
}
export default function ToastProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<
    { id: number; message: string; type: ToastType }[]
  >([]);
  const next = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const notify = useCallback((message: string, type: ToastType = "error") => {
    if (!message) return;
    const id = ++next.current;
    setItems((old) =>
      [
        ...old.filter((item) => item.message !== message),
        { id, message, type },
      ].slice(-4),
    );
    const timer = setTimeout(
      () => {
        setItems((old) => old.filter((item) => item.id !== id));
        timers.current.delete(timer);
      },
      type === "error" ? 10000 : 5000,
    );
    timers.current.add(timer);
  }, []);
  useEffect(() => {
    setMounted(true);
    function invalid(event: Event) {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
      )
        notify(target.validationMessage);
    }
    document.addEventListener("invalid", invalid, true);
    const activeTimers = timers.current;
    return () => {
      document.removeEventListener("invalid", invalid, true);
      activeTimers.forEach(clearTimeout);
    };
  }, [notify]);
  return (
    <ToastContext.Provider value={notify}>
      {children}
      {mounted &&
        createPortal(
          <div className="toast-stack" aria-label="Thông báo">
            {items.map((item) => (
              <div
                key={item.id}
                className={`app-toast ${item.type}`}
                role={item.type === "error" ? "alert" : "status"}
              >
                <span>{item.message}</span>
                <button
                  type="button"
                  aria-label="Đóng thông báo"
                  onClick={() =>
                    setItems((old) =>
                      old.filter((value) => value.id !== item.id),
                    )
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
