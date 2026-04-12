/**
 * Product form page (create and edit modes).
 *
 * Dual-purpose form that handles both product creation and editing.
 * Mode is determined by the route: /products/new (create) vs /products/:id/edit (edit).
 * Includes fields for name, description, price, quantity, category dropdown,
 * and image upload with preview.
 *
 * On submit:
 * 1. Validates all required fields
 * 2. Uploads the image to Supabase Storage (if a new file was selected)
 * 3. Creates or updates the product record in the database
 * 4. Navigates back to the product list (create) or detail page (edit)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Paper,
  CircularProgress,
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { useProducts } from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';
import { useProductImageStorage } from '../hooks/useProductImageStorage';
import ImageUpload from '../components/ImageUpload';
import { MAX_IMAGE_FILE_SIZE_BYTES } from '../constants/imageUpload';
import type { Product } from '../types/product';

interface ProductFormValues {
  name: string;
  description: string;
  price: string;
  quantity: string;
  categoryId: string;
}

const INITIAL_FORM_VALUES: ProductFormValues = {
  name: '',
  description: '',
  price: '0.00',
  quantity: '0',
  categoryId: '',
};

const PRICE_INPUT_PATTERN = /^\d*(\.\d{0,2})?$/;

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const { getProduct, addProduct, updateProduct } = useProducts();
  const { categories, loading: categoriesLoading } = useCategories();
  const { uploadImage, deleteImage, uploading, getPublicUrl } = useProductImageStorage();
  const {
    control,
    handleSubmit: handleFormSubmit,
    reset,
    formState: { isDirty },
  } = useForm<ProductFormValues>({
    defaultValues: INITIAL_FORM_VALUES,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImagePath, setExistingImagePath] = useState<string | null>(null);
  const [imageMarkedForRemoval, setImageMarkedForRemoval] = useState<boolean>(false);
  const [imageDirty, setImageDirty] = useState<boolean>(false);
  const [allowNavigation, setAllowNavigation] = useState<boolean>(false);
  const localPreviewUrlRef = useRef<string | null>(null);

  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [imageValidationError, setImageValidationError] = useState<string | null>(null);
  const [existingProduct, setExistingProduct] = useState<Product | null>(null);
  const hasUnsavedChanges = !allowNavigation && !submitting && (isDirty || imageDirty);

  // Load existing product data in edit mode
  useEffect(() => {
    if (!id) return;

    const loadProduct = async (): Promise<void> => {
      setLoading(true);
      const product = await getProduct(id);
      if (product) {
        setExistingProduct(product);
        reset({
          name: product.name,
          description: product.description ?? '',
          price: (product.price / 100).toFixed(2),
          quantity: String(product.quantity),
          categoryId: product.category_id ?? '',
        });
        setExistingImagePath(product.image_path);
        setImageMarkedForRemoval(false);
        setImageDirty(false);
        // Show existing image preview if available
        if (product.image_path) {
          setImagePreview(getPublicUrl(product.image_path));
        }
      }
      setLoading(false);
    };

    loadProduct();
  }, [getProduct, getPublicUrl, id, reset]);

  useEffect(() => {
    return () => {
      if (localPreviewUrlRef.current) {
        URL.revokeObjectURL(localPreviewUrlRef.current);
      }
    };
  }, []);

  const clearLocalPreview = useCallback((): void => {
    if (localPreviewUrlRef.current) {
      URL.revokeObjectURL(localPreviewUrlRef.current);
      localPreviewUrlRef.current = null;
    }
  }, []);

  /** Handle new image file selection from the ImageUpload component. */
  const handleFileSelect = useCallback((file: File): void => {
    clearLocalPreview();
    setError(null);
    setImageValidationError(null);
    setImageFile(file);
    setImageMarkedForRemoval(false);
    setImageDirty(true);
    // Create a local preview URL for the selected file
    const previewUrl = URL.createObjectURL(file);
    localPreviewUrlRef.current = previewUrl;
    setImagePreview(previewUrl);
  }, [clearLocalPreview]);

  /** Remove the current image from the form. */
  const handleImageRemove = useCallback((): void => {
    clearLocalPreview();
    setError(null);
    setImageValidationError(null);
    setImageFile(null);
    setImagePreview(null);
    setImageMarkedForRemoval(Boolean(existingImagePath));
    setImageDirty(true);
  }, [clearLocalPreview, existingImagePath]);

  const handleFileValidation = useCallback((message: string | null): void => {
    setImageValidationError(message);
  }, []);

  /** Handle form submission for both create and edit modes. */
  const handleSubmit = async (values: ProductFormValues): Promise<void> => {
    if (imageValidationError) {
      return;
    }

    setError(null);

    setSubmitting(true);

    try {
      let imagePath = imageMarkedForRemoval ? null : existingImagePath;
      let imagePathToDelete: string | null = null;

      // Upload new image if one was selected
      if (imageFile) {
        if (isEditMode && id) {
          // For edit mode, upload using existing product ID
          const path = await uploadImage(imageFile, id);
          if (path) {
            imagePath = path;
            if (existingImagePath) {
              imagePathToDelete = existingImagePath;
            }
          }
        } else {
          // For create mode, we'll upload after getting the new product ID
          // (handled below after addProduct)
        }
      }

      if (!imageFile && imageMarkedForRemoval && existingImagePath) {
        imagePathToDelete = existingImagePath;
      }

      const productData = {
        name: values.name.trim(),
        description: values.description.trim() || null,
        // Convert RM to cents for storage (e.g., "12.50" -> 1250)
        price: Math.round(parseFloat(values.price) * 100),
        quantity: parseInt(values.quantity, 10),
        category_id: values.categoryId,
        image_path: imagePath,
      };

      if (isEditMode && id) {
        // Update existing product
        const success = await updateProduct(id, productData);
        if (success) {
          if (imagePathToDelete) {
            await deleteImage(imagePathToDelete);
          }
          setAllowNavigation(true);
          navigate(`/products/${id}`);
        }
      } else {
        // Create new product
        const newId = await addProduct(productData);
        if (newId) {
          // Upload image using the new product's ID
          if (imageFile) {
            const path = await uploadImage(imageFile, newId);
            if (path) {
              // Update the product record with the image path
              await updateProduct(newId, { image_path: path });
            }
          }
          setAllowNavigation(true);
          navigate('/');
        }
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const guardedUrl = window.location.href;

    const handlePopState = (): void => {
      const shouldLeave = window.confirm('You have unsaved changes. Leave this page?');
      if (shouldLeave) {
        setAllowNavigation(true);
        return;
      }

      window.history.pushState(null, '', guardedUrl);
    };

    window.history.pushState(null, '', guardedUrl);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasUnsavedChanges]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isEditMode && !existingProduct && !loading) {
    return <Alert severity="error">Product not found.</Alert>;
  }

  return (
    <Box>
      {/* Page title and action buttons */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h1">
          {isEditMode ? 'Edit Product' : 'Add New Product'}
        </Typography>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<CancelIcon />}
            onClick={() => {
              if (hasUnsavedChanges) {
                const shouldLeave = window.confirm('You have unsaved changes. Leave this page?');
                if (!shouldLeave) {
                  return;
                }
              }

              setAllowNavigation(true);
              navigate(isEditMode ? `/products/${id}` : '/');
            }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="product-form"
            variant="contained"
            startIcon={
              submitting || uploading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <SaveIcon />
              )
            }
            disabled={
              submitting
              || uploading
              || Boolean(imageValidationError)
              || (isEditMode && !hasUnsavedChanges)
            }
          >
            {isEditMode ? 'Save' : 'Create'}
          </Button>
        </Box>
      </Box>

      {(imageValidationError || error) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {imageValidationError ?? error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Box component="form" id="product-form" onSubmit={handleFormSubmit(handleSubmit)} noValidate>
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {/* Left column: image upload */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Product Image
              </Typography>
              <ImageUpload
                previewUrl={imagePreview}
                onFileSelect={handleFileSelect}
                onFileValidation={handleFileValidation}
                onRemove={handleImageRemove}
                disabled={submitting || uploading}
                maxFileSizeBytes={MAX_IMAGE_FILE_SIZE_BYTES}
              />
            </Box>

            {/* Right column: form fields */}
            <Box sx={{ flex: 1, minWidth: 300 }}>
              <Controller
                name="name"
                control={control}
                rules={{
                  validate: (value) => value.trim() !== '' || 'Product name is required.',
                }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Product Name"
                    fullWidth
                    required
                    margin="normal"
                    disabled={submitting}
                    autoFocus={!isEditMode}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                  />
                )}
              />

              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Description"
                    fullWidth
                    multiline
                    rows={3}
                    margin="normal"
                    disabled={submitting}
                  />
                )}
              />

              <Controller
                name="price"
                control={control}
                rules={{
                  validate: (value) => {
                    const parsedPrice = parseFloat(value);
                    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
                      return 'Price (RM) must be 0 or greater.';
                    }
                    return true;
                  },
                }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Price"
                    type="number"
                    fullWidth
                    required
                    margin="normal"
                    disabled={submitting}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value !== '' && !PRICE_INPUT_PATTERN.test(value)) {
                        return;
                      }

                      field.onChange(value);
                    }}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">RM</InputAdornment>,
                      },
                      htmlInput: { min: 0, step: 0.01 },
                    }}
                  />
                )}
              />

              <Controller
                name="quantity"
                control={control}
                rules={{
                  validate: (value) => {
                    const parsedQty = parseInt(value, 10);
                    if (Number.isNaN(parsedQty) || parsedQty < 0) {
                      return 'Quantity must be 0 or greater.';
                    }
                    return true;
                  },
                }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Quantity"
                    type="number"
                    fullWidth
                    required
                    margin="normal"
                    disabled={submitting}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                    slotProps={{ htmlInput: { min: 0, step: 1 } }}
                  />
                )}
              />

              <Controller
                name="categoryId"
                control={control}
                rules={{
                  validate: (value) => value.trim() !== '' || 'Category is required.',
                }}        
                render={({ field, fieldState }) => (
                  <FormControl
                    fullWidth
                    margin="normal"
                    disabled={submitting || categoriesLoading}
                    error={Boolean(fieldState.error)}
                    required
                  >
                    <InputLabel>Category</InputLabel>
                    <Select {...field} label="Category">
                      <MenuItem value="" disabled>
                        <em>Select category</em>
                      </MenuItem>
                      {categories.map((cat) => (
                        <MenuItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>{fieldState.error?.message}</FormHelperText>
                  </FormControl>
                )}
              />
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
