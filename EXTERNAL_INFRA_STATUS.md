# External Infrastructure Status

## TiDB Cloud Starter

The `corporate-good-deeds` TiDB Cloud Starter instance is active in AWS N. Virginia with a monthly spending limit of `$0`. It exposes a public TLS endpoint on port `4000`. The database password has been generated and must be stored only in Render's `DATABASE_URL` secret.

## Backblaze B2

The private bucket `corporate-good-deeds` has been created with Backblaze-managed server-side encryption enabled and Object Lock disabled. The S3-compatible endpoint is `https://s3.ca-east-006.backblazeb2.com`. A bucket-restricted read/write application key was created; its secret is intentionally not recorded in this repository because Backblaze displays it only once.

## References

[1] TiDB Cloud Starter: <https://docs.pingcap.com/tidbcloud/select-cluster-tier/>

[2] Backblaze B2 pricing: <https://www.backblaze.com/cloud-storage/pricing>

[3] Backblaze B2 S3-compatible API: <https://www.backblaze.com/docs/cloud-storage-s3-compatible-api>
