import TechnologiesSection from "@/components/TechnologiesSection";
import BlogSection from "@/components/BlogSection";
import FaqSection from "@/components/FaqSection";
import ContactsSection from "@/components/ContactsSection";
import AudienceSection from "@/components/AudienceSection";
import ProblemSection from "@/components/ProblemSection";
import ProcessSection from "@/components/ProcessSection";
import FinalCtaSection from "@/components/FinalCtaSection";
import PartnersSection from "@/components/PartnersSection";
import CalculatorSection from "@/components/CalculatorSection";

interface BottomSectionsProps {
  scrollTo: (href: string) => void;
}

export default function BottomSections({ scrollTo }: BottomSectionsProps) {
  return (
    <>
      <CalculatorSection scrollTo={scrollTo} />
      <ProblemSection scrollTo={scrollTo} />
      <AudienceSection scrollTo={scrollTo} />
      <ProcessSection scrollTo={scrollTo} />
      <TechnologiesSection scrollTo={scrollTo} />
      <BlogSection />
      <FaqSection />
      <PartnersSection />
      <FinalCtaSection scrollTo={scrollTo} />
      <ContactsSection scrollTo={scrollTo} />
    </>
  );
}