import { createContext, useCallback, useContext } from "react";

/**
 * The workspace's URL prefix: "/app" for the real console, "/demo" for the
 * in-browser demo. Components write paths as "/app/..." and map them here.
 */
export const WorkspaceBaseContext = createContext("/app");

export function useAppPath() {
  const base = useContext(WorkspaceBaseContext);
  return useCallback((path: string) => path.replace(/^\/app(?=\/|$|\?|#)/, base), [base]);
}

export function useWorkspaceBase() {
  return useContext(WorkspaceBaseContext);
}

/** Present only inside the /demo workspace: actions that replace real network side effects. */
export type DemoActions = { simulate: (url: string) => void };
export const DemoContext = createContext<DemoActions | null>(null);
export function useDemo() {
  return useContext(DemoContext);
}
