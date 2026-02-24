import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PRESIGNED_URL_EXPIRY_SECONDS } from "./constants";

const s3 = new S3Client({
  region: process.env.AWS_S3_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const bucket = process.env.AWS_S3_BUCKET!;

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getSignedFileUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3, command, { expiresIn: PRESIGNED_URL_EXPIRY_SECONDS });
}

export async function getFileContent(key: string): Promise<string> {
  const response = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  return (await response.Body?.transformToString()) ?? "";
}

export async function deleteFile(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export function buildS3Key(
  userId: string,
  taskId: string,
  fileId: string,
  ext: string,
) {
  return `attachments/${userId}/${taskId}/${fileId}.${ext}`;
}
