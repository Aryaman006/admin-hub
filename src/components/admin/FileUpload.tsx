 import { useState, useRef, useCallback } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { Button } from '@/components/ui/button';
 import { Progress } from '@/components/ui/progress';
 import { Upload, X, Image, Video, Check, AlertCircle } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { toast } from 'sonner';
 
interface FileUploadProps {
  bucket: 'thumbnails' | 'videos';
  accept: string;
  value?: string;
  onChange: (url: string) => void;
  onDurationDetected?: (durationSeconds: number) => void;
  label?: string;
  maxSizeMB?: number;
}
 
const FileUpload = ({
  bucket,
  accept,
  value,
  onChange,
  onDurationDetected,
  label = 'Upload File',
  maxSizeMB = bucket === 'videos' ? 500 : 5,
}: FileUploadProps) => {
   const [isDragging, setIsDragging] = useState(false);
   const [isUploading, setIsUploading] = useState(false);
   const [progress, setProgress] = useState(0);
   const [previewUrl, setPreviewUrl] = useState<string | null>(null);
   const inputRef = useRef<HTMLInputElement>(null);
 
   const isVideo = bucket === 'videos';
   const maxSizeBytes = maxSizeMB * 1024 * 1024;
 
   const validateFile = (file: File): boolean => {
     const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
     const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
     const validTypes = isVideo ? validVideoTypes : validImageTypes;
 
     if (!validTypes.includes(file.type)) {
       toast.error(`Invalid file type. Allowed: ${validTypes.join(', ')}`);
       return false;
     }
 
     if (file.size > maxSizeBytes) {
       toast.error(`File too large. Maximum size: ${maxSizeMB}MB`);
       return false;
     }
 
     return true;
   };
 
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
    if (!validateFile(file)) return;

    setIsUploading(true);
    setProgress(0);

    // Create local preview
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    // Detect video duration if it's a video file
    if (isVideo && onDurationDetected) {
      const duration = await detectVideoDuration(file);
      if (duration > 0) {
        onDurationDetected(duration);
      }
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    try {
      // Fast progress simulation
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 15, 90));
      }, 100);

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      clearInterval(progressInterval);

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      setProgress(100);
      onChange(urlData.publicUrl);
      toast.success('File uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload file');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(localPreview);
    }
  };
 
   const handleDrop = useCallback(
     (e: React.DragEvent) => {
       e.preventDefault();
       setIsDragging(false);
 
       const file = e.dataTransfer.files[0];
       if (file) uploadFile(file);
     },
     [bucket]
   );
 
   const handleDragOver = useCallback((e: React.DragEvent) => {
     e.preventDefault();
     setIsDragging(true);
   }, []);
 
   const handleDragLeave = useCallback((e: React.DragEvent) => {
     e.preventDefault();
     setIsDragging(false);
   }, []);
 
   const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (file) uploadFile(file);
   };
 
   const clearFile = async () => {
     if (value) {
       // Extract file path from URL and delete from storage
       try {
         const url = new URL(value);
         const pathParts = url.pathname.split('/');
         const fileName = pathParts[pathParts.length - 1];
         
         await supabase.storage.from(bucket).remove([fileName]);
       } catch (error) {
         console.error('Error deleting file:', error);
       }
     }
     onChange('');
     setPreviewUrl(null);
     setProgress(0);
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
             onClick={clearFile}
           >
             <X className="w-4 h-4" />
           </Button>
           {isUploading && (
             <div className="absolute bottom-0 left-0 right-0 bg-background/80 p-2">
               <Progress value={progress} className="h-2" />
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
           onClick={() => inputRef.current?.click()}
           onDrop={handleDrop}
           onDragOver={handleDragOver}
           onDragLeave={handleDragLeave}
           className={cn(
             'flex flex-col items-center justify-center gap-2 h-40 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
             isDragging
               ? 'border-primary bg-primary/5'
               : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
           )}
         >
           {isUploading ? (
             <div className="text-center px-4 w-full">
               <Progress value={progress} className="h-2 mb-2" />
               <p className="text-sm text-muted-foreground">Uploading... {progress}%</p>
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
     </div>
   );
 };
 
 export default FileUpload;