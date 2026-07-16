import { BadgeCheck, BookOpen, FileText, Gavel, Globe, KeyRound, MessageCircle, Scale, ShieldOff, Trash2, UserCheck, Wallet } from 'lucide-react';
import { usePublicLanguage } from '../../../app/hooks/usePublicLanguage.js';
import LegalPageLayout from '../components/shared/LegalPageLayout.jsx';

const SECTION_ICONS = {
  acceptance: BadgeCheck,
  service: BookOpen,
  accounts: KeyRound,
  subscription: Wallet,
  'acceptable-use': UserCheck,
  'data-ownership': FileText,
  ip: Globe,
  disclaimers: ShieldOff,
  liability: Scale,
  termination: Trash2,
  'governing-law': Gavel,
  contact: MessageCircle,
};

export default function TermsPage() {
  const { language, setLanguage, t } = usePublicLanguage();

  return (
    <LegalPageLayout
      language={language}
      setLanguage={setLanguage}
      t={t}
      contentKey="landing.terms"
      sectionIcons={SECTION_ICONS}
      email="admin@stockledger.pro"
      heroGradient="linear-gradient(145deg, #0c0b1e 0%, #12103a 45%, #0d2040 100%)"
      ctaGradient="linear-gradient(135deg, #0c0b1e 0%, #12103a 50%, #0d2040 100%)"
    />
  );
}
