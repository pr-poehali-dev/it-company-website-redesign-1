import TechnologiesSection from "@/components/TechnologiesSection";
import BlogSection from "@/components/BlogSection";
import FaqSection from "@/components/FaqSection";
import ContactsSection from "@/components/ContactsSection";
import AudienceSection from "@/components/AudienceSection";
import ProblemSection from "@/components/ProblemSection";
import ProcessSection from "@/components/ProcessSection";
import FinalCtaSection from "@/components/FinalCtaSection";

interface BottomSectionsProps {
  scrollTo: (href: string) => void;
}

export default function BottomSections({ scrollTo }: BottomSectionsProps) {
  return (
    <>
      <ProblemSection scrollTo={scrollTo} />
      <AudienceSection scrollTo={scrollTo} />
      <ProcessSection scrollTo={scrollTo} />
      <TechnologiesSection scrollTo={scrollTo} />
      <BlogSection />
      <FaqSection />
      <FinalCtaSection scrollTo={scrollTo} />
      <ContactsSection scrollTo={scrollTo} />
    </>
  );
}
