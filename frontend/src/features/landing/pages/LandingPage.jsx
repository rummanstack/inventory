import { useEffect } from 'react';
import { useLanguage } from '../../../app/hooks/useLanguage';
import LandingHeader from '../components/LandingHeader.jsx';
import HeroSection from '../components/HeroSection.jsx';
import ProblemSection from '../components/ProblemSection.jsx';
import FeatureStorySection from '../components/FeatureStorySection.jsx';
import FeatureGridSection from '../components/FeatureGridSection.jsx';
import SolutionsSection from '../components/SolutionsSection.jsx';
import WorkflowSection from '../components/WorkflowSection.jsx';
import ImageShowcaseSection from '../components/ImageShowcaseSection.jsx';
import DemoSection from '../components/DemoSection.jsx';
import PricingSection from '../components/PricingSection.jsx';
import ContactSection from '../components/ContactSection.jsx';
import LandingFooter from '../components/LandingFooter.jsx';

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
      <ProblemSection t={t} />
      <FeatureStorySection t={t} />
      <FeatureGridSection t={t} />
      <SolutionsSection t={t} />
      <WorkflowSection t={t} />
      <ImageShowcaseSection t={t} />
      <DemoSection t={t} />
      <PricingSection t={t} />
      <ContactSection t={t} />
      <LandingFooter t={t} />
    </main>
  );
}
