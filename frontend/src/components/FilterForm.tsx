import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  Autocomplete,
  Chip,
  Stack,
  Paper,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { createFilter, updateFilter, Database } from '../api/filters';
import { Filter } from '../types';

// Get the leaf name of a folder path (e.g., "Work/Projects" -> "Projects")
function getFolderLeafName(folderPath: string): string {
  if (!folderPath) return '';
  const parts = folderPath.split('/');
  return parts[parts.length - 1];
}

interface ValidationResult {
  error: string | null;
  conflictingLabel: string | null;
  conflictType: 'local' | 'external-label' | 'external-folder' | null;
}

// Validate that folder name doesn't conflict with labels (Proton Mail limitation)
// This includes system-wide checks across all filters
function validateFolderLabelConflict(
  targetFolder: string,
  labels: string[],
  existingFolderLeafNames: string[],
  existingLabels: string[]
): ValidationResult {
  const folderLeaf = getFolderLeafName(targetFolder).toLowerCase();

  // Check 1: Current folder conflicts with existing labels from other filters
  if (folderLeaf) {
    const conflictingLabel = existingLabels.find((l) => l.toLowerCase() === folderLeaf);
    if (conflictingLabel) {
      return {
        error: `Folder name "${getFolderLeafName(targetFolder)}" conflicts with label "${conflictingLabel}" used by another filter. Proton Mail does not allow folders and labels to share the same name.`,
        conflictingLabel,
        conflictType: 'external-label',
      };
    }
  }

  // Check 2: Current labels conflict with existing folder leaf names from other filters
  for (const label of labels) {
    const conflictingFolder = existingFolderLeafNames.find(
      (f) => f.toLowerCase() === label.toLowerCase()
    );
    if (conflictingFolder) {
      return {
        error: `Label "${label}" conflicts with folder name "${conflictingFolder}" used by another filter. Proton Mail does not allow folders and labels to share the same name.`,
        conflictingLabel: label,
        conflictType: 'external-folder',
      };
    }
  }

  // Check 3: Current folder conflicts with current labels (within same filter)
  if (folderLeaf && labels.length > 0) {
    const conflictingLabel = labels.find((label) => label.toLowerCase() === folderLeaf);
    if (conflictingLabel) {
      return {
        error: `Folder name "${getFolderLeafName(targetFolder)}" conflicts with label "${conflictingLabel}". Proton Mail does not allow folders and labels to share the same name.`,
        conflictingLabel,
        conflictType: 'local',
      };
    }
  }

  return { error: null, conflictingLabel: null, conflictType: null };
}

interface FilterFormState {
  name: string;
  fromAddresses: string[];
  toAddress: string;
  expirationDays: string;
  markRead: boolean;
  addYearLabel: boolean;
  targetFolder: string;
  labels: string[];
}

const initialState: FilterFormState = {
  name: '',
  fromAddresses: [''],
  toAddress: '',
  expirationDays: '',
  markRead: false,
  addYearLabel: false,
  targetFolder: '',
  labels: [],
};

interface FilterFormProps {
  filter?: Filter;
  database: Database;
  availableLabels: string[];
  availableFolders: string[];
  existingFilterNames: string[];
  existingFolderLeafNames: string[];
  returnTo?: string;
  onFilterCreated: (filter: Filter) => void;
  onFilterUpdated: (filter: Filter) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

function filterToFormState(filter: Filter): FilterFormState {
  return {
    name: filter.name,
    fromAddresses: filter.fromAddresses.length > 0 ? filter.fromAddresses : [''],
    toAddress: filter.toAddress,
    expirationDays: filter.expirationDays !== null ? String(filter.expirationDays) : '',
    markRead: filter.markRead,
    addYearLabel: filter.addYearLabel ?? false,
    targetFolder: filter.targetFolder,
    labels: filter.labels,
  };
}

export default function FilterForm({ filter, database, availableLabels, availableFolders, existingFilterNames, existingFolderLeafNames, returnTo = '/', onFilterCreated, onFilterUpdated, onDirtyChange }: FilterFormProps) {
  const navigate = useNavigate();
  const [formState, setFormState] = useState<FilterFormState>(
    filter ? filterToFormState(filter) : initialState
  );
  const [saving, setSaving] = useState(false);
  const [originalState, setOriginalState] = useState<FilterFormState>(
    filter ? filterToFormState(filter) : initialState
  );
  const isEditing = Boolean(filter);

  const validation = useMemo(
    () => validateFolderLabelConflict(formState.targetFolder, formState.labels, existingFolderLeafNames, availableLabels),
    [formState.targetFolder, formState.labels, existingFolderLeafNames, availableLabels]
  );

  const nameError = useMemo(() => {
    if (!formState.name.trim()) return null;
    const isDuplicate = existingFilterNames.some(
      (name) => name.toLowerCase() === formState.name.trim().toLowerCase()
    );
    return isDuplicate ? 'A filter with this name already exists' : null;
  }, [formState.name, existingFilterNames]);

  const isDirty = useMemo(() => {
    return JSON.stringify(formState) !== JSON.stringify(originalState);
  }, [formState, originalState]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (filter) {
      const state = filterToFormState(filter);
      setFormState(state);
      setOriginalState(state);
    } else {
      setFormState(initialState);
      setOriginalState(initialState);
    }
  }, [filter]);

  const handleChange = (field: keyof FilterFormState, value: unknown) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleFromAddressChange = (index: number, value: string) => {
    const newAddresses = [...formState.fromAddresses];
    newAddresses[index] = value;
    setFormState((prev) => ({ ...prev, fromAddresses: newAddresses }));
  };

  const addFromAddress = () => {
    setFormState((prev) => ({
      ...prev,
      fromAddresses: [...prev.fromAddresses, ''],
    }));
  };

  const removeFromAddress = (index: number) => {
    if (formState.fromAddresses.length > 1) {
      const newAddresses = formState.fromAddresses.filter((_, i) => i !== index);
      setFormState((prev) => ({ ...prev, fromAddresses: newAddresses }));
    }
  };

  const handleCancel = () => {
    navigate(returnTo);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const filterData = {
        name: formState.name,
        fromAddresses: formState.fromAddresses.filter((addr) => addr.trim() !== ''),
        toAddress: formState.toAddress,
        expirationDays: formState.expirationDays ? parseInt(formState.expirationDays, 10) : null,
        markRead: formState.markRead,
        addYearLabel: formState.addYearLabel,
        targetFolder: formState.targetFolder,
        labels: formState.labels,
      };
      if (isEditing && filter) {
        const updatedFilter = await updateFilter(database, filter.id, filterData);
        onFilterUpdated(updatedFilter);
      } else {
        const newFilter = await createFilter(database, filterData);
        onFilterCreated(newFilter);
      }
      navigate(returnTo);
    } catch (error) {
      console.error('Failed to save filter:', error);
      setSaving(false);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={3}>
        <TextField
          label="Name"
          value={formState.name}
          onChange={(e) => handleChange('name', e.target.value)}
          fullWidth
          error={!saving && Boolean(nameError)}
          helperText={!saving ? nameError : ''}
        />

        <Box>
          <Box sx={{ mb: 1, fontWeight: 500, color: 'text.secondary' }}>
            From Addresses
          </Box>
          <Stack spacing={1}>
            {formState.fromAddresses.map((address, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  value={address}
                  onChange={(e) => handleFromAddressChange(index, e.target.value)}
                  placeholder="email@example.com"
                  fullWidth
                  size="small"
                />
                {formState.fromAddresses.length > 1 && (
                  <IconButton
                    onClick={() => removeFromAddress(index)}
                    color="error"
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>
            ))}
            <Box>
              <Button
                startIcon={<AddIcon />}
                onClick={addFromAddress}
                size="small"
              >
                Add Address
              </Button>
            </Box>
          </Stack>
        </Box>

        <TextField
          label="To Address"
          value={formState.toAddress}
          onChange={(e) => handleChange('toAddress', e.target.value)}
          placeholder="email@example.com"
          fullWidth
        />

        <TextField
          label="Expiration (days)"
          type="number"
          value={formState.expirationDays}
          onChange={(e) => handleChange('expirationDays', e.target.value)}
          placeholder="Leave blank for no expiration"
          fullWidth
          slotProps={{
            htmlInput: { min: 1 },
          }}
        />

        <Autocomplete
          freeSolo
          options={availableFolders}
          value={formState.targetFolder}
          onChange={(_, newValue) => handleChange('targetFolder', newValue ?? '')}
          onInputChange={(_, newValue) => handleChange('targetFolder', newValue)}
          slotProps={{
            paper: {
              sx: {
                border: '1px solid rgba(255, 255, 255, 0.23)',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
                mt: 0.5,
              },
            },
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Target Folder"
              placeholder="Folder path"
              error={!saving && Boolean(validation.error) && (validation.conflictType === 'local' || validation.conflictType === 'external-label')}
              helperText={!saving && validation.error && (validation.conflictType === 'local' || validation.conflictType === 'external-label') ? `Conflicts with label "${validation.conflictingLabel}"${validation.conflictType === 'external-label' ? ' (another filter)' : ''}` : ''}
            />
          )}
        />

        <Autocomplete
          multiple
          freeSolo
          options={availableLabels}
          value={formState.labels}
          onChange={(_, newValue) => handleChange('labels', newValue)}
          slotProps={{
            paper: {
              sx: {
                border: '1px solid rgba(255, 255, 255, 0.23)',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
                mt: 0.5,
              },
            },
          }}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const { key, ...tagProps } = getTagProps({ index });
              const isConflicting = validation.conflictingLabel?.toLowerCase() === option.toLowerCase();
              return (
                <Chip
                  key={key}
                  label={option}
                  {...tagProps}
                  size="small"
                  color={isConflicting ? 'error' : 'default'}
                  sx={isConflicting ? { fontWeight: 'bold' } : undefined}
                />
              );
            })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label="Labels"
              placeholder="Select or type labels"
              error={!saving && Boolean(validation.error) && (validation.conflictType === 'local' || validation.conflictType === 'external-folder')}
              helperText={!saving && validation.error && (validation.conflictType === 'local' || validation.conflictType === 'external-folder') ? `"${validation.conflictingLabel}" conflicts with folder name${validation.conflictType === 'external-folder' ? ' (another filter)' : ''}` : ''}
            />
          )}
        />

        {!saving && validation.error && (
          <Alert severity="error">{validation.error}</Alert>
        )}

        <Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={formState.markRead}
                onChange={(e) => handleChange('markRead', e.target.checked)}
              />
            }
            label="Mark as read"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={formState.addYearLabel}
                onChange={(e) => handleChange('addYearLabel', e.target.checked)}
              />
            }
            label="Add year as label"
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', pt: 2 }}>
          <Button variant="outlined" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || Boolean(validation.error) || Boolean(nameError)}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
