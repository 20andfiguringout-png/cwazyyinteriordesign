import { useEffect } from "react";

const faqs = [
  {
    q: "How should I measure my closet?",
    a: "Measure clear wall width, floor-to-ceiling height, and usable depth from wall to front obstruction. For walk-ins, measure full room width and depth wall-to-wall.",
  },
  {
    q: "What closet types do the shapes represent?",
    a: "Reach-in is a single fitted wall. Walk-in Single is one fitted wall in a room. L-shape uses two walls, U-shape uses three, Corridor uses two opposing walls, and Island adds a center unit.",
  },
  {
    q: "Can I build directly from these drawings?",
    a: "The layouts are planning-grade and include dimensions, cut-list guidance, and storage allocation. Always verify measurements onsite before fabrication.",
  },
  {
    q: "How do I download a PDF?",
    a: "Use Export in the preview panel. Alveo generates a real downloadable PDF file directly in your browser, including wall elevations.",
  },
  {
    q: "Does Alveo support metric units?",
    a: "Yes. Toggle Units in the configurator to Metric. Inputs accept cm or mm while Alveo stores internal calculations in inches for renderer consistency.",
  },
  {
    q: "Is my data stored on your servers?",
    a: "No account is required. Drafts and saved designs are stored in your browser local storage unless you explicitly share a link.",
  },
  {
    q: "What are current limitations?",
    a: "Cost and cut-list outputs are indicative and should be validated with local suppliers, hardware specs, and installer standards before purchase.",
  },
];

export default function FAQPage() {
  useEffect(() => {
    document.title = "FAQ | Alvéo";
  }, []);

  return (
    <main className="min-h-screen pt-16 bg-white">
      <section className="py-16 bg-cream-50 border-b border-cream-200">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-xs uppercase tracking-widest text-taupe-400 font-medium">Help center</p>
          <h1 className="font-serif text-5xl text-charcoal-600 mt-3">Frequently asked questions</h1>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-4xl mx-auto px-6 space-y-3">
          {faqs.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-cream-200 bg-cream-50 open:bg-white open:shadow-sm"
            >
              <summary className="list-none cursor-pointer px-5 py-4 flex items-center justify-between text-charcoal-600 font-medium">
                <span>{item.q}</span>
                <span className="text-charcoal-400 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="px-5 pb-5 text-sm text-charcoal-500 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
