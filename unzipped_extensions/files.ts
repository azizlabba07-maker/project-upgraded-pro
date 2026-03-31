import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { createUploadedFile, getUploadedFilesByUserId, getUploadedFileById } from '../db';
import { storagePut } from '../storage';
import { nanoid } from 'nanoid';

const MAX_FILE_SIZE = 500 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

export const filesRouter = router({
  listFiles: protectedProcedure.query(async ({ ctx }) => {
    return getUploadedFilesByUserId(ctx.user.id);
  }),

  getFile: protectedProcedure
    .input(z.object({ fileId: z.number() }))
    .query(async ({ ctx, input }) => {
      const file = await getUploadedFileById(input.fileId);
      if (!file || file.userId !== ctx.user.id) {
        throw new Error('File not found or unauthorized');
      }
      return file;
    }),

  uploadFile: protectedProcedure
    .input(z.object({
      fileName: z.string().min(1),
      fileType: z.enum(['image', 'video']),
      mimeType: z.string(),
      fileData: z.instanceof(Buffer),
      fileSize: z.number().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.fileSize > MAX_FILE_SIZE) {
        throw new Error('File is too large');
      }

      const isValidImage = SUPPORTED_IMAGE_TYPES.includes(input.mimeType);
      const isValidVideo = SUPPORTED_VIDEO_TYPES.includes(input.mimeType);

      if (!isValidImage && !isValidVideo) {
        throw new Error('Unsupported file type');
      }

      try {
        const fileExtension = input.fileName.split('.').pop() || 'bin';
        const s3Key = `uploads/${ctx.user.id}/${nanoid()}.${fileExtension}`;

        const { url: s3Url } = await storagePut(
          s3Key,
          input.fileData,
          input.mimeType
        );

        const result = await createUploadedFile({
          userId: ctx.user.id,
          fileName: input.fileName,
          fileType: input.fileType,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          s3Key,
          s3Url,
          processingStatus: 'pending',
        });

        return {
          success: true,
          message: 'File uploaded successfully',
          fileId: (result as any).insertId || 0,
          s3Url,
        };
      } catch (error) {
        console.error('File upload error:', error);
        throw new Error('Failed to upload file');
      }
    }),

  deleteFile: protectedProcedure
    .input(z.object({ fileId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const file = await getUploadedFileById(input.fileId);
      if (!file || file.userId !== ctx.user.id) {
        throw new Error('File not found or unauthorized');
      }

      return { success: true };
    }),
});
