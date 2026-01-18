import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { readFilters, writeFilters, generateId, Filter, Database, VALID_DATABASES } from './storage';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

function getDatabase(req: Request, res: Response): Database | null {
  const db = req.query.db as string;
  if (!db || !VALID_DATABASES.includes(db as Database)) {
    res.status(400).json({ error: `Invalid database. Must be one of: ${VALID_DATABASES.join(', ')}` });
    return null;
  }
  return db as Database;
}

// Get the leaf name of a folder path (e.g., "Work/Projects" -> "Projects")
function getFolderLeafName(folderPath: string): string {
  if (!folderPath) return '';
  const parts = folderPath.split('/');
  return parts[parts.length - 1];
}

// Validate that folder name doesn't conflict with labels (Proton Mail limitation)
// This includes system-wide checks across all filters
function validateFolderLabelConflict(
  targetFolder: string,
  labels: string[],
  allFilters: Filter[],
  excludeId?: string
): string | null {
  const otherFilters = allFilters.filter((f) => f.id !== excludeId);
  const existingFolderLeafs = otherFilters
    .map((f) => getFolderLeafName(f.targetFolder))
    .filter((name) => name !== '');
  const existingLabels = otherFilters.flatMap((f) => f.labels);

  const folderLeaf = getFolderLeafName(targetFolder).toLowerCase();

  // Check 1: Current folder conflicts with existing labels from other filters
  if (folderLeaf) {
    const conflictingLabel = existingLabels.find((l) => l.toLowerCase() === folderLeaf);
    if (conflictingLabel) {
      return `Folder name "${getFolderLeafName(targetFolder)}" conflicts with label "${conflictingLabel}" used by another filter. Proton Mail does not allow folders and labels to share the same name.`;
    }
  }

  // Check 2: Current labels conflict with existing folder leaf names from other filters
  for (const label of labels) {
    const conflictingFolder = existingFolderLeafs.find(
      (f) => f.toLowerCase() === label.toLowerCase()
    );
    if (conflictingFolder) {
      return `Label "${label}" conflicts with folder name "${conflictingFolder}" used by another filter. Proton Mail does not allow folders and labels to share the same name.`;
    }
  }

  // Check 3: Current folder conflicts with current labels (within same filter)
  if (folderLeaf && labels.length > 0) {
    const conflictingLabel = labels.find((label) => label.toLowerCase() === folderLeaf);
    if (conflictingLabel) {
      return `Folder name "${getFolderLeafName(targetFolder)}" conflicts with label "${conflictingLabel}". Proton Mail does not allow folders and labels to share the same name.`;
    }
  }

  return null;
}

// Validate that filter name is unique (Proton Mail limitation)
function validateUniqueName(name: string, filters: Filter[], excludeId?: string): string | null {
  const trimmedName = name.trim().toLowerCase();
  const duplicate = filters.find(
    (f) => f.name.toLowerCase() === trimmedName && f.id !== excludeId
  );
  if (duplicate) {
    return `A filter with the name "${name}" already exists. Proton Mail requires unique filter names.`;
  }
  return null;
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/hello', (_req, res) => {
  res.json({ message: 'Hello from the backend!' });
});

app.get('/api/filters', async (req, res) => {
  const db = getDatabase(req, res);
  if (!db) return;
  try {
    const filters = await readFilters(db);
    res.json(filters);
  } catch (error) {
    console.error('Error reading filters:', error);
    res.status(500).json({ error: 'Failed to read filters' });
  }
});

app.post('/api/filters', async (req, res) => {
  const db = getDatabase(req, res);
  if (!db) return;
  try {
    const filters = await readFilters(db);
    const conflictError = validateFolderLabelConflict(req.body.targetFolder, req.body.labels || [], filters);
    if (conflictError) {
      res.status(400).json({ error: conflictError });
      return;
    }
    const nameError = validateUniqueName(req.body.name, filters);
    if (nameError) {
      res.status(400).json({ error: nameError });
      return;
    }
    const newFilter: Filter = {
      id: generateId(),
      name: req.body.name,
      fromAddresses: req.body.fromAddresses,
      toAddress: req.body.toAddress,
      expirationDays: req.body.expirationDays,
      markRead: req.body.markRead,
      addYearLabel: req.body.addYearLabel,
      targetFolder: req.body.targetFolder,
      labels: req.body.labels,
      updatedAt: new Date().toISOString(),
    };
    filters.push(newFilter);
    await writeFilters(db, filters);
    res.status(201).json(newFilter);
  } catch (error) {
    console.error('Error creating filter:', error);
    res.status(500).json({ error: 'Failed to create filter' });
  }
});

app.get('/api/filters/:id', async (req, res) => {
  const db = getDatabase(req, res);
  if (!db) return;
  try {
    const filters = await readFilters(db);
    const filter = filters.find((f) => f.id === req.params.id);
    if (!filter) {
      res.status(404).json({ error: 'Filter not found' });
      return;
    }
    res.json(filter);
  } catch (error) {
    console.error('Error reading filter:', error);
    res.status(500).json({ error: 'Failed to read filter' });
  }
});

app.put('/api/filters/:id', async (req, res) => {
  const db = getDatabase(req, res);
  if (!db) return;
  try {
    const filters = await readFilters(db);
    const index = filters.findIndex((f) => f.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Filter not found' });
      return;
    }
    const conflictError = validateFolderLabelConflict(req.body.targetFolder, req.body.labels || [], filters, req.params.id);
    if (conflictError) {
      res.status(400).json({ error: conflictError });
      return;
    }
    const nameError = validateUniqueName(req.body.name, filters, req.params.id);
    if (nameError) {
      res.status(400).json({ error: nameError });
      return;
    }
    const updatedFilter: Filter = {
      id: req.params.id,
      name: req.body.name,
      fromAddresses: req.body.fromAddresses,
      toAddress: req.body.toAddress,
      expirationDays: req.body.expirationDays,
      markRead: req.body.markRead,
      addYearLabel: req.body.addYearLabel,
      targetFolder: req.body.targetFolder,
      labels: req.body.labels,
      updatedAt: new Date().toISOString(),
    };
    filters[index] = updatedFilter;
    await writeFilters(db, filters);
    res.json(updatedFilter);
  } catch (error) {
    console.error('Error updating filter:', error);
    res.status(500).json({ error: 'Failed to update filter' });
  }
});

app.delete('/api/filters', async (req, res) => {
  const db = getDatabase(req, res);
  if (!db) return;
  try {
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'ids array is required' });
      return;
    }
    const filters = await readFilters(db);
    const idsSet = new Set(ids);
    const remainingFilters = filters.filter((f) => !idsSet.has(f.id));
    const deletedCount = filters.length - remainingFilters.length;
    await writeFilters(db, remainingFilters);
    res.json({ deleted: deletedCount });
  } catch (error) {
    console.error('Error deleting filters:', error);
    res.status(500).json({ error: 'Failed to delete filters' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
