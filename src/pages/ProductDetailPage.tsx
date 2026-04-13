/**
 * Product detail page.
 *
 * Shows full product information including image, description, category,
 * price, and quantity. Provides quantity adjustment controls (+/- and keyboard)
 * below the price. Quantity changes are held locally
 * until the user clicks "Save". Action buttons (Back, Edit, Remove) sit
 * outside the card.
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import { useProducts } from '../hooks/useProducts';
import { useProductImageStorage } from '../hooks/useProductImageStorage';
import { useUserNames } from '../hooks/useUserNames';
import QuantityControl from '../components/QuantityControl';
import type { Product } from '../types/product';
import { formatPrice } from '../utils/formatters';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getProduct,
    setQuantity,
    removeProduct,
    error,
  } = useProducts();
  const { getPublicUrl } = useProductImageStorage();
  const { resolveUserName } = useUserNames();

  const [product, setProduct] = useState<Product | null>(null);
  const [createdByName, setCreatedByName] = useState<string>('');
  const [editedByName, setEditedByName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });

  // Local quantity state — changes are held here until "Save" is clicked
  const [pendingQuantity, setPendingQuantity] = useState<number>(0);
  // Track whether the user has unsaved quantity changes
  const hasQuantityChanged = product !== null && pendingQuantity !== product.quantity;

  // Fetch product details and resolve audit user names on mount
  useEffect(() => {
    const loadProduct = async (): Promise<void> => {
      if (!id) return;
      setLoading(true);
      const data = await getProduct(id);
      setProduct(data);

      // Initialize local quantity from fetched product
      if (data) {
        setPendingQuantity(data.quantity);
        const createdName = await resolveUserName(data.created_by);
        setCreatedByName(createdName);
        if (data.edited_by) {
          const editedName = await resolveUserName(data.edited_by);
          setEditedByName(editedName);
        }
      }

      setLoading(false);
    };

    loadProduct();
  }, [id, getProduct, resolveUserName]);

  /** Increment local quantity (not yet saved to DB). */
  const handleIncrement = (): void => {
    setPendingQuantity((prev) => prev + 1);
  };

  /** Decrement local quantity (not yet saved to DB). Minimum 0. */
  const handleDecrement = (): void => {
    setPendingQuantity((prev) => Math.max(0, prev - 1));
  };

  /** Set local quantity directly from keyboard input. */
  const handleSetPendingQuantity = (value: number): void => {
    setPendingQuantity(Math.max(0, Math.floor(value)));
  };

  /** Persist the local quantity to the database. */
  const handleSaveQuantity = async (): Promise<void> => {
    if (!product) return;
    setActionLoading(true);
    const success = await setQuantity(product.id, pendingQuantity);
    if (success) {
      setProduct((prev) => prev ? { ...prev, quantity: pendingQuantity } : null);
      setSnackbar({ open: true, message: `Quantity updated to ${pendingQuantity}.` });
    }
    setActionLoading(false);
  };

  /** Soft-delete the product after confirmation. */
  const handleRemove = async (): Promise<void> => {
    if (!product) return;
    setActionLoading(true);
    const success = await removeProduct(product.id);
    setActionLoading(false);
    setConfirmOpen(false);
    if (success) {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!product) {
    return (
      <Alert severity="error">Product not found.</Alert>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Action buttons — above the card */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
        >
          Back to List
        </Button>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 2 }}>
          {/* Remove button: only enabled when quantity is 0 */}
          <Tooltip
            title={product.quantity > 0 ? 'Product can only be removed when quantity is 0.' : ''}
          >
            <span>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                disabled={product.quantity > 0 || actionLoading}
                onClick={() => setConfirmOpen(true)}
              >
                Remove
              </Button>
            </span>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/products/${product.id}/edit`)}
          >
            Edit
          </Button>
        </Box>
      </Box>

      {/* Product card with quantity below price */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {/* Product image */}
          {product.image_path && (
            <Box
              component="img"
              src={getPublicUrl(product.image_path)}
              alt={product.name}
              sx={{
                width: 300,
                height: 300,
                objectFit: 'cover',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
          )}

          {/* Product details */}
          <Box sx={{ flex: 1, minWidth: 280 }}>
            <Typography variant="h4" gutterBottom>
              {product.name}
            </Typography>

            {product.description && (
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                {product.description}
              </Typography>
            )}

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>Category:</strong> {product.category?.name ?? '—'}
            </Typography>

            <Typography variant="h5" color="primary" sx={{ mb: 2 }}>
              RM {formatPrice(product.price)}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <QuantityControl
                quantity={pendingQuantity}
                onIncrement={handleIncrement}
                onDecrement={handleDecrement}
                onSetQuantity={handleSetPendingQuantity}
                disabled={actionLoading}
              />
              {hasQuantityChanged && (
                <Button
                  variant="contained"
                  startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                  onClick={handleSaveQuantity}
                  disabled={actionLoading}
                >
                  Update
                </Button>
              )}
            </Box>
          </Box>
        </Box>

        {/* Audit record — bottom-right of card */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mt: 2 }}>
          Created: {new Date(product.created_at).toLocaleDateString()}
          {createdByName && <> by {createdByName}</>}
          {product.edited_at && (
            <> | Last edited: {new Date(product.edited_at).toLocaleDateString()}
              {editedByName && <> by {editedByName}</>}
            </>
          )}
        </Typography>
      </Paper>

      {/* Confirmation dialog for product removal */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Remove Product</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove &quot;{product.name}&quot;? This action will
            soft-delete the product from the catalog.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button
            onClick={handleRemove}
            color="error"
            variant="contained"
            disabled={actionLoading}
          >
            {actionLoading ? <CircularProgress size={20} /> : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success feedback snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ open: false, message: '' })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
