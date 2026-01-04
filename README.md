# Vite Plugin ScriptCat Backup

English / [中文](./README.zh.md)

## Features

A Vite plugin for automatically backing up built ScriptCat (or TamperMonkey) userscripts. Creates backup files based on script version numbers to prevent duplicate backups of the same version.

## Installation

```bash
npm install vite-plugin-scriptcat-backup -D
# or
yarn add vite-plugin-scriptcat-backup -D
# or
pnpm add vite-plugin-scriptcat-backup -D
```

## Configuration

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `backupDir` | `string` | Directory to store backup files | `'./backup'` |
| `match` | `RegExp` | Regular expression to match files for backup | `/\.js$/` |
| `scriptName` | `string` | Script name (used for generating backup filenames) | Current directory name |

## Usage

Add the plugin in `vite.config.js`:

```ts
import { defineConfig } from 'vite'
import backupScriptPlugin from 'vite-plugin-scriptcat-backup'

export default defineConfig({
  plugins: [
    // Other plugins...
    
    backupScriptPlugin({
      backupDir: './script-backups',
      scriptName: 'my-script'
    })
  ]
})
```

### Integration with vite-plugin-scriptcat-meta-banner

This plugin can automatically detect script version information parsed by `vite-plugin-scriptcat-meta-banner`:

```ts
import { defineConfig } from 'vite'
import metaBannerPlugin from 'vite-plugin-scriptcat-meta-banner'
import backupScriptPlugin from 'vite-plugin-scriptcat-backup'

export default defineConfig({
  plugins: [
    metaBannerPlugin({
      // meta-banner configuration
    }),
    backupScriptPlugin()
  ]
})
```

## How It Works

The plugin performs the following operations during the build process:

1. Attempts to get script version information from the `vite-plugin-scriptcat-meta-banner` plugin
2. If meta-banner plugin is not found, extracts `@version` metadata from the built script code
3. Checks if a backup already exists for the script version
4. Throws a `BackupExistError` if backup already exists
5. Saves the script code to the backup directory if no backup exists

**Backup File Naming Format:**
```
<scriptName>_<version>.backup.js
```

Example: `my-script_1.0.0.backup.js`

## Error Handling

If attempting to backup an already existing script version, the plugin throws a `BackupExistError` with version information:

```js
try {
  // Build process
} catch (error) {
  if (error instanceof BackupExistError) {
    console.error(`Version ${error.cause} already backed up, skipping backup`);
  }
}
```

## Contributing

Contributions are welcome! Please submit issues or PRs via [GitHub](https://github.com/your-username/vite-plugin-scriptcat-backup).

## License

GPL-3 © [Author Name](https://github.com/your-username)
