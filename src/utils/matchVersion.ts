/**
 *  提取脚本版本
 */
export const matchVersion = ( content: string ): string | undefined => {
	if ( !/(\/\/\s*==\/UserScript==)/.test( content ) ) {
		return undefined;
	}
	
	const versionMatches = /\/\/\s*@version\s+(\S*)\b/.exec( content );
	if ( versionMatches && versionMatches[ 1 ] ) {
		return versionMatches[ 1 ];
	}
	return undefined;
};
