import { useEffect } from 'react';
import { useLanguage } from '../../../app/hooks/useLanguage';
import LandingHeader from '../components/LandingHeader.jsx';
import HeroSection from '../components/HeroSection.jsx';
import FeatureStorySection from '../components/FeatureStorySection.jsx';
import SolutionsSection from '../components/SolutionsSection.jsx';
import WorkflowSection from '../components/WorkflowSection.jsx';
import ImageShowcaseSection from '../components/ImageShowcaseSection.jsx';
import TestimonialsSection from '../components/TestimonialsSection.jsx';
import CtaSection from '../components/CtaSection.jsx';
import PricingSection from '../components/PricingSection.jsx';
import FaqSection from '../components/FaqSection.jsx';
import TrustBarSection from '../components/TrustBarSection.jsx';
import ProofSection from '../components/ProofSection.jsx';
import WhoIsItForSection from '../components/WhoIsItForSection.jsx';
import ContactSection from '../components/ContactSection.jsx';
import LandingFooter from '../components/LandingFooter.jsx';
import LandingChatWidget from '../components/LandingChatWidget.jsx';

export default function LandingPage() {
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    document.documentElement.classList.add('landing-page-active');
    document.body.classList.add('landing-page-active');
    return () => {
      document.documentElement.classList.remove('landing-page-active');
      document.body.classList.remove('landing-page-active');
    };
  }, []);

  return (
    <main className="landing-page">
      <LandingHeader language={language} setLanguage={setLanguage} t={t} />
      <HeroSection t={t} />
      <TrustBarSection t={t} />
      <FeatureStorySection t={t} />
      <WorkflowSection t={t} />
      <SolutionsSection t={t} />
      <WhoIsItForSection t={t} />
      <ImageShowcaseSection t={t} />
      <ProofSection t={t} />
      <TestimonialsSection t={t} />
      <PricingSection t={t} />
      <FaqSection t={t} />
      <CtaSection t={t} />
      <ContactSection t={t} />
      <LandingFooter t={t} />
      <LandingChatWidget t={t} />
    </main>
  );
}
