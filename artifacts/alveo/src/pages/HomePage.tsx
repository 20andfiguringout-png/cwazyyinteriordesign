import { useEffect } from "react";
import { Link } from "wouter";
import { UserTypeSelector } from "@/components/UserTypeSelector";
import { HowItWorks } from "@/components/HowItWorks";
import { InspirationGallery, WhyUs } from "@/components/LandingSections";
import { AnimatedClosetHero, ArchitecturalGrid } from "@/components/AnimatedClosetHero";
import { Testimonials } from "@/components/Testimonials";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export default function HomePage() {
  useEffect(() => {
    trackEvent("landing_viewed");
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <section className="relative min-h-screen bg-cream-50 flex flex-col items-center justify-center pt-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] sm:w-[600px] h-[420px] sm:h-[600px] bg-taupe-200/30 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-block text-xs font-medium tracking-widest uppercase text-taupe-400 mb-8 px-4 py-1.5 border border-taupe-200 rounded-full"
          >
            Closet design, made precise
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-serif text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-charcoal-600 leading-[1.05] mb-8"
          >
            Design the closet
            <br />
            <span className="text-taupe-500">you've always imagined</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-base sm:text-lg md:text-xl text-charcoal-400 max-w-xl mx-auto font-light leading-relaxed mb-10"
          >
            Tell us your space and wardrobe — we generate a precision layout, instantly.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/configure"
              className="inline-flex items-center gap-2 bg-charcoal-600 text-white px-8 py-4 rounded-xl text-base font-medium hover:bg-charcoal-500 transition-colors shadow-lg hover:shadow-xl"
            >
              Start Designing
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/gallery"
              className="inline-flex items-center gap-2 text-charcoal-400 hover:text-charcoal-600 text-base font-medium transition-colors"
            >
              Browse gallery
            </Link>
            <Link
              href="/alveo-pitch/"
              className="inline-flex items-center gap-2 text-taupe-500 hover:text-charcoal-600 text-base font-medium transition-colors"
            >
              View pitch deck
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="mt-6 text-xs text-charcoal-300 tracking-wide"
          >
            Free to use · No account needed · Results in under 5 minutes
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="relative z-10 mt-16 sm:mt-20 mb-8"
        >
          <p className="font-serif text-xl sm:text-2xl text-taupe-400 italic">Carved for you.</p>
        </motion.div>

        <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-white to-transparent" />
      </section>

      <section className="py-28 bg-white relative overflow-hidden">
        <ArchitecturalGrid className="absolute inset-0" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-taupe-400 mb-4">
              <Sparkles size={14} />
              Precision Architecture
            </span>
            <h2 className="font-serif text-4xl md:text-5xl text-charcoal-600 mb-4">
              See your closet come to life
            </h2>
            <p className="text-lg text-charcoal-400 max-w-xl mx-auto">
              Watch as we draw your custom elevation — every rod, shelf, and drawer placed with architectural precision.
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 40, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-cream-50 rounded-2xl p-8 md:p-12 border border-cream-200 shadow-xl"
          >
            <AnimatedClosetHero />
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-center mt-10"
          >
            <Link
              href="/configure"
              className="inline-flex items-center gap-2 bg-charcoal-600 text-white px-8 py-4 rounded-xl text-base font-medium hover:bg-charcoal-500 transition-all hover:scale-105 shadow-lg"
            >
              Design Your Own
              <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>
      </section>

      <section id="user-type" className="py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ y: 20 }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 sm:mb-16"
          >
            <span className="text-xs font-medium tracking-widest uppercase text-taupe-400">
              Personalised for you
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-charcoal-600 mt-4 mb-4">
              Who are you designing for?
            </h2>
            <p className="text-base sm:text-lg text-charcoal-400 max-w-xl mx-auto">
              Your path shapes how we ask the questions — and how we build the layout.
            </p>
          </motion.div>
          <UserTypeSelector />
        </div>
      </section>

      <section className="py-28 bg-cream-50 border-t border-cream-200">
        <HowItWorks />
      </section>

      <section className="py-28 bg-white border-t border-cream-100">
        <InspirationGallery />
      </section>

      <section className="py-28 bg-cream-50 border-t border-cream-200">
        <WhyUs />
      </section>

      <Testimonials />

      <section className="py-32 bg-charcoal-600">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial={{ y: 20 }}
            whileInView={{ y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs font-medium tracking-widest uppercase text-cream-300 mb-6">
              Ready to start?
            </p>
            <h2 className="font-serif text-4xl md:text-5xl text-white mb-6 leading-tight">
              Your dream closet is
              <br />5 minutes away
            </h2>
            <p className="text-gray-400 text-lg mb-10 max-w-md mx-auto">
              No sign-up, no paywall — just a layout built around your life.
            </p>
            <Link
              href="/configure"
              className="inline-flex items-center gap-2 bg-cream-100 text-charcoal-600 px-10 py-4 rounded-xl text-base font-medium hover:bg-white transition-colors"
            >
              Start for free
              <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
