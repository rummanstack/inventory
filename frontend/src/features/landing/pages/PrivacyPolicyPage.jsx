import { Clock, Cookie, Database, Eye, FileText, Lock, MessageCircle, RefreshCw, UserCheck, Users } from 'lucide-react';
import { useLanguage } from '../../../app/hooks/useLanguage';
import LegalPageLayout from '../components/shared/LegalPageLayout.jsx';

const SECTION_ICONS = {
  introduction: FileText,
  'data-we-collect': Database,
  'how-we-use': Eye,
  'data-sharing': Users,
  security: Lock,
  'your-rights': UserCheck,
  cookies: Cookie,
  retention: Clock,
  changes: RefreshCw,
  contact: MessageCircle,
};

export default function PrivacyPolicyPage() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <LegalPageLayout
      language={language}
      setLanguage={setLanguage}
      t={t}
      contentKey="landing.privacy"
      sectionIcons={SECTION_ICONS}
      email="admin@stockledger.pro"
      heroGradient="linear-gradient(145deg, var(--bg-dark) 0%, var(--brand-strong) 55%, #1a1440 100%)"
      ctaGradient="linear-gradient(135deg, var(--brand-strong) 0%, #1a1440 55%, #0d2040 100%)"
    />
  );
}
