import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function SignupPage() {
  const { signup, loading } = useAuth();
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ email: "", password: "", confirm: "", firstName: "", lastName: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((v) => ({ ...v, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords don't match");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    try {
      await signup(form.email, form.password, form.firstName || undefined, form.lastName || undefined);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    }
  };

  return (
    <main className="min-h-screen bg-cream-50 flex items-center justify-center px-4 pt-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl text-charcoal-600 mb-2">Create your account</h1>
          <p className="text-charcoal-400">Start designing beautiful closets with Alvéo</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-cream-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal-600 mb-1.5">First name</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={set("firstName")}
                  placeholder="Jane"
                  className="w-full px-4 py-3 border border-cream-300 rounded-lg text-charcoal-600 placeholder-charcoal-300 focus:outline-none focus:ring-2 focus:ring-taupe-300 focus:border-taupe-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-600 mb-1.5">Last name</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={set("lastName")}
                  placeholder="Smith"
                  className="w-full px-4 py-3 border border-cream-300 rounded-lg text-charcoal-600 placeholder-charcoal-300 focus:outline-none focus:ring-2 focus:ring-taupe-300 focus:border-taupe-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal-600 mb-1.5">Email address</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={set("email")}
                placeholder="designer@studio.com"
                className="w-full px-4 py-3 border border-cream-300 rounded-lg text-charcoal-600 placeholder-charcoal-300 focus:outline-none focus:ring-2 focus:ring-taupe-300 focus:border-taupe-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal-600 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={set("password")}
                  placeholder="Min. 8 characters"
                  className="w-full px-4 py-3 pr-12 border border-cream-300 rounded-lg text-charcoal-600 placeholder-charcoal-300 focus:outline-none focus:ring-2 focus:ring-taupe-300 focus:border-taupe-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-600"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal-600 mb-1.5">Confirm password</label>
              <input
                type={showPw ? "text" : "password"}
                required
                value={form.confirm}
                onChange={set("confirm")}
                placeholder="Repeat password"
                className="w-full px-4 py-3 border border-cream-300 rounded-lg text-charcoal-600 placeholder-charcoal-300 focus:outline-none focus:ring-2 focus:ring-taupe-300 focus:border-taupe-400"
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-charcoal-600 text-white py-3 rounded-lg font-medium hover:bg-charcoal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <UserPlus size={18} />
              )}
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm text-charcoal-400 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-taupe-600 hover:text-taupe-700 font-medium underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-charcoal-400 mt-6">
          <Link href="/" className="hover:text-charcoal-600 transition-colors">← Back to home</Link>
        </p>
      </motion.div>
    </main>
  );
}
