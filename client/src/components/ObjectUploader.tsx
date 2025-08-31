import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X } from "lucide-react";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (result: any) => void;
  buttonClassName?: string;
  children: ReactNode;
}

/**
 * A simplified file upload component for handling product images
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;
    
    if (files.length > maxNumberOfFiles) {
      alert(`You can only upload up to ${maxNumberOfFiles} files at once`);
      return;
    }

    for (const file of files) {
      if (file.size > maxFileSize) {
        alert(`File ${file.name} is too large. Maximum size is ${Math.round(maxFileSize / 1024 / 1024)}MB`);
        return;
      }
    }

    setUploading(true);
    
    try {
      const uploadResults = [];
      
      for (const file of files) {
        const { url } = await onGetUploadParameters();
        
        const response = await fetch(url, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });
        
        if (response.ok) {
          // Extract the object URL without query parameters
          const uploadURL = url.split('?')[0];
          uploadResults.push({
            successful: true,
            uploadURL,
            name: file.name,
          });
        }
      }
      
      if (onComplete) {
        onComplete({
          successful: uploadResults,
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      // Reset the input
      event.target.value = '';
    }
  };

  return (
    <div className="relative">
      <input
        type="file"
        multiple={maxNumberOfFiles > 1}
        accept="image/*"
        onChange={handleFileSelect}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={uploading}
      />
      <Button 
        type="button"
        className={buttonClassName} 
        disabled={uploading}
      >
        {uploading ? "Uploading..." : children}
      </Button>
    </div>
  );
}