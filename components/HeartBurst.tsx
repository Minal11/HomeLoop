"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import Heart from "@/components/Heart";

type Burst = {
  id: string;
  x: number;
  y: number;
};

type HeartBurstContextValue = {
  burstAt: (x: number, y: number) => void;
};

const HeartBurstContext = createContext<HeartBurstContextValue | null>(null);

function subscribe() {
  return () => {};
}

export function useHeartBurst(): HeartBurstContextValue {
  const value = useContext(HeartBurstContext);
  if (!value) {
    return {
      burstAt: () => {},
    };
  }
  return value;
}

export function HeartBurstProvider({ children }: { children: ReactNode }) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const reactId = useId();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const burstAt = useCallback(
    (x: number, y: number) => {
      const id = `${reactId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setBursts((current) => [...current, { id, x, y }]);
      window.setTimeout(() => {
        setBursts((current) => current.filter((burst) => burst.id !== id));
      }, 900);
    },
    [reactId],
  );

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const action = target.closest("button, a[href], [role='button']");
      if (!(action instanceof HTMLElement)) {
        return;
      }

      if (action.getAttribute("aria-disabled") === "true") {
        return;
      }
      if (action instanceof HTMLButtonElement && action.disabled) {
        return;
      }
      if (action.hasAttribute("disabled")) {
        return;
      }

      if (action.dataset.heartBurst === "off") {
        return;
      }

      burstAt(event.clientX, event.clientY);
    }

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [burstAt]);

  const value = useMemo(() => ({ burstAt }), [burstAt]);

  return (
    <HeartBurstContext.Provider value={value}>
      {children}
      {mounted
        ? createPortal(
            <div
              aria-hidden="true"
              className="pointer-events-none fixed inset-0 z-[400] overflow-visible"
            >
              {bursts.map((burst) => (
                <span
                  key={burst.id}
                  className="heart-burst-float absolute"
                  style={{ left: burst.x, top: burst.y }}
                >
                  <Heart size={16} className="text-accent drop-shadow-sm" />
                </span>
              ))}
            </div>,
            document.body,
          )
        : null}
    </HeartBurstContext.Provider>
  );
}
