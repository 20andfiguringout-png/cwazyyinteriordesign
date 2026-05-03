import { motion } from "framer-motion";

const testimonials = [
  {
    quote:
      "We used Alveo to redesign our primary closet and finally stopped guessing shelf heights. The plan was clear enough for our carpenter to execute in one pass.",
    name: "Nadia R.",
    role: "Homeowner",
    location: "Bengaluru, IN",
  },
  {
    quote:
      "As a renter I needed a reversible layout. The reach-in setup gave me way more hanging capacity without any permanent changes.",
    name: "Maya T.",
    role: "Renter",
    location: "Melbourne, AU",
  },
  {
    quote:
      "I now send Alveo previews to clients before site visits. It cuts revision loops and helps them decide finishes much faster.",
    name: "Caroline M.",
    role: "Interior Designer",
    location: "London, UK",
  },
];

export function Testimonials() {
  return (
    <section className="py-24 bg-white border-t border-cream-200">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-xs font-medium tracking-widest uppercase text-taupe-400">
            Early access users
          </p>
          <h2 className="font-serif text-4xl md:text-5xl text-charcoal-600 mt-3">
            Trusted by homeowners and designers
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, index) => (
            <motion.article
              key={t.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: index * 0.08, duration: 0.4 }}
              className="rounded-2xl border border-cream-200 bg-cream-50 p-6"
            >
              <p className="text-charcoal-500 leading-relaxed text-sm">“{t.quote}”</p>
              <p className="mt-5 text-sm font-semibold text-charcoal-600">{t.name}</p>
              <p className="text-xs text-charcoal-400">{t.role} · {t.location}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
