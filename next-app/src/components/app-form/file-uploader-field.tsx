"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { File, FileText, ImageIcon, Upload, Video, X } from "lucide-react";
import { useCallback, useState } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import { useFieldContext } from "./form-context";

export interface FileWithPreview extends File {
  preview?: string;
  progress?: number;
  error?: string;
}

interface FileUploaderProps {
  label: string;
  mode?: "no-label" | "label";
  maxFiles?: number;
  maxSize?: number;
  accept?: Record<string, string[]>;
  disabled?: boolean;
  className?: string;
}

export function FileUploader({
  label,
  mode = "label",
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024,
  accept = {
    "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    "application/pdf": [".pdf"],
  },
  disabled = false,
  className,
}: FileUploaderProps) {
  const field = useFieldContext<FileWithPreview[]>();
  const files = field.state.value ?? [];
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  );

  const simulateUpload = useCallback((fileName: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }
      setUploadProgress((prev) => ({ ...prev, [fileName]: progress }));
    }, 200);
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (disabled) return;

      const newFiles: FileWithPreview[] = acceptedFiles.map((file) =>
        Object.assign(file, {
          preview: file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : undefined,
        })
      );

      const rejectedFilesWithError: FileWithPreview[] = rejectedFiles.map(
        ({ file, errors }) =>
          Object.assign(file, {
            error: errors[0]?.message || "File rejected",
          })
      );

      const allNewFiles = [...newFiles, ...rejectedFilesWithError];
      const current = field.state.value ?? [];
      const updatedFiles = [...current, ...allNewFiles].slice(0, maxFiles);

      field.handleChange(updatedFiles);

      newFiles.forEach((file) => {
        if (!file.error) {
          simulateUpload(file.name);
        }
      });
    },
    [field, maxFiles, disabled, simulateUpload]
  );

  const removeFile = (index: number) => {
    if (disabled) return;

    const file = files[index];
    const newFiles = files.filter((_: FileWithPreview, i: number) => i !== index);
    field.handleChange(newFiles);

    if (file?.preview) {
      URL.revokeObjectURL(file.preview);
    }
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept,
      maxSize,
      maxFiles: maxFiles - files.length,
      disabled,
    });

  const getFileIcon = (file: FileWithPreview) => {
    if (file.type.startsWith("image/"))
      return <ImageIcon className="h-4 w-4" />;
    if (file.type.startsWith("video/")) return <Video className="h-4 w-4" />;
    if (file.type === "application/pdf")
      return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <Field
      className={cn("w-full space-y-4", className)}
      data-invalid={isInvalid}
    >
      <FieldLabel
        className={cn({ "sr-only": mode === "no-label" })}
        htmlFor={field.name}
      >
        {label}
      </FieldLabel>
      <Card
        {...getRootProps()}
        className={cn(
          "cursor-pointer border shadow-xs transition-colors",
          isDragActive && !isDragReject && "border-primary bg-primary/5",
          isDragReject && "border-destructive bg-destructive/5",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <input {...getInputProps()} />
          <Upload
            className={cn(
              "mb-4 h-10 w-10 text-muted-foreground",
              isDragActive && "text-primary"
            )}
          />
          <div className="space-y-2">
            <p className="font-medium text-sm">
              {isDragActive
                ? "Drop files here"
                : "Drag & drop files here, or click to select"}
            </p>
            <p className="text-muted-foreground text-xs">
              Max {maxFiles} files, up to {formatFileSize(maxSize)} each
            </p>
          </div>
        </CardContent>
      </Card>
      {isInvalid && <FieldError errors={field.state.meta.errors} />}

      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm">
            Uploaded Files ({files.length})
          </h4>
          <div className="space-y-2">
            {files.map((file: FileWithPreview, index: number) => (
              <Card className="p-3" key={`${file.name}-${index}`}>
                <div className="flex items-center gap-3">
                  {file.preview ? (
                    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-muted">
                      <Image
                        alt={file.name}
                        className="object-cover"
                        fill
                        sizes="40px"
                        src={file.preview}
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-muted">
                      {getFileIcon(file)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm">{file.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatFileSize(file.size)}
                    </p>

                    {file.error && (
                      <p className="mt-1 text-destructive text-xs">
                        {file.error}
                      </p>
                    )}

                    {(() => {
                      const progress = uploadProgress[file.name];
                      return (
                        !file.error &&
                        progress !== undefined &&
                        progress < 100 && (
                          <div className="mt-2">
                            <Progress className="h-1" value={progress} />
                            <p className="mt-1 text-muted-foreground text-xs">
                              Uploading... {Math.round(progress)}%
                            </p>
                          </div>
                        )
                      );
                    })()}

                    {!file.error && uploadProgress[file.name] === 100 && (
                      <p className="mt-1 text-green-600 text-xs">
                        Upload complete
                      </p>
                    )}
                  </div>

                  <Button
                    className="h-8 w-8 flex-shrink-0"
                    disabled={disabled}
                    onClick={() => removeFile(index)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </Field>
  );
}
