import { Clock, Cookie, Database, Eye, FileText, Lock, MessageCircle, RefreshCw, UserCheck, Users } from 'lucide-react';
import { usePublicLanguage } from '../../../app/hooks/usePublicLanguage.js';
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
  const { language, setLanguage, t } = usePublicLanguage();

  return (
    <LegalPageLayout
      language={language}
      setLanguage={setLanguage}
      t={t}
      contentKey="landing.privacy"
      sectionIcons={SECTION_ICONS}
      email="admin@stockledger.pro"
      ctaGradient="linear-gradient(135deg, var(--brand-strong) 0%, #1a1440 55%, #0d2040 100%)"
    />
  );
}
