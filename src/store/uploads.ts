import { create } from "zustand";
import { enableMapSet } from "immer";
import { immer } from "zustand/middleware/immer";
import { uploadFileToStorage } from "../http/upload-file-to-storage";
import { CanceledError } from "axios";
import { useShallow } from "zustand/shallow";
import { compressImage } from "../utils/compress-image";

export type Upload = {
  name: string;
  file: File;
  abortController?: AbortController;
  status: "progress" | "success" | "error" | "cancelled";
  originalSizeInBytes: number;
  compressedSizeInBytes?: number;
  uploadSizeInBytes: number;
  remoteUrl?: string;
};

type UploadState = {
  uploads: Map<string, Upload>;
  addUploads: (files: File[]) => void;
  cancelUpload: (uploadId: string) => void;
  retryUpload: (uploadId: string) => void;
};

enableMapSet();

export const useUploads = create<UploadState, [["zustand/immer", never]]>(
  immer((set, get) => {
    function updateUpload(uploadId: string, data: Partial<Upload>) {
      const upload = get().uploads.get(uploadId);

      if (!upload) {
        return;
      }

      set((state) => {
        state.uploads.set(uploadId, { ...upload, ...data });
      });
    }

    async function proccessUpload(uploadId: string) {
      const upload = get().uploads.get(uploadId);
        const abortController = new AbortController();

      if (!upload) {
        return;
      }

      updateUpload(uploadId, {
        uploadSizeInBytes: 0,
        compressedSizeInBytes: undefined,
        remoteUrl: undefined,
        abortController,
        status: "progress",
      });

      try {
        const compressedFile = await compressImage({
          file: upload.file,
          maxWidth: 1000,
          maxHeight: 1000,
          quality: 0.8,
        });

        updateUpload(uploadId, { compressedSizeInBytes: compressedFile.size });

        const { url } = await uploadFileToStorage(
          {
            file: compressedFile,
            onProgress: (sizeInBytes) => {
              updateUpload(uploadId, { uploadSizeInBytes: sizeInBytes });
            },
          },
          { signal: abortController?.signal },
        );

        updateUpload(uploadId, { status: "success", remoteUrl: url });
      } catch (err) {
        if (err instanceof CanceledError) {
          updateUpload(uploadId, { status: "cancelled" });

          return;
        }

        updateUpload(uploadId, { status: "error" });
      }
    }

    function cancelUpload(uploadId: string) {
      const upload = get().uploads.get(uploadId);

      if (!upload) {
        return;
      }

      upload.abortController?.abort();
    }

    function retryUpload(uploadId: string) {
      proccessUpload(uploadId);
    }

    function addUploads(files: File[]) {
      for (const file of files) {
        const uploadId = crypto.randomUUID();

        const upload: Upload = {
          name: file.name,
          file,
          status: "progress",
          originalSizeInBytes: file.size,
          uploadSizeInBytes: 0,
        };

        set((state) => {
          state.uploads.set(uploadId, upload);
        });

        proccessUpload(uploadId);
      }
    }

    return {
      uploads: new Map(),
      addUploads,
      cancelUpload,
      retryUpload,
    };
  }),
);

export const usePendingUploads = () => {
  return useUploads(
    useShallow((state) => {
      const isThereAnyPendingUpload = Array.from(state.uploads.values()).some(
        (upload) => upload.status === "progress",
      );

      if (!isThereAnyPendingUpload) {
        return { isThereAnyPendingUpload, globalPercentage: 100 };
      }

      const { total, uploaded } = Array.from(state.uploads.values()).reduce(
        (acc, upload) => {
          if (upload.compressedSizeInBytes) {
            acc.uploaded += upload.uploadSizeInBytes;
          }

          acc.total +=
            upload.compressedSizeInBytes || upload.originalSizeInBytes;

          return acc;
        },
        {
          total: 0,
          uploaded: 0,
        },
      );

      const globalPercentage = Math.min(
        Math.round((uploaded * 100) / total),
        100,
      );

      return { isThereAnyPendingUpload, globalPercentage };
    }),
  );
};
