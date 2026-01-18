import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Container, Typography, Box, FormControl, Select, MenuItem, SelectChangeEvent, Tabs, Tab } from '@mui/material';
import { GridRowSelectionModel, GridSortModel } from '@mui/x-data-grid';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FiltersTable from './components/FiltersTable';
import FilterForm from './components/FilterForm';
import ConfirmDialog from './components/ConfirmDialog';
import ReportsPage from './components/ReportsPage';
import { Filter } from './types';
import { fetchFilters, deleteFilters, Database } from './api/filters';

interface ListPageProps {
  filters: Filter[];
  loading: boolean;
  database: Database;
  pageSize: number;
  page: number;
  searchQuery: string;
  selectedIds: GridRowSelectionModel;
  sortModel: GridSortModel;
  selectedReportId: string;
  onDatabaseChange: (db: Database) => void;
  onPageSizeChange: (size: number) => void;
  onPageChange: (page: number) => void;
  onSearchQueryChange: (query: string) => void;
  onSelectedIdsChange: (ids: GridRowSelectionModel) => void;
  onSortModelChange: (model: GridSortModel) => void;
  onSelectedReportIdChange: (id: string) => void;
  onDeleteSelected: (ids: string[]) => void;
}

function ListPage({ filters, loading, database, pageSize, page, searchQuery, selectedIds, sortModel, selectedReportId, onDatabaseChange, onPageSizeChange, onPageChange, onSearchQueryChange, onSelectedIdsChange, onSortModelChange, onSelectedReportIdChange, onDeleteSelected }: ListPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentTab = location.pathname === '/reports' ? '/reports' : '/';

  const handleDatabaseChange = (event: SelectChangeEvent) => {
    onDatabaseChange(event.target.value as Database);
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
    navigate(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab label="Filters" value="/" />
          <Tab label="Reports" value="/reports" />
        </Tabs>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select value={database} onChange={handleDatabaseChange}>
            <MenuItem value="karl">Karl</MenuItem>
            <MenuItem value="amy">Amy</MenuItem>
          </Select>
        </FormControl>
      </Box>
      {currentTab === '/' ? (
        <FiltersTable
          filters={filters}
          loading={loading}
          pageSize={pageSize}
          page={page}
          searchQuery={searchQuery}
          selectedIds={selectedIds}
          sortModel={sortModel}
          onPageSizeChange={onPageSizeChange}
          onPageChange={onPageChange}
          onSearchQueryChange={onSearchQueryChange}
          onSelectedIdsChange={onSelectedIdsChange}
          onSortModelChange={onSortModelChange}
          onDeleteSelected={onDeleteSelected}
        />
      ) : (
        <ReportsPage
          filters={filters}
          selectedReportId={selectedReportId}
          onSelectedReportIdChange={onSelectedReportIdChange}
        />
      )}
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
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const filter = id ? filters.find((f) => f.id === id) : undefined;
  const isEditing = Boolean(filter);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  const returnTo = (location.state as { returnTo?: string })?.returnTo || '/';

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
      navigate(returnTo);
    }
  };

  const handleConfirmLeave = () => {
    setShowUnsavedDialog(false);
    navigate(returnTo);
  };

  const handleCancelLeave = () => {
    setShowUnsavedDialog(false);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Link
          to={returnTo}
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
          <Typography variant="body2">
            {returnTo === '/reports' ? 'Back to reports' : 'Back to filters'}
          </Typography>
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
        returnTo={returnTo}
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

const DEFAULT_SORT_MODEL: GridSortModel = [{ field: 'updatedAt', sort: 'desc' }];

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

  // Filters table state (persists across tab switches)
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<GridRowSelectionModel>([]);
  const [sortModel, setSortModel] = useState<GridSortModel>(DEFAULT_SORT_MODEL);

  // Reports page state
  const [selectedReportId, setSelectedReportId] = useState('');

  const pageSize = pageSizes[database] ?? DEFAULT_PAGE_SIZE;

  const handlePageSizeChange = (newPageSize: number) => {
    const updated = { ...pageSizes, [database]: newPageSize };
    setPageSizes(updated);
    localStorage.setItem(PAGE_SIZE_STORAGE_KEY, JSON.stringify(updated));
  };

  const handlePageChange = useCallback((newPage: number) => setPage(newPage), []);
  const handleSearchQueryChange = useCallback((query: string) => setSearchQuery(query), []);
  const handleSelectedIdsChange = useCallback((ids: GridRowSelectionModel) => setSelectedIds(ids), []);
  const handleSortModelChange = useCallback((model: GridSortModel) => setSortModel(model), []);

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
              page={page}
              searchQuery={searchQuery}
              selectedIds={selectedIds}
              sortModel={sortModel}
              selectedReportId={selectedReportId}
              onDatabaseChange={handleDatabaseChange}
              onPageSizeChange={handlePageSizeChange}
              onPageChange={handlePageChange}
              onSearchQueryChange={handleSearchQueryChange}
              onSelectedIdsChange={handleSelectedIdsChange}
              onSortModelChange={handleSortModelChange}
              onSelectedReportIdChange={setSelectedReportId}
              onDeleteSelected={handleDeleteSelected}
            />
          }
        />
        <Route
          path="/reports"
          element={
            <ListPage
              filters={filters}
              loading={loading}
              database={database}
              pageSize={pageSize}
              page={page}
              searchQuery={searchQuery}
              selectedIds={selectedIds}
              sortModel={sortModel}
              selectedReportId={selectedReportId}
              onDatabaseChange={handleDatabaseChange}
              onPageSizeChange={handlePageSizeChange}
              onPageChange={handlePageChange}
              onSearchQueryChange={handleSearchQueryChange}
              onSelectedIdsChange={handleSelectedIdsChange}
              onSortModelChange={handleSortModelChange}
              onSelectedReportIdChange={setSelectedReportId}
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
