import { useMemo } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Link,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Filter } from '../types';

interface Report {
  id: string;
  name: string;
  description: string;
  run: (filters: Filter[]) => Filter[];
}

const reports: Report[] = [
  {
    id: 'no-from-address',
    name: 'Filters without From address',
    description: 'Lists all filters that do not specify any From addresses',
    run: (filters) => filters.filter((f) => f.fromAddresses.length === 0 || f.fromAddresses.every((a) => !a.trim())),
  },
  {
    id: 'no-to-address',
    name: 'Filters without To address',
    description: 'Lists all filters that do not specify a To address',
    run: (filters) => filters.filter((f) => !f.toAddress),
  },
  {
    id: 'no-labels',
    name: 'Filters without labels',
    description: 'Lists all filters that do not have any labels assigned',
    run: (filters) => filters.filter((f) => f.labels.length === 0),
  },
  {
    id: 'no-expiration',
    name: 'Filters without expiration',
    description: 'Lists all filters that do not have an expiration set',
    run: (filters) => filters.filter((f) => f.expirationDays === null),
  },
  {
    id: 'no-folder',
    name: 'Filters without target folder',
    description: 'Lists all filters that do not move emails to a folder',
    run: (filters) => filters.filter((f) => !f.targetFolder),
  },
];

interface ReportsPageProps {
  filters: Filter[];
  selectedReportId: string;
  onSelectedReportIdChange: (id: string) => void;
}

export default function ReportsPage({ filters, selectedReportId, onSelectedReportIdChange }: ReportsPageProps) {
  const navigate = useNavigate();

  const selectedReport = reports.find((r) => r.id === selectedReportId);

  const results = useMemo(() => {
    if (!selectedReport) return [];
    return selectedReport.run(filters);
  }, [selectedReport, filters]);

  const handleReportChange = (event: SelectChangeEvent) => {
    onSelectedReportIdChange(event.target.value);
  };

  const handleFilterClick = (filterId: string) => {
    navigate(`/filters/${filterId}`, { state: { returnTo: '/reports' } });
  };

  return (
    <Box>
      <FormControl sx={{ minWidth: 300, mb: 4 }}>
        <InputLabel>Select a report</InputLabel>
        <Select
          value={selectedReportId}
          onChange={handleReportChange}
          label="Select a report"
        >
          {reports.map((report) => (
            <MenuItem key={report.id} value={report.id}>
              {report.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {selectedReport && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {selectedReport.description}
          </Typography>

          {results.length === 0 ? (
            <Typography color="text.secondary">
              No filters match this report criteria.
            </Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>From Addresses</TableCell>
                    <TableCell>Target Folder</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.map((filter) => (
                    <TableRow key={filter.id} hover>
                      <TableCell>
                        <Link
                          component="button"
                          variant="body2"
                          onClick={() => handleFilterClick(filter.id)}
                          sx={{ textAlign: 'left' }}
                        >
                          {filter.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {filter.fromAddresses.length > 0
                          ? filter.fromAddresses.join(', ')
                          : '-'}
                      </TableCell>
                      <TableCell>{filter.targetFolder || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {results.length} {results.length === 1 ? 'filter' : 'filters'} found
          </Typography>
        </Box>
      )}
    </Box>
  );
}
