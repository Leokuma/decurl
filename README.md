# Decurl
[Curl](https://curl.se/libcurl/) bindings for Deno.

The goal of this library is not to provide an ergonomic layer on top of Curl, but to provide a 1:1 usage parity with Curl with a few convenient helpers.

```ts
import Decurl, {globalInit, globalCleanup} from 'https://deno.land/x/decurl/decurl.ts';

globalInit();

using decurl = new Decurl();

decurl.setUrl('https://example.com');
decurl.perform();

const response = decurl.getWriteFunctionData();

if (response)
	console.log(new TextDecoder().decode(response));

globalCleanup();
```

Run with `deno run -A --unstable`.

More examples in the `tests` folder.

`libcurl` must be installed.

## Roadmap
- **Support Windows and Mac**: currently only works in Linux.
- **Support ARM**: currently only works in amd64.
- **Async operations**: currently the entire API is blocking.