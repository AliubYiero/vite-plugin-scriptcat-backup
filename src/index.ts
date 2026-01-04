import { Plugin } from 'vite';
import { ParseUserScript } from './types/UserScript.ts';
import { basename } from 'path';
import { matchVersion } from './utils/matchVersion.ts';
import { BackupExistError, BackupScript } from './module/BackupScript.ts';


interface BackupScriptOptions {
	backupDir: string;
	match: RegExp;
	scriptName: string;
}

/**
 * Vite 插件：
 *
 * 将打包脚本同时生成一份备份文件.
 */
export default function backupScriptPlugin(
	options: Partial<BackupScriptOptions> = {},
): Plugin {
	// 默认配置
	const mergedOption: BackupScriptOptions = {
		backupDir: './backup',
		match: /\.js$/,
		scriptName: basename( process.cwd() || __dirname ),
		...options,
	};
	
	// 脚本版本号
	let scriptVersion: string | undefined;
	const backupScript = new BackupScript( mergedOption.backupDir, mergedOption.scriptName );
	
	return {
		name: 'vite-plugin-scriptact-backup',
		
		/**
		 * 获取 vite-plugin-scriptcat-meta-banner 脚本导出的 UserScript
		 */
		buildStart( { plugins } ) {
			if ( !Array.isArray( plugins ) ) return;
			const metaPlugin = plugins.find( plugin => plugin.name === 'vite-plugin-scriptcat-meta-banner' );
			if ( !metaPlugin ) return;
			const parsedUserScript: ParseUserScript = metaPlugin.api.parsedUserScript;
			if ( parsedUserScript ) {
				const mapper = Object.fromEntries( parsedUserScript.filter );
				scriptVersion = mapper.version;
			}
		},
		
		writeBundle( _, bundle ) {
			for ( const fileName in bundle ) {
				const chunk = bundle[ fileName ];
				if ( chunk.type !== 'chunk' ) continue;
				if ( !mergedOption.match.test( fileName ) ) continue;
				
				// 获取脚本版本号
				const bundleScriptVersion = scriptVersion
					? scriptVersion
					: matchVersion( chunk.code );
				if ( !bundleScriptVersion ) {
					console.warn( '[ScriptCat Backup] 没有检测到脚本版本号' );
					continue;
				}
				// 检查脚本是否已备份
				if ( backupScript.hasScript( bundleScriptVersion ) ) {
					throw new BackupExistError( bundleScriptVersion );
				}
				
				// 添加脚本备份
				backupScript.addScript(
					bundleScriptVersion,
					chunk.code,
				);
			}
		},
	};
}
