import libcurl from './libcurl.ts';
import {Code, CString, CurlBlob, GlobalInit} from './types.ts';
const sym = libcurl.symbols;

let initialized = false;
/** https://curl.se/libcurl/c/curl_global_init.html */
export function globalInit(globalInit = GlobalInit.Default): Code | null {
	if (!initialized) {
		const ret = sym.globalInit(globalInit);
		initialized = true;
		return ret;
	}
	return null;
}
/** https://curl.se/libcurl/c/curl_global_cleanup.html */
export function globalCleanup() {
	if (initialized) {
		sym.globalCleanup();
		initialized = false;
	}
}

export default class Decurl {
	#httpHeaderList: Deno.PointerValue = null;
	#writeFunction: null | ((chunk: Uint8Array) => void) = null;
	#_writeFunction: Deno.UnsafeCallback<{
		readonly parameters: readonly ['buffer', 'i32', 'i32', 'pointer'];
		readonly result: 'usize';
	}>;
	#writeFunctionData: Uint8Array | null = null;
	#p: Deno.PointerValue;

	constructor() {
		this.#p = this.init();

		this.#_writeFunction = new Deno.UnsafeCallback({
			parameters: ['buffer', 'i32', 'i32', 'pointer'],
			result: 'usize'
		}, (pRet: Deno.PointerValue, _sz = 1, size: number, _customP: Deno.PointerValue): number => {
			if (!pRet)
				throw new Error('Null pointer');

			const currentResponse = new Uint8Array(size);

			Deno.UnsafePointerView.copyInto(pRet, currentResponse);

			let concatResponse: Uint8Array;
			if (!this.#writeFunctionData) {
				concatResponse = currentResponse
			} else {
				concatResponse = new Uint8Array(this.#writeFunctionData.length + currentResponse.length);
				concatResponse.set(this.#writeFunctionData);
				concatResponse.set(currentResponse, this.#writeFunctionData.length);
			}

			this.#writeFunctionData = concatResponse;

			if (this.#writeFunction)
				this.#writeFunction(currentResponse);

			return size;
		});

		sym.easySetoptFunction(this.#p, this.optionByName('WRITEFUNCTION'), this.#_writeFunction.pointer);
	}

	init(): Deno.PointerValue {
		return sym.easyInit();
	}

	/** https://curl.se/libcurl/c/curl_easy_cleanup.html */
	cleanup() {
		sym.slistFreeAll(this.#httpHeaderList);
		sym.easyCleanup(this.#p);
		this.#_writeFunction?.close();
		this.#writeFunction = null;
		this.#writeFunctionData = null;
		this.#p = null;
	}

	// easySetopt(opt: Opt, param: string | number | Deno.UnsafeCallback /** @todo type callback */): Code {
	// 	const pOpt = this.optionByName(opt);

	// 	if (typeof param == 'string')
	// 		return sym.easySetoptBuffer(this.#handle, pOpt, CString(param))
	// 	else if (typeof param == 'number')
	// 		return sym.easySetoptU64(this.#handle, pOpt, param)
	// 	else if (param instanceof Deno.UnsafeCallback)
	// 		return sym.easySetoptFunction(this.#handle, pOpt, param.pointer);
	// 	else
	// 		throw new Error('Error setting option ' + opt);
	// }

	optionByName(name: string): Deno.PointerValue<number> {
		const p = sym.easyOptionByName(CString(name));

		if (!p)	throw new Error(`Option ${name} not found`);

		return Deno.UnsafePointer.create(new Deno.UnsafePointerView(p).getUint32(8)); /** @todo Use `byte_type` */
	}

	perform(): Code {
		this.#writeFunctionData = null;
		return sym.easyPerform(this.#p);
	}

	get writeFunctionData(): Uint8Array | null {
		return this.#writeFunctionData;
	}

	setAbstractUnixSocket(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('ABSTRACT_UNIX_SOCKET'), CString(val))
	}

	setAccepttimeoutMs(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('ACCEPTTIMEOUT_MS'), val);
	}

	setAcceptEncoding(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('ACCEPT_ENCODING'), CString(val))
	}

	setAddressScope(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('ADDRESS_SCOPE'), val);
	}

	setAltsvc(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('ALTSVC'), CString(val))
	}

	setAltsvcCtrl(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('ALTSVC_CTRL'), CString(val))
	}

	setAppend(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('APPEND'), val);
	}

	setAutoreferer(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('AUTOREFERER'), val);
	}

	setAwsSigv4(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('AWS_SIGV4'), CString(val))
	}

	setBuffersize(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('BUFFERSIZE'), val);
	}

	setCainfo(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('CAINFO'), CString(val))
	}

	/** @todo */
	// setCainfoBlob(val: string): Code {
	// } // = 'CAINFO_BLOB'

	setCapath(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('CAPATH'), CString(val))
	}

	setCaCacheTimeout(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('CA_CACHE_TIMEOUT'), val);
	}

	setCertinfo(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('CERTINFO'), val);
	}

	/** @todo */
	// setChunkBgnFunction(val: () => number): Code {
	// } // = 'CHUNK_BGN_FUNCTION'

	/** @todo */
	// setChunkData(): Code {
	// } // = 'CHUNK_DATA'

	/** @todo */
	// setChunkEndFunction(val: () => number): Code {
	// } // = 'CHUNK_END_FUNCTION'

	/** @todo */
	// setClosesocketdata(): Code {
	// } // = 'CLOSESOCKETDATA'

	/** @todo */
	// setClosesocketfunction(val: () => number): Code {
	// } // = 'CLOSESOCKETFUNCTION'

	setConnecttimeout(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('CONNECTTIMEOUT'), val);
	}

	setConnecttimeoutMs(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('CONNECTTIMEOUT_MS'), val);
	}

	setConnectOnly(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('CONNECT_ONLY'), val);
	}

	/** @todo */
	// setConnectTo(): Code {
	// } // = 'CONNECT_TO'

	/** @todo */
	// setConvFromNetworkFunction(val: () => number): Code {
	// } // = 'CONV_FROM_NETWORK_FUNCTION'

	/** @todo */
	// setConvFromUtf8Function(val: () => number): Code {
	// } // = 'CONV_FROM_UTF8_FUNCTION'

	/** @todo */
	// setConvToNetworkFunction(val: () => number): Code {
	// } // = 'CONV_TO_NETWORK_FUNCTION'

	setCookie(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('COOKIE'), CString(val))
	}

	setCookiefile(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('COOKIEFILE'), CString(val))
	}

	setCookiejar(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('COOKIEJAR'), CString(val))
	}

	setCookielist(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('COOKIELIST'), CString(val))
	}

	setCookiesession(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('COOKIESESSION'), val);
	}

	setCopypostfields(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('COPYPOSTFIELDS'), CString(val))
	}

	setCrlf(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('CRLF'), val);
	}

	setCrlfile(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('CRLFILE'), CString(val))
	}

	/** @todo */
	// setCurlu(): Code {
	// } // = 'CURLU'

	setCustomrequest(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('CUSTOMREQUEST'), CString(val))
	}

	/** @todo */
	// setDebugdata(): Code {
	// } // = 'DEBUGDATA'

	/** @todo */
	// setDebugfunction(val: () => number): Code {
	// } // = 'DEBUGFUNCTION'

	setDefaultProtocol(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('DEFAULT_PROTOCOL'), CString(val))
	}

	setDirlistonly(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('DIRLISTONLY'), val);
	}

	setDisallowUsernameInUrl(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('DISALLOW_USERNAME_IN_URL'), val);
	}

	setDnsCacheTimeout(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('DNS_CACHE_TIMEOUT'), val);
	}

	setDnsInterface(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('DNS_INTERFACE'), CString(val))
	}

	setDnsLocalIp4(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('DNS_LOCAL_IP4'), CString(val))
	}

	setDnsLocalIp6(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('DNS_LOCAL_IP6'), CString(val))
	}

	setDnsServers(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('DNS_SERVERS'), CString(val))
	}

	setDnsShuffleAddresses(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('DNS_SHUFFLE_ADDRESSES'), val);
	}

	setDnsUseGlobalCache(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('DNS_USE_GLOBAL_CACHE'), val);
	}

	setDohSslVerifyhost(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('DOH_SSL_VERIFYHOST'), val);
	}

	setDohSslVerifypeer(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('DOH_SSL_VERIFYPEER'), val);
	}

	setDohSslVerifystatus(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('DOH_SSL_VERIFYSTATUS'), val);
	}

	setDohUrl(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('DOH_URL'), CString(val))
	}

	setEgdsocket(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('EGDSOCKET'), CString(val))
	}

	/** @todo */
	// setErrorbuffer(): Code {
	// } // = 'ERRORBUFFER'

	setExpect100TimeoutMs(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('EXPECT_100_TIMEOUT_MS'), val);
	}

	setFailonerror(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('FAILONERROR'), val);
	}

	setFiletime(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('FILETIME'), val);
	}

	/** @todo */
	// setFnmatchData(): Code {
	// } // = 'FNMATCH_DATA'

	/** @todo */
	// setFnmatchFunction(val: () => number): Code {
	// } // = 'FNMATCH_FUNCTION'

	setFollowlocation(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('FOLLOWLOCATION'), val);
	}

	setForbidReuse(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('FORBID_REUSE'), val);
	}

	setFreshConnect(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('FRESH_CONNECT'), val);
	}

	setFtpport(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('FTPPORT'), CString(val))
	}

	setFtpsslauth(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('FTPSSLAUTH'), val);
	}

	setFtpAccount(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('FTP_ACCOUNT'), CString(val))
	}

	setFtpAlternativeToUser(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('FTP_ALTERNATIVE_TO_USER'), CString(val))
	}

	setFtpCreateMissingDirs(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('FTP_CREATE_MISSING_DIRS'), val);
	}

	setFtpFilemethod(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('FTP_FILEMETHOD'), val);
	}

	setFtpSkipPasvIp(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('FTP_SKIP_PASV_IP'), val);
	}

	setFtpSslCcc(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('FTP_SSL_CCC'), val);
	}

	setFtpUseEprt(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('FTP_USE_EPRT'), val);
	}

	setFtpUseEpsv(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('FTP_USE_EPSV'), val);
	}

	setFtpUsePret(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('FTP_USE_PRET'), val);
	}

	setGssapiDelegation(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('GSSAPI_DELEGATION'), val);
	}

	setHappyEyeballsTimeoutMs(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('HAPPY_EYEBALLS_TIMEOUT_MS'), val);
	}

	setHaproxyprotocol(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('HAPROXYPROTOCOL'), val);
	}

	setHaproxyClientIp(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('HAPROXY_CLIENT_IP'), CString(val))
	}

	setHeader(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('HEADER'), val);
	}

	/** @todo */
	// setHeaderdata(): Code {
	// } // = 'HEADERDATA'

	/** @todo */
	// setHeaderfunction(val: () => number): Code {
	// } // = 'HEADERFUNCTION'

	setHeaderopt(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('HEADEROPT'), val);
	}

	setHsts(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('HSTS'), CString(val))
	}

	setHstsreaddata(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('HSTSREADDATA'), CString(val))
	}

	/** @todo */
	// setHstsreadfunction(val: () => number): Code {
	// } // 'HSTSREADFUNCTION'

	setHstswritedata(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('HSTSWRITEDATA'), CString(val))
	}

	/** @todo */
	// setHstswritefunction(val: () => number): Code {
	// } // 'HSTSWRITEFUNCTION'

	setHstsCtrl(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('HSTS_CTRL'), val)
	}

	setHttp09Allowed(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('HTTP09_ALLOWED'), val);
	}

	/** @todo */
	// setHttp200aliases(): Code {
	// } // = 'HTTP200ALIASES'

	setHttpauth(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('HTTPAUTH'), val);
	}

	setHttpget(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('HTTPGET'), val);
	}

	setHttpheader(header: Record<string, string | number | bigint>): Code {
		sym.slistFreeAll(this.#httpHeaderList);
		this.#httpHeaderList = null;

		for (const [k, v] of Object.entries(header))
			this.#httpHeaderList = sym.slistAppend(this.#httpHeaderList, CString(`${k}: ${v}`));

		return sym.easySetoptPointer(this.#p, this.optionByName('HTTPHEADER'), this.#httpHeaderList);
	}

	/** @todo */
	// setHttppost(): Code {
	// } // = 'HTTPPOST'

	setHttpproxytunnel(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('HTTPPROXYTUNNEL'), val);
	}

	setHttpContentDecoding(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('HTTP_CONTENT_DECODING'), val);
	} // = 'HTTP_CONTENT_DECODING'

	setHttpTransferDecoding(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('HTTP_TRANSFER_DECODING'), val);
	}

	setHttpVersion(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('HTTP_VERSION'), val);
	}

	setIgnoreContentLength(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('IGNORE_CONTENT_LENGTH'), val);
	}

	setInfilesize(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('INFILESIZE'), val);
	}

	/** @todo */
	// setInfilesizeLarge(): Code {
	// } // = 'INFILESIZE_LARGE'

	setInterface(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('INTERFACE'), CString(val))
	}

	/** @todo */
	// setInterleavedata(): Code {
	// } // = 'INTERLEAVEDATA'

	/** @todo */
	// setInterleavefunction(val: () => number): Code {
	// } // = 'INTERLEAVEFUNCTION'

	/** @todo */
	// setIoctldata(): Code {
	// } // = 'IOCTLDATA'

	/** @todo */
	// setIoctlfunction(val: () => number): Code {
	// } // = 'IOCTLFUNCTION'

	setIpresolve(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('IPRESOLVE'), val);
	}

	setIssuercert(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('ISSUERCERT'), CString(val))
	}

	/** @todo */
	// setIssuercertBlob(val: string): Code {
	// } // = 'ISSUERCERT_BLOB'

	setKeepSendingOnError(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('KEEP_SENDING_ON_ERROR'), val);
	}

	setKeypasswd(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('KEYPASSWD'), CString(val))
	}

	setKrblevel(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('KRBLEVEL'), CString(val))
	}

	setLocalport(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('LOCALPORT'), val);
	}

	setLocalportrange(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('LOCALPORTRANGE'), val);
	}

	setLoginOptions(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('LOGIN_OPTIONS'), CString(val))
	}

	setLowSpeedLimit(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('LOW_SPEED_LIMIT'), val);
	}

	setLowSpeedTime(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('LOW_SPEED_TIME'), val);
	}

	setMailAuth(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('MAIL_AUTH'), CString(val))
	}

	setMailFrom(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('MAIL_FROM'), CString(val))
	}

	/** @todo */
	// setMailRcpt(): Code {
	// } // = 'MAIL_RCPT'

	setMailRcptAllowfails(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('MAIL_RCPT_ALLOWFAILS'), val);
	}

	setMaxageConn(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('MAXAGE_CONN'), val);
	}

	setMaxconnects(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('MAXCONNECTS'), val);
	}

	setMaxfilesize(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('MAXFILESIZE'), val);
	}

	/** @todo */
	// setMaxfilesizeLarge(): Code {
	// } // = 'MAXFILESIZE_LARGE'

	setMaxlifetimeConn(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('MAXLIFETIME_CONN'), val);
	}

	setMaxredirs(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('MAXREDIRS'), val);
	}

	/** @todo */
	// setMaxRecvSpeedLarge(): Code {
	// } // = 'MAX_RECV_SPEED_LARGE'

	/** @todo */
	// setMaxSendSpeedLarge(): Code {
	// } // = 'MAX_SEND_SPEED_LARGE'

	/** @todo */
	// setMimepost(): Code {
	// } // = 'MIMEPOST'

	setMimeOptions(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('MIME_OPTIONS'), val);
	}

	setNetrc(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('NETRC'), val);
	}

	setNetrcFile(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('NETRC_FILE'), CString(val))
	}

	setNewDirectoryPerms(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('NEW_DIRECTORY_PERMS'), val);
	}

	setNewFilePerms(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('NEW_FILE_PERMS'), val);
	}

	setNobody(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('NOBODY'), val);
	}

	setNoprogress(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('NOPROGRESS'), val);
	}

	setNoproxy(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('NOPROXY'), CString(val))
	}

	setNosignal(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('NOSIGNAL'), val);
	}

	/** @todo */
	// setOpensocketdata(): Code {
	// } // = 'OPENSOCKETDATA'

	/** @todo */
	// setOpensocketfunction(val: () => number): Code {
	// } // = 'OPENSOCKETFUNCTION'

	setPassword(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('PASSWORD'), CString(val))
	}

	setPathAsIs(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('PATH_AS_IS'), val);
	}

	setPinnedpublickey(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('PINNEDPUBLICKEY'), CString(val))
	}

	setPipewait(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('PIPEWAIT'), val);
	}

	setPort(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('PORT'), val);
	}

	setPost(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('POST'), val);
	}

	/** @todo */
	// setPostfields(): Code {
	// } // = 'POSTFIELDS'

	setPostfieldsize(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('POSTFIELDSIZE'), val);
	} // = 'POSTFIELDSIZE'

	/** @todo */
	// setPostfieldsizeLarge(): Code {
	// } // = 'POSTFIELDSIZE_LARGE'

	/** @todo */
	// setPostquote(): Code {
	// } // = 'POSTQUOTE'

	setPostredir(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('POSTREDIR'), val);
	}

	/** @todo */
	// setPrequote(): Code {
	// } // = 'PREQUOTE'

	/** @todo */
	// setPrereqdata(): Code {
	// } // = 'PREREQDATA'

	/** @todo */
	// setPrereqfunction(val: () => number): Code {
	// } // = 'PREREQFUNCTION'

	setPreProxy(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('PRE_PROXY'), CString(val))
	}

	/** @todo */
	// setPrivate(): Code {
	// } // = 'PRIVATE'

	/** @todo */
	// setProgressdata(): Code {
	// } // = 'PROGRESSDATA'

	/** @todo */
	// setProgressfunction(val: () => number): Code {
	// } // = 'PROGRESSFUNCTION'

	setProtocols(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('PROTOCOLS'), val);
	}

	setProtocolsStr(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('PROTOCOLS_STR'), CString(val))
	}

	setProxy(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('PROXY'), CString(val))
	}

	setProxyauth(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('PROXYAUTH'), val);
	}

	setProxyheader(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('PROXYHEADER'), CString(val))
	}

	setProxypassword(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('PROXYPASSWORD'), CString(val))
	}

	setProxyport(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('PROXYPORT'), val);
	}

	setProxytype(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('PROXYTYPE'), val);
	}

	setProxyusername(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('PROXYUSERNAME'), CString(val))
	}

	setProxyuserpwd(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('PROXYUSERPWD'), CString(val))
	}

	setProxyCainfo(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('PROXY_CAINFO'), CString(val))
	}

	/** @todo */
	// setProxyCainfoBlob(val: string): Code {
	// } // = 'PROXY_CAINFO_BLOB'

	setProxyCapath(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('PROXY_CAPATH'), CString(val))
	}

	setProxyCrlfile(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('PROXY_CRLFILE'), CString(val))
	}

	setProxyIssuercert(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('PROXY_ISSUERCERT'), CString(val))
	}

	/** @todo */
	// setProxyIssuercertBlob(val: string): Code {
	// } // = 'PROXY_ISSUERCERT_BLOB'

	setProxyKeypasswd(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('PROXY_KEYPASSWD'), CString(val))
	}

	setProxyPinnedpublickey(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('PROXY_PINNEDPUBLICKEY'), CString(val))
	}

	setProxyServiceName(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('PROXY_SERVICE_NAME'), CString(val))
	}

	setProxySslcert(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('PROXY_SSLCERT'), CString(val))
	}

	setProxySslcerttype(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('PROXY_SSLCERTTYPE'), CString(val))
	}

	/** @todo */
	// setProxySslcertBlob(val: string): Code {
	// } // = 'PROXY_SSLCERT_BLOB'

	setProxySslkey(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('PROXY_SSLKEY'), CString(val))
	}

	setProxySslkeytype(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('PROXY_SSLKEYTYPE'), CString(val))
	}

	/** @todo */
	// setProxySslkeyBlob(val: string): Code {
	// } // = 'PROXY_SSLKEY_BLOB'

	setProxySslversion(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('PROXY_SSLVERSION'), val);
	}

	setProxySslCipherList(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('PROXY_SSL_CIPHER_LIST'), CString(val))
	}

	setProxySslOptions(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('PROXY_SSL_OPTIONS'), val);
	}

	setProxySslVerifyhost(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('PROXY_SSL_VERIFYHOST'), val);
	}

	setProxySslVerifypeer(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('PROXY_SSL_VERIFYPEER'), val);
	}

	setProxyTls13Ciphers(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('PROXY_TLS13_CIPHERS'), CString(val))
	}

	setProxyTlsauthPassword(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('PROXY_TLSAUTH_PASSWORD'), CString(val))
	}

	setProxyTlsauthType(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('PROXY_TLSAUTH_TYPE'), CString(val))
	}

	setProxyTlsauthUsername(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('PROXY_TLSAUTH_USERNAME'), CString(val))
	}

	setProxyTransferMode(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('PROXY_TRANSFER_MODE'), val);
	}

	setPut(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('PUT'), val);
	}

	setQuickExit(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('QUICK_EXIT'), val);
	}

	/** @todo */
	// setQuote(): Code {
	// } // = 'QUOTE'

	setRandomFile(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('RANDOM_FILE'), CString(val))
	}

	setRange(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('RANGE'), CString(val))
	}

	/** @todo */
	// setReaddata(): Code {
	// } // = 'READDATA'

	/** @todo */
	// setReadfunction(val: () => number): Code {
	// } // = 'READFUNCTION'

	setRedirProtocols(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('REDIR_PROTOCOLS'), val);
	}

	setRedirProtocolsStr(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('REDIR_PROTOCOLS_STR'), CString(val))
	}

	setReferer(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('REFERER'), CString(val))
	}

	setRequestTarget(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('REQUEST_TARGET'), CString(val))
	}

	/** @todo */
	// setResolve(): Code {
	// } // = 'RESOLVE'

	/** @todo */
	// setResolverStartData(): Code {
	// } // = 'RESOLVER_START_DATA'

	/** @todo */
	// setResolverStartFunction(val: () => number): Code {
	// } // = 'RESOLVER_START_FUNCTION'

	setResumeFrom(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('RESUME_FROM'), val);
	}

	/** @todo */
	// setResumeFromLarge(): Code {
	// } // = 'RESUME_FROM_LARGE'

	setRtspClientCseq(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('RTSP_CLIENT_CSEQ'), val);
	}

	setRtspRequest(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('RTSP_REQUEST'), val);
	}

	setRtspServerCseq(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('RTSP_SERVER_CSEQ'), val);
	}

	setRtspSessionId(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('RTSP_SESSION_ID'), CString(val))
	}

	setRtspStreamUri(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('RTSP_STREAM_URI'), CString(val))
	}

	setRtspTransport(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('RTSP_TRANSPORT'), CString(val))
	}

	setSaslAuthzid(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('SASL_AUTHZID'), CString(val))
	}

	setSaslIr(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('SASL_IR'), val);
	}

	/** @todo */
	// setSeekdata(): Code {
	// } // = 'SEEKDATA'

	/** @todo */
	// setSeekfunction(val: () => number): Code {
	// } // = 'SEEKFUNCTION'

	setServerResponseTimeout(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('SERVER_RESPONSE_TIMEOUT'), val);
	}

	setServiceName(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('SERVICE_NAME'), CString(val))
	}

	/** @todo */
	// setShare(): Code {
	// } // = 'SHARE'

	/** @todo */
	// setSockoptdata(): Code {
	// } // = 'SOCKOPTDATA'

	/** @todo */
	// setSockoptfunction(val: () => number): Code {
	// } // = 'SOCKOPTFUNCTION'

	setSocks5Auth(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('SOCKS5_AUTH'), val);
	}

	setSocks5GssapiNec(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('SOCKS5_GSSAPI_NEC'), val);
	}

	setSocks5GssapiService(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('SOCKS5_GSSAPI_SERVICE'), CString(val))
	}

	setSshAuthTypes(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('SSH_AUTH_TYPES'), val);
	}

	setSshCompression(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('SSH_COMPRESSION'), val);
	}

	/** @todo */
	// setSshHostkeydata(): Code {
	// } // = 'SSH_HOSTKEYDATA'

	/** @todo */
	// setSshHostkeyfunction(val: () => number): Code {
	// } // = 'SSH_HOSTKEYFUNCTION'

	setSshHostPublicKeyMd5(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('SSH_HOST_PUBLIC_KEY_MD5'), CString(val))
	}

	setSshHostPublicKeySha256(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('SSH_HOST_PUBLIC_KEY_SHA256'), CString(val))
	}

	/** @todo */
	// setSshKeydata(): Code {
	// } // = 'SSH_KEYDATA'

	/** @todo */
	// setSshKeyfunction(val: () => number): Code {
	// } // = 'SSH_KEYFUNCTION'

	setSshKnownhosts(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('SSH_KNOWNHOSTS'), CString(val))
	}

	setSshPrivateKeyfile(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('SSH_PRIVATE_KEYFILE'), CString(val))
	}

	setSshPublicKeyfile(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('SSH_PUBLIC_KEYFILE'), CString(val))
	}

	setSslcert(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('SSLCERT'), CString(val))
	}

	setSslcerttype(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('SSLCERTTYPE'), CString(val))
	}

	setSslcertBlob(cert: ArrayBuffer): Code {
		return sym.easySetoptBlob(this.#p, this.optionByName('SSLCERT_BLOB'), CurlBlob(cert));
	}

	setSslengine(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('SSLENGINE'), CString(val))
	}

	setSslengineDefault(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('SSLENGINE_DEFAULT'), val)
	}

	setSslkey(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('SSLKEY'), CString(val))
	}

	setSslkeytype(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('SSLKEYTYPE'), CString(val))
	}

	/** @todo */
	// setSslkeyBlob(val: string): Code {
	// } // = 'SSLKEY_BLOB'

	setSslversion(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('SSLVERSION'), val);
	}

	setSslCipherList(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('SSL_CIPHER_LIST'), CString(val))
	}

	/** @todo */
	// setSslCtxData(): Code {
	// } // = 'SSL_CTX_DATA'

	/** @todo */
	// setSslCtxFunction(val: () => number): Code {
	// } // = 'SSL_CTX_FUNCTION'

	setSslEcCurves(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('SSL_EC_CURVES'), CString(val))
	}

	setSslEnableAlpn(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('SSL_ENABLE_ALPN'), val);
	}

	setSslEnableNpn(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('SSL_ENABLE_NPN'), val);
	}

	setSslFalsestart(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('SSL_FALSESTART'), val);
	}

	setSslOptions(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('SSL_OPTIONS'), val);
	}

	setSslSessionidCache(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('SSL_SESSIONID_CACHE'), val);
	}

	setSslVerifyhost(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('SSL_VERIFYHOST'), val);
	}

	setSslVerifypeer(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('SSL_VERIFYPEER'), val);
	}

	setSslVerifystatus(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('SSL_VERIFYSTATUS'), val);
	}

	/** @todo */
	// setStderr(): Code {
	// } // = 'STDERR'

	/** @todo */
	// setStreamDepends(): Code {
	// } // = 'STREAM_DEPENDS'

	/** @todo */
	// setStreamDependsE(): Code {
	// } // = 'STREAM_DEPENDS_E'

	setStreamWeight(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('STREAM_WEIGHT'), val);
	}

	setSuppressConnectHeaders(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('SUPPRESS_CONNECT_HEADERS'), val);
	}

	setTcpFastopen(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('TCP_FASTOPEN'), val);
	}

	setTcpKeepalive(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('TCP_KEEPALIVE'), val);
	}

	setTcpKeepidle(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('TCP_KEEPIDLE'), val);
	}

	setTcpKeepintvl(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('TCP_KEEPINTVL'), val);
	}

	setTcpNodelay(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('TCP_NODELAY'), val);
	}

	/** @todo */
	// setTelnetoptions(): Code {
	// } // = 'TELNETOPTIONS'

	setTftpBlksize(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('TFTP_BLKSIZE'), val);
	}

	setTftpNoOptions(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('TFTP_NO_OPTIONS'), val);
	}

	setTimecondition(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('TIMECONDITION'), val);
	}

	setTimeout(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('TIMEOUT'), val);
	}

	setTimeoutMs(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('TIMEOUT_MS'), val);
	}

	setTimevalue(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('TIMEVALUE'), val);
	}

	/** @todo */
	// setTimevalueLarge(): Code {
	// } // = 'TIMEVALUE_LARGE'

	setTls13Ciphers(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('TLS13_CIPHERS'), CString(val))
	}

	setTlsauthPassword(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('TLSAUTH_PASSWORD'), CString(val))
	}

	setTlsauthType(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('TLSAUTH_TYPE'), CString(val))
	}

	setTlsauthUsername(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('TLSAUTH_USERNAME'), CString(val))
	}

	/** @todo */
	// setTrailerdata(): Code {
	// } // = 'TRAILERDATA'

	/** @todo */
	// setTrailerfunction(val: () => number): Code {
	// } // = 'TRAILERFUNCTION'

	setTransfertext(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('TRANSFERTEXT'), val);
	}

	setTransferEncoding(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('TRANSFERE_NCODING'), val);
	}

	setUnixSocketPath(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('UNIX_SOCKET_PATH'), CString(val))
	}

	setUnrestrictedAuth(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('UNRESTRICTED_AUTH'), val);
	}

	setUpkeepIntervalMs(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('UPKEEP_INTERVAL_MS'), val);
	}

	setUpload(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('UPLOAD'), val);
	}

	setUploadBuffersize(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('UPLOAD_BUFFERSIZE'), val);
	}

	setUrl(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('URL'), CString(val));
	}

	setUseragent(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('USERAGENT'), CString(val));
	}

	setUsername(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('USERNAME'), CString(val));
	}

	setUserpwd(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('USERPWD'), CString(val));
	}

	setUseSsl(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('USE_SSL'), val);
	}

	setVerbose(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('VERBOSE'), val);
	}

	setWildcardmatch(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('WILDCARDMATCH'), val);
	}

	/** @todo */
	// setWritedata(): Code {
	// } // = 'WRITEDATA'

	setWritefunction(fn: (chunk: Uint8Array) => void) {
		this.#writeFunction = fn;
	}

	setWsOptions(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName('WS_OPTIONS'), val);
	}

	/** @todo */
	// setXferinfodata(): Code {
	// } // = 'XFERINFODATA'

	/** @todo */
	// setXferinfofunction(val: () => number): Code {
	// } // = 'XFERINFOFUNCTION'

	setXoauth2Bearer(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName('XOAUTH2_BEARER'), CString(val))
	}
}