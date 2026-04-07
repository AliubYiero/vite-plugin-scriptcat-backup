import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { resolve } from 'node:path';
import { strToU8, unzipSync, zipSync } from 'fflate';
import type { VersionMap } from '../types/UserScript.ts';

export class BackupExistError extends Error {
	constructor( version: string ) {
		super( `脚本备份已存在, 请勿重复备份脚本`, { cause: version } );
	}
}

/**
 * 脚本备份管理器
 *
 * 核心功能：
 * 1. 自动初始化备份目录和版本映射文件
 * 2. 安全地添加/验证脚本备份
 * 3. 防止重复备份相同版本
 * 4. ZIP 压缩打包所有备份文件
 * 5. 旧版本备份文件自动迁移
 * 6. 完善的错误处理和数据校验
 */
export class BackupScript {
	constructor(
		private backupDir: string,
		private scriptName: string,
	) {
		this.init();
	}
	
	/**
	 * 版本映射文件路径
	 */
	private get versionsPath(): string {
		return resolve( this.backupDir, 'versions.json' );
	}
	
	/**
	 * ZIP 文件路径
	 */
	private get zipPath(): string {
		return resolve( this.backupDir, `${ this.scriptName }.zip` );
	}
	
	/**
	 * 初始化备份环境
	 * 1. 创建备份目录（递归）
	 * 2. 初始化 versions.json（如不存在）
	 * 3. 迁移旧版本备份文件
	 */
	private init(): void {
		// 确保备份目录存在
		if ( !existsSync( this.backupDir ) ) {
			mkdirSync( this.backupDir, { recursive: true } );
		}
		
		// 确保 versions.json 存在
		if ( !existsSync( this.versionsPath ) ) {
			this.writeVersions( {} );
		}
		
		// 迁移旧备份文件
		this.migrateOldBackups();
	}
	
	/**
	 * 迁移旧版本备份文件到 ZIP
	 *
	 * 流程：
	 * 1. 扫描备份目录中的旧备份文件 (*_*.backup.js)
	 * 2. 解析文件名提取版本号
	 * 3. 如果版本未在 versions.json 中注册：
	 *    - 读取文件内容
	 *    - 添加到 ZIP
	 *    - 更新 versions.json
	 *    - 删除旧文件
	 */
	private migrateOldBackups(): void {
		// 匹配旧备份文件名格式: ${scriptName}_${version}.backup.js
		const oldBackupPattern = new RegExp(
			`^${ this.escapeRegExp( this.scriptName ) }_(.+)\\.backup\\.js$`
		);
		
		// 扫描备份目录
		const files = readdirSync( this.backupDir );
		const oldBackups: { fileName: string; version: string }[] = [];
		
		for ( const file of files ) {
			const match = file.match( oldBackupPattern );
			if ( match && match[ 1 ] ) {
				oldBackups.push( { fileName: file, version: match[ 1 ] } );
			}
		}
		
		if ( oldBackups.length === 0 ) {
			return;
		}
		
		console.log( `[ScriptCat Backup] 检测到 ${ oldBackups.length } 个旧备份文件，正在迁移...` );
		
		const versions = this.readVersions();
		const existingFiles = this.unzipExistingBackup();
		
		for ( const { fileName, version } of oldBackups ) {
			// 跳过已存在的版本
			if ( version in versions ) {
				console.warn( `[ScriptCat Backup] 版本 ${ version } 已存在，跳过迁移` );
				continue;
			}
			
			const filePath = resolve( this.backupDir, fileName );
			try {
				const content = readFileSync( filePath, 'utf-8' );
				const backupFileName = this.normalizeScriptName( version );
				
				// 添加到 ZIP
				existingFiles[ backupFileName ] = strToU8( content );
				
				// 更新版本映射
				versions[ version ] = backupFileName;
				
				// 删除旧文件
				unlinkSync( filePath );
				
				console.log( `[ScriptCat Backup] 已迁移: ${ fileName }` );
			} catch ( error ) {
				console.error( `[ScriptCat Backup] 迁移失败: ${ fileName }`, error );
			}
		}
		
		// 写入更新后的 ZIP 和版本映射
		if ( Object.keys( existingFiles ).length > 0 ) {
			this.createBackupZip( existingFiles );
		}
		this.writeVersions( versions );
		
		console.log( '[ScriptCat Backup] 旧备份文件迁移完成' );
	}
	
	/**
	 * 转义正则表达式特殊字符
	 */
	private escapeRegExp( str: string ): string {
		return str.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
	}
	
	/**
	 * 读取版本映射表
	 * 如果文件不存在或解析失败则返回空对象
	 */
	private readVersions(): VersionMap {
		if ( !existsSync( this.versionsPath ) ) {
			return {};
		}
		try {
			const content = readFileSync( this.versionsPath, 'utf-8' );
			return JSON.parse( content ) as VersionMap;
		} catch {
			console.warn( '[ScriptCat Backup] 读取 versions.json 失败，将重新初始化' );
			return {};
		}
	}
	
	/**
	 * 写入版本映射表
	 */
	private writeVersions( versions: VersionMap ): void {
		writeFileSync( this.versionsPath, JSON.stringify( versions, null, 2 ), 'utf-8' );
	}
	
	/**
	 * 解压现有 ZIP 到内存
	 * 返回文件名 -> 内容 的映射
	 */
	private unzipExistingBackup(): Record<string, Uint8Array> {
		if ( !existsSync( this.zipPath ) ) {
			return {};
		}
		try {
			const zipData = readFileSync( this.zipPath );
			return unzipSync( new Uint8Array( zipData ) );
		} catch {
			console.warn( '[ScriptCat Backup] 解压 ZIP 失败，将创建新的备份' );
			return {};
		}
	}
	
	/**
	 * 将所有备份文件压缩成 ZIP
	 */
	private createBackupZip( files: Record<string, Uint8Array> ): void {
		const zipData = zipSync( files, { level: 6 } );
		writeFileSync( this.zipPath, Buffer.from( zipData ) );
	}
	
	/**
	 * 判断脚本是否已备份
	 * 通过 versions.json 判断
	 */
	hasScript( scriptVersion: string ): boolean {
		const versions = this.readVersions();
		return scriptVersion in versions;
	}
	
	/**
	 * 添加脚本到备份
	 *
	 * 流程：
	 * 1. 读取现有版本映射
	 * 2. 写入最新脚本
	 * 3. 解压现有 ZIP
	 * 4. 添加新备份文件
	 * 5. 重新压缩 ZIP
	 * 6. 更新版本映射
	 */
	addScript(
		scriptVersion: string,
		content: string,
	): void {
		// 1. 读取现有版本映射
		const versions = this.readVersions();
		
		// 2. 写入最新脚本
		const latestScriptPath = resolve( this.backupDir, `${ this.scriptName }.user.js` );
		writeFileSync( latestScriptPath, content, 'utf-8' );
		
		// 3. 解压现有 ZIP 到内存
		const existingFiles = this.unzipExistingBackup();
		
		// 4. 添加新备份文件
		const backupFileName = this.normalizeScriptName( scriptVersion );
		existingFiles[ backupFileName ] = strToU8( content );
		
		// 5. 重新压缩并写入 ZIP
		this.createBackupZip( existingFiles );
		
		// 6. 更新版本映射
		versions[ scriptVersion ] = backupFileName;
		this.writeVersions( versions );
	}
	
	/**
	 * 规范化脚本名
	 */
	private normalizeScriptName( scriptVersion: string ) {
		return `${ this.scriptName }_${ scriptVersion }.backup.js`;
	}
}
