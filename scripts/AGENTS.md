# Scripts

Start and stop scripts for the Docker container.

| Script          | OS           |
|-----------------|-------------|
| `start.sh`      | Linux/macOS |
| `start.ps1`     | Windows     |
| `stop.sh`       | Linux/macOS |
| `stop.ps1`      | Windows     |

## Usage

```bash
# Linux/macOS
./scripts/start.sh
./scripts/stop.sh

# Windows
.\scripts\start.ps1
.\scripts\stop.ps1
```

These use `docker compose` from the project root.
