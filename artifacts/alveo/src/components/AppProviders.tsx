import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/lib/AuthContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </AuthProvider>
  );
}
