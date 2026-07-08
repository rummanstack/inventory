export default function ImagePlaceholder({ data, heightClass, variant = 'photo', fit = 'cover', position, priority = false }) {
  const fitClass = fit === 'fill' ? 'landing-image-fill' : fit === 'contain' ? 'landing-image-contain' : 'landing-image-cover';

  return (
    <div className={`image-placeholder ${heightClass} ${variant === 'dashboard' ? 'image-placeholder-dashboard' : ''}`}>
      <img
        src={data.src}
        alt={data.alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchpriority={priority ? 'high' : undefined}
        className={`landing-image ${fitClass}`}
        style={position ? { objectPosition: position } : undefined}
      />
    </div>
  );
}
