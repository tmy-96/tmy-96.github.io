/**
 * Quantity control component.
 *
 * Renders increment (+) and decrement (-) buttons around an editable
 * number input field. Supports both button clicks and direct keyboard
 * input for quantity adjustment. Enforces a minimum value of 0.
 */
import { useState, useEffect } from 'react';
import { Box, IconButton, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

interface QuantityControlProps {
  /** Current quantity value. */
  quantity: number;
  /** Called when the user increments the quantity. */
  onIncrement: () => void;
  /** Called when the user decrements the quantity. */
  onDecrement: () => void;
  /** Called when the user types a specific quantity value. */
  onSetQuantity: (value: number) => void;
  /** Whether the controls are disabled (e.g., during a save operation). */
  disabled?: boolean;
}

export default function QuantityControl({
  quantity,
  onIncrement,
  onDecrement,
  onSetQuantity,
  disabled = false,
}: QuantityControlProps) {
  // Local state for the input field to allow typing without immediate validation
  const [inputValue, setInputValue] = useState<string>(String(quantity));

  // Sync local input with external quantity prop changes
  useEffect(() => {
    setInputValue(String(quantity));
  }, [quantity]);

  /**
   * Handle direct keyboard input in the quantity field.
   * Updates local state immediately; commits on blur.
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setInputValue(e.target.value);
  };

  /**
   * Commit the typed value on blur.
   * Parses the input, clamps to minimum 0, and calls onSetQuantity.
   */
  const handleBlur = (): void => {
    const parsed = parseInt(inputValue, 10);
    if (isNaN(parsed) || parsed < 0) {
      // Reset to current quantity if input is invalid
      setInputValue(String(quantity));
    } else {
      onSetQuantity(parsed);
    }
  };

  /** Commit on Enter key press for better keyboard UX. */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* Decrement button: disabled when quantity is 0 to enforce minimum */}
      <IconButton
        onClick={onDecrement}
        disabled={disabled || quantity <= 0}
        color="primary"
        size="small"
        aria-label="Decrease quantity"
      >
        <RemoveIcon />
      </IconButton>

      {/* Editable quantity input for direct keyboard entry */}
      <TextField
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        type="number"
        size="small"
        slotProps={{ htmlInput: { min: 0, style: { textAlign: 'center', width: '60px' } } }}
        aria-label="Product quantity"
      />

      {/* Increment button */}
      <IconButton
        onClick={onIncrement}
        disabled={disabled}
        color="primary"
        size="small"
        aria-label="Increase quantity"
      >
        <AddIcon />
      </IconButton>
    </Box>
  );
}
