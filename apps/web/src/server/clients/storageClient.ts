import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getStorageConfig } from "@/server/config/storage";

let client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!client) {
    const config = getStorageConfig();
    client = new S3Client({
      endpoint: config.endpoint,
      region: "auto",
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
    });
  }
  return client;
}

function getBucket(): string {
  return getStorageConfig().bucketName;
}

function buildKey(documentId: string, fileName: string): string {
  return `documents/${documentId}/${fileName}`;
}

export async function uploadFile(
  buffer: Buffer,
  documentId: string,
  fileName: string,
  mimeType: string
): Promise<string> {
  const key = buildKey(documentId, fileName);
  
  try {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: getBucket(),
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      })
    );
    console.log(`[storage] Uploaded ${key} (${buffer.length} bytes)`);
  } catch (err) {
    console.error(`[storage] Failed to upload ${key}:`, err);
    throw new Error(`Failed to upload file to storage: ${(err as Error).message}`);
  }
  
  return key;
}

export async function getDownloadUrl(
  documentId: string,
  fileName: string,
  expiresIn = 900
): Promise<string> {
  const key = buildKey(documentId, fileName);
  try {
    const command = new GetObjectCommand({
      Bucket: getBucket(),
      Key: key,
    });
    return await getSignedUrl(getS3Client(), command, { expiresIn });
  } catch (err) {
    console.error(`[storage] Failed to generate signed URL for ${key}:`, err);
    throw new Error(`Failed to generate download URL: ${(err as Error).message}`);
  }
}

export async function deleteFile(
  documentId: string,
  fileName: string
): Promise<void> {
  const key = buildKey(documentId, fileName);
  try {
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: getBucket(),
        Key: key,
      })
    );
    console.log(`[storage] Deleted ${key}`);
  } catch (err) {
    console.error(`[storage] Failed to delete ${key}:`, err);
    throw err; // Let caller handle it
  }
}

export async function listFiles(): Promise<string[]> {
  const result = await getS3Client().send(
    new ListObjectsV2Command({
      Bucket: getBucket(),
    })
  );
  return (result.Contents ?? []).map((obj) => obj.Key ?? "").filter(Boolean);
}
