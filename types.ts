import libcurl from './libcurl.ts';
import {Struct} from 'https://deno.land/x/byte_type@0.3.0/src/compound/struct.ts';
import {u32, u64} from 'https://deno.land/x/byte_type@0.3.0/src/primitives/mod.ts';

const CURLINFO_STRING = 0x100000;
const CURLINFO_LONG = 0x200000;
const CURLINFO_DOUBLE = 0x300000;
const CURLINFO_SLIST = 0x400000;
const CURLINFO_PTR = 0x400000;
const CURLINFO_SOCKET = 0x500000;
const CURLINFO_OFF_T = 0x600000;
const ERROR_SIZE = 1024;

enum Auth {
	None = 0,
	Basic = 1 << 0,
	Digest = 1 << 1,
	Negotiate = 1 << 2,
	GssNegotiate = Negotiate, // Deprecated since the advent of Negotiate
	GssApi = Negotiate, // Used for option `SOCKS5_AUTH` to stay terminologically correct
	Ntlm = 1 << 3,
	DigestIe = 1 << 4,
	NtlmWb = 1 << 5,
	Bearer = 1 << 6,
	AwsSigV4 = 1 << 7,
	Only = 2147483648, // "1 << 31" overflows in JS
	Any = ~DigestIe,
	AnySafe = ~(Basic | DigestIe),
}

/** https://curl.se/libcurl/c/libcurl-errors.html */
enum Code {
	Ok = 0,
	UnsupportedProtocol,
	FailedInit,
	UrlMalformat,
	NotBuiltIn,
	CouldntResolveProxy,
	CouldntResolveHost,
	CouldntConnect,
	WeirdServerReply,
	RemoteAccessDenied, // 9 a service was denied by the server due to lack of access - when login fails this is not returned.
	FtpAcceptFailed,
	FtpWeirdPassReply,
	FtpAcceptTimeout, // 12 - timeout occurred accepting server [was obsoleted in August 2007 for 7.17.0, reused in Dec 2011 for 7.24.0]
	FtpWeirdPasvReply,
	FtpWeird227Format,
	FtpCantGetHost,
	Http2, // 16 - A problem in the http2 framing layer. [was obsoleted in August 2007 for 7.17.0, reused in July 2014 for 7.38.0]
	FtpCouldntSetType,
	PartialFile,
	FtpCouldntRetrFile,
	Obsolete20, // 20 - NOT USED
	QuoteError, // 21 - quote command failure
	HttpReturnedError,
	WriteError,
	Obsolete24, // 24 - NOT USED
	UploadFailed, // 25 - failed upload "command"
	ReadError, // 26 - couldn't open/read from file
	OutOfMemory,
	OperationTimedout, // 28 - the timeout time was reached
	Obsolete29, // 29 - NOT USED
	FtpPortFailed, // 30 - FTP PORT operation failed
	FtpCouldntUseRest, // 31 - the REST command failed
	Obsolete32, // 32 - NOT USED
	RangeError, // 33 - RANGE "command" didn't work
	HttpPostError,
	SslConnectError, // 35 - wrong when connecting with SSL
	BadDownloadResume, // 36 - couldn't resume download
	FileCouldntReadFile,
	LdapCannotBind,
	LdapSearchFailed,
	Obsolete40, // 40 - NOT USED
	FunctionNotFound, // 41 - NOT USED starting with 7.53.0
	AbortedByCallback,
	BadFunctionArgument,
	Obsolete44, // 44 - NOT USED
	InterfaceFailed, // 45 - INTERFACE failed
	Obsolete46, // 46 - NOT USED
	TooManyRedirects, // 47 - catch endless re-direct loops
	UnknownOption, // 48 - User specified an unknown option
	SetoptOptionSyntax, // 49 - Malformed setopt option
	Obsolete50, // 50 - NOT USED
	Obsolete51, // 51 - NOT USED
	GotNothing, // 52 - when this is a specific error
	SslEngineNotfound, // 53 - SSL crypto engine not found
	SslEngineSetfailed, // 54 - can not set SSL crypto engine as default
	SendError, // 55 - failed sending network data
	RecvError, // 56 - failure in receiving network data
	Obsolete57, // 57 - NOT IN USE
	SslCertproblem, // 58 - problem with the local certificate
	SslCipher, // 59 - couldn't use specified cipher
	PeerFailedVerification, // 60 - peer's certificate or fingerprint wasn't verified fine
	BadContentEncoding, // 61 - Unrecognized/bad encoding
	Obsolete62, // 62 - NOT IN USE since 7.82.0
	FilesizeExceeded, // 63 - Maximum file size exceeded
	UseSslFailed, // 64 - Requested FTP SSL level failed
	SendFailRewind, // 65 - Sending the data requires a rewind that failed
	SslEngineInitfailed, // 66 - failed to initialise ENGINE
	LoginDenied, // 67 - user, password or similar was not accepted and we failed to login
	TftpNotfound, // 68 - file not found on server
	TftpPerm, // 69 - permission problem on server
	RemoteDiskFull, // 70 - out of disk space on server
	TftpIllegal, // 71 - Illegal TFTP operation
	TftpUnknownid, // 72 - Unknown transfer ID
	RemoteFileExists, // 73 - File already exists
	TftpNosuchuser, // 74 - No such user
	Obsolete75, // 75 - NOT IN USE since 7.82.0
	Obsolete76, // 76 - NOT IN USE since 7.82.0
	SslCacertBadfile, // 77 - could not load CACERT file, missing or wrong format
	RemoteFileNotFound, // 78 - remote file not found
	Ssh, // 79 - error from the SSH layer, somewhat generic so the error message will be of interest when this has happened
	SslShutdownFailed, // 80 - Failed to shut down the SSL connection
	Again, // 81 - socket is not ready for send/recv, wait till it's ready and try again (Added in 7.18.2)
	SslCrlBadfile, // 82 - could not load CRL file, missing or wrong format (Added in 7.19.0)
	SslIssuerError, // 83 - Issuer check failed.  (Added in 7.19.0)
	FtpPretFailed, // 84 - a PRET command failed
	RtspCseqError, // 85 - mismatch of RTSP CSeq numbers
	RtspSessionError, // 86 - mismatch of RTSP Session Ids
	FtpBadFileList, // 87 - unable to parse FTP file list
	ChunkFailed, // 88 - chunk callback reported error */
	NoConnectionAvailable, // 89 - No connection available, the session will be queued
	SslPinnedpubkeynotmatch, // 90 - specified pinned public key did not match
	SslInvalidcertstatus, // 91 - invalid certificate status
	Http2Stream, // 92 - stream error in HTTP/2 framing layer
	RecursiveApiCall, // 93 - an api function was called from inside a callback
	AuthError, // 94 - an authentication function returned an error
	Http3, // 95 - An HTTP/3 layer problem
	QuicConnectError, // 96 - QUIC connection error
	Proxy, // 97 - proxy handshake error
	SslClientcert, // 98 - client-side certificate required
	UnrecoverablePoll, // 99 - poll/select returned fatal error
	Last // never use!
}

enum EasyType {
	CURLOT_LONG = 0,    /* long (a range of values) */
	CURLOT_VALUES,  /*      (a defined set or bitmask) */
	CURLOT_OFF_T,   /* curl_off_t (a range of values) */
	CURLOT_OBJECT,  /* pointer (void *) */
	CURLOT_STRING,  /*         (char * to null-terminated buffer) */
	CURLOT_SLIST,   /*         (struct curl_slist *) */
	CURLOT_CBPTR,   /*         (void * passed as-is to a callback) */
	CURLOT_BLOB,    /* blob (struct curl_blob *) */
	CURLOT_FUNCTION /* function pointer */
};

enum FtpAuth {
	Default,
	Ssl,
	Tls,
}

/** https://curl.se/libcurl/c/curl_global_init.html */
enum GlobalInit {
	Nothing = 0,
	Ssl = 1 << 0, // no purpose since 7.57.0
	Win32 = 1 << 1,
	All = (Ssl | Win32),
	Default = All,
	AckEintr = 1 << 2,
}

const txtEnc = new TextEncoder();

function CStr(val: string | number | bigint) {
	return txtEnc.encode(val + '\0');
}

const CurlBlobStruct = new Struct({
	pData: u64,
	len: u64,
	flags: u32
});

/** https://github.com/curl/curl/blob/913eacf7730429f3de5d662691154ceb2aee8aa5/include/curl/easy.h#L34
* @param copy When `false`, `data` must be kept alive and prevented from being garbage collected. When `true`, Curl copies `data`, which can then be discarded safely. */
function CurlBlob(data: ArrayBuffer, copy = true): Deno.PointerValue {
	const ptr = Deno.UnsafePointer.of(data);
	const buf = new ArrayBuffer(20);
	const dv = new DataView(buf);

	CurlBlobStruct.write({
		pData: BigInt(Deno.UnsafePointer.value(ptr)),
		len: BigInt(data.byteLength),
		flags: +copy
	}, dv);

	return Deno.UnsafePointer.of(buf);
}

interface EasyOption {
	name: string,
	id: number,
	type: EasyType,
	flags: number
}

const CurlEasyOptionStruct = new Struct({
	pName: u64,
	curlOption: u32,
	curlEasytype: u32,
	flags: u32
});

function EasyOption(pEasyOption: Deno.PointerObject): EasyOption {
	const pv = new Deno.UnsafePointerView(pEasyOption);
	const dv = new DataView(pv.getArrayBuffer(20));

	const struct = CurlEasyOptionStruct.read(dv);
	const ptrName = Deno.UnsafePointer.create(struct.pName);

	if (!ptrName) throw new Error('Could not parse the EasyOption struct');

	const name = Deno.UnsafePointerView.getCString(ptrName);

	return {
		name: name,
		id: struct.curlOption,
		type: struct.curlEasytype,
		flags: struct.flags
	};
}

class DoublePtrChar extends ArrayBuffer {
	#dv: DataView;

	constructor() {
		super(8);
		this.#dv = new DataView(this);
	}

	getValue(): string | null {
		const ptr = Deno.UnsafePointer.create(u64.read(this.#dv));
		if (!ptr)	return null;
		return new Deno.UnsafePointerView(ptr).getCString();
	}

	getPtr(): Deno.PointerValue {
		return Deno.UnsafePointer.create(u64.read(this.#dv));
	}
}

const CurlSlist = new Struct({
	pData: u64,
	pNext: u64
});

class DoublePtrSlist extends ArrayBuffer {
	#dv: DataView;

	constructor() {
		super(8);
		this.#dv = new DataView(this);
	}

	getPtr(): Deno.PointerValue {
		return Deno.UnsafePointer.create(u64.read(this.#dv));
	}

	getValue(): string[] | null {
		const ptr = Deno.UnsafePointer.create(u64.read(this.#dv));
		if (!ptr)	return null;

		const ret: string[] = [];
		let slist = CurlSlist.read(new DataView(new Deno.UnsafePointerView(ptr).getArrayBuffer(16)));
		do {
			const pData = Deno.UnsafePointer.create(slist.pData);
			ret.push(new Deno.UnsafePointerView(pData!).getCString());

			const pNext = Deno.UnsafePointer.create(slist.pNext);
			if (!pNext) break;

			slist = CurlSlist.read(new DataView(new Deno.UnsafePointerView(pNext).getArrayBuffer(16)));
		} while (true);

		return ret;
	}

	freeAll() {
		libcurl.symbols.slistFreeAll(this.getPtr());
	}
}

enum HttpVersion {
	HttpVersionNone, // setting this means we don't care, and that we'd like the library to choose the best possible for us!
	HttpVersion10,  // please use HTTP 1.0 in the request
	HttpVersion11,  // please use HTTP 1.1 in the request
	HttpVersion20,  // please use HTTP 2 in the request
	HttpVersion2tls, // use version 2 for HTTPS, version 1.1 for HTTP
	HttpVersion2PriorKnowledge, // please use HTTP 2 without HTTP/1.1 Upgrade
	HttpVersion3 = 30, // Use HTTP/3, fallback to HTTP/2 or HTTP/1 if needed. For HTTPS only. For HTTP, this option makes libcurl return error.
	HttpVersion3only = 31, // Use HTTP/3 without fallback. For HTTPS only. For HTTP, this makes libcurl return error.
}

enum Info {
	EffectiveUrl = CURLINFO_STRING + 1,
	ResponseCode = +CURLINFO_LONG + 2,
	TotalTime = CURLINFO_DOUBLE + 3,
	NamelookupTime = CURLINFO_DOUBLE + 4,
	ConnectTime = CURLINFO_DOUBLE + 5,
	PretransferTime = CURLINFO_DOUBLE + 6,
	SizeUploadT = CURLINFO_OFF_T + 7,
	SizeDownloadT = CURLINFO_OFF_T + 8,
	SpeedDownloadT = CURLINFO_OFF_T + 9,
	SpeedUploadT = CURLINFO_OFF_T + 10,
	HeaderSize = CURLINFO_LONG + 11,
	RequestSize = CURLINFO_LONG + 12,
	SslVerifyresult = CURLINFO_LONG   + 13,
	Filetime = CURLINFO_LONG + 14,
	FiletimeT = CURLINFO_OFF_T + 14,
	ContentLengthDownloadT = CURLINFO_OFF_T + 15,
	ContentLengthUploadT = CURLINFO_OFF_T + 16,
	StarttransferTime = CURLINFO_DOUBLE + 17,
	ContentType = CURLINFO_STRING + 18,
	RedirectTime = CURLINFO_DOUBLE + 19,
	RedirectCount = CURLINFO_LONG + 20,
	Private = CURLINFO_STRING + 21,
	HttpConnectcode = CURLINFO_LONG + 22,
	HttpauthAvail = CURLINFO_LONG + 23,
	ProxyauthAvail = CURLINFO_LONG + 24,
	OsErrno = CURLINFO_LONG + 25,
	NumConnects = CURLINFO_LONG + 26,
	SslEngines = CURLINFO_SLIST + 27,
	Cookielist = CURLINFO_SLIST + 28,
	FtpEntryPath = CURLINFO_STRING + 30,
	RedirectUrl = CURLINFO_STRING + 31,
	PrimaryIp = CURLINFO_STRING + 32,
	AppconnectTime = CURLINFO_DOUBLE + 33,
	Certinfo = CURLINFO_PTR + 34,
	ConditionUnmet = CURLINFO_LONG + 35,
	RtspSessionId = CURLINFO_STRING + 36,
	RtspClientCseq = CURLINFO_LONG + 37,
	RtspServerCseq = CURLINFO_LONG + 38,
	RtspCseqRecv = CURLINFO_LONG + 39,
	PrimaryPort = CURLINFO_LONG + 40,
	LocalIp = CURLINFO_STRING + 41,
	LocalPort = CURLINFO_LONG + 42,
	Activesocket = CURLINFO_SOCKET + 44,
	TlsSslPtr = CURLINFO_PTR + 45,
	HttpVersion = CURLINFO_LONG + 46,
	ProxySslVerifyresult = CURLINFO_LONG + 47,
	Scheme = CURLINFO_STRING + 49,
	TotalTimeT = CURLINFO_OFF_T + 50,
	NamelookupTimeT = CURLINFO_OFF_T + 51,
	ConnectTimeT = CURLINFO_OFF_T + 52,
	PretransferTimeT = CURLINFO_OFF_T + 53,
	StarttransferTimeT = CURLINFO_OFF_T + 54,
	RedirectTimeT  = CURLINFO_OFF_T + 55,
	AppconnectTimeT = CURLINFO_OFF_T + 56,
	RetryAfter = CURLINFO_OFF_T + 57,
	EffectiveMethod = CURLINFO_STRING + 58,
	ProxyError = CURLINFO_LONG + 59,
	Referer = CURLINFO_STRING + 60,
	Cainfo = CURLINFO_STRING + 61,
	Capath = CURLINFO_STRING + 62,
	XferId = CURLINFO_OFF_T + 63,
	ConnId = CURLINFO_OFF_T + 64,
	Lastone = 64
}

interface MimePart {
	name: string,
	filename?: string
	data: string | ArrayBuffer,
	headers?: Record<string, string | number | bigint>,
	type?: string,
	subparts?: MimePart[]
}

/** Multi interface */
// export enum Mopt {
// }

/** https://curl.se/libcurl/c/easy_setopt_options.html */
enum Opt {
	AbstractUnixSocket = 'ABSTRACT_UNIX_SOCKET', // abstract Unix domain socket
	AccepttimeoutMs = 'ACCEPTTIMEOUT_MS', // timeout waiting for FTP server to connect back
	AcceptEncoding = 'ACCEPT_ENCODING', // automatic decompression of HTTP downloads
	AddressScope = 'ADDRESS_SCOPE', // scope id for IPv6 addresses
	Altsvc = 'ALTSVC', // alt-svc cache file name
	AltsvcCtrl = 'ALTSVC_CTRL', // control alt-svc behavior
	Append = 'APPEND', // append to the remote file
	Autoreferer = 'AUTOREFERER', // automatically update the referer header
	AwsSigv4 = 'AWS_SIGV4', // V4 signature
	Buffersize = 'BUFFERSIZE', // receive buffer size
	Cainfo = 'CAINFO', // path to Certificate Authority (CA) bundle
	CainfoBlob = 'CAINFO_BLOB', // Certificate Authority (CA) bundle in PEM format @todo
	Capath = 'CAPATH', // directory holding CA certificates
	CaCacheTimeout = 'CA_CACHE_TIMEOUT', // life-time for cached certificate stores
	Certinfo = 'CERTINFO', // request SSL certificate information
	ChunkBgnFunction = 'CHUNK_BGN_FUNCTION', // callback before a transfer with FTP wildcard match
	ChunkData = 'CHUNK_DATA', // pointer passed to the FTP chunk callbacks @todo
	ChunkEndFunction = 'CHUNK_END_FUNCTION', // callback after a transfer with FTP wildcard match
	Closesocketdata = 'CLOSESOCKETDATA', // pointer passed to the socket close callback @todo
	Closesocketfunction = 'CLOSESOCKETFUNCTION', // callback to socket close replacement
	Connecttimeout = 'CONNECTTIMEOUT', // timeout for the connect phase
	ConnecttimeoutMs = 'CONNECTTIMEOUT_MS', // timeout for the connect phase
	ConnectOnly = 'CONNECT_ONLY', // stop when connected to target server
	ConnectTo = 'CONNECT_TO', // connect to a specific host and port instead of the URL's host and port @todo
	ConvFromNetworkFunction = 'CONV_FROM_NETWORK_FUNCTION', // convert data from network to host encoding
	ConvFromUtf8Function = 'CONV_FROM_UTF8_FUNCTION', // convert data from UTF8 to host encoding
	ConvToNetworkFunction = 'CONV_TO_NETWORK_FUNCTION', // convert data to network from host encoding
	Cookie = 'COOKIE', // HTTP Cookie header
	Cookiefile = 'COOKIEFILE', // file name to read cookies from
	Cookiejar = 'COOKIEJAR', // file name to store cookies to
	Cookielist = 'COOKIELIST', // add to or manipulate cookies held in memory
	Cookiesession = 'COOKIESESSION', // start a new cookie session
	Copypostfields = 'COPYPOSTFIELDS', // have libcurl copy data to POST
	Crlf = 'CRLF', // CRLF conversion
	Crlfile = 'CRLFILE', // Certificate Revocation List file
	Curlu = 'CURLU', // URL in URL handle format @todo
	Customrequest = 'CUSTOMREQUEST', // custom request method
	Debugdata = 'DEBUGDATA', // pointer passed to the debug callback @todo
	Debugfunction = 'DEBUGFUNCTION', // debug callback
	DefaultProtocol = 'DEFAULT_PROTOCOL', // default protocol to use if the URL is missing a
	Dirlistonly = 'DIRLISTONLY', // ask for names only in a directory listing
	DisallowUsernameInUrl = 'DISALLOW_USERNAME_IN_URL', // disallow specifying username in the URL
	DnsCacheTimeout = 'DNS_CACHE_TIMEOUT', // life-time for DNS cache entries
	DnsInterface = 'DNS_INTERFACE', // interface to speak DNS over
	DnsLocalIp4 = 'DNS_LOCAL_IP4', // IPv4 address to bind DNS resolves to
	DnsLocalIp6 = 'DNS_LOCAL_IP6', // IPv6 address to bind DNS resolves to
	DnsServers = 'DNS_SERVERS', // DNS servers to use
	DnsShuffleAddresses = 'DNS_SHUFFLE_ADDRESSES', // shuffle IP addresses for hostname
	DnsUseGlobalCache = 'DNS_USE_GLOBAL_CACHE', // global DNS cache
	DohSslVerifyhost = 'DOH_SSL_VERIFYHOST', // verify the host name in the DoH SSL certificate
	DohSslVerifypeer = 'DOH_SSL_VERIFYPEER', // verify the DoH SSL certificate
	DohSslVerifystatus = 'DOH_SSL_VERIFYSTATUS', // verify the DoH SSL certificate's status
	DohUrl = 'DOH_URL', // provide the DNS-over-HTTPS URL
	Egdsocket = 'EGDSOCKET', // EGD socket path
	Errorbuffer = 'ERRORBUFFER', // error buffer for error messages @todo
	Expect100TimeoutMs = 'EXPECT_100_TIMEOUT_MS', // timeout for Expect: 100-continue response
	Failonerror = 'FAILONERROR', // request failure on HTTP response >= 400
	Filetime = 'FILETIME', // get the modification time of the remote resource
	FnmatchData = 'FNMATCH__DATA', // pointer passed to the fnmatch callback @todo
	FnmatchFunction = 'FNMATCH_FUNCTION', // wildcard match callback
	Followlocation = 'FOLLOWLOCATION', // follow HTTP 3xx redirects
	ForbidReuse = 'FORBID_REUSE', // make connection get closed at once after use
	FreshConnect = 'FRESH_CONNECT', // force a new connection to be used
	Ftpport = 'FTPPORT', // make FTP transfer active
	Ftpsslauth = 'FTPSSLAUTH', // order in which to attempt TLS vs SSL
	FtpAccount = 'FTP_ACCOUNT', // account info for FTP
	FtpAlternativeToUser = 'FTP_ALTERNATIVE_TO_USER', // command to use instead of USER with FTP
	FtpCreateMissingDirs = 'FTP_CREATE_MISSING_DIRS', // create missing directories for FTP and SFTP
	FtpFilemethod = 'FTP_FILEMETHOD', // select directory traversing method for FTP
	FtpSkipPasvIp = 'FTP_SKIP_PASV_IP', // ignore the IP address in the PASV response
	FtpSslCcc = 'FTP_SSL_CCC', // switch off SSL again with FTP after auth
	FtpUseEprt = 'FTP_USE_EPRT', // use EPRT for FTP
	FtpUseEpsv = 'FTP_USE_EPSV', // use EPSV for FTP
	FtpUsePret = 'FTP_USE_PRET', // use PRET for FTP
	GssapiDelegation = 'GSSAPI_DELEGATION', // allowed GSS-API delegation
	HappyEyeballsTimeoutMs = 'HAPPY_EYEBALLS_TIMEOUT_MS', // head start for IPv6 for happy eyeballs
	Haproxyprotocol = 'HAPROXYPROTOCOL', // send HAProxy PROXY protocol v1 header
	HaproxyClientIp = 'HAPROXY_CLIENT_IP', // set HAProxy PROXY protocol client IP
	Header = 'HEADER', // pass headers to the data stream
	Headerdata = 'HEADERDATA', // pointer to pass to header callback @todo
	Headerfunction = 'HEADERFUNCTION', // callback that receives header data
	Headeropt = 'HEADEROPT', // send HTTP headers to both proxy and host or separately
	Hsts = 'HSTS', // HSTS cache file name
	Hstsreaddata = 'HSTSREADDATA', // pointer passed to the HSTS read callback @todo
	Hstsreadfunction = 'HSTSREADFUNCTION', // read callback for HSTS hosts
	Hstswritedata = 'HSTSWRITEDATA', // pointer passed to the HSTS write callback @todo
	Hstswritefunction = 'HSTSWRITEFUNCTION', // write callback for HSTS hosts
	HstsCtrl = 'HSTS_CTRL', // control HSTS behavior
	Http09Allowed = 'HTTP09_ALLOWED', // allow HTTP/0.9 response
	Http200aliases = 'HTTP200ALIASES', // alternative matches for HTTP 200 OK @todo
	Httpauth = 'HTTPAUTH', // HTTP server authentication methods to try
	Httpget = 'HTTPGET', // ask for an HTTP GET request
	Httpheader = 'HTTPHEADER', // set of HTTP headers @todo
	Httppost = 'HTTPPOST', // multipart formpost content @todo
	Httpproxytunnel = 'HTTPPROXYTUNNEL', // tunnel through HTTP proxy
	HttpContentDecoding = 'HTTP_CONTENT_DECODING', // HTTP content decoding control
	HttpTransferDecoding = 'HTTP_TRANSFER_DECODING', // HTTP transfer decoding control
	HttpVersion = 'HTTP_VERSION', // HTTP protocol version to use
	IgnoreContentLength = 'IGNORE_CONTENT_LENGTH', // ignore content length
	Infilesize = 'INFILESIZE', // size of the input file to send off
	InfilesizeLarge = 'INFILESIZE_LARGE', // size of the input file to send off @todo
	Interface = 'INTERFACE', // source interface for outgoing traffic
	Interleavedata = 'INTERLEAVEDATA', // pointer passed to RTSP interleave callback @todo
	Interleavefunction = 'INTERLEAVEFUNCTION', // callback for RTSP interleaved data
	Ioctldata = 'IOCTLDATA', // pointer passed to I/O callback @todo
	Ioctlfunction = 'IOCTLFUNCTION', // callback for I/O operations
	Ipresolve = 'IPRESOLVE', // IP protocol version to use
	Issuercert = 'ISSUERCERT', // issuer SSL certificate filename
	IssuercertBlob = 'ISSUERCERT_BLOB', // issuer SSL certificate from memory blob @todo
	KeepSendingOnError = 'KEEP_SENDING_ON_ERROR', // keep sending on early HTTP response >= 300
	Keypasswd = 'KEYPASSWD', // passphrase to private key
	Krblevel = 'KRBLEVEL', // FTP kerberos security level
	Localport = 'LOCALPORT', // local port number to use for socket
	Localportrange = 'LOCALPORTRANGE', // number of additional local ports to try
	LoginOptions = 'LOGIN_OPTIONS', // login options
	LowSpeedLimit = 'LOW_SPEED_LIMIT', // low speed limit in bytes per second
	LowSpeedTime = 'LOW_SPEED_TIME', // low speed limit time period
	MailAuth = 'MAIL_AUTH', // SMTP authentication address
	MailFrom = 'MAIL_FROM', // SMTP sender address
	MailRcpt = 'MAIL_RCPT', // list of SMTP mail recipients @todo
	MailRcptAllowfails = 'MAIL_RCPT_ALLOWFAILS', // allow RCPT TO command to fail for some recipients
	MaxageConn = 'MAXAGE_CONN', // max idle time allowed for reusing a connection
	Maxconnects = 'MAXCONNECTS', // maximum connection cache size
	Maxfilesize = 'MAXFILESIZE', // maximum file size allowed to download
	MaxfilesizeLarge = 'MAXFILESIZE_LARGE', // maximum file size allowed to download @todo
	MaxlifetimeConn = 'MAXLIFETIME_CONN', // max lifetime (since creation) allowed for reusing a connection
	Maxredirs = 'MAXREDIRS', // maximum number of redirects allowed
	MaxRecvSpeedLarge = 'MAX_RECV_SPEED_LARGE', // rate limit data download speed @todo
	MaxSendSpeedLarge = 'MAX_SEND_SPEED_LARGE', // rate limit data upload speed @todo
	Mimepost = 'MIMEPOST', // send data from mime structure @todo
	MimeOptions = 'MIME_OPTIONS', // set MIME option flags
	Netrc = 'NETRC', // enable use of .netrc
	NetrcFile = 'NETRC_FILE', // file name to read .netrc info from
	NewDirectoryPerms = 'NEW_DIRECTORY_PERMS', // permissions for remotely created directories
	NewFilePerms = 'NEW_FILE_PERMS', // permissions for remotely created files
	Nobody = 'NOBODY', // do the download request without getting the body
	Noprogress = 'NOPROGRESS', // switch off the progress meter
	Noproxy = 'NOPROXY', // disable proxy use for specific hosts
	Nosignal = 'NOSIGNAL', // skip all signal handling
	Opensocketdata = 'OPENSOCKETDATA', // pointer passed to open socket callback @todo
	Opensocketfunction = 'OPENSOCKETFUNCTION', // callback for opening socket
	Password = 'PASSWORD', // password to use in authentication
	PathAsIs = 'PATH_AS_IS', // do not handle dot dot sequences
	Pinnedpublickey = 'PINNEDPUBLICKEY', // pinned public key
	Pipewait = 'PIPEWAIT', // wait for multiplexing
	Port = 'PORT', // remote port number to connect to
	Post = 'POST', // make an HTTP POST
	Postfields = 'POSTFIELDS', // data to POST to server @todo
	Postfieldsize = 'POSTFIELDSIZE', // size of POST data pointed to
	PostfieldsizeLarge = 'POSTFIELDSIZE_LARGE', // size of POST data pointed to @todo
	Postquote = 'POSTQUOTE', // (S)FTP commands to run after the transfer @todo
	Postredir = 'POSTREDIR', // how to act on an HTTP POST redirect
	Prequote = 'PREQUOTE', // commands to run before an FTP transfer @todo
	Prereqdata = 'PREREQDATA', // pointer passed to the pre-request callback @todo
	Prereqfunction = 'PREREQFUNCTION', // user callback called when a connection has been
	PreProxy = 'PRE_PROXY', // pre-proxy host to use
	Private = 'PRIVATE', // store a private pointer @todo
	Progressdata = 'PROGRESSDATA', // pointer passed to the progress callback @todo
	Progressfunction = 'PROGRESSFUNCTION', // progress meter callback
	Protocols = 'PROTOCOLS', // allowed protocols
	ProtocolsStr = 'PROTOCOLS_STR', // allowed protocols
	Proxy = 'PROXY', // proxy to use
	Proxyauth = 'PROXYAUTH', // HTTP proxy authentication methods
	Proxyheader = 'PROXYHEADER', // set of HTTP headers to pass to proxy @todo
	Proxypassword = 'PROXYPASSWORD', // password to use with proxy authentication
	Proxyport = 'PROXYPORT', // port number the proxy listens on
	Proxytype = 'PROXYTYPE', // proxy protocol type
	Proxyusername = 'PROXYUSERNAME', // user name to use for proxy authentication
	Proxyuserpwd = 'PROXYUSERPWD', // user name and password to use for proxy authentication
	ProxyCainfo = 'PROXY_CAINFO', // path to proxy Certificate Authority (CA) bundle
	ProxyCainfoBlob = 'PROXY_CAINFO_BLOB', // proxy Certificate Authority (CA) bundle in PEM format @todo
	ProxyCapath = 'PROXY_CAPATH', // directory holding HTTPS proxy CA certificates
	ProxyCrlfile = 'PROXY_CRLFILE', // HTTPS proxy Certificate Revocation List file
	ProxyIssuercert = 'PROXY_ISSUERCERT', // proxy issuer SSL certificate filename
	ProxyIssuercertBlob = 'PROXY_ISSUERCERT_BLOB', // proxy issuer SSL certificate from memory blob @todo
	ProxyKeypasswd = 'PROXY_KEYPASSWD', // passphrase for the proxy private key
	ProxyPinnedpublickey = 'PROXY_PINNEDPUBLICKEY', // pinned public key for https proxy
	ProxyServiceName = 'PROXY_SERVICE_NAME', // proxy authentication service name
	ProxySslcert = 'PROXY_SSLCERT', // HTTPS proxy client certificate
	ProxySslcerttype = 'PROXY_SSLCERTTYPE', // type of the proxy client SSL certificate
	ProxySslcertBlob = 'PROXY_SSLCERT_BLOB', // SSL proxy client certificate from memory blob @todo
	ProxySslkey = 'PROXY_SSLKEY', // private key file for HTTPS proxy client cert
	ProxySslkeytype = 'PROXY_SSLKEYTYPE', // type of the proxy private key file
	ProxySslkeyBlob = 'PROXY_SSLKEY_BLOB', // private key for proxy cert from memory blob @todo
	ProxySslversion = 'PROXY_SSLVERSION', // preferred HTTPS proxy TLS version
	ProxySslCipherList = 'PROXY_SSL_CIPHER_LIST', // ciphers to use for HTTPS proxy
	ProxySslOptions = 'PROXY_SSL_OPTIONS', // HTTPS proxy SSL behavior options
	ProxySslVerifyhost = 'PROXY_SSL_VERIFYHOST', // verify the proxy certificate's name against host
	ProxySslVerifypeer = 'PROXY_SSL_VERIFYPEER', // verify the proxy's SSL certificate
	ProxyTls13Ciphers = 'PROXY_TLS13_CIPHERS', // ciphers suites for proxy TLS 1.3
	ProxyTlsauthPassword = 'PROXY_TLSAUTH_PASSWORD', // password to use for proxy TLS authentication
	ProxyTlsauthType = 'PROXY_TLSAUTH_TYPE', // HTTPS proxy TLS authentication methods
	ProxyTlsauthUsername = 'PROXY_TLSAUTH_USERNAME', // user name to use for proxy TLS authentication
	ProxyTransferMode = 'PROXY_TRANSFER_MODE', // append FTP transfer mode to URL for proxy
	Put = 'PUT', // make an HTTP PUT request
	QuickExit = 'QUICK_EXIT', // allow to exit quickly
	Quote = 'QUOTE', // (S)FTP commands to run before transfer @todo
	RandomFile = 'RANDOM_FILE', // file to read random data from @deprecated
	Range = 'RANGE', // byte range to request
	Readdata = 'READDATA', // pointer passed to the read callback @todo
	Readfunction = 'READFUNCTION', // read callback for data uploads
	RedirProtocols = 'REDIR_PROTOCOLS', // protocols allowed to redirect to
	RedirProtocolsStr = 'REDIR_PROTOCOLS_STR', // protocols allowed to redirect to
	Referer = 'REFERER', // the HTTP referer header
	RequestTarget = 'REQUEST_TARGET', // alternative target for this request
	Resolve = 'RESOLVE', // provide custom host name to IP address resolves @todo
	ResolverStartData = 'RESOLVER_START_DATA', // pointer passed to the resolver start callback @todo
	ResolverStartFunction = 'RESOLVER_START_FUNCTION', // callback called before a new name resolve is started
	ResumeFrom = 'RESUME_FROM', // offset to resume transfer from
	ResumeFromLarge = 'RESUME_FROM_LARGE', // offset to resume transfer from @todo
	RtspClientCseq = 'RTSP_CLIENT_CSEQ', // RTSP client CSEQ number
	RtspRequest = 'RTSP_REQUEST', // RTSP request
	RtspServerCseq = 'RTSP_SERVER_CSEQ', // RTSP server CSEQ number
	RtspSessionId = 'RTSP_SESSION_ID', // RTSP session ID
	RtspStreamUri = 'RTSP_STREAM_URI', // RTSP stream URI
	RtspTransport = 'RTSP_TRANSPORT', // RTSP Transport: header
	SaslAuthzid = 'SASL_AUTHZID', // authorization identity (identity to act as)
	SaslIr = 'SASL_IR', // send initial response in first packet
	Seekdata = 'SEEKDATA', // pointer passed to the seek callback @todo
	Seekfunction = 'SEEKFUNCTION', // user callback for seeking in input stream
	ServerResponseTimeout = 'SERVER_RESPONSE_TIMEOUT', // time allowed to wait for server response
	ServiceName = 'SERVICE_NAME', // authentication service name
	Share = 'SHARE', // share handle to use @todo
	Sockoptdata = 'SOCKOPTDATA', // pointer to pass to sockopt callback @todo
	Sockoptfunction = 'SOCKOPTFUNCTION', // callback for setting socket options
	Socks5Auth = 'SOCKS5_AUTH', // methods for SOCKS5 proxy authentication
	Socks5GssapiNec = 'SOCKS5_GSSAPI_NEC', // SOCKS proxy GSSAPI negotiation protection
	Socks5GssapiService = 'SOCKS5_GSSAPI_SERVICE', // SOCKS5 proxy authentication service name
	SshAuthTypes = 'SSH_AUTH_TYPES', // auth types for SFTP and SCP
	SshCompression = 'SSH_COMPRESSION', // enable SSH compression
	SshHostkeydata = 'SSH_HOSTKEYDATA', // pointer to pass to the SSH host key callback @todo
	SshHostkeyfunction = 'SSH_HOSTKEYFUNCTION', // callback to check host key
	SshHostPublicKeyMd5 = 'SSH_HOST_PUBLIC_KEY_MD5', // MD5 checksum of SSH server public key
	SshHostPublicKeySha256 = 'SSH_HOST_PUBLIC_KEY_SHA256', // SHA256 hash of SSH server public key
	SshKeydata = 'SSH_KEYDATA', // pointer passed to the SSH key callback @todo
	SshKeyfunction = 'SSH_KEYFUNCTION', // callback for known host matching logic
	SshKnownhosts = 'SSH_KNOWNHOSTS', // file name holding the SSH known hosts
	SshPrivateKeyfile = 'SSH_PRIVATE_KEYFILE', // private key file for SSH auth
	SshPublicKeyfile = 'SSH_PUBLIC_KEYFILE', // public key file for SSH auth
	Sslcert = 'SSLCERT', // SSL client certificate
	Sslcerttype = 'SSLCERTTYPE', // type of client SSL certificate
	SslcertBlob = 'SSLCERT_BLOB', // SSL client certificate from memory blob @todo
	Sslengine = 'SSLENGINE', // SSL engine identifier
	SslengineDefault = 'SSLENGINE_DEFAULT', // make SSL engine default
	Sslkey = 'SSLKEY', // private key file for TLS and SSL client cert
	Sslkeytype = 'SSLKEYTYPE', // type of the private key file
	SslkeyBlob = 'SSLKEY_BLOB', // private key for client cert from memory blob @todo
	Sslversion = 'SSLVERSION', // preferred TLS/SSL version
	SslCipherList = 'SSL_CIPHER_LIST', // ciphers to use for TLS
	SslCtxData = 'SSL_CTX_DATA', // pointer passed to SSL context callback @todo
	SslCtxFunction = 'SSL_CTX_FUNCTION', // SSL context callback for OpenSSL, wolfSSL or mbedTLS
	SslEcCurves = 'SSL_EC_CURVES', // key exchange curves
	SslEnableAlpn = 'SSL_ENABLE_ALPN', // Application Layer Protocol Negotiation
	SslEnableNpn = 'SSL_ENABLE_NPN', // use NPN
	SslFalsestart = 'SSL_FALSESTART', // TLS false start
	SslOptions = 'SSL_OPTIONS', // SSL behavior options
	SslSessionidCache = 'SSL_SESSIONID_CACHE', // use the SSL session-ID cache
	SslVerifyhost = 'SSL_VERIFYHOST', // verify the certificate's name against host
	SslVerifypeer = 'SSL_VERIFYPEER', // verify the peer's SSL certificate
	SslVerifystatus = 'SSL_VERIFYSTATUS', // verify the certificate's status
	Stderr = 'STDERR', // redirect stderr to another stream @todo
	StreamDepends = 'STREAM_DEPENDS', // stream this transfer depends on @todo
	StreamDependsE = 'STREAM_DEPENDS_E', // stream this transfer depends on exclusively @todo
	StreamWeight = 'STREAM_WEIGHT', // numerical stream weight
	SuppressConnectHeaders = 'SUPPRESS_CONNECT_HEADERS', // suppress proxy CONNECT response headers from user callbacks
	TcpFastopen = 'TCP_FASTOPEN', // TCP Fast Open
	TcpKeepalive = 'TCP_KEEPALIVE', // TCP keep-alive probing
	TcpKeepidle = 'TCP_KEEPIDLE', // TCP keep-alive idle time wait
	TcpKeepintvl = 'TCP_KEEPINTVL', // TCP keep-alive interval
	TcpNodelay = 'TCP_NODELAY', // the TCP_NODELAY option
	Telnetoptions = 'TELNETOPTIONS', // set of telnet options @todo
	TftpBlksize = 'TFTP_BLKSIZE', // TFTP block size
	TftpNoOptions = 'TFTP_NO_OPTIONS', // send no TFTP options requests
	Timecondition = 'TIMECONDITION', // select condition for a time request
	Timeout = 'TIMEOUT', // maximum time the transfer is allowed to complete
	TimeoutMs = 'TIMEOUT_MS', // maximum time the transfer is allowed to complete
	Timevalue = 'TIMEVALUE', // time value for conditional
	TimevalueLarge = 'TIMEVALUE_LARGE', // time value for conditional @todo
	Tls13Ciphers = 'TLS13_CIPHERS', // ciphers suites to use for TLS 1.3
	TlsauthPassword = 'TLSAUTH_PASSWORD', // password to use for TLS authentication
	TlsauthType = 'TLSAUTH_TYPE', // TLS authentication methods
	TlsauthUsername = 'TLSAUTH_USERNAME', // user name to use for TLS authentication
	Trailerdata = 'TRAILERDATA', // pointer passed to trailing headers callback @todo
	Trailerfunction = 'TRAILERFUNCTION', // callback for sending trailing headers
	Transfertext = 'TRANSFERTEXT', // request a text based transfer for FTP
	TransferEncoding = 'TRANSFERE_NCODING', // ask for HTTP Transfer Encoding
	UnixSocketPath = 'UNIX_SOCKET_PATH', // Unix domain socket
	UnrestrictedAuth = 'UNRESTRICTED_AUTH', // send credentials to other hosts too
	UpkeepIntervalMs = 'UPKEEP_INTERVAL_MS', // connection upkeep interval
	Upload = 'UPLOAD', // data upload
	UploadBuffersize = 'UPLOAD_BUFFERSIZE', // upload buffer size
	Url = 'URL', // URL for this transfer
	Useragent = 'USERAGENT', // HTTP user-agent header
	Username = 'USERNAME', // user name to use in authentication
	Userpwd = 'USERPWD', // user name and password to use in authentication
	UseSsl = 'USE_SSL', // request using SSL / TLS for the transfer
	Verbose = 'VERBOSE', // verbose mode
	Wildcardmatch = 'WILDCARDMATCH', // directory wildcard transfers
	Writedata = 'WRITEDATA', // pointer passed to the write callback @todo
	Writefunction = 'WRITEFUNCTION', // callback for writing received data
	WsOptions = 'WS_OPTIONS', // WebSocket behavior options
	Xferinfodata = 'XFERINFODATA', // pointer passed to the progress callback @todo
	Xferinfofunction = 'XFERINFOFUNCTION', // progress meter callback
	Xoauth2Bearer = 'XOAUTH2_BEARER' // OAuth 2.0 access token
}

enum ProxyCode {
	Ok,
	BadAddressType,
	BadVersion,
	Closed,
	Gssapi,
	GssapiPermsg,
	GssapiProtection,
	Identd,
	IdentdDiffer,
	LongHostname,
	LongPasswd,
	LongUser,
	NoAuth,
	RecvAddress,
	RecvAuth,
	RecvConnect,
	RecvReqack,
	ReplyAddressTypeNotSupported,
	ReplyCommandNotSupported,
	ReplyConnectionRefused,
	ReplyGeneralServerFailure,
	ReplyHostUnreachable,
	ReplyNetworkUnreachable,
	ReplyNotAllowed,
	ReplyTtlExpired,
	ReplyUnassigned,
	RequestFailed,
	ResolveHost,
	SendAuth,
	SendConnect,
	SendRequest,
	UnknownFail,
	UnknownMode,
	UserRejected
}

enum Sslbackend {
	None = 0,
	Openssl = 1,
	Gnutls = 2,
	Wolfssl = 7,
	Schannel = 8,
	Securetransport = 9,
	Mbedtls = 11,
	Bearssl = 13,
	Rustls = 14
}

const SslbackendStruct = new Struct({
	id: u32,
	pName: u64
});

enum Sslset {
	Ok = 0,
	UnknownBackend,
	TooLate,
	NoBackends
}

const TlssessioninfoStruct = new Struct({
	backend: u32,
	pInternals: u64
});


export {Auth, Code, CStr, CurlBlob, TlssessioninfoStruct, DoublePtrChar, DoublePtrSlist, EasyOption, ERROR_SIZE, FtpAuth, GlobalInit, HttpVersion, Info, type MimePart, Opt, ProxyCode, Sslbackend, SslbackendStruct, Sslset};