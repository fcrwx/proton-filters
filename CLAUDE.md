# Claude Development Guidelines

## Production Data - DO NOT MODIFY

The following databases contain production data and must NOT be modified, deleted, or used for testing:

- `data/filters-karl.json` - Karl's filters (production)
- `data/filters-amy.json` - Amy's filters (production)

### When testing or developing:

1. **Never run DELETE, PUT, or POST requests against `?db=karl` or `?db=amy`**
2. If you need to test API endpoints, create a new test database (e.g., `?db=test`) by adding it to `VALID_DATABASES` in `backend/src/storage.ts`
3. Do not use `wget`, `curl`, or any HTTP client to create/modify/delete filters in karl or amy databases
4. When verifying functionality, use GET requests only against production databases, or test with a dedicated test database

### Adding a test database:

1. Edit `backend/src/storage.ts`
2. Add `'test'` to `VALID_DATABASES`: `export const VALID_DATABASES = ['karl', 'amy', 'test'] as const;`
3. Use `?db=test` for all testing
4. Remove test database from `VALID_DATABASES` before committing if not needed

## Project Structure

- `frontend/` - React + Vite + MUI frontend
- `backend/` - Express + TypeScript backend
- `data/` - JSON file storage (mounted as Docker volume)

## Development Commands

```bash
# Start development environment
docker compose -f docker-compose.dev.yml up --build

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Stop environment
docker compose -f docker-compose.dev.yml down
```
