import type { ReactNode } from "react";

// Замена react-helmet-async: React 19 сам поднимает <title>, <meta> и <link> в <head>,
// в том числе при серверном рендере.
export function Helmet({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}
