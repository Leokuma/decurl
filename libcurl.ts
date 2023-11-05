import {dlopen} from 'https://deno.land/x/plug@1.0.2/mod.ts';

const CURL_CODE = 'i32';
const CURL_INFO = 'i32';
const EASY_HANDLE = 'pointer';
const MIME_HANDLE = 'pointer';
const MIME_PART = 'pointer';
const OPT_ID = 'u32';

/** https://curl.se/libcurl/c/allfuncs.html */
const libcurl = await dlopen({
	url: {
		darwin: '/usr/lib/libcurl.4.dylib',
		linux: {
			x86_64: '/usr/lib/x86_64-linux-gnu/libcurl.so.4',
		},
		windows: {
			x86_64: 'https://deno.land/x/decurl@0.7.0/lib/libcurl-x64.dll'
		}
	}}, {
	easyCleanup: {name: 'curl_easy_cleanup', parameters: ['pointer'], result: 'void'},
	// easyDuphandle: {name: 'curl_easy_duphandle', parameters: ['pointer'], result: 'pointer'},
	// easyEscape: {name: 'curl_easy_escape', parameters: ['pointer', 'buffer', 'i32'], result: 'buffer'},
	easyGetinfoBuf: {name: 'curl_easy_getinfo', parameters: ['pointer', CURL_INFO, 'buffer'], result: CURL_CODE}, // https://curl.se/libcurl/c/curl_easy_getinfo.html
	// easy_header: {name: 'curl_easy_header', parameters: ['pointer', 'buffer', 'usize', 'u32', 'i32', 'pointer'], result: 'i32'}, // v7.84.0. https://curl.se/libcurl/c/curl_easy_header.html
	easyInit: {name: 'curl_easy_init', parameters: [], result: 'pointer'},
	// easy_nextheader: {name: 'curl_easy_nextheader', parameters: [''], result: ''},
	easyOptionById: {name: 'curl_easy_option_by_id', parameters: ['u32'], result: 'pointer'},
	easyOptionByName: {name: 'curl_easy_option_by_name', parameters: ['buffer'], result: 'pointer'},
	// easy_option_next: {name: 'curl_easy_option_next', parameters: [''], result: ''},
	// easy_pause: {name: 'curl_easy_pause', parameters: [''], result: ''},
	easyPerform: {name: 'curl_easy_perform', parameters: [EASY_HANDLE], result: CURL_CODE},
	// easyRecv: {name: 'curl_easy_recv', parameters: [''], result: ''}, /** @todo */
	// easyReset: {name: 'curl_easy_reset', parameters: ['pointer'], result: 'void'}, /** @todo */
	// easySend: {name: 'curl_easy_send', parameters: ['pointer', 'pointer', 'usize', 'pointer'], result: CURL_CODE}, /** @todo */
	easySetoptBuf: {name: 'curl_easy_setopt', parameters: [EASY_HANDLE, OPT_ID, 'buffer'], result: CURL_CODE},
	easySetoptFn: {name: 'curl_easy_setopt', parameters: [EASY_HANDLE, OPT_ID, 'function'], result: CURL_CODE},
	easySetoptU64: {name: 'curl_easy_setopt', parameters: [EASY_HANDLE, OPT_ID, 'u64'], result: CURL_CODE},
	easySetoptPtr: {name: 'curl_easy_setopt', parameters: [EASY_HANDLE, OPT_ID, 'pointer'], result: CURL_CODE},
	easySetoptBlob: {name: 'curl_easy_setopt', parameters: [EASY_HANDLE, OPT_ID, 'pointer'], result: CURL_CODE},
	easyStrerror: {name: 'curl_easy_strerror', parameters: ['i32'], result: 'buffer'},
	// easyUnescape: {name: 'curl_easy_unescape', parameters: ['pointer', 'buffer', 'i32', 'pointer'], result: 'buffer'},
	// easy_upkeep: {parameters: [''], result: ''},
	// formadd: {parameters: [''], result: 'i32'},
	// formfree: {parameters: [''], result: ''},
	// formget: {parameters: [''], result: ''},
	// free: {name: 'curl_free', parameters: ['pointer'], result: 'void'},
	// getdate: {parameters: [''], result: ''},
	globalCleanup: {name: 'curl_global_cleanup', parameters: [], result: 'void'},
	globalInit: {name: 'curl_global_init', parameters: ['i64'], result: CURL_CODE},
	// global_init_mem: {parameters: [''], result: ''},
	globalSslset: {name: 'curl_global_sslset', parameters: ['u32', 'buffer', 'pointer'], result: 'i32'},
	// global_trace: {name: 'curl_global_trace', parameters: ['buffer'], result: 'i32'},
	mimeAddpart: {name: 'curl_mime_addpart', parameters: [MIME_HANDLE], result: 'pointer'},
	mimeData: {name: 'curl_mime_data', parameters: [MIME_PART, 'buffer', 'u64'], result: CURL_CODE},
	// mime_data_cb: {parameters: [''], result: ''},
	// mime_encoder: {parameters: [''], result: ''},
	// mime_filedata: {parameters: [''], result: ''},
	mimeFilename: {name: 'curl_mime_filename', parameters: [MIME_PART, 'buffer'], result: CURL_CODE},
	mimeFree: {name: 'curl_mime_free', parameters: [MIME_HANDLE], result: 'void'},
	mimeHeaders: {name: 'curl_mime_headers', parameters: [MIME_PART, 'pointer', 'u32'], result: CURL_CODE},
	mimeInit: {name: 'curl_mime_init', parameters: [EASY_HANDLE], result: 'pointer'},
	mimeName: {name: 'curl_mime_name', parameters: [MIME_PART, 'buffer'], result: CURL_CODE},
	mimeSubparts: {name: 'curl_mime_subparts', parameters: [MIME_PART, MIME_HANDLE], result: CURL_CODE},
	mimeType: {name: 'curl_mime_type', parameters: [MIME_PART, 'buffer'], result: CURL_CODE},
	// multi_add_handle: {parameters: [''], result: ''},
	// multi_assign: {parameters: [''], result: ''},
	// multi_cleanup: {parameters: [''], result: ''},
	// multi_fdset: {parameters: [''], result: ''},
	// multi_info_read: {parameters: [''], result: ''},
	// multi_init: {parameters: [''], result: ''},
	// multi_perform: {parameters: [''], result: ''},
	// multi_remove_handle: {parameters: [''], result: ''},
	// multi_setopt: {parameters: [''], result: ''},
	// multi_socket_action: {parameters: [''], result: ''},
	// multi_strerror: {parameters: [''], result: ''},
	// multi_timeout: {parameters: [''], result: ''},
	// multi_poll: {parameters: [''], result: ''},
	// multi_wait: {parameters: [''], result: ''},
	// multi_wakeup: {parameters: [''], result: ''},
	// pushheader_byname: {parameters: [''], result: ''},
	// pushheader_bynum: {parameters: [''], result: ''},
	// share_cleanup: {parameters: [''], result: ''},
	// share_init: {parameters: [''], result: ''},
	// share_setopt: {parameters: [''], result: ''},
	// share_strerror: {parameters: [''], result: ''},
	slistAppend: {name: 'curl_slist_append', parameters: ['pointer', 'buffer'], result: 'pointer'},
	slistFreeAll: {name: 'curl_slist_free_all', parameters: ['pointer'], result: 'void'},
	// url: {name: 'curl_url', parameters: [], result: 'pointer'},
	// urlCleanup: {name: 'curl_url_cleanup', parameters: ['pointer'], result: 'void'},
	// url_dup: {parameters: [''], result: ''},
	// urlGet: {name: 'curl_url_get', parameters: ['pointer', 'i32', 'pointer', 'u32'], result: 'i32'},
	// urlSet: {name: 'curl_url_set', parameters: ['pointer', 'i32', 'buffer', 'u32'], result: 'i32'},
	// urlStrerror: {name: 'curl_url_strerror', parameters: ['i32'], result: 'buffer'},
	// version: {parameters: [], result: 'buffer'},
	// version_info: {parameters: [''], result: ''},
	// ws_recv: {parameters: [''], result: ''},
	// ws_send: {parameters: [''], result: ''},
	// ws_meta: {parameters: [''], result: ''},
});

export default libcurl;