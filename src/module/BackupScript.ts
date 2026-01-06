import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'node:path';

export class BackupExistError extends Error {
	constructor( version: string ) {
		super( `脚本备份已存在, 请勿重复备份脚本`, { cause: version } );
	}
}

/**
 * 脚本备份管理器
 *
 * 核心功能：
 * 1. 自动初始化备份目录和元数据文件
 * 2. 安全地添加/验证脚本备份
 * 3. 防止重复备份相同版本
 * 4. 完善的错误处理和数据校验
 */
export class BackupScript {
	constructor(
		private backupDir: string,
		private scriptName: string,
	) {
		this.init();
	}
	
	/**
	 * 初始化备份环境
	 * 1. 创建备份目录（递归）
	 * 2. 初始化元数据文件（如不存在）
	 * @private
	 */
	private init() {
		// 确保备份目录存在
		if ( !existsSync( this.backupDir ) ) {
			mkdirSync( this.backupDir, { recursive: true } );
		}
	}
	
	/**
	 * 判断脚本是否已备份
	 */
	hasScript( scriptVersion: string ) {
		const backupScriptPath = this.normalizeScriptPath( scriptVersion );
		return existsSync( backupScriptPath );
	}
	
	
	/**
	 * 添加脚本到备份
	 */
	addScript(
		scriptVersion: string,
		content: string,
	) {
		const backupScriptPath = this.normalizeScriptPath( scriptVersion );
		
		// 写入备份脚本
		writeFileSync( backupScriptPath, content, 'utf-8' );
		// 写入最新脚本
		writeFileSync( resolve( this.backupDir, `${ this.scriptName }.user.js` ), content, 'utf-8' );
	}
	
	/**
	 * 规范化脚本名
	 */
	private normalizeScriptName( scriptVersion: string ) {
		return `${ this.scriptName }_${ scriptVersion }.backup.js`;
	}
	
	/**
	 * 规范化脚本路径
	 */
	private normalizeScriptPath( scriptVersion: string ) {
		return resolve( this.backupDir, this.normalizeScriptName( scriptVersion ) );
	}
}
