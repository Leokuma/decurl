# Decurl
[Curl](https://curl.se/libcurl/) bindings for Deno.

```ts
import Decurl, {globalInit, globalCleanup} from 'https://deno.land/x/decurl/decurl.ts';

globalInit();

const decurl = new Decurl();

decurl.setUrl('https://example.com');
decurl.perform();

if (decurl.writeFunctionData)
	console.log(new TextDecoder().decode(decurl.writeFunctionData));

decurl.cleanup();

globalCleanup();
```

Run with `deno run -A --unstable`.

More examples in the [tests](./tests/) folder.

`libcurl` must be installed.

## Roadmap
- **Support Windows and Mac**: currently only works in Linux.
- **Support ARM**: currently only works in amd64.
- **Async operations**: currently the entire API is blocking.