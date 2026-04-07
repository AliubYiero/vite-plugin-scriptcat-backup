# Vite Plugin ScriptCat Backup

[English](./README.md) / 中文

## 功能

一个 Vite 插件，用于自动备份构建后的 ScriptCat（或 TamperMonkey）用户脚本。将所有备份文件压缩为单个 ZIP 归档，并通过 JSON 管理版本追踪，避免重复备份同一版本。

## 安装

```bash
npm install vite-plugin-scriptcat-backup -D
# 或
yarn add vite-plugin-scriptcat-backup -D
# 或
pnpm add vite-plugin-scriptcat-backup -D
```

## 配置

| 参数 | 类型 | 描述 | 默认值 |
|------|------|------|--------|
| `backupDir` | `string` | 备份文件存储目录 | `'./backup'` |
| `match` | `RegExp` | 匹配需要备份的文件名正则表达式 | `/\.js$/` |
| `scriptName` | `string` | 脚本名称（用于生成备份文件名） | 当前目录名 |

## 使用

在 `vite.config.js` 中添加插件：

```ts
import { defineConfig } from 'vite'
import backupScriptPlugin from 'vite-plugin-scriptcat-backup'

export default defineConfig({
  plugins: [
    // 其他插件...

    backupScriptPlugin({
      backupDir: './script-backups',
      scriptName: 'my-script'
    })
  ]
})
```

### 与 vite-plugin-scriptcat-meta-banner 配合使用

本插件可以自动检测 `vite-plugin-scriptcat-meta-banner` 插件解析的脚本版本信息：

```ts
import { defineConfig } from 'vite'
import metaBannerPlugin from 'vite-plugin-scriptcat-meta-banner'
import backupScriptPlugin from 'vite-plugin-scriptcat-backup'

export default defineConfig({
  plugins: [
    metaBannerPlugin({
      // meta-banner 配置
    }),
    backupScriptPlugin()
  ]
})
```

## 工作原理

插件在构建过程中执行以下操作：

1. 尝试从 `vite-plugin-scriptcat-meta-banner` 插件获取脚本版本信息
2. 如果没有找到 meta-banner 插件，则从构建输出的脚本代码中提取 `@version` 元数据
3. 通过 `versions.json` 检查是否已存在备份
4. 如果备份已存在，则抛出 `BackupExistError` 错误
5. 写入最新脚本到 `${scriptName}.user.js`
6. 解压现有 ZIP 归档（如存在），添加新备份文件后重新压缩
7. 更新 `versions.json` 添加新版本记录

## 备份目录结构

```
./backup/
├── versions.json           # 版本映射: {"1.0.0": "my-script_1.0.0.backup.js"}
├── my-script.user.js       # 最新脚本（始终更新）
└── my-script.zip           # 所有备份脚本压缩包
    ├── my-script_1.0.0.backup.js
    ├── my-script_1.0.1.backup.js
    └── ...
```

| 文件 | 描述 |
|------|------|
| `versions.json` | 版本号到备份文件名的 JSON 映射 |
| `${scriptName}.user.js` | 最新脚本副本，便于快速访问 |
| `${scriptName}.zip` | 包含所有历史备份的 ZIP 压缩包 |

## 错误处理

如果尝试备份已存在的脚本版本，插件会抛出 `BackupExistError` 错误，其中包含版本号信息：

```js
try {
  // 构建过程
} catch (error) {
  if (error instanceof BackupExistError) {
    console.error(`版本 ${error.cause} 已备份，跳过备份操作`);
  }
}
```

## 贡献指南

欢迎贡献！请通过 [GitHub](https://github.com/AliubYiero/vite-plugin-scriptcat-backup) 提交 issue 或 PR。

## 许可证

GPL-3 © [AliubYiero](https://github.com/AliubYiero)