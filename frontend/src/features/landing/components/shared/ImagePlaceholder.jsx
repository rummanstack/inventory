export default function ImagePlaceholder({ data, heightClass, variant = 'photo', fit = 'cover', position }) {
  return (
    <div className={`image-placeholder ${heightClass} ${variant === 'dashboard' ? 'image-placeholder-dashboard' : ''}`}>
      <img
        src={data.src}
        alt={data.alt}
        className={`landing-image ${fit === 'contain' ? 'landing-image-contain' : ''}`}
        style={position ? { objectPosition: position } : undefined}
      />
    </div>
  );
}
