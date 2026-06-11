const buckets = new Map();

export function createRateLimiter({ windowMs, max }) {
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || "unknown";
    let bucket = buckets.get(key);

    if (!bucket || now - bucket.start > windowMs) {
      bucket = { start: now, count: 0 };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    if (bucket.count > max) {
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
