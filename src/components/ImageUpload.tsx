/**
 * Image upload component.
 *
 * Provides a file picker for product images with a live preview.
 * Shows the existing image if one is already uploaded, or a placeholder
 * if no image is set. Supports replacing the current image with a new file.
 */
import { memo, useRef } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import { MAX_IMAGE_FILE_SIZE_BYTES, MAX_IMAGE_FILE_SIZE_DISPLAY } from '../constants/imageUpload';

interface ImageUploadProps {
  /** Preview URL of the currently selected or existing image. */
  previewUrl: string | null;
  /** Called when the user selects a new file. */
  onFileSelect: (file: File) => void;
  /** Called when file validation succeeds or fails. */
  onFileValidation?: (message: string | null) => void;
  /** Called when the user removes the current image. */
  onRemove?: () => void;
  /** Whether the upload button should be disabled. */
  disabled?: boolean;
  /** Maximum allowed file size in bytes. */
  maxFileSizeBytes?: number;
}

export default memo(function ImageUpload({
  previewUrl,
  onFileSelect,
  onFileValidation,
  onRemove,
  disabled = false,
  maxFileSizeBytes = MAX_IMAGE_FILE_SIZE_BYTES,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Trigger the hidden file input when the upload button is clicked. */
  const handleButtonClick = (): void => {
    fileInputRef.current?.click();
  };

  /** Handle file selection from the native file picker. */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > maxFileSizeBytes) {
        onFileValidation?.(`Image must be ${MAX_IMAGE_FILE_SIZE_DISPLAY} or smaller.`);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      onFileValidation?.(null);
      onFileSelect(file);
    }
    // Reset input value so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Box>
      {/* Image preview area */}
      {previewUrl ? (
        <Box
          component="img"
          src={previewUrl}
          alt="Product image preview"
          sx={{
            width: '100%',
            maxWidth: 300,
            height: 200,
            objectFit: 'cover',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            mb: 1,
            display: 'block',
          }}
        />
      ) : (
        <Box
          sx={{
            width: '100%',
            maxWidth: 300,
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 1,
            border: '2px dashed',
            borderColor: 'divider',
            mb: 1,
            backgroundColor: 'action.hover',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No image selected
          </Typography>
        </Box>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        hidden
        onChange={handleFileChange}
      />

      <Stack direction="row" spacing={1}>
        <Button
          variant="outlined"
          startIcon={<CloudUploadIcon />}
          onClick={handleButtonClick}
          disabled={disabled}
          size="small"
        >
          {previewUrl ? 'Change Image' : 'Upload Image'}
        </Button>
        {previewUrl && onRemove ? (
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={onRemove}
            disabled={disabled}
            size="small"
          >
            Remove Image
          </Button>
        ) : null}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        Accepted formats: JPEG, PNG, GIF, WebP. Max size {MAX_IMAGE_FILE_SIZE_DISPLAY}.
      </Typography>
    </Box>
  );
})
