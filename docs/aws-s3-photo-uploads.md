# AWS S3 photo uploads

The backend supports local photo storage by default and Amazon S3 in production. The browser continues to upload to `POST /api/uploads/photo`; AWS credentials never reach the frontend.

## Recommended architecture

Use a private S3 bucket with Block Public Access enabled. Put CloudFront in front of it with Origin Access Control (OAC), then use its domain as `AWS_S3_PUBLIC_BASE_URL`.

## Setup

1. Create a general-purpose S3 bucket and keep all Block Public Access options enabled.
2. Create a CloudFront distribution with the bucket as its S3 origin.
3. Attach an OAC and allow CloudFront to read objects from the bucket.
4. Give the backend workload role this least-privilege policy (replace the bucket name/prefix):

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "UploadTenantPhotos",
    "Effect": "Allow",
    "Action": "s3:PutObject",
    "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/photos/*"
  }]
}
```

5. Add these values to the repository-root `.env` locally or your production configuration:

```dotenv
PHOTO_STORAGE_DRIVER=s3
AWS_REGION=ap-south-1
AWS_S3_BUCKET=YOUR_BUCKET_NAME
AWS_S3_PHOTO_PREFIX=photos
AWS_S3_PUBLIC_BASE_URL=https://YOUR_CLOUDFRONT_DOMAIN
```

The AWS SDK uses its standard credential provider chain. On AWS, attach the policy to the workload role; do not commit access keys. For local development, use an AWS CLI profile or temporary environment credentials.

## Verify

Restart the backend and upload an employee photo. Confirm the returned URL uses CloudFront, the object is under `photos/<tenant-id>/`, the image loads, and direct anonymous S3 access stays blocked.

Existing local photo URLs continue to work because the backend still serves `/uploads/photos`.
## Runtime and AWS references

Use Node.js 20 or newer; the installed AWS SDK version requires it.

- [AWS SDK for JavaScript credential provider chain](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html)
- [Restrict S3 access with CloudFront Origin Access Control](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-overview.html)
- [Amazon S3 IAM object permissions and prefix ARNs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security_iam_service-with-iam.html)
