/**
 * Unit tests for the ImageUpload component.
 *
 * Verifies file selection, preview rendering, and button label changes.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ImageUpload from '../../components/ImageUpload';
import { MAX_IMAGE_FILE_SIZE_BYTES } from '../../constants/imageUpload';

describe('ImageUpload', () => {
  it('shows "Upload Image" when no preview URL is provided', () => {
    render(
      <ImageUpload previewUrl={null} onFileSelect={vi.fn()} />
    );
    expect(screen.getByText('Upload Image')).toBeInTheDocument();
    expect(screen.getByText('No image selected')).toBeInTheDocument();
  });

  it('shows "Change Image" when a preview URL is provided', () => {
    render(
      <ImageUpload
        previewUrl="https://example.com/image.jpg"
        onFileSelect={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect(screen.getByText('Change Image')).toBeInTheDocument();
    expect(screen.getByText('Remove Image')).toBeInTheDocument();
  });

  it('renders the preview image when a URL is provided', () => {
    render(
      <ImageUpload
        previewUrl="https://example.com/image.jpg"
        onFileSelect={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    const img = screen.getByAltText('Product image preview');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('calls onFileSelect when a file is chosen', async () => {
    const onFileSelect = vi.fn();
    render(
      <ImageUpload previewUrl={null} onFileSelect={onFileSelect} />
    );

    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, file);
    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it('rejects files larger than 5 MB', async () => {
    const onFileSelect = vi.fn();
    const onFileValidation = vi.fn();
    render(
      <ImageUpload
        previewUrl={null}
        onFileSelect={onFileSelect}
        onFileValidation={onFileValidation}
      />
    );

    const oversizedFile = new File(['test'], 'large.png', { type: 'image/png' });
    Object.defineProperty(oversizedFile, 'size', { value: MAX_IMAGE_FILE_SIZE_BYTES + 1 });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, oversizedFile);

    expect(onFileSelect).not.toHaveBeenCalled();
    expect(onFileValidation).toHaveBeenCalledWith('Image must be 5 MB or smaller.');
  });

  it('disables the upload button when disabled prop is true', () => {
    render(
      <ImageUpload previewUrl={null} onFileSelect={vi.fn()} disabled={true} />
    );
    expect(screen.getByText('Upload Image')).toBeDisabled();
  });

  it('calls onRemove when the remove button is clicked', async () => {
    const onRemove = vi.fn();
    render(
      <ImageUpload
        previewUrl="https://example.com/image.jpg"
        onFileSelect={vi.fn()}
        onRemove={onRemove}
      />
    );

    await userEvent.click(screen.getByText('Remove Image'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
