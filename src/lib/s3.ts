import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

const BUCKET = process.env.AWS_S3_BUCKET_NAME!;
const ENDPOINT = process.env.AWS_S3_ENDPOINT_URL!;

/**
 * Upload a file buffer to S3.
 * @returns The public URL of the uploaded file.
 */
export async function uploadToS3(
    buffer: Buffer,
    key: string,
    contentType: string
): Promise<string> {
    await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    }));
    return `${ENDPOINT}/${BUCKET}/${key}`;
}

/**
 * Delete a file from S3 by its key.
 */
export async function deleteFromS3(key: string): Promise<void> {
    await s3.send(new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
    }));
}

/**
 * Extract the S3 key from a full URL.
 */
export function getKeyFromUrl(url: string): string | null {
    const prefix = `${ENDPOINT}/${BUCKET}/`;
    if (url.startsWith(prefix)) return url.slice(prefix.length);
    return null;
}
