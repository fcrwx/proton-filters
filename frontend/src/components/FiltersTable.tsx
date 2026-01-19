import { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Button, IconButton, Tooltip, TextField, InputAdornment } from '@mui/material';
import { DataGrid, GridColDef, GridRowSelectionModel, GridSortModel } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CodeIcon from '@mui/icons-material/Code';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { Filter } from '../types';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import ScriptDialog from './ScriptDialog';

function fuzzyMatch(text: string, query: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let queryIndex = 0;
  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
  }
  return queryIndex === lowerQuery.length;
}

interface FiltersTableProps {
  filters: Filter[];
  loading?: boolean;
  pageSize: number;
  page: number;
  searchQuery: string;
  selectedIds: GridRowSelectionModel;
  sortModel: GridSortModel;
  onPageSizeChange: (size: number) => void;
  onPageChange: (page: number) => void;
  onSearchQueryChange: (query: string) => void;
  onSelectedIdsChange: (ids: GridRowSelectionModel) => void;
  onSortModelChange: (model: GridSortModel) => void;
  onDeleteSelected: (ids: string[]) => void;
}

function EmptyState() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
      }}
    >
      <Typography variant="h6" color="text.primary" gutterBottom>
        No filters yet
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Create your first filter to get started
      </Typography>
    </Box>
  );
}

export default function FiltersTable({ filters, loading = false, pageSize, page, searchQuery, selectedIds, sortModel, onPageSizeChange, onPageChange, onSearchQueryChange, onSelectedIdsChange, onSortModelChange, onDeleteSelected }: FiltersTableProps) {
  const navigate = useNavigate();
  const [scriptDialogFilter, setScriptDialogFilter] = useState<Filter | null>(null);
  const [, setTick] = useState(0);

  // Auto-refresh relative times every minute
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // Clear selections for deleted items
  useEffect(() => {
    const filterIds = new Set(filters.map((f) => f.id));
    const validIds = selectedIds.filter((id) => filterIds.has(id as string));
    if (validIds.length !== selectedIds.length) {
      onSelectedIdsChange(validIds);
    }
  }, [filters, selectedIds, onSelectedIdsChange]);

  const filteredFilters = useMemo(() => {
    if (!searchQuery.trim()) {
      return filters;
    }
    return filters.filter((filter) => fuzzyMatch(filter.name, searchQuery));
  }, [filters, searchQuery]);

  const handleNewFilter = () => {
    navigate('/filters/new');
  };

  const handleSelectionChange = (newSelection: GridRowSelectionModel) => {
    onSelectedIdsChange(newSelection);
  };

  const handleDelete = () => {
    onDeleteSelected(selectedIds as string[]);
  };

  const handleScriptClick = (filter: Filter) => {
    setScriptDialogFilter(filter);
  };

  const handleScriptDialogClose = () => {
    setScriptDialogFilter(null);
  };

  const columns: GridColDef<Filter>[] = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'updatedAt',
      headerName: 'Updated',
      width: 180,
      valueFormatter: (value: Date) => formatRelativeTime(value),
    },
    {
      field: 'actions',
      headerName: '',
      width: 60,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <Tooltip title="View Sieve Script">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleScriptClick(params.row);
            }}
          >
            <CodeIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  if (filters.length === 0) {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNewFilter}
          >
            New Filter
          </Button>
        </Box>
        <EmptyState />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2 }}>
        <TextField
          placeholder="Search filters..."
          size="small"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && onSearchQueryChange('')}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => onSearchQueryChange('')}
                    edge="end"
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
          sx={{ width: 300 }}
        />
        <Box sx={{ display: 'flex', gap: 2 }}>
          {selectedIds.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDelete}
            >
              Delete ({selectedIds.length})
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNewFilter}
          >
            New Filter
          </Button>
        </Box>
      </Box>
      <DataGrid
        rows={filteredFilters}
        columns={columns}
        loading={loading}
        checkboxSelection
        rowSelectionModel={selectedIds}
        onRowSelectionModelChange={handleSelectionChange}
        keepNonExistentRowsSelected
        paginationModel={{ pageSize, page }}
        onPaginationModelChange={(model) => {
          onPageChange(model.page);
          if (model.pageSize !== pageSize) {
            onPageSizeChange(model.pageSize);
          }
        }}
        sortModel={sortModel}
        onSortModelChange={onSortModelChange}
        pageSizeOptions={[10, 25, 50]}
        disableRowSelectionOnClick
        onRowClick={(params, event) => {
          const target = event.target as HTMLElement;
          if (target.closest('.MuiCheckbox-root') || target.closest('.MuiIconButton-root')) {
            return;
          }
          navigate(`/filters/${params.row.id}`);
        }}
        sx={{
          border: 'none',
          '& .MuiDataGrid-row': {
            cursor: 'pointer',
          },
          '& .MuiDataGrid-cell': {
            borderColor: 'rgba(255, 255, 255, 0.1)',
          },
          '& .MuiDataGrid-columnHeaders': {
            borderColor: 'rgba(255, 255, 255, 0.1)',
          },
          '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
            outline: 'none',
          },
          '& .MuiDataGrid-footerContainer': {
            borderColor: 'rgba(255, 255, 255, 0.1)',
          },
        }}
      />
      <ScriptDialog
        open={scriptDialogFilter !== null}
        filter={scriptDialogFilter}
        onClose={handleScriptDialogClose}
      />
    </Box>
  );
}
