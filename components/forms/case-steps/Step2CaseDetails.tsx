"use client";

import { useRef } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface UploadedFile {
  url: string;
  name: string;
  size: number;
  mimeType: string;
  preview?: string;
}

interface Step2CaseDetailsProps {
  formData: {
    help_type: string;
    description: string;
    files: UploadedFile[];
  };
  onChange: (field: string, value: any) => void;
  errors: Record<string, string>;
}

const HELP_TYPE_OPTIONS = [
  { value: "school_fees", label: "School Fees" },
  { value: "educational_materials", label: "Educational Materials" },
  { value: "infrastructure", label: "Infrastructure Issue" },
  { value: "scholarship", label: "Scholarship" },
  { value: "health_welfare", label: "Health/Welfare Issue" },
  { value: "other", label: "Other" },
];

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_FILES = 5;

export default function Step2CaseDetails({
  formData,
  onChange,
  errors,
}: Step2CaseDetailsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    processFiles(selectedFiles);
  };

  const processFiles = (selectedFiles: File[]) => {
    const currentFiles = formData.files || [];

    // Check total file count
    if (currentFiles.length + selectedFiles.length > MAX_FILES) {
      toast.error(`You can only upload up to ${MAX_FILES} images`);
      return;
    }

    // Validate each file
    const validFiles: File[] = [];
    for (const file of selectedFiles) {
      // Check file type
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file`);
        continue;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(
          `${file.name} exceeds 2MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`
        );
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Create preview URLs for valid files
    const newFiles: UploadedFile[] = validFiles.map((file) => ({
      url: "", // Will be set after upload
      name: file.name,
      size: file.size,
      mimeType: file.type,
      preview: URL.createObjectURL(file), // Local preview
    }));

    // Add to form data
    onChange("files", [...currentFiles, ...newFiles]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    const updatedFiles = [...formData.files];
    // Revoke preview URL to free memory
    if (updatedFiles[index].preview) {
      URL.revokeObjectURL(updatedFiles[index].preview!);
    }
    updatedFiles.splice(index, 1);
    onChange("files", updatedFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-theme-800 dark:text-theme-100 mb-2">
          Case Details
        </h3>
        <p className="text-sm text-muted-foreground">
          Tell us about the type of help you need.
        </p>
      </div>

      {/* Type of Help Needed */}
      <div className="space-y-2">
        <Label htmlFor="help_type">
          Type of Help Needed <span className="text-destructive">*</span>
        </Label>
        <Select
          value={formData.help_type}
          onValueChange={(value) => onChange("help_type", value)}
        >
          <SelectTrigger
            id="help_type"
            className={errors.help_type ? "border-destructive" : ""}
          >
            <SelectValue placeholder="Select type of assistance" />
          </SelectTrigger>
          <SelectContent>
            {HELP_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.help_type && (
          <p className="text-sm text-destructive">{errors.help_type}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">
          Detailed Description <span className="text-muted-foreground">(Make it believable)</span> <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="Please describe your situation briefly (minimum 10 characters)"
          rows={4}
          className={errors.description ? "border-destructive" : ""}
        />
        <p className="text-xs text-muted-foreground">
          {formData.description.length} characters
        </p>
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description}</p>
        )}
      </div>

      {/* File Upload */}
      <div className="space-y-2">
        <Label htmlFor="files">Supporting Images (Optional)</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Upload up to {MAX_FILES} images (max 2MB each)
        </p>

        {/* Upload Button */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            id="files"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={formData.files.length >= MAX_FILES}
            className="w-full sm:w-auto"
          >
            <Upload className="w-4 h-4 mr-2" />
            {formData.files.length >= MAX_FILES
              ? "Maximum files reached"
              : "Choose Images"}
          </Button>
        </div>

        {/* File Previews */}
        {formData.files.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            {formData.files.map((file, index) => (
              <div
                key={index}
                className="relative border border-border rounded-lg overflow-hidden bg-muted/30"
              >
                {/* Image Preview */}
                <div className="aspect-square relative bg-muted">
                  {file.preview || file.url ? (
                    <img
                      src={file.preview || file.url}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
                    aria-label="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* File Info */}
                <div className="p-2 space-y-1">
                  <p className="text-xs font-medium truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
