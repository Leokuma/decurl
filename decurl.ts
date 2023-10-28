import libcurl from './libcurl.ts';
import {Code, CString, CurlBlob, EasyOption, ERROR_SIZE, GlobalInit, MimePart, Opt} from './types.ts';
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

const txtDec = new TextDecoder();
const txtEnc = new TextEncoder();

type Mime = {
	p: Deno.PointerValue
	parts: Map<MimePart, Deno.PointerObject>
}

export default class Decurl implements Disposable {
	#errorBuffer: ArrayBuffer | null = null;
	#httpHeaderList: Deno.PointerValue = null;
	#mime: Mime = {p: null, parts: new Map()};
	#writeFunction: null | ((chunk: Uint8Array) => void) = null;
	#_writeFunction: null | Deno.UnsafeCallback<{
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

		sym.easySetoptFunction(this.#p, this.optionByName(Opt.Writefunction).id, this.#_writeFunction.pointer);
	}

	init(): Deno.PointerValue {
		return sym.easyInit();
	}

	/** https://curl.se/libcurl/c/curl_easy_cleanup.html */
	cleanup() {
		sym.slistFreeAll(this.#httpHeaderList);
		sym.mimeFree(this.#mime.p);
		sym.easyCleanup(this.#p);
		this.#errorBuffer = null;
		this.#_writeFunction?.close();
		this.#_writeFunction = null;
		this.#writeFunction = null;
		this.#writeFunctionData = null;
		this.#p = null;
	}

	[Symbol.dispose]() {
		this.cleanup();
	}

	optionByName(name: Opt): EasyOption {
		const p = sym.easyOptionByName(CString(name));

		if (!p)	throw new Error(`Option ${name} not found`);

		return EasyOption(p);
	}

	perform(): Code {
		this.#errorBuffer = null;
		this.#writeFunctionData = null;
		return sym.easyPerform(this.#p);
	}

	/** Get data received by `perform()` and other functions. */
	getWriteFunctionData(): Uint8Array | null {
		return this.#writeFunctionData;
	}

	setAbstractUnixSocket(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.AbstractUnixSocket).id, CString(val))
	}

	setAccepttimeoutMs(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.AccepttimeoutMs).id, val);
	}

	setAcceptEncoding(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.AcceptEncoding).id, CString(val))
	}

	setAddressScope(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.AddressScope).id, val);
	}

	setAltsvc(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Altsvc).id, CString(val))
	}

	setAltsvcCtrl(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.AltsvcCtrl).id, CString(val))
	}

	setAppend(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Append).id, val);
	}

	setAutoreferer(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Autoreferer).id, val);
	}

	setAwsSigv4(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.AwsSigv4).id, CString(val))
	}

	setBuffersize(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Buffersize).id, val);
	}

	setCainfo(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Cainfo).id, CString(val))
	}

	/** @todo */
	// setCainfoBlob(val: string): Code {
	// } // = 'CAINFO_BLOB'

	setCapath(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Capath).id, CString(val))
	}

	setCaCacheTimeout(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.CaCacheTimeout).id, val);
	}

	setCertinfo(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Certinfo).id, val);
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
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Connecttimeout).id, val);
	}

	setConnecttimeoutMs(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.ConnecttimeoutMs).id, val);
	}

	setConnectOnly(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.ConnectOnly).id, val);
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
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Cookie).id, CString(val))
	}

	setCookiefile(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Cookiefile).id, CString(val))
	}

	setCookiejar(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Cookiejar).id, CString(val))
	}

	setCookielist(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Cookielist).id, CString(val))
	}

	setCookiesession(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Cookiesession).id, val);
	}

	setCopypostfields(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Copypostfields).id, CString(val))
	}

	setCrlf(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Crlf).id, val);
	}

	setCrlfile(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Crlfile).id, CString(val))
	}

	/** @todo */
	// setCurlu(): Code {
	// } // = 'CURLU'

	setCustomrequest(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Customrequest).id, CString(val))
	}

	/** @todo */
	// setDebugdata(): Code {
	// } // = 'DEBUGDATA'

	/** @todo */
	// setDebugfunction(val: () => number): Code {
	// } // = 'DEBUGFUNCTION'

	setDefaultProtocol(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.DefaultProtocol).id, CString(val))
	}

	setDirlistonly(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Dirlistonly).id, val);
	}

	setDisallowUsernameInUrl(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.DisallowUsernameInUrl).id, val);
	}

	setDnsCacheTimeout(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.DnsCacheTimeout).id, val);
	}

	setDnsInterface(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.DnsInterface).id, CString(val))
	}

	setDnsLocalIp4(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.DnsLocalIp4).id, CString(val))
	}

	setDnsLocalIp6(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.DnsLocalIp6).id, CString(val))
	}

	setDnsServers(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.DnsServers).id, CString(val))
	}

	setDnsShuffleAddresses(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.DnsShuffleAddresses).id, val);
	}

	setDnsUseGlobalCache(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.DnsUseGlobalCache).id, val);
	}

	setDohSslVerifyhost(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.DohSslVerifyhost).id, val);
	}

	setDohSslVerifypeer(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.DohSslVerifypeer).id, val);
	}

	setDohSslVerifystatus(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.DohSslVerifystatus).id, val);
	}

	setDohUrl(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.DohUrl).id, CString(val))
	}

	setEgdsocket(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Egdsocket).id, CString(val))
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
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Errorbuffer).id, this.#errorBuffer);
	}

	setExpect100TimeoutMs(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Expect100TimeoutMs).id, val);
	}

	setFailonerror(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Failonerror).id, val);
	}

	setFiletime(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Filetime).id, val);
	}

	/** @todo */
	// setFnmatchData(): Code {
	// } // = 'FNMATCH_DATA'

	/** @todo */
	// setFnmatchFunction(val: () => number): Code {
	// } // = 'FNMATCH_FUNCTION'

	setFollowlocation(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Followlocation).id, val);
	}

	setForbidReuse(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.ForbidReuse).id, val);
	}

	setFreshConnect(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.FreshConnect).id, val);
	}

	setFtpport(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Ftpport).id, CString(val))
	}

	setFtpsslauth(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Ftpsslauth).id, val);
	}

	setFtpAccount(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.FtpAccount).id, CString(val))
	}

	setFtpAlternativeToUser(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.FtpAlternativeToUser).id, CString(val))
	}

	setFtpCreateMissingDirs(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.FtpCreateMissingDirs).id, val);
	}

	setFtpFilemethod(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.FtpFilemethod).id, val);
	}

	setFtpSkipPasvIp(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.FtpSkipPasvIp).id, val);
	}

	setFtpSslCcc(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.FtpSslCcc).id, val);
	}

	setFtpUseEprt(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.FtpUseEprt).id, val);
	}

	setFtpUseEpsv(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.FtpUseEpsv).id, val);
	}

	setFtpUsePret(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.FtpUsePret).id, val);
	}

	setGssapiDelegation(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.GssapiDelegation).id, val);
	}

	setHappyEyeballsTimeoutMs(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.HappyEyeballsTimeoutMs).id, val);
	}

	setHaproxyprotocol(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Haproxyprotocol).id, val);
	}

	setHaproxyClientIp(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.HaproxyClientIp).id, CString(val))
	}

	setHeader(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Header).id, val);
	}

	/** @todo */
	// setHeaderdata(): Code {
	// } // = 'HEADERDATA'

	/** @todo */
	// setHeaderfunction(val: () => number): Code {
	// } // = 'HEADERFUNCTION'

	setHeaderopt(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Headeropt).id, val);
	}

	setHsts(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Hsts).id, CString(val))
	}

	setHstsreaddata(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Hstsreaddata).id, CString(val))
	}

	/** @todo */
	// setHstsreadfunction(val: () => number): Code {
	// } // 'HSTSREADFUNCTION'

	setHstswritedata(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Hstswritedata).id, CString(val))
	}

	/** @todo */
	// setHstswritefunction(val: () => number): Code {
	// } // 'HSTSWRITEFUNCTION'

	setHstsCtrl(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.HstsCtrl).id, val)
	}

	setHttp09Allowed(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Http09Allowed).id, val);
	}

	/** @todo */
	// setHttp200aliases(): Code {
	// } // = 'HTTP200ALIASES'

	setHttpauth(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Httpauth).id, val);
	}

	setHttpget(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Httpget).id, val);
	}

	setHttpheader(headers: Record<string, string | number | bigint>): Code {
		sym.slistFreeAll(this.#httpHeaderList);
		this.#httpHeaderList = null;

		for (const [k, v] of Object.entries(headers))
			this.#httpHeaderList = sym.slistAppend(this.#httpHeaderList, CString(`${k}: ${v}`));

		return sym.easySetoptPointer(this.#p, this.optionByName(Opt.Httpheader).id, this.#httpHeaderList);
	}

	/** @deprecated */
	// setHttppost(): Code {
	// } // = 'HTTPPOST'

	setHttpproxytunnel(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Httpproxytunnel).id, val);
	}

	setHttpContentDecoding(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.HttpContentDecoding).id, val);
	}

	setHttpTransferDecoding(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.HttpTransferDecoding).id, val);
	}

	setHttpVersion(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.HttpVersion).id, val);
	}

	setIgnoreContentLength(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.IgnoreContentLength).id, val);
	}

	setInfilesize(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Infilesize).id, val);
	}

	/** @todo */
	// setInfilesizeLarge(): Code {
	// } // = 'INFILESIZE_LARGE'

	setInterface(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Interface).id, CString(val))
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
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Ipresolve).id, val);
	}

	setIssuercert(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Issuercert).id, CString(val))
	}

	/** @todo */
	// setIssuercertBlob(val: string): Code {
	// } // = 'ISSUERCERT_BLOB'

	setKeepSendingOnError(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.KeepSendingOnError).id, val);
	}

	setKeypasswd(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Keypasswd).id, CString(val))
	}

	setKrblevel(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Krblevel).id, CString(val))
	}

	setLocalport(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Localport).id, val);
	}

	setLocalportrange(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Localportrange).id, val);
	}

	setLoginOptions(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.LoginOptions).id, CString(val))
	}

	setLowSpeedLimit(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.LowSpeedLimit).id, val);
	}

	setLowSpeedTime(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.LowSpeedTime).id, val);
	}

	setMailAuth(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.MailAuth).id, CString(val))
	}

	setMailFrom(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.MailFrom).id, CString(val))
	}

	/** @todo */
	// setMailRcpt(): Code {
	// } // = 'MAIL_RCPT'

	setMailRcptAllowfails(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.MailRcptAllowfails).id, val);
	}

	setMaxageConn(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.MaxageConn).id, val);
	}

	setMaxconnects(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Maxconnects).id, val);
	}

	setMaxfilesize(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Maxfilesize).id, val);
	}

	/** @todo */
	// setMaxfilesizeLarge(): Code {
	// } // = 'MAXFILESIZE_LARGE'

	setMaxlifetimeConn(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.MaxlifetimeConn).id, val);
	}

	setMaxredirs(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Maxredirs).id, val);
	}

	/** @todo */
	// setMaxRecvSpeedLarge(): Code {
	// } // = 'MAX_RECV_SPEED_LARGE'

	/** @todo */
	// setMaxSendSpeedLarge(): Code {
	// } // = 'MAX_SEND_SPEED_LARGE'

	/** @todo */
	setMimepost(mimePart: MimePart): Code {
		if (!this.#mime.p) {
			const p = sym.mimeInit(this.#p);
			if (!p) throw new Error('Mime could not be initialized');
			this.#mime.p = p;
		}

		let pMimePart = this.#mime.parts.get(mimePart);
		if (!pMimePart) {
			const _mimePart = sym.mimeAddpart(this.#mime.p);
			if (!_mimePart) throw new Error('Mime part could not be initialized');
			this.#mime.parts.set(mimePart, _mimePart);
			pMimePart = _mimePart;
		}

		sym.mimeName(pMimePart, CString(mimePart.name));

		if (mimePart.filename)
			sym.mimeFilename(pMimePart, CString(mimePart.filename));

		let buf: ArrayBuffer;
		if (typeof mimePart.data == 'string')
			buf = txtEnc.encode(mimePart.data);
		else
			buf = mimePart.data;
		
		sym.mimeData(pMimePart, buf, buf.byteLength);

		return sym.easySetoptPointer(this.#p, this.optionByName(Opt.Mimepost).id, this.#mime.p);
	}

	setMimeOptions(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.MimeOptions).id, val);
	}

	setNetrc(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Netrc).id, val);
	}

	setNetrcFile(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.NetrcFile).id, CString(val))
	}

	setNewDirectoryPerms(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.NewDirectoryPerms).id, val);
	}

	setNewFilePerms(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.NewFilePerms).id, val);
	}

	setNobody(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Nobody).id, val);
	}

	setNoprogress(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Noprogress).id, val);
	}

	setNoproxy(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Noproxy).id, CString(val))
	}

	setNosignal(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Nosignal).id, val);
	}

	/** @todo */
	// setOpensocketdata(): Code {
	// } // = 'OPENSOCKETDATA'

	/** @todo */
	// setOpensocketfunction(val: () => number): Code {
	// } // = 'OPENSOCKETFUNCTION'

	setPassword(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Password).id, CString(val))
	}

	setPathAsIs(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.PathAsIs).id, val);
	}

	setPinnedpublickey(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Pinnedpublickey).id, CString(val))
	}

	setPipewait(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Pipewait).id, val);
	}

	setPort(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Port).id, val);
	}

	setPost(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Post).id, val);
	}

	setPostfields(data: string | ArrayBuffer): Code {
		if (typeof data == 'string')
			data = CString(data);

		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Postfields).id, data)
	}

	setPostfieldsize(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Postfieldsize).id, val);
	}

	/** @todo */
	// setPostfieldsizeLarge(): Code {
	// } // = 'POSTFIELDSIZE_LARGE'

	/** @todo */
	// setPostquote(): Code {
	// } // = 'POSTQUOTE'

	setPostredir(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Postredir).id, val);
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
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.PreProxy).id, CString(val))
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
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Protocols).id, val);
	}

	setProtocolsStr(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.ProtocolsStr).id, CString(val))
	}

	setProxy(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Proxy).id, CString(val))
	}

	setProxyauth(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Proxyauth).id, val);
	}

	setProxyheader(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Proxyheader).id, CString(val))
	}

	setProxypassword(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Proxypassword).id, CString(val))
	}

	setProxyport(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Proxyport).id, val);
	}

	setProxytype(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Proxytype).id, val);
	}

	setProxyusername(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Proxyusername).id, CString(val))
	}

	setProxyuserpwd(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Proxyuserpwd).id, CString(val))
	}

	setProxyCainfo(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.ProxyCainfo).id, CString(val))
	}

	/** @todo */
	// setProxyCainfoBlob(val: string): Code {
	// } // = 'PROXY_CAINFO_BLOB'

	setProxyCapath(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.ProxyCapath).id, CString(val))
	}

	setProxyCrlfile(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.ProxyCrlfile).id, CString(val))
	}

	setProxyIssuercert(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.ProxyIssuercert).id, CString(val))
	}

	/** @todo */
	// setProxyIssuercertBlob(val: string): Code {
	// } // = 'PROXY_ISSUERCERT_BLOB'

	setProxyKeypasswd(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.ProxyKeypasswd).id, CString(val))
	}

	setProxyPinnedpublickey(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.ProxyPinnedpublickey).id, CString(val))
	}

	setProxyServiceName(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.ProxyServiceName).id, CString(val))
	}

	setProxySslcert(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.ProxySslcert).id, CString(val))
	}

	setProxySslcerttype(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.ProxySslcerttype).id, CString(val))
	}

	/** @todo */
	// setProxySslcertBlob(val: string): Code {
	// } // = 'PROXY_SSLCERT_BLOB'

	setProxySslkey(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.ProxySslkey).id, CString(val))
	}

	setProxySslkeytype(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.ProxySslkeytype).id, CString(val))
	}

	/** @todo */
	// setProxySslkeyBlob(val: string): Code {
	// } // = 'PROXY_SSLKEY_BLOB'

	setProxySslversion(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.ProxySslversion).id, val);
	}

	setProxySslCipherList(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.ProxySslCipherList).id, CString(val))
	}

	setProxySslOptions(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.ProxySslOptions).id, val);
	}

	setProxySslVerifyhost(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.ProxySslVerifyhost).id, val);
	}

	setProxySslVerifypeer(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.ProxySslVerifypeer).id, val);
	}

	setProxyTls13Ciphers(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.ProxyTls13Ciphers).id, CString(val))
	}

	setProxyTlsauthPassword(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.ProxyTlsauthPassword).id, CString(val))
	}

	setProxyTlsauthType(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.ProxyTlsauthType).id, CString(val))
	}

	setProxyTlsauthUsername(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.ProxyTlsauthUsername).id, CString(val))
	}

	setProxyTransferMode(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.ProxyTransferMode).id, val);
	}

	setPut(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Put).id, val);
	}

	setQuickExit(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.QuickExit).id, val);
	}

	/** @todo */
	// setQuote(): Code {
	// } // = 'QUOTE'

	setRandomFile(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.RandomFile).id, CString(val))
	}

	setRange(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Range).id, CString(val))
	}

	/** @todo */
	// setReaddata(): Code {
	// } // = 'READDATA'

	/** @todo */
	// setReadfunction(val: () => number): Code {
	// } // = 'READFUNCTION'

	setRedirProtocols(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.RedirProtocols).id, val);
	}

	setRedirProtocolsStr(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.RedirProtocolsStr).id, CString(val))
	}

	setReferer(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Referer).id, CString(val))
	}

	setRequestTarget(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.RequestTarget).id, CString(val))
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
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.ResumeFrom).id, val);
	}

	/** @todo */
	// setResumeFromLarge(): Code {
	// } // = 'RESUME_FROM_LARGE'

	setRtspClientCseq(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.RtspClientCseq).id, val);
	}

	setRtspRequest(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.RtspRequest).id, val);
	}

	setRtspServerCseq(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.RtspServerCseq).id, val);
	}

	setRtspSessionId(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.RtspSessionId).id, CString(val))
	}

	setRtspStreamUri(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.RtspStreamUri).id, CString(val))
	}

	setRtspTransport(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.RtspTransport).id, CString(val))
	}

	setSaslAuthzid(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.SaslAuthzid).id, CString(val))
	}

	setSaslIr(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.SaslIr).id, val);
	}

	/** @todo */
	// setSeekdata(): Code {
	// } // = 'SEEKDATA'

	/** @todo */
	// setSeekfunction(val: () => number): Code {
	// } // = 'SEEKFUNCTION'

	setServerResponseTimeout(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.ServerResponseTimeout).id, val);
	}

	setServiceName(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.ServiceName).id, CString(val))
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
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Socks5Auth).id, val);
	}

	setSocks5GssapiNec(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Socks5GssapiNec).id, val);
	}

	setSocks5GssapiService(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Socks5GssapiService).id, CString(val))
	}

	setSshAuthTypes(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.SshAuthTypes).id, val);
	}

	setSshCompression(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.SshCompression).id, val);
	}

	/** @todo */
	// setSshHostkeydata(): Code {
	// } // = 'SSH_HOSTKEYDATA'

	/** @todo */
	// setSshHostkeyfunction(val: () => number): Code {
	// } // = 'SSH_HOSTKEYFUNCTION'

	setSshHostPublicKeyMd5(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.SshHostPublicKeyMd5).id, CString(val))
	}

	setSshHostPublicKeySha256(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.SshHostPublicKeySha256).id, CString(val))
	}

	/** @todo */
	// setSshKeydata(): Code {
	// } // = 'SSH_KEYDATA'

	/** @todo */
	// setSshKeyfunction(val: () => number): Code {
	// } // = 'SSH_KEYFUNCTION'

	setSshKnownhosts(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.SshKnownhosts).id, CString(val))
	}

	setSshPrivateKeyfile(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.SshPrivateKeyfile).id, CString(val))
	}

	setSshPublicKeyfile(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.SshPublicKeyfile).id, CString(val))
	}

	setSslcert(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Sslcert).id, CString(val))
	}

	setSslcerttype(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Sslcerttype).id, CString(val))
	}

	setSslcertBlob(cert: ArrayBuffer): Code {
		return sym.easySetoptBlob(this.#p, this.optionByName(Opt.SslcertBlob).id, CurlBlob(cert));
	}

	setSslengine(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Sslengine).id, CString(val))
	}

	setSslengineDefault(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.SslengineDefault).id, val)
	}

	setSslkey(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Sslkey).id, CString(val))
	}

	setSslkeytype(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Sslkeytype).id, CString(val))
	}

	/** @todo */
	// setSslkeyBlob(val: string): Code {
	// } // = 'SSLKEY_BLOB'

	setSslversion(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Sslversion).id, val);
	}

	setSslCipherList(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.SslCipherList).id, CString(val))
	}

	/** @todo */
	// setSslCtxData(): Code {
	// } // = 'SSL_CTX_DATA'

	/** @todo */
	// setSslCtxFunction(val: () => number): Code {
	// } // = 'SSL_CTX_FUNCTION'

	setSslEcCurves(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.SslEcCurves).id, CString(val))
	}

	setSslEnableAlpn(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.SslEnableAlpn).id, val);
	}

	setSslEnableNpn(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.SslEnableNpn).id, val);
	}

	setSslFalsestart(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.SslFalsestart).id, val);
	}

	setSslOptions(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.SslOptions).id, val);
	}

	setSslSessionidCache(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.SslSessionidCache).id, val);
	}

	setSslVerifyhost(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.SslVerifyhost).id, val);
	}

	setSslVerifypeer(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.SslVerifypeer).id, val);
	}

	setSslVerifystatus(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.SslVerifystatus).id, val);
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
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.StreamWeight).id, val);
	}

	setSuppressConnectHeaders(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.SuppressConnectHeaders).id, val);
	}

	setTcpFastopen(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.TcpFastopen).id, val);
	}

	setTcpKeepalive(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.TcpKeepalive).id, val);
	}

	setTcpKeepidle(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.TcpKeepidle).id, val);
	}

	setTcpKeepintvl(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.TcpKeepintvl).id, val);
	}

	setTcpNodelay(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.TcpNodelay).id, val);
	}

	/** @todo */
	// setTelnetoptions(): Code {
	// } // = 'TELNETOPTIONS'

	setTftpBlksize(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.TftpBlksize).id, val);
	}

	setTftpNoOptions(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.TftpNoOptions).id, val);
	}

	setTimecondition(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Timecondition).id, val);
	}

	setTimeout(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Timeout).id, val);
	}

	setTimeoutMs(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.TimeoutMs).id, val);
	}

	setTimevalue(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Timevalue).id, val);
	}

	/** @todo */
	// setTimevalueLarge(): Code {
	// } // = 'TIMEVALUE_LARGE'

	setTls13Ciphers(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Tls13Ciphers).id, CString(val))
	}

	setTlsauthPassword(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.TlsauthPassword).id, CString(val))
	}

	setTlsauthType(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.TlsauthType).id, CString(val))
	}

	setTlsauthUsername(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.TlsauthUsername).id, CString(val))
	}

	/** @todo */
	// setTrailerdata(): Code {
	// } // = 'TRAILERDATA'

	/** @todo */
	// setTrailerfunction(val: () => number): Code {
	// } // = 'TRAILERFUNCTION'

	setTransfertext(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Transfertext).id, val);
	}

	setTransferEncoding(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.TransferEncoding).id, val);
	}

	setUnixSocketPath(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.UnixSocketPath).id, CString(val))
	}

	setUnrestrictedAuth(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.UnrestrictedAuth).id, val);
	}

	setUpkeepIntervalMs(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.UpkeepIntervalMs).id, val);
	}

	setUpload(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Upload).id, val);
	}

	setUploadBuffersize(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.UploadBuffersize).id, val);
	}

	setUrl(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Url).id, CString(val));
	}

	setUseragent(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Useragent).id, CString(val));
	}

	setUsername(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Username).id, CString(val));
	}

	setUserpwd(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Userpwd).id, CString(val));
	}

	setUseSsl(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.UseSsl).id, val);
	}

	setVerbose(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Verbose).id, val);
	}

	setWildcardmatch(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.Wildcardmatch).id, val);
	}

	/** @todo */
	// setWritedata(): Code {
	// } // = 'WRITEDATA'

	setWritefunction(fn: (chunk: Uint8Array) => void) {
		this.#writeFunction = fn;
	}

	setWsOptions(val: number): Code {
		return sym.easySetoptU64(this.#p, this.optionByName(Opt.WsOptions).id, val);
	}

	/** @todo */
	// setXferinfodata(): Code {
	// } // = 'XFERINFODATA'

	/** @todo */
	// setXferinfofunction(val: () => number): Code {
	// } // = 'XFERINFOFUNCTION'

	setXoauth2Bearer(val: string): Code {
		return sym.easySetoptBuffer(this.#p, this.optionByName(Opt.Xoauth2Bearer).id, CString(val))
	}
}