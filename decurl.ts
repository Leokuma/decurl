import libcurl from './libcurl.ts';
import {Code, EasyHandle, GlobalInit} from './types.ts';
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

const txtEnc = new TextEncoder();

export default class Decurl {
	#writeFunction?: (chunk: Uint8Array) => void;
	#_writeFunction: Deno.UnsafeCallback<{
		readonly parameters: readonly ['buffer', 'i32', 'i32', 'pointer'];
		readonly result: 'usize';
	}>;
	#writeFunctionData: Uint8Array | null = null;
	#handle: EasyHandle;

	constructor() {
		this.#handle = this.init();

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

		sym.easySetoptFunction(this.#handle, this.optionByName('WRITEFUNCTION'), this.#_writeFunction.pointer);
	}

	init(): EasyHandle {
		return sym.easyInit();
	}

	cleanup() {
		sym.easyCleanup(this.#handle);
		this.#_writeFunction?.close();
	}

	// easySetopt(opt: Opt, param: string | number | Deno.UnsafeCallback /** @todo type callback */): Code {
	// 	const pOpt = this.optionByName(opt);

	// 	if (typeof param == 'string')
	// 		return sym.easySetoptBuffer(this.#handle, pOpt, txtEnc.encode(param + '\0'))
	// 	else if (typeof param == 'number')
	// 		return sym.easySetoptU64(this.#handle, pOpt, param)
	// 	else if (param instanceof Deno.UnsafeCallback)
	// 		return sym.easySetoptFunction(this.#handle, pOpt, param.pointer);
	// 	else
	// 		throw new Error('Error setting option ' + opt);
	// }

	optionByName(name: string): Deno.PointerValue<number> {
		const p = sym.easyOptionByName(txtEnc.encode(name + '\0'));

		if (!p)	throw new Error(`Option ${name} not found`);

		return Deno.UnsafePointer.create(new Deno.UnsafePointerView(p).getUint32(8));
	}

	perform(): Code {
		this.#writeFunctionData = null;
		return sym.easyPerform(this.#handle);
	}

	get writeFunctionData(): Uint8Array | null {
		return this.#writeFunctionData;
	}

	setAbstractUnixSocket(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('ABSTRACT_UNIX_SOCKET'), txtEnc.encode(val + '\0'))
	}

	setAccepttimeoutMs(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('ACCEPTTIMEOUT_MS'), val);
	}

	setAcceptEncoding(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('ACCEPT_ENCODING'), txtEnc.encode(val + '\0'))
	}

	setAddressScope(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('ADDRESS_SCOPE'), val);
	}

	setAltsvc(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('ALTSVC'), txtEnc.encode(val + '\0'))
	}

	setAltsvcCtrl(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('ALTSVC_CTRL'), txtEnc.encode(val + '\0'))
	}

	setAppend(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('APPEND'), val);
	}

	setAutoreferer(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('AUTOREFERER'), val);
	}

	setAwsSigv4(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('AWS_SIGV4'), txtEnc.encode(val + '\0'))
	}

	setBuffersize(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('BUFFERSIZE'), val);
	}

	setCainfo(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('CAINFO'), txtEnc.encode(val + '\0'))
	}

	setCainfoBlob(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('CAINFO_BLOB'), txtEnc.encode(val + '\0'))
	}

	setCapath(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('CAPATH'), txtEnc.encode(val + '\0'))
	}

	setCaCacheTimeout(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('CA_CACHE_TIMEOUT'), val);
	}

	setCertinfo(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('CERTINFO'), val);
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
		return sym.easySetoptU64(this.#handle, this.optionByName('CONNECTTIMEOUT'), val);
	}

	setConnecttimeoutMs(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('CONNECTTIMEOUT_MS'), val);
	}

	setConnectOnly(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('CONNECT_ONLY'), val);
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
		return sym.easySetoptBuffer(this.#handle, this.optionByName('COOKIE'), txtEnc.encode(val + '\0'))
	}

	setCookiefile(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('COOKIEFILE'), txtEnc.encode(val + '\0'))
	}

	setCookiejar(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('COOKIEJAR'), txtEnc.encode(val + '\0'))
	}

	setCookielist(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('COOKIELIST'), txtEnc.encode(val + '\0'))
	}

	setCookiesession(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('COOKIESESSION'), val);
	}

	setCopypostfields(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('COPYPOSTFIELDS'), txtEnc.encode(val + '\0'))
	}

	setCrlf(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('CRLF'), val);
	}

	setCrlfile(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('CRLFILE'), txtEnc.encode(val + '\0'))
	}

	/** @todo */
	// setCurlu(): Code {
	// } // = 'CURLU'

	setCustomrequest(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('CUSTOMREQUEST'), txtEnc.encode(val + '\0'))
	}

	/** @todo */
	// setDebugdata(): Code {
	// } // = 'DEBUGDATA'

	/** @todo */
	// setDebugfunction(val: () => number): Code {
	// } // = 'DEBUGFUNCTION'

	setDefaultProtocol(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('DEFAULT_PROTOCOL'), txtEnc.encode(val + '\0'))
	}

	setDirlistonly(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('DIRLISTONLY'), val);
	}

	setDisallowUsernameInUrl(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('DISALLOW_USERNAME_IN_URL'), val);
	}

	setDnsCacheTimeout(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('DNS_CACHE_TIMEOUT'), val);
	}

	setDnsInterface(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('DNS_INTERFACE'), txtEnc.encode(val + '\0'))
	}

	setDnsLocalIp4(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('DNS_LOCAL_IP4'), txtEnc.encode(val + '\0'))
	}

	setDnsLocalIp6(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('DNS_LOCAL_IP6'), txtEnc.encode(val + '\0'))
	}

	setDnsServers(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('DNS_SERVERS'), txtEnc.encode(val + '\0'))
	}

	setDnsShuffleAddresses(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('DNS_SHUFFLE_ADDRESSES'), val);
	}

	setDnsUseGlobalCache(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('DNS_USE_GLOBAL_CACHE'), val);
	}

	setDohSslVerifyhost(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('DOH_SSL_VERIFYHOST'), val);
	}

	setDohSslVerifypeer(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('DOH_SSL_VERIFYPEER'), val);
	}

	setDohSslVerifystatus(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('DOH_SSL_VERIFYSTATUS'), val);
	}

	setDohUrl(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('DOH_URL'), txtEnc.encode(val + '\0'))
	}

	setEgdsocket(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('EGDSOCKET'), txtEnc.encode(val + '\0'))
	}

	/** @todo */
	// setErrorbuffer(): Code {
	// } // = 'ERRORBUFFER'

	setExpect100TimeoutMs(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('EXPECT_100_TIMEOUT_MS'), val);
	}

	setFailonerror(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('FAILONERROR'), val);
	}

	setFiletime(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('FILETIME'), val);
	}

	/** @todo */
	// setFnmatchData(): Code {
	// } // = 'FNMATCH__DATA'

	/** @todo */
	// setFnmatchFunction(val: () => number): Code {
	// } // = 'FNMATCH_FUNCTION'

	setFollowlocation(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('FOLLOWLOCATION'), val);
	}

	setForbidReuse(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('FORBID_REUSE'), val);
	}

	setFreshConnect(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('FRESH_CONNECT'), val);
	}

	setFtpport(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('FTPPORT'), txtEnc.encode(val + '\0'))
	}

	setFtpsslauth(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('FTPSSLAUTH'), val);
	}

	setFtpAccount(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('FTP_ACCOUNT'), txtEnc.encode(val + '\0'))
	}

	setFtpAlternativeToUser(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('FTP_ALTERNATIVE_TO_USER'), txtEnc.encode(val + '\0'))
	}

	setFtpCreateMissingDirs(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('FTP_CREATE_MISSING_DIRS'), val);
	}

	setFtpFilemethod(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('FTP_FILEMETHOD'), val);
	}

	setFtpSkipPasvIp(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('FTP_SKIP_PASV_IP'), val);
	}

	setFtpSslCcc(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('FTP_SSL_CCC'), val);
	}

	setFtpUseEprt(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('FTP_USE_EPRT'), val);
	}

	setFtpUseEpsv(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('FTP_USE_EPSV'), val);
	}

	setFtpUsePret(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('FTP_USE_PRET'), val);
	}

	setGssapiDelegation(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('GSSAPI_DELEGATION'), val);
	}

	setHappyEyeballsTimeoutMs(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('HAPPY_EYEBALLS_TIMEOUT_MS'), val);
	}

	setHaproxyprotocol(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('HAPROXYPROTOCOL'), val);
	}

	setHaproxyClientIp(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('HAPROXY_CLIENT_IP'), txtEnc.encode(val + '\0'))
	}

	setHeader(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('HEADER'), val);
	}

	/** @todo */
	// setHeaderdata(): Code {
	// } // = 'HEADERDATA'

	/** @todo */
	// setHeaderfunction(val: () => number): Code {
	// } // = 'HEADERFUNCTION'

	setHeaderopt(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('HEADEROPT'), val);
	}

	setHsts(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('HSTS'), txtEnc.encode(val + '\0'))
	}

	setHstsreaddata(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('HSTSREADDATA'), txtEnc.encode(val + '\0'))
	}

	/** @todo */
	// setHstsreadfunction(val: () => number): Code {
	// } // 'HSTSREADFUNCTION'

	setHstswritedata(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('HSTSWRITEDATA'), txtEnc.encode(val + '\0'))
	}

	setHstswritefunction(val: () => number): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('HSTSWRITEFUNCTION'), txtEnc.encode(val + '\0'))
	}

	setHstsCtrl(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('HSTS_CTRL'), val)
	}

	setHttp09Allowed(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('HTTP09_ALLOWED'), val);
	}

	/** @todo */
	// setHttp200aliases(): Code {
	// } // = 'HTTP200ALIASES'

	setHttpauth(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('HTTPAUTH'), val);
	}

	setHttpget(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('HTTPGET'), val);
	}

	/** @todo */
	// setHttpheader(): Code {
	// } // = 'HTTPHEADER'

	/** @todo */
	// setHttppost(): Code {
	// } // = 'HTTPPOST'

	setHttpproxytunnel(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('HTTPPROXYTUNNEL'), val);
	}

	setHttpContentDecoding(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('HTTP_CONTENT_DECODING'), val);
	} // = 'HTTP_CONTENT_DECODING'

	setHttpTransferDecoding(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('HTTP_TRANSFER_DECODING'), val);
	}

	setHttpVersion(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('HTTP_VERSION'), val);
	}

	setIgnoreContentLength(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('IGNORE_CONTENT_LENGTH'), val);
	}

	setInfilesize(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('INFILESIZE'), val);
	}

	/** @todo */
	// setInfilesizeLarge(): Code {
	// } // = 'INFILESIZE_LARGE'

	setInterface(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('INTERFACE'), txtEnc.encode(val + '\0'))
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
		return sym.easySetoptU64(this.#handle, this.optionByName('IPRESOLVE'), val);
	}

	setIssuercert(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('ISSUERCERT'), txtEnc.encode(val + '\0'))
	}

	setIssuercertBlob(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('ISSUERCERT_BLOB'), txtEnc.encode(val + '\0'))
	}

	setKeepSendingOnError(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('KEEP_SENDING_ON_ERROR'), val);
	}

	setKeypasswd(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('KEYPASSWD'), txtEnc.encode(val + '\0'))
	}

	setKrblevel(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('KRBLEVEL'), txtEnc.encode(val + '\0'))
	}

	setLocalport(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('LOCALPORT'), val);
	}

	setLocalportrange(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('LOCALPORTRANGE'), val);
	}

	setLoginOptions(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('LOGIN_OPTIONS'), txtEnc.encode(val + '\0'))
	}

	setLowSpeedLimit(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('LOW_SPEED_LIMIT'), val);
	}

	setLowSpeedTime(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('LOW_SPEED_TIME'), val);
	}

	setMailAuth(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('MAIL_AUTH'), txtEnc.encode(val + '\0'))
	}

	setMailFrom(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('MAIL_FROM'), txtEnc.encode(val + '\0'))
	}

	/** @todo */
	// setMailRcpt(): Code {
	// } // = 'MAIL_RCPT'

	setMailRcptAllowfails(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('MAIL_RCPT_ALLOWFAILS'), val);
	}

	setMaxageConn(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('MAXAGE_CONN'), val);
	}

	setMaxconnects(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('MAXCONNECTS'), val);
	}

	setMaxfilesize(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('MAXFILESIZE'), val);
	}

	/** @todo */
	// setMaxfilesizeLarge(): Code {
	// } // = 'MAXFILESIZE_LARGE'

	setMaxlifetimeConn(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('MAXLIFETIME_CONN'), val);
	}

	setMaxredirs(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('MAXREDIRS'), val);
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
		return sym.easySetoptU64(this.#handle, this.optionByName('MIME_OPTIONS'), val);
	}

	setNetrc(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('NETRC'), val);
	}

	setNetrcFile(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('NETRC_FILE'), txtEnc.encode(val + '\0'))
	}

	setNewDirectoryPerms(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('NEW_DIRECTORY_PERMS'), val);
	}

	setNewFilePerms(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('NEW_FILE_PERMS'), val);
	}

	setNobody(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('NOBODY'), val);
	}

	setNoprogress(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('NOPROGRESS'), val);
	}

	setNoproxy(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('NOPROXY'), txtEnc.encode(val + '\0'))
	}

	setNosignal(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('NOSIGNAL'), val);
	}

	/** @todo */
	// setOpensocketdata(): Code {
	// } // = 'OPENSOCKETDATA'

	/** @todo */
	// setOpensocketfunction(val: () => number): Code {
	// } // = 'OPENSOCKETFUNCTION'

	setPassword(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('PASSWORD'), txtEnc.encode(val + '\0'))
	}

	setPathAsIs(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('PATH_AS_IS'), val);
	}

	setPinnedpublickey(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('PINNEDPUBLICKEY'), txtEnc.encode(val + '\0'))
	}

	setPipewait(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('PIPEWAIT'), val);
	}

	setPort(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('PORT'), val);
	}

	setPost(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('POST'), val);
	}

	/** @todo */
	// setPostfields(): Code {
	// } // = 'POSTFIELDS'

	setPostfieldsize(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('POSTFIELDSIZE'), val);
	} // = 'POSTFIELDSIZE'

	/** @todo */
	// setPostfieldsizeLarge(): Code {
	// } // = 'POSTFIELDSIZE_LARGE'

	/** @todo */
	// setPostquote(): Code {
	// } // = 'POSTQUOTE'

	setPostredir(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('POSTREDIR'), val);
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
		return sym.easySetoptBuffer(this.#handle, this.optionByName('PRE_PROXY'), txtEnc.encode(val + '\0'))
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
		return sym.easySetoptU64(this.#handle, this.optionByName('PROTOCOLS'), val);
	}

	setProtocolsStr(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('PROTOCOLS_STR'), txtEnc.encode(val + '\0'))
	}

	setProxy(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('PROXY'), txtEnc.encode(val + '\0'))
	}

	setProxyauth(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('PROXYAUTH'), val);
	}

	setProxyheader(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('PROXYHEADER'), txtEnc.encode(val + '\0'))
	}

	setProxypassword(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('PROXYPASSWORD'), txtEnc.encode(val + '\0'))
	}

	setProxyport(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('PROXYPORT'), val);
	}

	setProxytype(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('PROXYTYPE'), val);
	}

	setProxyusername(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('PROXYUSERNAME'), txtEnc.encode(val + '\0'))
	}

	setProxyuserpwd(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('PROXYUSERPWD'), txtEnc.encode(val + '\0'))
	}

	setProxyCainfo(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('PROXY_CAINFO'), txtEnc.encode(val + '\0'))
	}

	setProxyCainfoBlob(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('PROXY_CAINFO_BLOB'), txtEnc.encode(val + '\0'))
	}

	setProxyCapath(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('PROXY_CAPATH'), txtEnc.encode(val + '\0'))
	}

	setProxyCrlfile(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('PROXY_CRLFILE'), txtEnc.encode(val + '\0'))
	}

	setProxyIssuercert(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('PROXY_ISSUERCERT'), txtEnc.encode(val + '\0'))
	}

	setProxyIssuercertBlob(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('PROXY_ISSUERCERT_BLOB'), txtEnc.encode(val + '\0'))
	}

	setProxyKeypasswd(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('PROXY_KEYPASSWD'), txtEnc.encode(val + '\0'))
	}

	setProxyPinnedpublickey(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('PROXY_PINNEDPUBLICKEY'), txtEnc.encode(val + '\0'))
	}

	setProxyServiceName(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('PROXY_SERVICE_NAME'), txtEnc.encode(val + '\0'))
	}

	setProxySslcert(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('PROXY_SSLCERT'), txtEnc.encode(val + '\0'))
	}

	setProxySslcerttype(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('PROXY_SSLCERTTYPE'), txtEnc.encode(val + '\0'))
	}

	setProxySslcertBlob(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('PROXY_SSLCERT_BLOB'), txtEnc.encode(val + '\0'))
	}

	setProxySslkey(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('PROXY_SSLKEY'), txtEnc.encode(val + '\0'))
	}

	setProxySslkeytype(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('PROXY_SSLKEYTYPE'), txtEnc.encode(val + '\0'))
	}

	setProxySslkeyBlob(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('PROXY_SSLKEY_BLOB'), txtEnc.encode(val + '\0'))
	}

	setProxySslversion(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('PROXY_SSLVERSION'), val);
	}

	setProxySslCipherList(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('PROXY_SSL_CIPHER_LIST'), txtEnc.encode(val + '\0'))
	}

	setProxySslOptions(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('PROXY_SSL_OPTIONS'), val);
	}

	setProxySslVerifyhost(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('PROXY_SSL_VERIFYHOST'), val);
	}

	setProxySslVerifypeer(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('PROXY_SSL_VERIFYPEER'), val);
	}

	setProxyTls13Ciphers(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('PROXY_TLS13_CIPHERS'), txtEnc.encode(val + '\0'))
	}

	setProxyTlsauthPassword(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('PROXY_TLSAUTH_PASSWORD'), txtEnc.encode(val + '\0'))
	}

	setProxyTlsauthType(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('PROXY_TLSAUTH_TYPE'), txtEnc.encode(val + '\0'))
	}

	setProxyTlsauthUsername(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('PROXY_TLSAUTH_USERNAME'), txtEnc.encode(val + '\0'))
	}

	setProxyTransferMode(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('PROXY_TRANSFER_MODE'), val);
	}

	setPut(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('PUT'), val);
	}

	setQuickExit(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('QUICK_EXIT'), val);
	}

	/** @todo */
	// setQuote(): Code {
	// } // = 'QUOTE'

	setRandomFile(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('RANDOM_FILE'), txtEnc.encode(val + '\0'))
	}

	setRange(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('RANGE'), txtEnc.encode(val + '\0'))
	}

	/** @todo */
	// setReaddata(): Code {
	// } // = 'READDATA'

	/** @todo */
	// setReadfunction(val: () => number): Code {
	// } // = 'READFUNCTION'

	setRedirProtocols(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('REDIR_PROTOCOLS'), val);
	}

	setRedirProtocolsStr(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('REDIR_PROTOCOLS_STR'), txtEnc.encode(val + '\0'))
	}

	setReferer(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('REFERER'), txtEnc.encode(val + '\0'))
	}

	setRequestTarget(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('REQUEST_TARGET'), txtEnc.encode(val + '\0'))
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
		return sym.easySetoptU64(this.#handle, this.optionByName('RESUME_FROM'), val);
	}

	/** @todo */
	// setResumeFromLarge(): Code {
	// } // = 'RESUME_FROM_LARGE'

	setRtspClientCseq(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('RTSP_CLIENT_CSEQ'), val);
	}

	setRtspRequest(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('RTSP_REQUEST'), val);
	}

	setRtspServerCseq(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('RTSP_SERVER_CSEQ'), val);
	}

	setRtspSessionId(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('RTSP_SESSION_ID'), txtEnc.encode(val + '\0'))
	}

	setRtspStreamUri(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('RTSP_STREAM_URI'), txtEnc.encode(val + '\0'))
	}

	setRtspTransport(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('RTSP_TRANSPORT'), txtEnc.encode(val + '\0'))
	}

	setSaslAuthzid(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('SASL_AUTHZID'), txtEnc.encode(val + '\0'))
	}

	setSaslIr(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('SASL_IR'), val);
	}

	/** @todo */
	// setSeekdata(): Code {
	// } // = 'SEEKDATA'

	/** @todo */
	// setSeekfunction(val: () => number): Code {
	// } // = 'SEEKFUNCTION'

	setServerResponseTimeout(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('SERVER_RESPONSE_TIMEOUT'), val);
	}

	setServiceName(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('SERVICE_NAME'), txtEnc.encode(val + '\0'))
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
		return sym.easySetoptU64(this.#handle, this.optionByName('SOCKS5_AUTH'), val);
	}

	setSocks5GssapiNec(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('SOCKS5_GSSAPI_NEC'), val);
	}

	setSocks5GssapiService(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('SOCKS5_GSSAPI_SERVICE'), txtEnc.encode(val + '\0'))
	}

	setSshAuthTypes(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('SSH_AUTH_TYPES'), val);
	}

	setSshCompression(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('SSH_COMPRESSION'), val);
	}

	/** @todo */
	// setSshHostkeydata(): Code {
	// } // = 'SSH_HOSTKEYDATA'

	/** @todo */
	// setSshHostkeyfunction(val: () => number): Code {
	// } // = 'SSH_HOSTKEYFUNCTION'

	setSshHostPublicKeyMd5(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('SSH_HOST_PUBLIC_KEY_MD5'), txtEnc.encode(val + '\0'))
	}

	setSshHostPublicKeySha256(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('SSH_HOST_PUBLIC_KEY_SHA256'), txtEnc.encode(val + '\0'))
	}

	/** @todo */
	// setSshKeydata(): Code {
	// } // = 'SSH_KEYDATA'

	/** @todo */
	// setSshKeyfunction(val: () => number): Code {
	// } // = 'SSH_KEYFUNCTION'

	setSshKnownhosts(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('SSH_KNOWNHOSTS'), txtEnc.encode(val + '\0'))
	}

	setSshPrivateKeyfile(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('SSH_PRIVATE_KEYFILE'), txtEnc.encode(val + '\0'))
	}

	setSshPublicKeyfile(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('SSH_PUBLIC_KEYFILE'), txtEnc.encode(val + '\0'))
	}

	setSslcert(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('SSLCERT'), txtEnc.encode(val + '\0'))
	}

	setSslcerttype(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('SSLCERTTYPE'), txtEnc.encode(val + '\0'))
	}

	setSslcertBlob(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('SSLCERT_BLOB'), txtEnc.encode(val + '\0'))
	}

	setSslengine(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('SSLENGINE'), txtEnc.encode(val + '\0'))
	}

	setSslengineDefault(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('SSLENGINE_DEFAULT'), val)
	}

	setSslkey(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('SSLKEY'), txtEnc.encode(val + '\0'))
	}

	setSslkeytype(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('SSLKEYTYPE'), txtEnc.encode(val + '\0'))
	}

	setSslkeyBlob(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('SSLKEY_BLOB'), txtEnc.encode(val + '\0'))
	}

	setSslversion(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('SSLVERSION'), val);
	}

	setSslCipherList(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('SSL_CIPHER_LIST'), txtEnc.encode(val + '\0'))
	}

	/** @todo */
	// setSslCtxData(): Code {
	// } // = 'SSL_CTX_DATA'

	/** @todo */
	// setSslCtxFunction(val: () => number): Code {
	// } // = 'SSL_CTX_FUNCTION'

	setSslEcCurves(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('SSL_EC_CURVES'), txtEnc.encode(val + '\0'))
	}

	setSslEnableAlpn(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('SSL_ENABLE_ALPN'), val);
	}

	setSslEnableNpn(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('SSL_ENABLE_NPN'), val);
	}

	setSslFalsestart(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('SSL_FALSESTART'), val);
	}

	setSslOptions(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('SSL_OPTIONS'), val);
	}

	setSslSessionidCache(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('SSL_SESSIONID_CACHE'), val);
	}

	setSslVerifyhost(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('SSL_VERIFYHOST'), val);
	}

	setSslVerifypeer(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('SSL_VERIFYPEER'), val);
	}

	setSslVerifystatus(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('SSL_VERIFYSTATUS'), val);
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
		return sym.easySetoptU64(this.#handle, this.optionByName('STREAM_WEIGHT'), val);
	}

	setSuppressConnectHeaders(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('SUPPRESS_CONNECT_HEADERS'), val);
	}

	setTcpFastopen(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('TCP_FASTOPEN'), val);
	}

	setTcpKeepalive(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('TCP_KEEPALIVE'), val);
	}

	setTcpKeepidle(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('TCP_KEEPIDLE'), val);
	}

	setTcpKeepintvl(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('TCP_KEEPINTVL'), val);
	}

	setTcpNodelay(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('TCP_NODELAY'), val);
	}

	/** @todo */
	// setTelnetoptions(): Code {
	// } // = 'TELNETOPTIONS'

	setTftpBlksize(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('TFTP_BLKSIZE'), val);
	}

	setTftpNoOptions(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('TFTP_NO_OPTIONS'), val);
	}

	setTimecondition(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('TIMECONDITION'), val);
	}

	setTimeout(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('TIMEOUT'), val);
	}

	setTimeoutMs(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('TIMEOUT_MS'), val);
	}

	setTimevalue(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('TIMEVALUE'), val);
	}

	/** @todo */
	// setTimevalueLarge(): Code {
	// } // = 'TIMEVALUE_LARGE'

	setTls13Ciphers(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('TLS13_CIPHERS'), txtEnc.encode(val + '\0'))
	}

	setTlsauthPassword(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('TLSAUTH_PASSWORD'), txtEnc.encode(val + '\0'))
	}

	setTlsauthType(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('TLSAUTH_TYPE'), txtEnc.encode(val + '\0'))
	}

	setTlsauthUsername(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('TLSAUTH_USERNAME'), txtEnc.encode(val + '\0'))
	}

	/** @todo */
	// setTrailerdata(): Code {
	// } // = 'TRAILERDATA'

	/** @todo */
	// setTrailerfunction(val: () => number): Code {
	// } // = 'TRAILERFUNCTION'

	setTransfertext(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('TRANSFERTEXT'), val);
	}

	setTransferEncoding(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('TRANSFERE_NCODING'), val);
	}

	setUnixSocketPath(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('UNIX_SOCKET_PATH'), txtEnc.encode(val + '\0'))
	}

	setUnrestrictedAuth(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('UNRESTRICTED_AUTH'), val);
	}

	setUpkeepIntervalMs(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('UPKEEP_INTERVAL_MS'), val);
	}

	setUpload(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('UPLOAD'), val);
	}

	setUploadBuffersize(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('UPLOAD_BUFFERSIZE'), val);
	}

	setUrl(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('URL'), txtEnc.encode(val + '\0'));
	}

	setUseragent(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('USERAGENT'), txtEnc.encode(val + '\0'));
	}

	setUsername(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('USERNAME'), txtEnc.encode(val + '\0'));
	}

	setUserpwd(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('USERPWD'), txtEnc.encode(val + '\0'));
	}

	setUseSsl(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('USE_SSL'), val);
	}

	setVerbose(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('VERBOSE'), val);
	}

	setWildcardmatch(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('WILDCARDMATCH'), val);
	}

	/** @todo */
	// setWritedata(): Code {
	// } // = 'WRITEDATA'

	setWritefunction(val: (chunk: Uint8Array) => void) {
		this.#writeFunction = val;
	}

	setWsOptions(val: number): Code {
		return sym.easySetoptU64(this.#handle, this.optionByName('WS_OPTIONS'), val);
	}

	/** @todo */
	// setXferinfodata(): Code {
	// } // = 'XFERINFODATA'

	/** @todo */
	// setXferinfofunction(val: () => number): Code {
	// } // = 'XFERINFOFUNCTION'

	setXoauth2Bearer(val: string): Code {
		return sym.easySetoptBuffer(this.#handle, this.optionByName('XOAUTH2_BEARER'), txtEnc.encode(val + '\0'))
	}
}