import { useState, useEffect } from 'react';
import { Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Box, FormControl, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FiltersTable from './components/FiltersTable';
import FilterForm from './components/FilterForm';
import ConfirmDialog from './components/ConfirmDialog';
import { Filter } from './types';
import { fetchFilters, deleteFilters, Database } from './api/filters';

interface ListPageProps {
  filters: Filter[];
  loading: boolean;
  database: Database;
  pageSize: number;
  onDatabaseChange: (db: Database) => void;
  onPageSizeChange: (size: number) => void;
  onDeleteSelected: (ids: string[]) => void;
}

function ListPage({ filters, loading, database, pageSize, onDatabaseChange, onPageSizeChange, onDeleteSelected }: ListPageProps) {
  const handleDatabaseChange = (event: SelectChangeEvent) => {
    onDatabaseChange(event.target.value as Database);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" color="primary" fontWeight="bold">
          Proton Filters
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select value={database} onChange={handleDatabaseChange}>
            <MenuItem value="karl">Karl</MenuItem>
            <MenuItem value="amy">Amy</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <FiltersTable filters={filters} loading={loading} pageSize={pageSize} onPageSizeChange={onPageSizeChange} onDeleteSelected={onDeleteSelected} />
    </Container>
  );
}

interface FormPageProps {
  filters: Filter[];
  database: Database;
  onFilterCreated: (filter: Filter) => void;
  onFilterUpdated: (filter: Filter) => void;
}

function FormPage({ filters, database, onFilterCreated, onFilterUpdated }: FormPageProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const filter = id ? filters.find((f) => f.id === id) : undefined;
  const isEditing = Boolean(filter);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  // Compute unique labels from all other filters (excluding current filter if editing)
  const availableLabels = Array.from(
    new Set(filters.filter((f) => f.id !== id).flatMap((f) => f.labels))
  ).sort();

  // Compute unique folders from all filters
  const availableFolders = Array.from(
    new Set(filters.map((f) => f.targetFolder).filter((f) => f !== ''))
  ).sort();

  // Get existing filter names, excluding the current filter if editing
  const existingFilterNames = filters
    .filter((f) => f.id !== id)
    .map((f) => f.name);

  // Get folder leaf names from all other filters for system-wide conflict validation
  const existingFolderLeafNames = filters
    .filter((f) => f.id !== id)
    .map((f) => {
      if (!f.targetFolder) return '';
      const parts = f.targetFolder.split('/');
      return parts[parts.length - 1];
    })
    .filter((name) => name !== '');

  const handleBackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isDirty) {
      setShowUnsavedDialog(true);
    } else {
      navigate('/');
    }
  };

  const handleConfirmLeave = () => {
    setShowUnsavedDialog(false);
    navigate('/');
  };

  const handleCancelLeave = () => {
    setShowUnsavedDialog(false);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Link
          to="/"
          onClick={handleBackClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            color: 'inherit',
            textDecoration: 'none',
            marginBottom: 8,
          }}
        >
          <ArrowBackIcon fontSize="small" />
          <Typography variant="body2">Back to filters</Typography>
        </Link>
        <Typography variant="h4" component="h1" color="primary" fontWeight="bold">
          {isEditing ? 'Edit Filter' : 'New Filter'}
        </Typography>
      </Box>
      <FilterForm
        filter={filter}
        database={database}
        availableLabels={availableLabels}
        availableFolders={availableFolders}
        existingFilterNames={existingFilterNames}
        existingFolderLeafNames={existingFolderLeafNames}
        onFilterCreated={onFilterCreated}
        onFilterUpdated={onFilterUpdated}
        onDirtyChange={setIsDirty}
      />
      <ConfirmDialog
        open={showUnsavedDialog}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
        confirmLabel="Leave"
        onConfirm={handleConfirmLeave}
        onCancel={handleCancelLeave}
      />
    </Container>
  );
}

const STORAGE_KEY = 'proton-filters-database';
const PAGE_SIZE_STORAGE_KEY = 'proton-filters-page-size';
const DEFAULT_PAGE_SIZE = 10;

function getStoredPageSizes(): Record<string, number> {
  try {
    const saved = localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function App() {
  const [database, setDatabase] = useState<Database>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'karl' || saved === 'amy' ? saved : 'karl';
  });
  const [pageSizes, setPageSizes] = useState<Record<string, number>>(getStoredPageSizes);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  const pageSize = pageSizes[database] ?? DEFAULT_PAGE_SIZE;

  const handlePageSizeChange = (newPageSize: number) => {
    const updated = { ...pageSizes, [database]: newPageSize };
    setPageSizes(updated);
    localStorage.setItem(PAGE_SIZE_STORAGE_KEY, JSON.stringify(updated));
  };

  useEffect(() => {
    setLoading(true);
    fetchFilters(database)
      .then(setFilters)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [database]);

  const handleDatabaseChange = (db: Database) => {
    setDatabase(db);
    localStorage.setItem(STORAGE_KEY, db);
  };

  const handleFilterCreated = (filter: Filter) => {
    setFilters((prev) => [...prev, filter]);
  };

  const handleFilterUpdated = (filter: Filter) => {
    setFilters((prev) => prev.map((f) => (f.id === filter.id ? filter : f)));
  };

  const handleDeleteSelected = (ids: string[]) => {
    setPendingDeleteIds(ids);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteFilters(database, pendingDeleteIds);
      setFilters((prev) => prev.filter((f) => !pendingDeleteIds.includes(f.id)));
    } catch (error) {
      console.error('Failed to delete filters:', error);
    } finally {
      setDeleteDialogOpen(false);
      setPendingDeleteIds([]);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setPendingDeleteIds([]);
  };

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <ListPage
              filters={filters}
              loading={loading}
              database={database}
              pageSize={pageSize}
              onDatabaseChange={handleDatabaseChange}
              onPageSizeChange={handlePageSizeChange}
              onDeleteSelected={handleDeleteSelected}
            />
          }
        />
        <Route
          path="/filters/new"
          element={
            <FormPage
              filters={filters}
              database={database}
              onFilterCreated={handleFilterCreated}
              onFilterUpdated={handleFilterUpdated}
            />
          }
        />
        <Route
          path="/filters/:id"
          element={
            <FormPage
              filters={filters}
              database={database}
              onFilterCreated={handleFilterCreated}
              onFilterUpdated={handleFilterUpdated}
            />
          }
        />
      </Routes>
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Filters"
        message={`Are you sure you want to delete ${pendingDeleteIds.length} filter${pendingDeleteIds.length === 1 ? '' : 's'}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
}

export default App;
