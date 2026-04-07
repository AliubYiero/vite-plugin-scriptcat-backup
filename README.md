# Vite Plugin ScriptCat Backup

English / [中文](./README.zh.md)

## Features

A Vite plugin for automatically backing up built ScriptCat (or TamperMonkey) userscripts. Compresses all backup files into a single ZIP archive and manages version tracking via JSON, preventing duplicate backups of the same version.

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
3. Checks if a backup already exists via `versions.json`
4. Throws a `BackupExistError` if backup already exists
5. Writes the latest script to `${scriptName}.user.js`
6. Extracts existing ZIP archive (if any), adds new backup file, then recompresses
7. Updates `versions.json` with the new version entry

## Backup Directory Structure

```
./backup/
├── versions.json           # Version map: {"1.0.0": "my-script_1.0.0.backup.js"}
├── my-script.user.js       # Latest script (always updated)
└── my-script.zip           # All backup scripts compressed
    ├── my-script_1.0.0.backup.js
    ├── my-script_1.0.1.backup.js
    └── ...
```

| File | Description |
|------|-------------|
| `versions.json` | JSON mapping of version numbers to backup filenames |
| `${scriptName}.user.js` | Latest script copy for easy access |
| `${scriptName}.zip` | ZIP archive containing all historical backups |

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

Contributions are welcome! Please submit issues or PRs via [GitHub](https://github.com/AliubYiero/vite-plugin-scriptcat-backup).

## License

GPL-3 © [AliubYiero](https://github.com/AliubYiero)