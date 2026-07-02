const buckets = new Map();

export function createRateLimiter({ name, windowMs, max }) {
  if (!name) {
    throw new Error("Rate limiter requires a unique name.");
  }

  return (req, res, next) => {
    const now = Date.now();
    const ip = req.ip || "unknown";
    const key = `${name}:${ip}`;
    let bucket = buckets.get(key);

    if (!bucket || now - bucket.start > windowMs) {
      bucket = { start: now, count: 0 };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    if (bucket.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.start + windowMs - now) / 1000));
      res.set("Retry-After", String(retryAfterSeconds));
      console.warn(`[rate-limit] name=${name} ip=${ip} path=${req.originalUrl} method=${req.method}`);
      res.status(429).json({ message: "Too many requests. Please try again later." });
      return;
    }

    if (buckets.size > 10000) {
      for (const [bucketKey, bucketValue] of buckets) {
        if (now - bucketValue.start > windowMs) {
          buckets.delete(bucketKey);
        }
      }
    }

    next();
  };
}
