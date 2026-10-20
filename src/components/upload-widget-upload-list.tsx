import * as ScrollArea from "@radix-ui/react-scroll-area";
import { useUploads } from "../store/uploads";
import { UploadWidgetUploadItem } from "./upload-widget-upload-item";

export function UploadWidgetUploadList() {
  const uploads = useUploads((store) => store.uploads);

  const isUploadListEmpty = uploads.size === 0;

  return (
    <div className="px-3 flex flex-col gap-3">
      <span className="text-xs font-medium">
        Uploaded files <span className="text-zinc-400">({uploads.size})</span>
      </span>

      <ScrollArea.Root type="scroll" className="overflow-hidden">
        <ScrollArea.Viewport className="h-[220px]">
          {isUploadListEmpty ? (
            <span className="text-xs text-zinc-400">No uploads added</span>
          ) : (
            <div className="flex flex-col gap-2">
              {Array.from(uploads).map(([uploadId, upload]) => {
                return (
                  <UploadWidgetUploadItem
                    key={uploadId}
                    upload={upload}
                    uploadId={uploadId}
                  />
                );
              })}
            </div>
          )}
        </ScrollArea.Viewport>

        <ScrollArea.Scrollbar
          className="flex select-none touch-none p-0.5 bg-zinc-800 transition-colors duration-[160ms] ease-out data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5"
          orientation="vertical"
        >
          <ScrollArea.Thumb className="flex-1 bg-zinc-600 rounded-[10px] relative before:content-[''] before:absolute before:top-[50%] before:left-[50%] before:w-full before:h-full before:min-w-[44px] before:min-h-[44px] before:-translate-x-[50%] before:-translate-y-[50%]" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
}
