import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Browse closet layout inspiration by style and size.",
  openGraph: {
    title: "Alveo Gallery",
    description: "Explore curated closet layout inspiration and floor-planning ideas.",
    images: ["/og-closet.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Alveo Gallery",
    description: "Explore curated closet layout inspiration and floor-planning ideas.",
    images: ["/og-closet.svg"],
  },
};

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
