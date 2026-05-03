import { useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const values = [
  {
    title: "Function over fashion",
    body: "Layouts that actually work for how you live — not a showroom nobody uses.",
  },
  {
    title: "No two closets alike",
    body: "Every configuration starts from your real wardrobe, not someone else's template.",
  },
  {
    title: "Transparent by default",
    body: "See exactly what fits, what doesn't, and why. Industry-grade layout logic — made accessible.",
  },
];

const timeline = [
  { year: "Step 1", label: "Tell us your space", detail: "Dimensions, shape, constraints." },
  { year: "Step 2", label: "Catalog your wardrobe", detail: "What you own, down to shoe types." },
  { year: "Step 3", label: "Choose your style", detail: "From minimal to glam — materials, finishes." },
  { year: "Step 4", label: "Get your layout", detail: "A precision elevation, ready to build or share." },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fadeUp: any = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: "easeOut" },
  }),
};

export default function AboutPage() {
  useEffect(() => {
    document.title = "About | Alvéo";
  }, []);

  return (
    <main className="min-h-screen bg-white pt-16">
      <section className="relative py-24 bg-cream-50 border-b border-cream-200 overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block text-sm uppercase tracking-widest text-taupe-400 font-medium mb-6"
          >
            About Alvéo
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-serif text-5xl md:text-7xl text-charcoal-600 mb-6 leading-tight"
          >
            Carved for you.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-charcoal-400 max-w-2xl mx-auto leading-relaxed"
          >
            <strong className="text-charcoal-500">Alvéo</strong> comes from the Latin{" "}
            <em className="text-taupe-500">alveus</em> — a natural hollow, a carved-out vessel. It represents a space
            shaped to hold exactly what belongs inside it. That&apos;s what we build: closet layouts designed around
            <em> your</em> wardrobe, not a catalog average.
          </motion.p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
      </section>

      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            custom={0}
            variants={fadeUp}
            className="font-serif text-4xl text-charcoal-600 text-center mb-14"
          >
            What we believe
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-10">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                custom={i + 1}
                variants={fadeUp}
                className="text-center md:text-left"
              >
                <h3 className="font-serif text-xl text-charcoal-600 mb-3">{v.title}</h3>
                <p className="text-charcoal-400 leading-relaxed">{v.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-cream-50 border-t border-b border-cream-200">
        <div className="max-w-3xl mx-auto px-6">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            custom={0}
            variants={fadeUp}
            className="font-serif text-4xl text-charcoal-600 text-center mb-16"
          >
            From chaos to clarity
          </motion.h2>

          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-taupe-200 hidden md:block" />
            <div className="space-y-10">
              {timeline.map((step, i) => (
                <motion.div
                  key={step.year}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  custom={i}
                  variants={fadeUp}
                  className="flex items-start gap-6"
                >
                  <div className="shrink-0 w-12 h-12 rounded-full bg-charcoal-600 text-white flex items-center justify-center text-sm font-bold z-10">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-taupe-400 mb-1">{step.year}</p>
                    <h3 className="font-serif text-lg text-charcoal-600 mb-1">{step.label}</h3>
                    <p className="text-charcoal-400 text-sm">{step.detail}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            custom={0}
            variants={fadeUp}
            className="font-serif text-4xl text-charcoal-600 mb-6"
          >
            Built with care
          </motion.h2>
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            custom={1}
            variants={fadeUp}
            className="text-charcoal-400 leading-relaxed mb-10 max-w-xl mx-auto"
          >
            Alvéo runs a proprietary layout engine that balances zone allocation, rod heights, shelf spacing,
            and drawer stacking against your actual wardrobe profile. The result is a precision SVG elevation
            drawing — the same output format professional closet designers use — generated in your browser
            in milliseconds.
          </motion.p>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            custom={2}
            variants={fadeUp}
            className="flex flex-wrap justify-center gap-3"
          >
            {["React", "TypeScript", "Tailwind CSS", "Framer Motion", "Custom SVG Engine"].map((tech) => (
              <span
                key={tech}
                className="px-4 py-1.5 rounded-full bg-cream-100 text-xs font-medium text-charcoal-500 tracking-wide"
              >
                {tech}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-24 bg-charcoal-600">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-serif text-5xl text-white mb-6">Ready to see what fits?</h2>
          <p className="text-gray-300 text-lg mb-10 max-w-lg mx-auto">
            No sign-up, no paywall — just your ideal closet layout in under 5 minutes.
          </p>
          <Link
            href="/configure"
            className="inline-flex items-center gap-2 bg-cream-200 text-charcoal-600 px-10 py-4 rounded-xl text-base font-medium hover:bg-cream-300 transition-colors"
          >
            Start configuring
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
