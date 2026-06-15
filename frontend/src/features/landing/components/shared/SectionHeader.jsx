export default function SectionHeader({ label, title, description }) {
  return (
    <div className="max-w-3xl">
      <p className="landing-eyebrow">{label}</p>
      <h2 className="landing-section-title">{title}</h2>
      <p className="landing-section-text">{description}</p>
    </div>
  );
}
