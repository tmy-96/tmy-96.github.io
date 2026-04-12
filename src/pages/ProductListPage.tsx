/**
 * Product list page (landing page).
 *
 * Displays a paginated MUI table of all active products. Supports
 * server-side filtering, sorting, and pagination with column visibility control.
 */
import { memo, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
  Skeleton,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import { useProducts } from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';
import { useUserNames } from '../hooks/useUserNames';
import type { Product } from '../types/product';
import { formatPrice } from '../utils/formatters';

type SortColumn =
  | 'name'
  | 'description'
  | 'price'
  | 'quantity'
  | 'category'
  | 'created_at'
  | 'created_by'
  | 'edited_at'
  | 'edited_by';
type SortDirection = 'asc' | 'desc';
type ColumnKey = SortColumn;

interface ColumnDefinition {
  key: ColumnKey;
  label: string;
}

const COLUMNS: ColumnDefinition[] = [
  { key: 'name', label: 'Name' },
  { key: 'description', label: 'Description' },
  { key: 'category', label: 'Category' },
  { key: 'price', label: 'Price (RM)' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'created_at', label: 'Created At' },
  { key: 'created_by', label: 'Created By' },
  { key: 'edited_at', label: 'Edited At' },
  { key: 'edited_by', label: 'Edited By' },
];

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  name: true,
  description: false,
  category: true,
  price: true,
  quantity: true,
  created_at: false,
  created_by: false,
  edited_at: false,
  edited_by: false,
};

interface SearchInputProps {
  onApply: (value: string) => void;
  onClear: () => void;
}

const SearchInput = memo(function SearchInput({ onApply, onClear }: SearchInputProps) {
  const [value, setValue] = useState<string>('');

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    onApply(value.trim());
  };

  const handleClear = (): void => {
    setValue('');
    onClear();
  };

  return (
    <TextField
      label="Search"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="Search name"
      size="small"
      slotProps={{
        input: {
          endAdornment:
            value.length > 0 ? (
              <InputAdornment position="end">
                <IconButton
                  aria-label="Clear search"
                  edge="end"
                  size="small"
                  onClick={handleClear}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
        },
      }}
      sx={{ minWidth: 260, flex: 1 }}
    />
  );
});

export default function ProductListPage() {
  const navigate = useNavigate();
  const { products, loading, error, totalCount, fetchProducts } = useProducts();
  const { categories } = useCategories();
  const { userNames, resolveUserName } = useUserNames();

  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(
    DEFAULT_VISIBLE_COLUMNS
  );
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<HTMLElement | null>(null);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(totalCount / rowsPerPage) - 1));

  useEffect(() => {
    fetchProducts({
      page: currentPage,
      rowsPerPage,
      searchTerm,
      categoryId: categoryFilter,
      sortBy,
      sortDirection,
    });
  }, [categoryFilter, currentPage, fetchProducts, rowsPerPage, searchTerm, sortBy, sortDirection]);

  useEffect(() => {
    const preloadUserNames = async (): Promise<void> => {
      const ids = Array.from(
        new Set(
          products.flatMap((product) => [product.created_by, product.edited_by]).filter(Boolean)
        )
      ) as string[];

      await Promise.all(ids.map((id) => resolveUserName(id)));
    };

    if (products.length > 0) {
      void preloadUserNames();
    }
  }, [products, resolveUserName]);

  const displayedColumns = useMemo(
    () => COLUMNS.filter((column) => visibleColumns[column.key]),
    [visibleColumns]
  );

  const hasActiveFilters = searchTerm.trim() !== '' || categoryFilter !== 'all';

  const handleRowClick = (productId: string): void => {
    navigate(`/products/${productId}`);
  };

  const handleChangePage = (_event: unknown, newPage: number): void => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleApplySearch = (value: string): void => {
    setSearchTerm(value);
    setPage(0);
  };

  const handleClearSearch = (): void => {
    setSearchTerm('');
    setPage(0);
  };

  const handleCategoryFilterChange = (event: SelectChangeEvent<string>): void => {
    setCategoryFilter(event.target.value);
    setPage(0);
  };

  const handleSort = (column: SortColumn): void => {
    if (sortBy === column) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortBy(column);
    setSortDirection('asc');
  };

  const handleToggleColumn = (column: ColumnKey): void => {
    setVisibleColumns((current) => {
      const nextVisibleColumns = {
        ...current,
        [column]: !current[column],
      };

      return Object.values(nextVisibleColumns).some(Boolean) ? nextVisibleColumns : current;
    });
  };

  const renderCellValue = (product: Product, column: keyof Product): string | number => {
    switch (column) {
      case 'name':
        return product.name;
      case 'description':
        return product.description ?? '—';
      case 'category':
        return product.category?.name ?? '—';
      case 'price':
        return formatPrice(product.price);
      case 'quantity':
        return product.quantity;
      case 'created_at':
        return new Date(product.created_at).toLocaleString();
      case 'created_by':
        return userNames[product.created_by ?? ''] ?? (product.created_by ? 'Loading...' : '—');
      case 'edited_at':
        return product.edited_at ? new Date(product.edited_at).toLocaleString() : '—';
      case 'edited_by':
        return userNames[product.edited_by ?? ''] ?? (product.edited_by ? 'Loading...' : '—');
      default:
        return '—';
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="h5" component="h1">
          Products
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/products/new')}
        >
          Create Product
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && products.length === 0 && !hasActiveFilters ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No products yet. Click &quot;Add Product&quot; to create your first one.
          </Typography>
        </Paper>
      ) : (
        <Paper sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              p: 2,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <SearchInput onApply={handleApplySearch} onClear={handleClearSearch} />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="category-filter-label">Category</InputLabel>
              <Select
                labelId="category-filter-label"
                value={categoryFilter}
                label="Category"
                onChange={handleCategoryFilterChange}
              >
                <MenuItem value="all">All Categories</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<ViewColumnIcon />}
              onClick={(event) => setColumnMenuAnchor(event.currentTarget)}
            >
              Columns
            </Button>
            <Menu
              anchorEl={columnMenuAnchor}
              open={Boolean(columnMenuAnchor)}
              onClose={() => setColumnMenuAnchor(null)}
            >
              {COLUMNS.map((column) => (
                <MenuItem key={column.key} onClick={() => handleToggleColumn(column.key)} dense>
                  <Checkbox checked={visibleColumns[column.key]} size="small" />
                  <ListItemText>{column.label}</ListItemText>
                </MenuItem>
              ))}
            </Menu>
          </Box>

          {loading ? (
            <TableContainer sx={{ flex: 1, minHeight: 0 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    {displayedColumns.map((column) => (
                      <TableCell key={column.key} align="left" sx={{ fontWeight: 700 }}>
                        <TableSortLabel
                          active={sortBy === column.key}
                          direction={sortBy === column.key ? sortDirection : 'asc'}
                          onClick={() => handleSort(column.key)}
                          sx={{ fontWeight: 700 }}
                        >
                          {column.label}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.from({ length: rowsPerPage + 1}).map((_, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {displayedColumns.map((column) => (
                        <TableCell key={column.key}>
                          <Skeleton variant="text" width="80%" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : products.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No products match the current filters.
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer sx={{ flex: 1, minHeight: 0 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      {displayedColumns.map((column) => (
                        <TableCell
                          key={column.key}
                          align="left"
                          sx={{ fontWeight: 700 }}
                        >
                          <TableSortLabel
                            active={sortBy === column.key}
                            direction={sortBy === column.key ? sortDirection : 'asc'}
                            onClick={() => handleSort(column.key)}
                            sx={{
                              fontWeight: 700,
                            }}
                          >
                            {column.label}
                          </TableSortLabel>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow
                        key={product.id}
                        hover
                        onClick={() => handleRowClick(product.id)}
                        sx={() => {
                          const isOutOfStock = product.quantity === 0;

                          return {
                            cursor: 'pointer',
                            ...(isOutOfStock
                              ? {
                                  backgroundColor: 'warning.light',
                                  '&.MuiTableRow-hover:hover': {
                                    backgroundColor: 'warning.main',
                                  },
                                }
                              : {}),
                          };
                        }}
                      >
                        {displayedColumns.map((column) => (
                          <TableCell
                            key={column.key}
                            align="left"
                            sx={
                              column.key === 'description'
                                ? {
                                    maxWidth: 240,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }
                                : undefined
                            }
                          >
                            {column.key === 'description' ? (
                              <Tooltip
                                title={product.description ?? ''}
                                placement="top-start"
                                disableHoverListener={!product.description}
                              >
                                <span>{renderCellValue(product, column.key)}</span>
                              </Tooltip>
                            ) : (
                              renderCellValue(product, column.key)
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={totalCount}
                page={currentPage}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25]}
              />
            </>
          )}
        </Paper>
      )}
    </Box>
  );
}
