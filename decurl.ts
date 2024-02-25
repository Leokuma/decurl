import {i32, u32, u64, f64} from 'https://deno.land/x/byte_type@0.3.0/src/primitives/mod.ts';
import libcurl from './libcurl.ts';
import {Auth, Code, CStr, CurlBlob, TlssessioninfoStruct, DoublePtrChar, DoublePtrSlist, EasyOption, ERROR_SIZE, GlobalInit, HttpVersion, Info, MimePart, Opt, ProxyCode, Sslbackend, Sslset} from './types.ts';
const sym = libcurl.symbols;

let initialized = false;

/** @todo Implement third param. */
/** https://curl.se/libcurl/c/curl_global_sslset.html */
export function globalSslset(id: Sslbackend, name?: string): Sslset {
	return sym.globalSslset(id, (name ? CStr(name) : null), null);
}

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

const txtDec = new TextDecoder();
const txtEnc = new TextEncoder();

type Mime = {
	ptr: Deno.PointerValue
	parts: Map<MimePart, Deno.PointerObject>
}

export default class Decurl implements Disposable {
	#errorBuffer: ArrayBuffer | null = null;
	#httpHeaderList: Deno.PointerValue = null;
	#mime: Mime = {ptr: null, parts: new Map()};
	#writeFunction: null | ((chunk: Uint8Array) => void) = null;
	#_writeFunction: null | Deno.UnsafeCallback<{
		readonly parameters: readonly ['buffer', 'i32', 'i32', 'pointer'];
		readonly result: 'usize';
	}>;
	#writeFunctionData: Uint8Array | null = null;
	#headerFunction: null | ((chunk: ArrayBuffer) => void) = null;
	#_headerFunction: null | Deno.UnsafeCallback<{
		readonly parameters: readonly ['buffer', 'i32', 'i32', 'pointer'];
		readonly result: 'usize';
	}>;
	#headerFunctionData: Headers | null = null;
	/** Curl handle. */
	#ptr: Deno.PointerValue;

	constructor() {
		this.#ptr = this.init();

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
		sym.easySetoptFn(this.#ptr, this.optionByName(Opt.Writefunction).id, this.#_writeFunction.pointer);

		this.#_headerFunction = new Deno.UnsafeCallback({
			parameters: ['buffer', 'i32', 'i32', 'pointer'],
			result: 'usize'
		}, (pBuf: Deno.PointerValue, _size: number, nitems: number, _customP: Deno.PointerValue): number => {
			if (!pBuf)
				throw new Error('Null pointer');

			const retBuf = Deno.UnsafePointerView.getArrayBuffer(pBuf, nitems);
			const retStr = txtDec.decode(retBuf).trim();
			const colonPos = retStr.indexOf(':');

			if (!retStr)
				return nitems;

			if (colonPos == -1) {
				const cookies = this.#headerFunctionData?.getSetCookie();
				this.#headerFunctionData = new Headers();

				if (cookies)
					for (const cookie of cookies)
						this.#headerFunctionData.append('set-cookie', cookie);

				return nitems;
			}

			this.#headerFunctionData ??= new Headers();
			this.#headerFunctionData.append(retStr.substring(0, colonPos).trim(), retStr.substring(colonPos + 1).trim());

			if (this.#headerFunction)
				this.#headerFunction(retBuf);

			return nitems;
		});
		sym.easySetoptFn(this.#ptr, this.optionByName(Opt.Headerfunction).id, this.#_headerFunction.pointer);
	}

	init(): Deno.PointerValue {
		return sym.easyInit();
	}

	/** https://curl.se/libcurl/c/curl_easy_cleanup.html */
	cleanup() {
		sym.slistFreeAll(this.#httpHeaderList);
		sym.mimeFree(this.#mime.ptr);
		sym.easyCleanup(this.#ptr);
		this.#errorBuffer = null;
		this.#_writeFunction?.close();
		this.#_writeFunction = null;
		this.#writeFunction = null;
		this.#writeFunctionData = null;
		this.#_headerFunction?.close();
		this.#_headerFunction = null;
		this.#headerFunction = null;
		this.#headerFunctionData = null;
		this.#ptr = null;
	}

	[Symbol.dispose]() {
		this.cleanup();
	}

	optionByName(name: Opt): EasyOption {
		const p = sym.easyOptionByName(CStr(name));

		if (!p)	throw new Error(`Option ${name} not found`);

		return EasyOption(p);
	}

	perform(): Code {
		this.#errorBuffer = null;
		this.#writeFunctionData = null;
		return sym.easyPerform(this.#ptr);
	}

	/** Get headers received by `perform()`. */
	getHeaderFunctionData(): Headers | null {
		return this.#headerFunctionData;
	}

	/** Get data received by `perform()` and other functions. */
	getWriteFunctionData(): Uint8Array | null {
		return this.#writeFunctionData;
	}

	setAbstractUnixSocket(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.AbstractUnixSocket).id, CStr(val))
	}

	setAccepttimeoutMs(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.AccepttimeoutMs).id, val);
	}

	setAcceptEncoding(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.AcceptEncoding).id, CStr(val))
	}

	setAddressScope(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.AddressScope).id, val);
	}

	setAltsvc(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Altsvc).id, CStr(val))
	}

	setAltsvcCtrl(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.AltsvcCtrl).id, CStr(val))
	}

	setAppend(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Append).id, val);
	}

	setAutoreferer(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Autoreferer).id, val);
	}

	setAwsSigv4(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.AwsSigv4).id, CStr(val))
	}

	setBuffersize(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Buffersize).id, val);
	}

	setCainfo(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Cainfo).id, CStr(val))
	}

	/** @todo */
	// setCainfoBlob(val: string): Code {
	// } // = 'CAINFO_BLOB'

	setCapath(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Capath).id, CStr(val))
	}

	setCaCacheTimeout(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.CaCacheTimeout).id, val);
	}

	setCertinfo(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Certinfo).id, val);
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
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Connecttimeout).id, val);
	}

	setConnecttimeoutMs(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.ConnecttimeoutMs).id, val);
	}

	setConnectOnly(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.ConnectOnly).id, val);
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

	setCookie(data: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Cookie).id, CStr(data))
	}

	setCookiefile(filename: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Cookiefile).id, CStr(filename))
	}

	setCookiejar(filename: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Cookiejar).id, CStr(filename))
	}

	setCookielist(data: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Cookielist).id, CStr(data))
	}

	setCookiesession(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Cookiesession).id, val);
	}

	setCopypostfields(data: string | ArrayBuffer): Code {
		if (typeof data == 'string')
			data = CStr(data);

		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Copypostfields).id, data)
	}

	setCrlf(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Crlf).id, val);
	}

	setCrlfile(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Crlfile).id, CStr(val))
	}

	/** @todo */
	// setCurlu(): Code {
	// } // = 'CURLU'

	setCustomrequest(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Customrequest).id, CStr(val))
	}

	/** @todo */
	// setDebugdata(): Code {
	// } // = 'DEBUGDATA'

	/** @todo */
	// setDebugfunction(val: () => number): Code {
	// } // = 'DEBUGFUNCTION'

	setDefaultProtocol(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.DefaultProtocol).id, CStr(val))
	}

	setDirlistonly(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Dirlistonly).id, val);
	}

	setDisallowUsernameInUrl(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.DisallowUsernameInUrl).id, val);
	}

	setDnsCacheTimeout(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.DnsCacheTimeout).id, val);
	}

	setDnsInterface(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.DnsInterface).id, CStr(val))
	}

	setDnsLocalIp4(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.DnsLocalIp4).id, CStr(val))
	}

	setDnsLocalIp6(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.DnsLocalIp6).id, CStr(val))
	}

	setDnsServers(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.DnsServers).id, CStr(val))
	}

	setDnsShuffleAddresses(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.DnsShuffleAddresses).id, val);
	}

	setDnsUseGlobalCache(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.DnsUseGlobalCache).id, val);
	}

	setDohSslVerifyhost(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.DohSslVerifyhost).id, val);
	}

	setDohSslVerifypeer(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.DohSslVerifypeer).id, val);
	}

	setDohSslVerifystatus(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.DohSslVerifystatus).id, val);
	}

	setDohUrl(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.DohUrl).id, CStr(val))
	}

	setEgdsocket(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Egdsocket).id, CStr(val))
	}

	getErrorbuffer(): string | null {
		if (!this.#errorBuffer)
			return null;

		return txtDec.decode(this.#errorBuffer);
	}

	setErrorbuffer(buf: ArrayBuffer): Code {
		if (buf.byteLength < ERROR_SIZE)
			throw new Error('Error buffer must be at least ' + ERROR_SIZE + ' bytes big.');

		this.#errorBuffer = buf;
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Errorbuffer).id, this.#errorBuffer);
	}

	setExpect100TimeoutMs(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Expect100TimeoutMs).id, val);
	}

	setFailonerror(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Failonerror).id, val);
	}

	setFiletime(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Filetime).id, val);
	}

	/** @todo */
	// setFnmatchData(): Code {
	// } // = 'FNMATCH_DATA'

	/** @todo */
	// setFnmatchFunction(val: () => number): Code {
	// } // = 'FNMATCH_FUNCTION'

	setFollowlocation(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Followlocation).id, val);
	}

	setForbidReuse(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.ForbidReuse).id, val);
	}

	setFreshConnect(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.FreshConnect).id, val);
	}

	setFtpport(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Ftpport).id, CStr(val))
	}

	setFtpsslauth(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Ftpsslauth).id, val);
	}

	setFtpAccount(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.FtpAccount).id, CStr(val))
	}

	setFtpAlternativeToUser(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.FtpAlternativeToUser).id, CStr(val))
	}

	setFtpCreateMissingDirs(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.FtpCreateMissingDirs).id, val);
	}

	setFtpFilemethod(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.FtpFilemethod).id, val);
	}

	setFtpSkipPasvIp(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.FtpSkipPasvIp).id, val);
	}

	setFtpSslCcc(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.FtpSslCcc).id, val);
	}

	setFtpUseEprt(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.FtpUseEprt).id, val);
	}

	setFtpUseEpsv(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.FtpUseEpsv).id, val);
	}

	setFtpUsePret(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.FtpUsePret).id, val);
	}

	setGssapiDelegation(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.GssapiDelegation).id, val);
	}

	setHappyEyeballsTimeoutMs(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.HappyEyeballsTimeoutMs).id, val);
	}

	setHaproxyprotocol(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Haproxyprotocol).id, val);
	}

	setHaproxyClientIp(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.HaproxyClientIp).id, CStr(val))
	}

	setHeader(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Header).id, val);
	}

	/** @todo */
	// setHeaderdata(): Code {
	// } // = 'HEADERDATA'

	/** @todo */
	// setHeaderfunction(val: () => number): Code {
	// } // = 'HEADERFUNCTION'

	setHeaderopt(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Headeropt).id, val);
	}

	setHsts(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Hsts).id, CStr(val))
	}

	setHstsreaddata(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Hstsreaddata).id, CStr(val))
	}

	/** @todo */
	// setHstsreadfunction(val: () => number): Code {
	// } // 'HSTSREADFUNCTION'

	setHstswritedata(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Hstswritedata).id, CStr(val))
	}

	/** @todo */
	// setHstswritefunction(val: () => number): Code {
	// } // 'HSTSWRITEFUNCTION'

	setHstsCtrl(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.HstsCtrl).id, val)
	}

	setHttp09Allowed(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Http09Allowed).id, val);
	}

	/** @todo */
	// setHttp200aliases(): Code {
	// } // = 'HTTP200ALIASES'

	setHttpauth(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Httpauth).id, val);
	}

	setHttpget(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Httpget).id, val);
	}

	setHttpheader(headers: Headers): Code {
		sym.slistFreeAll(this.#httpHeaderList);
		this.#httpHeaderList = null;

		for (const [k, v] of Object.entries(headers))
			this.#httpHeaderList = sym.slistAppend(this.#httpHeaderList, CStr(`${k}: ${v}`));

		return sym.easySetoptPtr(this.#ptr, this.optionByName(Opt.Httpheader).id, this.#httpHeaderList);
	}

	/** @deprecated */
	// setHttppost(): Code {
	// } // = 'HTTPPOST'

	setHttpproxytunnel(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Httpproxytunnel).id, val);
	}

	setHttpContentDecoding(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.HttpContentDecoding).id, val);
	}

	setHttpTransferDecoding(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.HttpTransferDecoding).id, val);
	}

	setHttpVersion(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.HttpVersion).id, val);
	}

	setIgnoreContentLength(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.IgnoreContentLength).id, val);
	}

	setInfilesize(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Infilesize).id, val);
	}

	/** @todo */
	// setInfilesizeLarge(): Code {
	// } // = 'INFILESIZE_LARGE'

	setInterface(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Interface).id, CStr(val))
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
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Ipresolve).id, val);
	}

	setIssuercert(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Issuercert).id, CStr(val))
	}

	/** @todo */
	// setIssuercertBlob(val: string): Code {
	// } // = 'ISSUERCERT_BLOB'

	setKeepSendingOnError(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.KeepSendingOnError).id, val);
	}

	setKeypasswd(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Keypasswd).id, CStr(val))
	}

	setKrblevel(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Krblevel).id, CStr(val))
	}

	setLocalport(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Localport).id, val);
	}

	setLocalportrange(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Localportrange).id, val);
	}

	setLoginOptions(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.LoginOptions).id, CStr(val))
	}

	setLowSpeedLimit(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.LowSpeedLimit).id, val);
	}

	setLowSpeedTime(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.LowSpeedTime).id, val);
	}

	setMailAuth(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.MailAuth).id, CStr(val))
	}

	setMailFrom(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.MailFrom).id, CStr(val))
	}

	/** @todo */
	// setMailRcpt(): Code {
	// } // = 'MAIL_RCPT'

	setMailRcptAllowfails(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.MailRcptAllowfails).id, val);
	}

	setMaxageConn(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.MaxageConn).id, val);
	}

	setMaxconnects(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Maxconnects).id, val);
	}

	setMaxfilesize(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Maxfilesize).id, val);
	}

	/** @todo */
	// setMaxfilesizeLarge(): Code {
	// } // = 'MAXFILESIZE_LARGE'

	setMaxlifetimeConn(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.MaxlifetimeConn).id, val);
	}

	setMaxredirs(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Maxredirs).id, val);
	}

	/** @todo */
	// setMaxRecvSpeedLarge(): Code {
	// } // = 'MAX_RECV_SPEED_LARGE'

	/** @todo */
	// setMaxSendSpeedLarge(): Code {
	// } // = 'MAX_SEND_SPEED_LARGE'

	/** @todo */
	setMimepost(mimePart: MimePart): Code {
		if (!this.#mime.ptr) {
			const p = sym.mimeInit(this.#ptr);
			if (!p) throw new Error('Mime could not be initialized');
			this.#mime.ptr = p;
		}

		let pMimePart = this.#mime.parts.get(mimePart);
		if (!pMimePart) {
			const _mimePart = sym.mimeAddpart(this.#mime.ptr);
			if (!_mimePart) throw new Error('Mime part could not be initialized');
			this.#mime.parts.set(mimePart, _mimePart);
			pMimePart = _mimePart;
		}

		sym.mimeName(pMimePart, CStr(mimePart.name));

		if (mimePart.filename)
			sym.mimeFilename(pMimePart, CStr(mimePart.filename));

		let buf: ArrayBuffer;
		if (typeof mimePart.data == 'string')
			buf = txtEnc.encode(mimePart.data);
		else
			buf = mimePart.data;
		
		sym.mimeData(pMimePart, buf, buf.byteLength);

		return sym.easySetoptPtr(this.#ptr, this.optionByName(Opt.Mimepost).id, this.#mime.ptr);
	}

	setMimeOptions(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.MimeOptions).id, val);
	}

	setNetrc(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Netrc).id, val);
	}

	setNetrcFile(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.NetrcFile).id, CStr(val))
	}

	setNewDirectoryPerms(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.NewDirectoryPerms).id, val);
	}

	setNewFilePerms(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.NewFilePerms).id, val);
	}

	setNobody(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Nobody).id, val);
	}

	setNoprogress(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Noprogress).id, val);
	}

	setNoproxy(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Noproxy).id, CStr(val))
	}

	setNosignal(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Nosignal).id, val);
	}

	/** @todo */
	// setOpensocketdata(): Code {
	// } // = 'OPENSOCKETDATA'

	/** @todo */
	// setOpensocketfunction(val: () => number): Code {
	// } // = 'OPENSOCKETFUNCTION'

	setPassword(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Password).id, CStr(val))
	}

	setPathAsIs(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.PathAsIs).id, val);
	}

	setPinnedpublickey(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Pinnedpublickey).id, CStr(val))
	}

	setPipewait(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Pipewait).id, val);
	}

	setPort(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Port).id, val);
	}

	setPost(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Post).id, val);
	}

	/** **Careful!** Data is passed by reference. Use `setCopypostfields` to pass by value. */
	setPostfields(data: string | ArrayBuffer): Code {
		if (typeof data == 'string')
			data = CStr(data);

		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Postfields).id, data)
	}

	setPostfieldsize(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Postfieldsize).id, val);
	}

	/** @todo */
	// setPostfieldsizeLarge(): Code {
	// } // = 'POSTFIELDSIZE_LARGE'

	/** @todo */
	// setPostquote(): Code {
	// } // = 'POSTQUOTE'

	setPostredir(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Postredir).id, val);
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
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.PreProxy).id, CStr(val))
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
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Protocols).id, val);
	}

	setProtocolsStr(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.ProtocolsStr).id, CStr(val))
	}

	setProxy(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Proxy).id, CStr(val))
	}

	setProxyauth(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Proxyauth).id, val);
	}

	setProxyheader(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Proxyheader).id, CStr(val))
	}

	setProxypassword(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Proxypassword).id, CStr(val))
	}

	setProxyport(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Proxyport).id, val);
	}

	setProxytype(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Proxytype).id, val);
	}

	setProxyusername(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Proxyusername).id, CStr(val))
	}

	setProxyuserpwd(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Proxyuserpwd).id, CStr(val))
	}

	setProxyCainfo(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.ProxyCainfo).id, CStr(val))
	}

	/** @todo */
	// setProxyCainfoBlob(val: string): Code {
	// } // = 'PROXY_CAINFO_BLOB'

	setProxyCapath(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.ProxyCapath).id, CStr(val))
	}

	setProxyCrlfile(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.ProxyCrlfile).id, CStr(val))
	}

	setProxyIssuercert(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.ProxyIssuercert).id, CStr(val))
	}

	/** @todo */
	// setProxyIssuercertBlob(val: string): Code {
	// } // = 'PROXY_ISSUERCERT_BLOB'

	setProxyKeypasswd(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.ProxyKeypasswd).id, CStr(val))
	}

	setProxyPinnedpublickey(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.ProxyPinnedpublickey).id, CStr(val))
	}

	setProxyServiceName(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.ProxyServiceName).id, CStr(val))
	}

	setProxySslcert(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.ProxySslcert).id, CStr(val))
	}

	setProxySslcerttype(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.ProxySslcerttype).id, CStr(val))
	}

	/** @todo */
	// setProxySslcertBlob(val: string): Code {
	// } // = 'PROXY_SSLCERT_BLOB'

	setProxySslkey(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.ProxySslkey).id, CStr(val))
	}

	setProxySslkeytype(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.ProxySslkeytype).id, CStr(val))
	}

	/** @todo */
	// setProxySslkeyBlob(val: string): Code {
	// } // = 'PROXY_SSLKEY_BLOB'

	setProxySslversion(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.ProxySslversion).id, val);
	}

	setProxySslCipherList(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.ProxySslCipherList).id, CStr(val))
	}

	setProxySslOptions(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.ProxySslOptions).id, val);
	}

	setProxySslVerifyhost(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.ProxySslVerifyhost).id, val);
	}

	setProxySslVerifypeer(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.ProxySslVerifypeer).id, val);
	}

	setProxyTls13Ciphers(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.ProxyTls13Ciphers).id, CStr(val))
	}

	setProxyTlsauthPassword(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.ProxyTlsauthPassword).id, CStr(val))
	}

	setProxyTlsauthType(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.ProxyTlsauthType).id, CStr(val))
	}

	setProxyTlsauthUsername(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.ProxyTlsauthUsername).id, CStr(val))
	}

	setProxyTransferMode(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.ProxyTransferMode).id, val);
	}

	setPut(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Put).id, val);
	}

	setQuickExit(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.QuickExit).id, val);
	}

	/** @todo */
	// setQuote(): Code {
	// } // = 'QUOTE'

	setRandomFile(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.RandomFile).id, CStr(val))
	}

	setRange(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Range).id, CStr(val))
	}

	/** @todo */
	// setReaddata(): Code {
	// } // = 'READDATA'

	/** @todo */
	// setReadfunction(val: () => number): Code {
	// } // = 'READFUNCTION'

	setRedirProtocols(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.RedirProtocols).id, val);
	}

	setRedirProtocolsStr(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.RedirProtocolsStr).id, CStr(val))
	}

	setReferer(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Referer).id, CStr(val))
	}

	setRequestTarget(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.RequestTarget).id, CStr(val))
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
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.ResumeFrom).id, val);
	}

	/** @todo */
	// setResumeFromLarge(): Code {
	// } // = 'RESUME_FROM_LARGE'

	setRtspClientCseq(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.RtspClientCseq).id, val);
	}

	setRtspRequest(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.RtspRequest).id, val);
	}

	setRtspServerCseq(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.RtspServerCseq).id, val);
	}

	setRtspSessionId(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.RtspSessionId).id, CStr(val))
	}

	setRtspStreamUri(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.RtspStreamUri).id, CStr(val))
	}

	setRtspTransport(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.RtspTransport).id, CStr(val))
	}

	setSaslAuthzid(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.SaslAuthzid).id, CStr(val))
	}

	setSaslIr(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.SaslIr).id, val);
	}

	/** @todo */
	// setSeekdata(): Code {
	// } // = 'SEEKDATA'

	/** @todo */
	// setSeekfunction(val: () => number): Code {
	// } // = 'SEEKFUNCTION'

	setServerResponseTimeout(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.ServerResponseTimeout).id, val);
	}

	setServiceName(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.ServiceName).id, CStr(val))
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
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Socks5Auth).id, val);
	}

	setSocks5GssapiNec(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Socks5GssapiNec).id, val);
	}

	setSocks5GssapiService(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Socks5GssapiService).id, CStr(val))
	}

	setSshAuthTypes(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.SshAuthTypes).id, val);
	}

	setSshCompression(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.SshCompression).id, val);
	}

	/** @todo */
	// setSshHostkeydata(): Code {
	// } // = 'SSH_HOSTKEYDATA'

	/** @todo */
	// setSshHostkeyfunction(val: () => number): Code {
	// } // = 'SSH_HOSTKEYFUNCTION'

	setSshHostPublicKeyMd5(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.SshHostPublicKeyMd5).id, CStr(val))
	}

	setSshHostPublicKeySha256(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.SshHostPublicKeySha256).id, CStr(val))
	}

	/** @todo */
	// setSshKeydata(): Code {
	// } // = 'SSH_KEYDATA'

	/** @todo */
	// setSshKeyfunction(val: () => number): Code {
	// } // = 'SSH_KEYFUNCTION'

	setSshKnownhosts(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.SshKnownhosts).id, CStr(val))
	}

	setSshPrivateKeyfile(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.SshPrivateKeyfile).id, CStr(val))
	}

	setSshPublicKeyfile(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.SshPublicKeyfile).id, CStr(val))
	}

	setSslcert(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Sslcert).id, CStr(val))
	}

	setSslcerttype(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Sslcerttype).id, CStr(val))
	}

	setSslcertBlob(cert: ArrayBuffer): Code {
		return sym.easySetoptBlob(this.#ptr, this.optionByName(Opt.SslcertBlob).id, CurlBlob(cert));
	}

	setSslengine(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Sslengine).id, CStr(val))
	}

	setSslengineDefault(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.SslengineDefault).id, val)
	}

	setSslkey(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Sslkey).id, CStr(val))
	}

	setSslkeytype(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Sslkeytype).id, CStr(val))
	}

	/** @todo */
	// setSslkeyBlob(val: string): Code {
	// } // = 'SSLKEY_BLOB'

	setSslversion(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Sslversion).id, val);
	}

	setSslCipherList(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.SslCipherList).id, CStr(val))
	}

	/** @todo */
	// setSslCtxData(): Code {
	// } // = 'SSL_CTX_DATA'

	/** @todo */
	// setSslCtxFunction(val: () => number): Code {
	// } // = 'SSL_CTX_FUNCTION'

	setSslEcCurves(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.SslEcCurves).id, CStr(val))
	}

	setSslEnableAlpn(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.SslEnableAlpn).id, val);
	}

	setSslEnableNpn(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.SslEnableNpn).id, val);
	}

	setSslFalsestart(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.SslFalsestart).id, val);
	}

	setSslOptions(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.SslOptions).id, val);
	}

	setSslSessionidCache(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.SslSessionidCache).id, val);
	}

	setSslVerifyhost(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.SslVerifyhost).id, val);
	}

	setSslVerifypeer(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.SslVerifypeer).id, val);
	}

	setSslVerifystatus(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.SslVerifystatus).id, val);
	}

	/** @todo Doesn't work in Windows */
	// setStderr(): Code {
	// } // = 'STDERR'

	/** @todo */
	// setStreamDepends(): Code {
	// } // = 'STREAM_DEPENDS'

	/** @todo */
	// setStreamDependsE(): Code {
	// } // = 'STREAM_DEPENDS_E'

	setStreamWeight(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.StreamWeight).id, val);
	}

	setSuppressConnectHeaders(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.SuppressConnectHeaders).id, val);
	}

	setTcpFastopen(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.TcpFastopen).id, val);
	}

	setTcpKeepalive(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.TcpKeepalive).id, val);
	}

	setTcpKeepidle(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.TcpKeepidle).id, val);
	}

	setTcpKeepintvl(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.TcpKeepintvl).id, val);
	}

	setTcpNodelay(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.TcpNodelay).id, val);
	}

	/** @todo */
	// setTelnetoptions(): Code {
	// } // = 'TELNETOPTIONS'

	setTftpBlksize(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.TftpBlksize).id, val);
	}

	setTftpNoOptions(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.TftpNoOptions).id, val);
	}

	setTimecondition(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Timecondition).id, val);
	}

	setTimeout(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Timeout).id, val);
	}

	setTimeoutMs(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.TimeoutMs).id, val);
	}

	setTimevalue(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Timevalue).id, val);
	}

	/** @todo */
	// setTimevalueLarge(): Code {
	// } // = 'TIMEVALUE_LARGE'

	setTls13Ciphers(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Tls13Ciphers).id, CStr(val))
	}

	setTlsauthPassword(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.TlsauthPassword).id, CStr(val))
	}

	setTlsauthType(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.TlsauthType).id, CStr(val))
	}

	setTlsauthUsername(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.TlsauthUsername).id, CStr(val))
	}

	/** @todo */
	// setTrailerdata(): Code {
	// } // = 'TRAILERDATA'

	/** @todo */
	// setTrailerfunction(val: () => number): Code {
	// } // = 'TRAILERFUNCTION'

	setTransfertext(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Transfertext).id, val);
	}

	setTransferEncoding(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.TransferEncoding).id, val);
	}

	setUnixSocketPath(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.UnixSocketPath).id, CStr(val))
	}

	setUnrestrictedAuth(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.UnrestrictedAuth).id, val);
	}

	setUpkeepIntervalMs(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.UpkeepIntervalMs).id, val);
	}

	setUpload(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Upload).id, val);
	}

	setUploadBuffersize(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.UploadBuffersize).id, val);
	}

	setUrl(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Url).id, CStr(val));
	}

	setUseragent(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Useragent).id, CStr(val));
	}

	setUsername(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Username).id, CStr(val));
	}

	setUserpwd(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Userpwd).id, CStr(val));
	}

	setUseSsl(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.UseSsl).id, val);
	}

	setVerbose(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Verbose).id, val);
	}

	setWildcardmatch(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.Wildcardmatch).id, val);
	}

	/** @todo */
	// setWritedata(): Code {
	// } // = 'WRITEDATA'

	setWritefunction(fn: (chunk: Uint8Array) => void) {
		this.#writeFunction = fn;
	}

	setWsOptions(val: number): Code {
		return sym.easySetoptU64(this.#ptr, this.optionByName(Opt.WsOptions).id, val);
	}

	/** @todo */
	// setXferinfodata(): Code {
	// } // = 'XFERINFODATA'

	/** @todo */
	// setXferinfofunction(val: () => number): Code {
	// } // = 'XFERINFOFUNCTION'

	setXoauth2Bearer(val: string): Code {
		return sym.easySetoptBuf(this.#ptr, this.optionByName(Opt.Xoauth2Bearer).id, CStr(val))
	}

	getEffectiveUrl(): string | null {
		const pptr = new DoublePtrChar();
		sym.easyGetinfoBuf(this.#ptr, Info.EffectiveUrl, pptr);
		return pptr.getValue();
	}

	getResponseCode(): number {
		const buf = new Int32Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.ResponseCode, buf);
		return i32.read(new DataView(buf.buffer));
	}

	getTotalTime(): number {
		const buf = new BigUint64Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.TotalTime, buf);
		return f64.read(new DataView(buf.buffer));
	}

	getNamelookupTime(): number {
		const buf = new BigUint64Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.NamelookupTime, buf);
		return f64.read(new DataView(buf.buffer));
	}

	getConnectTime(): number {
		const buf = new BigUint64Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.ConnectTime, buf);
		return f64.read(new DataView(buf.buffer));
	}

	getPretransferTime(): number {
		const buf = new BigUint64Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.PretransferTime, buf);
		return f64.read(new DataView(buf.buffer));
	}

	getSizeUploadT(): number {
		const buf = new BigUint64Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.SizeUploadT, buf);
		return u32.read(new DataView(buf.buffer));
	}

	getSizeDownloadT(): number {
		const buf = new BigUint64Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.SizeDownloadT, buf);
		return u32.read(new DataView(buf.buffer));
	}

	getSpeedDownloadT(): number {
		const buf = new BigUint64Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.SpeedDownloadT, buf);
		return u32.read(new DataView(buf.buffer));
	}

	getSpeedUploadT(): number {
		const buf = new BigUint64Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.SpeedUploadT, buf);
		return u32.read(new DataView(buf.buffer));
	}

	getHeaderSize(): number {
		const buf = new Uint32Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.HeaderSize, buf);
		return u32.read(new DataView(buf.buffer));
	}

	getRequestSize(): number {
		const buf = new Uint32Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.RequestSize, buf);
		return u32.read(new DataView(buf.buffer));
	}

	getSslVerifyresult(): number {
		const buf = new Uint8Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.SslVerifyresult, buf);
		return u32.read(new DataView(buf.buffer));
	}

	getFiletime(): number {
		const buf = new Uint32Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.Filetime, buf);
		return u32.read(new DataView(buf.buffer));
	}

	getFiletimeT(): number {
		const buf = new Uint32Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.FiletimeT, buf);
		return u32.read(new DataView(buf.buffer));
	}

	getContentLengthDownloadT(): number {
		const buf = new Uint32Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.ContentLengthDownloadT, buf);
		return u32.read(new DataView(buf.buffer));
	}

	getContentLengthUploadT(): number {
		const buf = new Uint32Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.ContentLengthUploadT, buf);
		return u32.read(new DataView(buf.buffer));
	}

	getStarttransferTime(): number {
		const buf = new BigUint64Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.StarttransferTime, buf);
		return f64.read(new DataView(buf.buffer));
	}

	getContentType(): string | null {
		const pptr = new DoublePtrChar();
		sym.easyGetinfoBuf(this.#ptr, Info.ContentType, pptr);
		return pptr.getValue();
	}

	getRedirectTime(): number {
		const buf = new BigUint64Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.RedirectTime, buf);
		return f64.read(new DataView(buf.buffer));
	}

	getRedirectCount(): number {
		const buf = new BigUint64Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.RedirectCount, buf);
		return u32.read(new DataView(buf.buffer));
	}

	getPrivate(): string | null {
		const pptr = new DoublePtrChar();
		sym.easyGetinfoBuf(this.#ptr, Info.Private, pptr);
		return pptr.getValue();
	}

	getHttpConnectcode(): number {
		const buf = new Uint32Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.HttpConnectcode, buf);
		return u32.read(new DataView(buf.buffer));
	}

	getHttpauthAvail(): Auth {
		const buf = new Uint32Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.HttpauthAvail, buf);
		return u32.read(new DataView(buf.buffer));
	}

	getProxyauthAvail(): Auth {
		const buf = new Uint32Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.ProxyauthAvail, buf);
		return u32.read(new DataView(buf.buffer));
	}

	getOsErrno(): number {
		const buf = new Int32Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.OsErrno, buf);
		return i32.read(new DataView(buf.buffer));
	}

	getNumConnects(): number {
		const buf = new Uint32Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.NumConnects, buf);
		return u32.read(new DataView(buf.buffer));
	}

	getSslEngines(): string[] | null {
		const pptr = new DoublePtrSlist();
		sym.easyGetinfoBuf(this.#ptr, Info.SslEngines, pptr);
		const ret = pptr.getValue();
		pptr.freeAll();
		return ret;
	}

	getCookielist(): string[] | null {
		const pptr = new DoublePtrSlist();
		sym.easyGetinfoBuf(this.#ptr, Info.Cookielist, pptr);
		const ret = pptr.getValue();
		pptr.freeAll();
		return ret;
	}

	getFtpEntryPath(): string | null {
		const pptr = new DoublePtrChar();
		sym.easyGetinfoBuf(this.#ptr, Info.FtpEntryPath, pptr);
		return pptr.getValue();
	}

	getRedirectUrl(): string | null {
		const pptr = new DoublePtrChar();
		sym.easyGetinfoBuf(this.#ptr, Info.RedirectUrl, pptr);
		return pptr.getValue();
	}

	getPrimaryIp(): string | null {
		const pptr = new DoublePtrChar();
		sym.easyGetinfoBuf(this.#ptr, Info.PrimaryIp, pptr);
		return pptr.getValue();
	}

	getAppconnectTime(): number {
		const buf = new BigUint64Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.AppconnectTime, buf);
		return f64.read(new DataView(buf.buffer));
	}

	/** @todo */
	// getCertinfo():  {
		// struct curl_certinfo {
		//   int num_of_certs;             /* number of certificates with information */
		//   struct curl_slist **certinfo; /* for each index in this array, there's a
		//                                    linked list with textual information for a
		//                                    certificate in the format "name:content".
		//                                    eg "Subject:foo", "Issuer:bar", etc. */
		// };
	// }

	getConditionUnmet(): number {
		const buf = new Uint32Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.ConditionUnmet, buf);
		return u32.read(new DataView(buf.buffer));
	}

	getRtspSessionId(): string | null {
		const pptr = new DoublePtrChar();
		sym.easyGetinfoBuf(this.#ptr, Info.RtspSessionId, pptr);
		return pptr.getValue();
	}

	getRtspClientCseq(): number {
		const buf = new Uint32Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.RtspClientCseq, buf);
		return u32.read(new DataView(buf.buffer));
	}

	getRtspServerCseq(): number {
		const buf = new Uint32Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.RtspServerCseq, buf);
		return u32.read(new DataView(buf.buffer));
	}

	getRtspCseqRecv(): number {
		const buf = new Uint32Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.RtspCseqRecv, buf);
		return u32.read(new DataView(buf.buffer));
	}

	getPrimaryPort(): number {
		const buf = new Uint32Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.PrimaryPort, buf);
		return u32.read(new DataView(buf.buffer));
	}

	getLocalIp(): string | null {
		const pptr = new DoublePtrChar();
		sym.easyGetinfoBuf(this.#ptr, Info.LocalIp, pptr);
		return pptr.getValue();
	}

	getLocalPort(): number {
		const buf = new Uint32Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.LocalPort, buf);
		return u32.read(new DataView(buf.buffer));
	}

	getActivesocket(): number {
		const buf = new Uint32Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.Activesocket, buf);
		return u32.read(new DataView(buf.buffer));
	}

	/** @return internals Pointer to the active TLS library. */
	getTlsSslPtr(): {backend: Sslbackend, pInternals: bigint} | null {
		const pptr = new ArrayBuffer(8);
		sym.easyGetinfoBuf(this.#ptr, Info.TlsSslPtr, pptr);
		const ptr = Deno.UnsafePointer.create(u64.read(new DataView(pptr)));
		if (!ptr) return null;
		return TlssessioninfoStruct.read(new DataView(new Deno.UnsafePointerView(ptr).getArrayBuffer(12)));
	}

	getHttpVersion(): HttpVersion {
		const buf = new Uint32Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.HttpVersion, buf);
		return u32.read(new DataView(buf.buffer));
	}

	getProxySslVerifyresult(): number {
		const buf = new Uint32Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.ProxySslVerifyresult, buf);
		return u32.read(new DataView(buf.buffer));
	}

	getScheme(): string | null {
		const pptr = new DoublePtrChar();
		sym.easyGetinfoBuf(this.#ptr, Info.Scheme, pptr);
		return pptr.getValue();
	}

	getTotalTimeT(): bigint {
		const buf = new BigUint64Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.TotalTimeT, buf);
		return u64.read(new DataView(buf.buffer));
	}

	getNamelookupTimeT(): bigint {
		const buf = new BigUint64Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.NamelookupTimeT, buf);
		return u64.read(new DataView(buf.buffer));
	}

	getConnectTimeT(): bigint {
		const buf = new BigUint64Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.ConnectTimeT, buf);
		return u64.read(new DataView(buf.buffer));
	}

	getPretransferTimeT(): bigint {
		const buf = new BigUint64Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.PretransferTimeT, buf);
		return u64.read(new DataView(buf.buffer));
	}

	getStarttransferTimeT(): bigint {
		const buf = new BigUint64Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.StarttransferTimeT, buf);
		return u64.read(new DataView(buf.buffer));
	}

	getRedirectTimeT(): bigint {
		const buf = new BigUint64Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.RedirectTimeT, buf);
		return u64.read(new DataView(buf.buffer));
	}

	getAppconnectTimeT(): bigint {
		const buf = new BigUint64Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.AppconnectTimeT, buf);
		return u64.read(new DataView(buf.buffer));
	}

	getRetryAfter(): number {
		const buf = new Uint32Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.RetryAfter, buf);
		return u32.read(new DataView(buf.buffer));
	}

	getEffectiveMethod(): string | null {
		const pptr = new DoublePtrChar();
		sym.easyGetinfoBuf(this.#ptr, Info.EffectiveMethod, pptr);
		return pptr.getValue();
	}

	getProxyError(): ProxyCode {
		const buf = new Int32Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.ProxyError, buf);
		return i32.read(new DataView(buf.buffer));
	}

	getReferer(): string | null {
		const pptr = new DoublePtrChar();
		sym.easyGetinfoBuf(this.#ptr, Info.Referer, pptr);
		return pptr.getValue();
	}

	getCainfo(): string | null {
		const pptr = new DoublePtrChar();
		sym.easyGetinfoBuf(this.#ptr, Info.Cainfo, pptr);
		return pptr.getValue();
	}

	getCapath(): string | null {
		const pptr = new DoublePtrChar();
		sym.easyGetinfoBuf(this.#ptr, Info.Capath, pptr);
		return pptr.getValue();
	}

	getXferId(): number {
		const buf = new Int32Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.XferId, buf);
		return i32.read(new DataView(buf.buffer));
	}

	getConnId(): number {
		const buf = new Int32Array(1);
		sym.easyGetinfoBuf(this.#ptr, Info.ConnId, buf);
		return i32.read(new DataView(buf.buffer));
	}

	// getLastone():  {
	// }
}