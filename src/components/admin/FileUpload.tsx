 import { useState, useRef, useEffect } from 'react';
 import { Button } from '@/components/ui/button';
 import { Progress } from '@/components/ui/progress';
 import { X, Image, Video, Check, AlertCircle, Loader2 } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { toast } from 'sonner';
 import {
   createUploadPath,
   removeUploadedObject,
   uploadWithRetry,
   validateUploadFile,
   type UploadBucket,
   type UploadResult,
 } from '@/utils/uploadUtils';
 
interface FileUploadProps {
  bucket: UploadBucket;
  accept: string;
  value?: string;
  onChange: (url: string) => void;
  onUploadStateChange?: (isUploading: boolean) => void;
  onUploadComplete?: (result: UploadResult) => void;
  onUploadError?: (error: Error) => void;
  onDurationDetected?: (durationSeconds: number) => void;
  label?: string;
  maxSizeMB?: number;
}
 
const FileUpload = ({
  bucket,
  accept,
  value,
  onChange,
  onUploadStateChange,
  onUploadComplete,
  onUploadError,
  onDurationDetected,
  label = 'Upload File',
  maxSizeMB = bucket === 'videos' ? 500 : 5,
}: FileUploadProps) => {
   const [isDragging, setIsDragging] = useState(false);
   const [isUploading, setIsUploading] = useState(false);
   const [progress, setProgress] = useState(0);
   const [previewUrl, setPreviewUrl] = useState<string | null>(null);
   const [uploadStatus, setUploadStatus] = useState<string>('');
   const [uploadError, setUploadError] = useState<string>('');
   const inputRef = useRef<HTMLInputElement>(null);
   const abortControllerRef = useRef<AbortController | null>(null);
   const uploadStateCallbackRef = useRef(onUploadStateChange);
 
   const isVideo = bucket === 'videos';

   useEffect(() => () => {
     abortControllerRef.current?.abort();
   }, []);

   useEffect(() => {
     uploadStateCallbackRef.current = onUploadStateChange;
   }, [onUploadStateChange]);

   useEffect(() => {
     uploadStateCallbackRef.current?.(isUploading);
   }, [isUploading]);
 
  const detectVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(Math.round(video.duration));
      };
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(0);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const uploadFile = async (file: File) => {
    if (isUploading) {
      toast.warning('An upload is already in progress. Please wait for it to finish.');
      return;
    }

    const validation = validateUploadFile(file, bucket, maxSizeMB);
    if (!validation.valid) {
      console.warn('[upload:validation:failure]', { bucket, fileName: file.name, fileSize: file.size, fileType: file.type, message: validation.message });
      toast.error(validation.message || 'Invalid file');
      setUploadError(validation.message || 'Invalid file');
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setUploadError('');
    setUploadStatus('Preparing upload...');

    // Create local preview
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    abortControllerRef.current = new AbortController();

    // Detect video duration if it's a video file
    if (isVideo && onDurationDetected) {
      setUploadStatus('Reading video metadata...');
      const duration = await detectVideoDuration(file);
      if (duration > 0) {
        onDurationDetected(duration);
      }
    }

    const filePath = createUploadPath(file);

    try {
      setUploadStatus('Uploading...');
      const result = await uploadWithRetry({
        bucket,
        file,
        path: filePath,
        maxRetries: isVideo ? 2 : 1,
        timeoutMs: isVideo ? 8 * 60 * 1000 : 90 * 1000,
        signal: abortControllerRef.current.signal,
        onProgress: (uploadProgress) => {
          setProgress(uploadProgress.percent);
          setUploadStatus(
            uploadProgress.totalAttempts > 1
              ? `Uploading... ${uploadProgress.percent}% (attempt ${uploadProgress.attempt}/${uploadProgress.totalAttempts})`
              : `Uploading... ${uploadProgress.percent}%`
          );
          console.debug('[upload:progress]', {
            bucket,
            path: filePath,
            percent: uploadProgress.percent,
            loaded: uploadProgress.loaded,
            total: uploadProgress.total,
            attempt: uploadProgress.attempt,
          });
        },
      });

      setProgress(100);
      setUploadStatus('Upload complete');
      onChange(result.publicUrl);
      onUploadComplete?.(result);
      toast.success('File uploaded successfully');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to upload file. Please try again.';
      console.error('[upload:ui:failure]', { bucket, filePath, error });
      setUploadError(message);
      setUploadStatus('');
      toast.error(message);
      onUploadError?.(error instanceof Error ? error : new Error(message));
      setPreviewUrl(null);
      setProgress(0);
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
      URL.revokeObjectURL(localPreview);
    }
  };
 
   const handleDrop = (e: React.DragEvent) => {
       e.preventDefault();
       setIsDragging(false);
 
       const file = e.dataTransfer.files[0];
       if (file) void uploadFile(file);
   };
 
   const handleDragOver = (e: React.DragEvent) => {
     e.preventDefault();
     setIsDragging(true);
   };
 
   const handleDragLeave = (e: React.DragEvent) => {
     e.preventDefault();
     setIsDragging(false);
   };
 
   const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (file) void uploadFile(file);
   };

   const cancelUpload = () => {
     if (!isUploading) return;
     setUploadStatus('Cancelling upload...');
     abortControllerRef.current?.abort();
   };
 
   const clearFile = async () => {
     if (isUploading) {
       cancelUpload();
       return;
     }

     if (value) {
       // Extract file path from URL and delete from storage
       try {
         const url = new URL(value);
         const pathParts = url.pathname.split('/');
         const fileName = pathParts[pathParts.length - 1];
         
         await removeUploadedObject(bucket, fileName, 'user-cleared-upload');
       } catch (error) {
         console.error('[upload:delete-existing:failure]', { bucket, value, error });
       }
     }
     onChange('');
     setPreviewUrl(null);
     setProgress(0);
     setUploadStatus('');
     setUploadError('');
     if (inputRef.current) inputRef.current.value = '';
   };
 
   const displayUrl = previewUrl || value;
 
   return (
     <div className="space-y-2">
       <input
         ref={inputRef}
         type="file"
         accept={accept}
         onChange={handleFileSelect}
         disabled={isUploading}
         className="hidden"
       />
 
       {displayUrl ? (
         <div className="relative rounded-lg border bg-muted/30 overflow-hidden">
           {isVideo ? (
             <video
               src={displayUrl}
               controls
               className="w-full h-40 object-contain bg-black"
             />
           ) : (
             <img
               src={displayUrl}
               alt="Preview"
               className="w-full h-40 object-contain"
             />
           )}
           <Button
             type="button"
             variant="destructive"
             size="icon"
             className="absolute top-2 right-2 h-8 w-8"
             onClick={isUploading ? cancelUpload : clearFile}
             disabled={false}
             title={isUploading ? 'Cancel upload' : 'Remove file'}
           >
             {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
           </Button>
           {isUploading && (
             <div className="absolute bottom-0 left-0 right-0 bg-background/90 p-2">
               <Progress value={progress} className="h-2" />
               <p className="mt-1 text-xs text-muted-foreground">{uploadStatus || `Uploading... ${progress}%`}</p>
             </div>
           )}
           {!isUploading && progress === 100 && (
             <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
               <Check className="w-3 h-3" /> Uploaded
             </div>
           )}
         </div>
       ) : (
         <div
           onClick={() => !isUploading && inputRef.current?.click()}
           onDrop={handleDrop}
           onDragOver={handleDragOver}
           onDragLeave={handleDragLeave}
           className={cn(
             'flex flex-col items-center justify-center gap-2 h-40 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
             isUploading && 'cursor-not-allowed opacity-80',
             isDragging
               ? 'border-primary bg-primary/5'
               : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
           )}
         >
           {isUploading ? (
             <div className="text-center px-4 w-full">
               <Progress value={progress} className="h-2 mb-2" />
               <p className="text-sm text-muted-foreground">{uploadStatus || `Uploading... ${progress}%`}</p>
               <Button type="button" variant="outline" size="sm" className="mt-3" onClick={cancelUpload}>
                 Cancel
               </Button>
             </div>
           ) : (
             <>
               <div className="p-3 rounded-full bg-muted">
                 {isVideo ? (
                   <Video className="w-6 h-6 text-muted-foreground" />
                 ) : (
                   <Image className="w-6 h-6 text-muted-foreground" />
                 )}
               </div>
               <div className="text-center">
                 <p className="text-sm font-medium">{label}</p>
                 <p className="text-xs text-muted-foreground">
                   Drag & drop or click to browse
                 </p>
                 <p className="text-xs text-muted-foreground mt-1">
                   Max {maxSizeMB}MB
                 </p>
               </div>
             </>
           )}
         </div>
       )}
       {uploadError ? (
         <div className="flex items-start gap-2 text-sm text-destructive">
           <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
           <span>{uploadError}</span>
         </div>
       ) : null}
     </div>
   );
 };
 
 export default FileUpload;
