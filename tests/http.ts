import {assert, assertEquals} from 'https://deno.land/std@0.203.0/assert/mod.ts';
import Decurl, {globalInit, globalCleanup} from '../decurl.ts';

Deno.test('Small GET text', async () => {
	globalInit();

	using d = new Decurl();

	d.setUrl('https://example.com');
	d.perform();
	const dRes = d.getWriteFunctionData();
	assert(dRes);

	const fetchRes = await fetch('https://example.com').then(r => r.text());

	assertEquals(new TextDecoder().decode(dRes), fetchRes);

	globalCleanup();
})

Deno.test('Big GET text', async () => {
	globalInit();

	using d = new Decurl();

	d.setUrl('https://html.spec.whatwg.org/');
	d.perform();
	const dRes = d.getWriteFunctionData();
	assert(dRes);

	const fetchRes = await fetch('https://html.spec.whatwg.org/').then(r => r.text());

	assertEquals(new TextDecoder().decode(dRes), fetchRes);

	globalCleanup();
})

Deno.test('GET PDF', async () => {
	globalInit();

	using d = new Decurl();

	d.setUrl('https://html.spec.whatwg.org/print.pdf');
	d.perform();
	const dRes = d.getWriteFunctionData();
	assert(dRes);

	const fetchRes = await fetch('https://html.spec.whatwg.org/print.pdf').then(r => r.arrayBuffer());

	const shaDecurl = await crypto.subtle.digest('SHA-256', dRes);
	const shaFetch = await crypto.subtle.digest('SHA-256', fetchRes);
	assertEquals(new Uint8Array(shaDecurl), new Uint8Array(shaFetch)); // asserting ArrayBuffers directly doesn't work

	globalCleanup();
})

Deno.test('Multiple handles GET', async () => {
	globalInit();

	using d1 = new Decurl();
	using d2 = new Decurl();

	d1.setUrl('https://example.com');
	d2.setUrl('https://example.com');
	d1.perform();
	d2.perform();
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

Deno.test('Readme', () => {
	globalInit();

	using decurl = new Decurl();

	decurl.setUrl('https://example.com');
	decurl.perform();

	const response = decurl.getWriteFunctionData();

	if (response)
		console.log(new TextDecoder().decode(response));

	globalCleanup();
})