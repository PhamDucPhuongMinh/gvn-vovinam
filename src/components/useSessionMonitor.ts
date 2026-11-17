"use client";
import { useCallback, useEffect, useRef } from "react";
import { useToast } from "./ToastProvider";
export function sessionExpired() {
  window.location.replace("/login?reason=session-expired");
}
export default function useSessionMonitor(onExpire: () => void) {
  const notify = useToast();
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;
  const request = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(false);
  const check = useCallback((): Promise<boolean> => {
    if (request.current) return request.current;
    request.current = (async () => {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        });
        if (!mounted.current) return false;
        if (response.status === 401) {
          expireRef.current();
          sessionExpired();
          return false;
        }
        if (!response.ok)
          throw new Error(
            "Không kiểm tra được phiên đăng nhập. Vui lòng thử lại.",
          );
        const data = await response.json();
        clearTimeout(timer.current);
        timer.current = setTimeout(
          () => {
            void check();
          },
          Math.max(1000, data.expiresAt - data.serverTime),
        );
        return true;
      } catch {
        if (mounted.current)
          notify(
            "Không kiểm tra được phiên đăng nhập. Kiểm tra kết nối mạng và thử lại.",
          );
        return false;
      } finally {
        request.current = null;
      }
    })();
    return request.current;
  }, [notify]);
  useEffect(() => {
    mounted.current = true;
    const resume = () => {
      if (document.visibilityState === "visible") void check();
    };
    void check();
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", resume);
    window.addEventListener("pageshow", resume);
    window.addEventListener("online", resume);
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("focus", resume);
      window.removeEventListener("pageshow", resume);
      window.removeEventListener("online", resume);
    };
  }, [check]);
  return check;
}
