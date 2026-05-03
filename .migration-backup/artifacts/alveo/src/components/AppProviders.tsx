import { ThemeProvider } from "@/components/ThemeProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
