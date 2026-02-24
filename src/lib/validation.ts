import { z } from "zod";
import {
  MESSAGE_CHAR_LIMIT,
  MAX_ATTACHMENTS,
  FILE_SIZE_LIMIT,
} from "./constants";

const attachmentSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().int().positive().max(FILE_SIZE_LIMIT),
  s3Key: z.string().min(1),
});

export const chatSendSchema = z.object({
  taskId: z.string().uuid(),
  message: z.string().min(1).max(MESSAGE_CHAR_LIMIT),
  model: z.string().optional(),
  attachments: z.array(attachmentSchema).max(MAX_ATTACHMENTS).optional(),
});

export const taskCreateSchema = z.object({
  title: z.string().max(500).optional(),
});

export const taskUpdateSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(500)
    .transform((s) => s.trim())
    .optional(),
  status: z.enum(["active", "completed", "archived"]).optional(),
});

export const keyPutSchema = z.object({
  provider: z.enum(["anthropic", "openai", "gemini"]),
  apiKey: z.string().min(1),
});

export const keyDeleteSchema = z.object({
  provider: z.enum(["anthropic", "openai", "gemini"]),
});

export function geminiKeyValid(key: string): boolean {
  return key.startsWith("AIza");
}
