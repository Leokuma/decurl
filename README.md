# Decurl
[Curl](https://curl.se/libcurl/) bindings for Deno.

```ts
import Decurl, {globalInit, globalCleanup} from 'decurl.ts';

globalInit();

const decurl = new Decurl();

decurl.setUrl('https://example.com');
decurl.perform();

console.log(new TextDecoder().decode(decurl.writeFunctionData));

decurl.cleanup();

globalCleanup();
```

More examples in the [tests](./tests/) folder.

`libcurl` must be installed.

## Roadmap
- **Better OS support**: currently only works in Linux.
- **Async operations**: currently the entire API is blocking.