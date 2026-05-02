import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about the design philosophy behind Alveo.",
  openGraph: {
    title: "About Alveo",
    description: "Precision closet planning designed around real wardrobes.",
    images: ["/og-closet.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Alveo",
    description: "Precision closet planning designed around real wardrobes.",
    images: ["/og-closet.svg"],
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
