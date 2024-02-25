import {assert, assertEquals, assertGreater, assertGreaterOrEqual, assertLess, assertLessOrEqual} from 'https://deno.land/std@0.208.0/assert/mod.ts';
import Decurl, {globalInit, globalCleanup, globalSslset} from './decurl.ts';
import {Code, HttpVersion, Opt, Sslbackend, Sslset} from './types.ts';
import {isStatus} from 'https://deno.land/std@0.208.0/http/status.ts';


/** This must be the first test. */
Deno.test('Init - SSL backend', () => {
  assertEquals(globalSslset(Sslbackend.Bearssl), Sslset.UnknownBackend);
  assertEquals(globalSslset(Sslbackend.Openssl), Sslset.Ok);
  assertEquals(globalInit(), 0);
  globalCleanup();

	if (Deno.build.os == 'windows') {
		assertEquals(globalSslset(Sslbackend.Schannel), Sslset.Ok);
		assertEquals(globalSslset(Sslbackend.Bearssl), Sslset.TooLate);
		assertEquals(globalInit(), 0);
		globalCleanup();
	}
})

Deno.test('Readme', () => {
	globalInit()

	using decurl = new Decurl()

	decurl.setSslVerifypeer(0)
	decurl.setUrl('https://example.com')

	const curlCode = decurl.perform()
	const responseCode = decurl.getResponseCode()
	const response = decurl.getWriteFunctionData()

	if (response) {
		console.log(new TextDecoder().decode(response))
	}

	console.log(responseCode)
	console.log(curlCode)

	globalCleanup()
})

Deno.test('optionByName', () => {
	globalInit();

	using d = new Decurl();

	assert(d.optionByName(Opt.Url));
	assert(d.optionByName(Opt.Connecttimeout));
	assert(d.optionByName(Opt.Cookiefile));
	assert(d.optionByName(Opt.Copypostfields));
	assert(d.optionByName(Opt.Headerfunction));
	assert(d.optionByName(Opt.Httpheader));
	assert(d.optionByName(Opt.Password));
	assert(d.optionByName(Opt.Postfields));
	assert(d.optionByName(Opt.Post));
	assert(d.optionByName(Opt.SslcertBlob));

	globalCleanup();
});

Deno.test('GET - Big text', async () => {
	globalInit();

	using d = new Decurl();

	if (Deno.build.os == 'windows')
		assertEquals(d.setSslVerifypeer(0), Code.Ok);

	assertEquals(d.setUrl('https://html.spec.whatwg.org/'), Code.Ok);
	assertEquals(d.perform(), Code.Ok);
	consistResponse(d);
	const dRes = d.getWriteFunctionData();
	assert(dRes);

	const fetchRes = await fetch('https://html.spec.whatwg.org/').then(r => r.text());

	assertEquals(new TextDecoder().decode(dRes), fetchRes);

	globalCleanup();
})

Deno.test('GET - Multiple handles', async () => {
	globalInit();

	using d1 = new Decurl();
	using d2 = new Decurl();

	if (Deno.build.os == 'windows')
		assertEquals(d1.setSslVerifypeer(0), Code.Ok);

	if (Deno.build.os == 'windows')
		assertEquals(d2.setSslVerifypeer(0), Code.Ok);

	assertEquals(d1.setUrl('https://example.com'), Code.Ok);
	assertEquals(d2.setUrl('https://example.com'), Code.Ok);
	assertEquals(d1.perform(), Code.Ok);
	assertEquals(d2.perform(), Code.Ok);
	consistResponse(d1);
	consistResponse(d2);
	const d1Res = d1.getWriteFunctionData();
	const d2Res = d2.getWriteFunctionData();
	assert(d1Res);
	assert(d2Res);

	const fetchRes = await fetch('https://example.com').then(r => r.text());

	const txtDec = new TextDecoder();
	assertEquals(txtDec.decode(d1Res), txtDec.decode(d2Res));
	assertEquals(txtDec.decode(d2Res), fetchRes);

	globalCleanup();
})

Deno.test('GET - Not found', async () => {
	globalInit();

	using d = new Decurl();

	if (Deno.build.os == 'windows')
		assertEquals(d.setSslVerifypeer(0), Code.Ok);

	assertEquals(d.setUrl('https://example.com/not_found'), Code.Ok);
	assertEquals(d.perform(), Code.Ok);
	consistResponse(d);
	assertEquals(d.getResponseCode(), 404);
	assertEquals(d.getEffectiveUrl(), 'https://example.com/not_found');
	const dRes = d.getWriteFunctionData();
	assert(dRes);

	const fetchRes = await fetch('https://example.com/not_found').then(r => r.text());

	assertEquals(new TextDecoder().decode(dRes), fetchRes);

	globalCleanup();
})

Deno.test('GET - PDF', async () => {
	globalInit();

	using d = new Decurl();

	if (Deno.build.os == 'windows')
		assertEquals(d.setSslVerifypeer(0), Code.Ok);

	assertEquals(d.setUrl('https://html.spec.whatwg.org/print.pdf'), Code.Ok);
	assertEquals(d.perform(), Code.Ok);
	consistResponse(d);
	const dRes = d.getWriteFunctionData();
	assert(dRes);

	const fetchRes = await fetch('https://html.spec.whatwg.org/print.pdf').then(r => r.arrayBuffer());

	const shaDecurl = await crypto.subtle.digest('SHA-256', dRes);
	const shaFetch = await crypto.subtle.digest('SHA-256', fetchRes);
	assertEquals(new Uint8Array(shaDecurl), new Uint8Array(shaFetch)); // asserting ArrayBuffers directly doesn't work

	globalCleanup();
})

Deno.test('GET - Small text', async () => {
	globalInit();

	using d = new Decurl();

	if (Deno.build.os == 'windows')
		assertEquals(d.setSslVerifypeer(0), Code.Ok);

	assertEquals(d.setUrl('https://example.com'), Code.Ok);
	assertEquals(d.perform(), Code.Ok);
	consistResponse(d);
	assertEquals(d.getResponseCode(), 200);
	assertEquals(d.getEffectiveUrl(), 'https://example.com/');

	const dRes = d.getWriteFunctionData();
	assert(dRes);

	const fetchRes = await fetch('https://example.com').then(r => r.text());

	assertEquals(new TextDecoder().decode(dRes), fetchRes);

	globalCleanup();
})

Deno.test('GET - Headers', async () => {
	globalInit();

	using d = new Decurl();

	if (Deno.build.os == 'windows')
		assertEquals(d.setSslVerifypeer(0), Code.Ok);

	assertEquals(d.setUrl('https://example.com'), Code.Ok);
	assertEquals(d.perform(), Code.Ok);
	consistResponse(d);
	assertEquals(d.getResponseCode(), 200);

	const headers = d.getHeaderFunctionData();
	assert(headers);
	assert(headers.get('content-length'));
	assert(headers.get('age'));
	assert(headers.get('date'));
	assert(headers.get('x-cache'));

	const fetchRes = await fetch('https://example.com');
	await fetchRes.arrayBuffer();

	assertEquals(headers.get('content-type'), fetchRes.headers.get('content-type'));

	globalCleanup();
})

Deno.test('Custom headers', async () => {
	globalInit();

	using d = new Decurl();

	if (Deno.build.os == 'windows')
		assertEquals(d.setSslVerifypeer(0), Code.Ok);

	d.setHttpheader(new Headers({'custom-header': 'custom value'}));
	assertEquals(d.setUrl('https://example.com'), Code.Ok);
	assertEquals(d.perform(), Code.Ok);
	consistResponse(d);
	assertEquals(d.getResponseCode(), 200);

	const fetchRes = await fetch('https://example.com');
	await fetchRes.arrayBuffer();

	globalCleanup();
})

Deno.test('Cookie engine', () => {
	globalInit();

	using d = new Decurl();

	if (Deno.build.os == 'windows')
		assertEquals(d.setSslVerifypeer(0), Code.Ok);

	assertEquals(d.setFollowlocation(1), Code.Ok);
	d.setCookiefile('');
	assertEquals(d.setUrl('https://www.google.com/'), Code.Ok);
	assertEquals(d.perform(), Code.Ok);
	assertEquals(d.getResponseCode(), 200);
	assertGreater(d.getCookielist()?.length, 1);
	consistResponse(d);

	assertEquals(d.perform(), Code.Ok);
	assertEquals(d.getResponseCode(), 200);
	assertGreater(d.getHeaderFunctionData()?.getSetCookie().length, 1);
	assertGreater(d.getCookielist()?.length, 1);
	consistResponse(d);

	globalCleanup();
})


function consistResponse(d: Decurl) {
	assert(d.getHttpVersion() in HttpVersion);
	assert(d.getEffectiveMethod() == 'GET' || d.getEffectiveMethod() == 'POST');
	assert(d.getScheme()?.includes('HTTP'));
	assert(isStatus(d.getResponseCode()));
	assert(d.getContentType());
	assertGreater(d.getLocalIp()!.length, 3);
	assertGreaterOrEqual(d.getLocalPort(), 8000);
	assertGreater(d.getEffectiveUrl()!.length, 7);
	assertGreater(d.getPrimaryIp()!.length, 7);
	assert([80, 443].includes(d.getPrimaryPort()));

	const headers = d.getHeaderFunctionData();
	assert(headers);
	assert(headers.get('content-type'));
	assert(headers.get('date'));

	/** @todo console.log(d.getCainfo()); */

	assertGreaterOrEqual(d.getFiletimeT(), 0);
	assertGreaterOrEqual(d.getFiletime(), 0);
	assertEquals(d.getFiletimeT(), d.getFiletime()); // what's the difference?

	assertGreater(d.getSizeDownloadT(), 10);
	assertGreaterOrEqual(d.getSizeUploadT(), 0);
	assertGreaterOrEqual(d.getSpeedDownloadT(), 50);
	assertLess(d.getSpeedDownloadT(), 10000000);
	assertGreaterOrEqual(d.getSpeedUploadT(), 0);

	assertGreaterOrEqual(d.getRequestSize(), 10);
	assertGreaterOrEqual(d.getHeaderSize(), 0);
	assertLessOrEqual(d.getHeaderSize(), 2000);
	assertGreaterOrEqual(d.getContentLengthDownloadT(), 0);
	assertGreaterOrEqual(d.getContentLengthUploadT(), 0);

	assertGreaterOrEqual(d.getTotalTimeT(), 0n);
	assertGreaterOrEqual(d.getStarttransferTimeT(), 0n);
	assertGreaterOrEqual(d.getPretransferTimeT(), 0n);
	assertGreaterOrEqual(d.getAppconnectTimeT(), 0n);
	assertGreaterOrEqual(d.getConnectTimeT(), 0n);
	assertGreaterOrEqual(d.getNamelookupTimeT(), 0n);
	assertGreaterOrEqual(d.getRedirectTimeT(), 0n);

	assertGreaterOrEqual(d.getTotalTime(), 0);
	assertGreaterOrEqual(d.getStarttransferTime(), 0);
	assertGreaterOrEqual(d.getPretransferTime(), 0);
	assertGreaterOrEqual(d.getAppconnectTime(), 0);
	assertGreaterOrEqual(d.getConnectTime(), 0);
	assertGreaterOrEqual(d.getNamelookupTime(), 0);
	assertGreaterOrEqual(d.getRedirectTime(), 0);

	assertEquals(BigInt(Math.round(d.getTotalTime() * 1000000)), d.getTotalTimeT());
	assertEquals(BigInt(Math.round(d.getPretransferTime() * 1000000)), d.getPretransferTimeT());
	assertEquals(BigInt(Math.round(d.getAppconnectTime() * 1000000)), d.getAppconnectTimeT());
	assertEquals(BigInt(Math.round(d.getConnectTime() * 1000000)), d.getConnectTimeT());
	assertEquals(BigInt(Math.round(d.getNamelookupTime() * 1000000)), d.getNamelookupTimeT());
	assertEquals(BigInt(Math.round(d.getRedirectTime() * 1000000)), d.getRedirectTimeT());

	assertGreaterOrEqual(d.getPretransferTimeT(), d.getAppconnectTimeT());
	assertGreaterOrEqual(d.getAppconnectTimeT(), d.getConnectTimeT());
	assertGreaterOrEqual(d.getConnectTimeT(), d.getNamelookupTimeT());

	assertGreaterOrEqual(d.getPretransferTime(), d.getAppconnectTime());
	assertGreaterOrEqual(d.getAppconnectTime(), d.getConnectTime());
	assertGreaterOrEqual(d.getConnectTime(), d.getNamelookupTime());
}