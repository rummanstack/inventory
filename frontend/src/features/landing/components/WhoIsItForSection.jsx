import { BadgeDollarSign, BriefcaseBusiness, Calculator, Headset, ScanLine, Users } from 'lucide-react';
import ImagePlaceholder from './shared/ImagePlaceholder.jsx';
import { roleStoryImages } from '../constants.js';

const ICONS = [BriefcaseBusiness, ScanLine, Calculator, BadgeDollarSign, Users, Headset];
const IMAGE_SETTINGS = [
  { fit: 'cover', position: 'center' },
  { fit: 'cover', position: 'center' },
  { fit: 'cover', position: 'center' },
  { fit: 'cover', position: 'center' },
  { fit: 'cover', position: 'center' },
  { fit: 'cover', position: 'center' },
];

export default function WhoIsItForSection({ t }) {
  const copy = t('landing.roles');

  return (
    <section className="landing-section landing-section-brand">
      <div className="landing-container">
        <div className="mb-10 max-w-3xl">
          <p className="landing-eyebrow">{copy.eyebrow}</p>
          <h2 className="landing-section-title mt-4">{copy.title}</h2>
          <p className="landing-section-text mt-4">{copy.text}</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {copy.items.map((role, index) => {
            const Icon = ICONS[index];
            const image = IMAGE_SETTINGS[index] ?? IMAGE_SETTINGS[0];
            return (
              <article key={role.title} className="role-story-card">
                <ImagePlaceholder data={{ src: roleStoryImages[index], alt: role.title }} heightClass="aspect-[16/10]" fit={image.fit} position={image.position} />
                <div className="role-story-copy">
                  <div className="flex items-center gap-3">
                    <span className="hero-metric-icon">
                      <Icon size={18} />
                    </span>
                    <h3 className="text-lg font-black text-slate-950">{role.title}</h3>
                  </div>
                  <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{role.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {role.chips.map((chip) => (
                      <span key={chip} className="role-chip">{chip}</span>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}


