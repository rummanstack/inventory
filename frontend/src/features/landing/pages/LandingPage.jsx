import { usePublicLanguage } from '../../../app/hooks/usePublicLanguage.js';
import { usePublicPageEffects } from '../hooks/usePublicPageEffects.js';
import LandingHeader from '../components/LandingHeader.jsx';
import HeroSection from '../components/HeroSection.jsx';
import FeatureStorySection from '../components/FeatureStorySection.jsx';
import SolutionsSection from '../components/SolutionsSection.jsx';
import WorkflowSection from '../components/WorkflowSection.jsx';
import TestimonialsSection from '../components/TestimonialsSection.jsx';
import CtaSection from '../components/CtaSection.jsx';
import PricingSection from '../components/PricingSection.jsx';
import FaqSection from '../components/FaqSection.jsx';
import TrustBarSection from '../components/TrustBarSection.jsx';
import LandingFooter from '../components/LandingFooter.jsx';
import DeferredLandingAiChatWidget from '../components/DeferredLandingAiChatWidget.jsx';

export default function LandingPage() {
  const { language, setLanguage, t } = usePublicLanguage();

  usePublicPageEffects({ scrollToTop: false });

  return (
    <main id="top" className="landing-page">
      <LandingHeader language={language} setLanguage={setLanguage} t={t} />
      <HeroSection t={t} language={language} />
      <TrustBarSection t={t} />
      <FeatureStorySection t={t} />
      <WorkflowSection t={t} />
      <SolutionsSection t={t} />
      <TestimonialsSection t={t} />
      <PricingSection t={t} language={language} />
      <FaqSection t={t} />
      <CtaSection t={t} />
      <LandingFooter t={t} language={language} />
      <DeferredLandingAiChatWidget t={t} />
    </main>
  );
}
