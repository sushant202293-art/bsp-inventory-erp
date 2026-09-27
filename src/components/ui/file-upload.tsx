import * as React from "react";
import { Upload, X, File, Image, FileText, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
  onFilesChange?: (files: File[]) => void;
  onFileRemove?: (index: number) => void;
  files?: File[];
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
  className?: string;
  description?: string;
}

function getFileIcon(file: File) {
  if (file.type.startsWith("image/")) return <Image className="h-5 w-5 text-info" />;
  if (file.type.includes("spreadsheet") || file.type.includes("excel") || file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))
    return <FileSpreadsheet className="h-5 w-5 text-success" />;
  if (file.type.includes("pdf") || file.type.includes("document") || file.name.endsWith(".doc") || file.name.endsWith(".docx"))
    return <FileText className="h-5 w-5 text-primary" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function FileUpload({
  accept,
  multiple = false,
  maxSize = 10 * 1024 * 1024,
  maxFiles = 5,
  onFilesChange,
  onFileRemove,
  files = [],
  disabled = false,
  error,
  errorMessage,
  className,
  description,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File "${file.name}" exceeds maximum size of ${formatFileSize(maxSize)}`;
    }
    if (accept) {
      const acceptedTypes = accept.split(",").map((t) => t.trim());
      const fileExt = "." + file.name.split(".").pop()?.toLowerCase();
      const fileType = file.type;
      const matches = acceptedTypes.some(
        (type) =>
          fileType === type ||
          fileType.startsWith(type.replace("/*", "/")) ||
          fileExt === type
      );
      if (!matches) {
        return `File "${file.name}" is not an accepted file type`;
      }
    }
    return null;
  };

  const handleFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const validFiles: File[] = [];

    for (const file of fileArray) {
      if (files.length + validFiles.length >= maxFiles) break;
      const error = validateFile(file);
      if (!error) {
        validFiles.push(file);
      }
    }

    if (validFiles.length > 0) {
      onFilesChange?.([...files, ...validFiles]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!disabled && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = "";
    }
  };

  const handleRemove = (index: number) => {
    onFileRemove?.(index);
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-all duration-200 cursor-pointer",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/50",
          error && "border-danger",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Upload
          className={cn(
            "mb-2 h-8 w-8",
            isDragOver ? "text-primary" : "text-muted-foreground"
          )}
        />
        <p className="text-sm font-medium text-foreground">
          Click to upload or drag and drop
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {description || `Max file size: ${formatFileSize(maxSize)}${multiple ? `. Max ${maxFiles} files` : ""}`}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
        />
      </div>

      {errorMessage && (
        <p className="mt-1 text-xs text-danger">{errorMessage}</p>
      )}

      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 rounded-md border border-border bg-card p-3"
            >
              {getFileIcon(file)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(index);
                }}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { FileUpload, type FileUploadProps, formatFileSize };
