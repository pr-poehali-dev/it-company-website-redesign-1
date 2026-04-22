import TechnologiesSection from "@/components/TechnologiesSection";
import BlogSection from "@/components/BlogSection";
import FaqSection from "@/components/FaqSection";
import ContactsSection from "@/components/ContactsSection";

interface BottomSectionsProps {
  scrollTo: (href: string) => void;
}

export default function BottomSections({ scrollTo }: BottomSectionsProps) {
  return (
    <>
      <TechnologiesSection scrollTo={scrollTo} />
      <BlogSection />
      <FaqSection />
      <ContactsSection scrollTo={scrollTo} />
    </>
  );
}
