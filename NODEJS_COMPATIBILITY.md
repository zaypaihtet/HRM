# Node.js Compatibility Guide for HRFlow

## The Issue

If you're seeing this error when running `npm run dev`:

```
TypeError [ERR_INVALID_ARG_TYPE]: The "paths[0]" argument must be of type string. Received undefined
```

This is caused by a Node.js version compatibility issue with the vite.config.ts file. The configuration uses `import.meta.dirname` which is only available in Node.js 20.11+.

## Quick Solutions

### Solution 1: Use the Node.js 18 Compatible Script (Immediate Fix)

Instead of `npm run dev`, use the compatibility script:

```bash
# Make the script executable
chmod +x dev-node18.sh

# Run the compatible development server
./dev-node18.sh
```

This bypasses the vite configuration issues and starts the server directly.

### Solution 2: Upgrade Node.js (Recommended)

**Using Node Version Manager (nvm) - Linux/macOS:**
```bash
# Install nvm if you don't have it
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart your terminal or run:
source ~/.bashrc

# Install and use Node.js 20
nvm install 20
nvm use 20

# Verify the version
node --version  # Should show v20.x.x

# Now you can use npm run dev normally
npm run dev
```

**Using Package Manager - Ubuntu/Debian:**
```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js 20
sudo apt-get install -y nodejs

# Verify installation
node --version
```

**Using Package Manager - macOS (Homebrew):**
```bash
# Install Node.js 20
brew install node@20
brew link node@20

# Verify installation
node --version
```

**Manual Installation:**
- Download Node.js 20.x from [nodejs.org](https://nodejs.org/en/download/)
- Follow the installation instructions for your operating system

### Solution 3: Alternative Development Command

If you can't upgrade Node.js right away, you can also run:

```bash
NODE_ENV=development npx tsx server/index.ts
```

This starts only the backend server. You'll need to access the frontend through the served files.

## Verification

After upgrading Node.js or using the compatibility script:

1. **Check Node.js version:**
   ```bash
   node --version
   ```

2. **Install dependencies (if you upgraded Node.js):**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Push database schema:**
   ```bash
   npm run db:push
   ```

4. **Start development server:**
   ```bash
   npm run dev
   # OR
   ./dev-node18.sh  # For Node.js 18/19
   ```

5. **Access the application:**
   - Web interface: http://localhost:5000
   - Mobile interface: http://localhost:5000/mobile-app

## Node.js Version Support

| Node.js Version | Status | Recommendation |
|----------------|--------|----------------|
| 20.11+ | ✅ Fully Supported | Recommended |
| 20.0-20.10 | ⚠️ Partial Support | Use compatibility script |
| 18.x-19.x | ⚠️ Compatibility Issues | Use dev-node18.sh script |
| 16.x and below | ❌ Not Supported | Upgrade required |

## Troubleshooting

### Issue: Still getting vite config errors after upgrade
**Solution:** Clear npm cache and reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Issue: nvm command not found
**Solution:** Make sure nvm is properly installed and your shell is restarted:
```bash
source ~/.bashrc
# or
source ~/.zshrc
```

### Issue: Permission errors during Node.js upgrade
**Solution:** Use nvm instead of system package managers to avoid permission issues.

## What Each Solution Does

- **dev-node18.sh**: Bypasses vite entirely and runs the server directly
- **Node.js 20+**: Enables full vite functionality with hot module replacement
- **tsx direct**: Runs only the backend server without frontend development features

For the best development experience, upgrading to Node.js 20+ is recommended.