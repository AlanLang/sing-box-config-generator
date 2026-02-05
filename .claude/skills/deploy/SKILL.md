# Deploy Skill

Automates the complete deployment workflow: build, restart service, verify, commit, push, and notify.

## When to Use

- After making code changes that need to be deployed
- When user explicitly asks to deploy changes
- Before committing code changes to ensure they work in production

## Complete Deployment Workflow

This skill orchestrates the full deployment process with proper error handling and rollback capability.

### Workflow Steps

```
1. Build frontend (npm run build)
2. Build backend (cargo build --release)
3. Install/update systemd service
4. Restart service
5. Health check (verify service is running)
6. If healthy: commit + push + notify
7. If failed: report error and rollback if needed
```

## Usage

### Standard Deployment

When code changes are ready to deploy:

```bash
./.claude/scripts/deploy.sh
```

This script will:
- ✅ Build both frontend and backend
- ✅ Update systemd service if needed
- ✅ Restart the service
- ✅ Verify service health
- ✅ Display service status and useful commands

### After Successful Deployment

If deployment succeeds, proceed with:
1. Commit changes
2. Push to remote
3. Send Telegram notification

### On Deployment Failure

If deployment fails:
- ❌ Do NOT commit or push code
- Check logs: `sudo journalctl -u sing-box-config-generator -n 50`
- Fix the issue
- Re-run deployment

## Service Management

### View Service Status

```bash
systemctl status sing-box-config-generator
```

### View Real-time Logs

```bash
sudo journalctl -u sing-box-config-generator -f
```

### Manual Service Control

```bash
# Restart
sudo systemctl restart sing-box-config-generator

# Stop
sudo systemctl stop sing-box-config-generator

# Start
sudo systemctl start sing-box-config-generator

# Check if running
systemctl is-active sing-box-config-generator
```

## Health Check

The deployment script checks if the service responds at:
```
http://localhost:3006/api/log
```

- Timeout: 30 seconds
- If health check fails, deployment is considered failed

## Error Handling

### Build Errors

If frontend or backend build fails:
- Script exits immediately
- Error details are displayed
- Service is not restarted
- No commit/push occurs

### Service Start Errors

If service fails to start:
- Check logs for error details
- Common issues:
  - Port 3005 already in use
  - Missing dependencies
  - Configuration errors
  - Permission issues

### Health Check Failures

If service starts but health check fails:
- Service might be running but not responding
- Check: `curl -v http://localhost:3005/api/log`
- Review logs: `sudo journalctl -u sing-box-config-generator -n 100`

## Complete Task Flow

For a typical code change workflow:

```bash
# 1. Make code changes
# ... edit files ...

# 2. Run deployment script
./.claude/scripts/deploy.sh

# 3. If successful, commit and push
git add .
git commit -m "..."
git push

# 4. Send notification
./.claude/scripts/telegram-notify.sh "deployment summary"
```

## Rollback Strategy

If deployment fails after service restart:

### Quick Rollback

```bash
# Stop the broken service
sudo systemctl stop sing-box-config-generator

# Revert code changes
git reset --hard HEAD

# Rebuild
cargo build --release
npm run build

# Restart
sudo systemctl start sing-box-config-generator
```

### Clean State

```bash
# Stop service
sudo systemctl stop sing-box-config-generator

# Clean build artifacts
cargo clean
rm -rf web/

# Checkout working version
git checkout <last-working-commit>

# Rebuild and restart
./.claude/scripts/deploy.sh
```

## First Time Setup

### Initial Service Installation

```bash
# Run deploy script (it will install the service)
./.claude/scripts/deploy.sh

# Enable service to start on boot
sudo systemctl enable sing-box-config-generator

# Check status
systemctl status sing-box-config-generator
```

### Verify Installation

```bash
# Check service is active
systemctl is-active sing-box-config-generator

# Test API endpoint
curl http://localhost:3005/api/log

# View logs
sudo journalctl -u sing-box-config-generator -n 20
```

## Configuration Files

### systemd Service File

Location: `sing-box-config-generator.service`

Key settings:
- **ExecStart**: Path to compiled binary
- **WorkingDirectory**: Project root
- **User**: alan
- **Restart**: always (auto-restart on failure)

### Deployment Script

Location: `.claude/scripts/deploy.sh`

Customizable settings:
- `HEALTH_CHECK_URL`: Health check endpoint
- `HEALTH_CHECK_TIMEOUT`: Wait time for service (default: 30s)
- `PROJECT_ROOT`: Project directory

## Troubleshooting

### Issue: Port Already in Use

```bash
# Find process using port 3006
sudo lsof -i :3006

# Kill old process if needed
sudo kill -9 <PID>

# Restart service
sudo systemctl restart sing-box-config-generator
```

### Issue: Permission Denied

```bash
# Ensure binary is executable
chmod +x target/release/sing-box-config-generator

# Check service file permissions
ls -l /etc/systemd/system/sing-box-config-generator.service

# Reload systemd if needed
sudo systemctl daemon-reload
```

### Issue: Service Fails Immediately

```bash
# Check detailed logs
sudo journalctl -u sing-box-config-generator -n 50 --no-pager

# Try running binary directly to see errors
./target/release/sing-box-config-generator

# Check binary exists
ls -lh target/release/sing-box-config-generator
```

### Issue: Build Takes Too Long

Frontend and backend builds can take time:
- Frontend: ~10-30 seconds
- Backend (release): ~1-5 minutes
- First build is always slower (caching helps)

## Best Practices

1. **Always deploy before committing** - Ensures code works in production
2. **Monitor logs after deployment** - Catch issues early
3. **Keep service file in repo** - Version control for service configuration
4. **Test health check** - Verify endpoint responds correctly
5. **Document configuration** - Note any environment-specific settings

## Integration with Git Workflow

Updated workflow with deployment:

```
1. Make code changes
2. Run deployment script ← NEW STEP
3. Verify service is healthy ← NEW STEP
4. Commit changes (only if deployment succeeded)
5. Push to remote
6. Send Telegram notification
```

## Notes

- Deployment script requires `sudo` for systemctl commands
- First deployment installs and enables the service
- Subsequent deployments only restart the service
- Service file changes trigger automatic reload
- Health check must pass for deployment to be considered successful
- Failed deployments prevent code from being committed
