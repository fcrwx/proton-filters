# Proton Filters

A web application for managing Proton Mail email filters. Create, edit, and organize your filters with an intuitive interface, and generate Sieve scripts for use in Proton Mail.

## Features

- Create and edit email filters with a user-friendly form
- Support for multiple From addresses, To address filtering
- Folder and label management with conflict detection (Proton Mail limitation)
- Auto-expiration settings
- Mark as read option
- Automatic year labeling
- Generate Sieve scripts compatible with Proton Mail
- Multi-user support with separate filter databases
- Reports to find filters missing certain criteria

## Prerequisites

- Docker and Docker Compose

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/fcrwx/proton-filters.git
   cd proton-filters
   ```

2. **Configure users**
   ```bash
   cp config/users.example.json config/users.json
   ```
   Edit `config/users.json` to add your user names:
   ```json
   {
     "users": ["alice", "bob"]
   }
   ```

3. **Start the application**
   ```bash
   docker compose -f docker-compose.dev.yml up --build
   ```

4. **Access the app**

   Open http://localhost:5173 in your browser.

## Data Storage

Filter data is stored in JSON files in the `data/` directory:
- `data/filters-{username}.json` - One file per configured user

These files are gitignored to protect your personal data.

## Project Structure

```
proton-filters/
├── frontend/          # React + Vite + MUI frontend
├── backend/           # Express + TypeScript backend
├── config/            # Configuration files
│   ├── users.json           # Your users (gitignored)
│   └── users.example.json   # Template for users config
└── data/              # Filter data storage (gitignored)
```

## Development

The development environment uses Docker with hot-reloading enabled for both frontend and backend.

```bash
# Start development environment
docker compose -f docker-compose.dev.yml up --build

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Stop environment
docker compose -f docker-compose.dev.yml down
```

## Sieve Script Generation

The app generates Sieve scripts compatible with Proton Mail. To use a generated script:

1. Click the code icon on any filter in the list
2. Copy the generated Sieve script
3. In Proton Mail, go to Settings > Filters > Add Sieve filter
4. Paste the script

**Note:** Labels referenced in the script must already exist in Proton Mail before the filter will work correctly.

## License

MIT
