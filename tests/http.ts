import {assert, assertEquals} from 'https://deno.land/std@0.203.0/assert/mod.ts';
import Decurl, {globalInit, globalCleanup} from '../decurl.ts';

Deno.test('Small GET text', async _ctx => {
	globalInit();

	using d = new Decurl();

	d.setUrl('https://example.com');
	d.perform();

	assert(d.writeFunctionData);

	if (!d.writeFunctionData)
		return;

	const fetchRes = await fetch('https://example.com').then(r => r.text());

	assertEquals(new TextDecoder().decode(d.writeFunctionData), fetchRes);

	globalCleanup();
})

Deno.test('Big GET text', async _ctx => {
	globalInit();

	using d = new Decurl();

	d.setUrl('https://html.spec.whatwg.org/');
	d.perform();

	assert(d.writeFunctionData);

	if (!d.writeFunctionData)
		return;

	const fetchRes = await fetch('https://html.spec.whatwg.org/').then(r => r.text());

	assertEquals(new TextDecoder().decode(d.writeFunctionData), fetchRes);

	globalCleanup();
})

Deno.test('GET PDF', async _ctx => {
	globalInit();

	using d = new Decurl();

	d.setUrl('https://html.spec.whatwg.org/print.pdf');
	d.perform();

	assert(d.writeFunctionData);

	if (!d.writeFunctionData)
		return;

	const fetchRes = await fetch('https://html.spec.whatwg.org/print.pdf').then(r => r.arrayBuffer());

	const shaDecurl = await crypto.subtle.digest('SHA-256', d.writeFunctionData);
	const shaFetch = await crypto.subtle.digest('SHA-256', fetchRes);

	assertEquals(new Uint8Array(shaDecurl), new Uint8Array(shaFetch)); // asserting ArrayBuffers directly doesn't work

	d.cleanup();
	globalCleanup();
})

Deno.test('Multiple handles GET', async _ctx => {
	globalInit();

	const txtDec = new TextDecoder();
	using d1 = new Decurl();
	using d2 = new Decurl();

	d1.setUrl('https://example.com');
	d2.setUrl('https://example.com');
	d1.perform();
	d2.perform();

	assert(d1.writeFunctionData);
	assert(d2.writeFunctionData);

	if (!d1.writeFunctionData || !d2.writeFunctionData)
		return;

	const fetchRes = await fetch('https://example.com').then(r => r.text());

	assertEquals(txtDec.decode(d1.writeFunctionData), txtDec.decode(d2.writeFunctionData));
	assertEquals(txtDec.decode(d2.writeFunctionData), fetchRes);

	globalCleanup();
})