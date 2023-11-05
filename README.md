# Decurl
[Curl](https://curl.se/libcurl/) bindings for Deno.

The goal of this library is not to provide an ergonomic layer on top of Curl, but to provide a 1:1 usage and feature parity with Curl with a few convenient helpers.

```ts
import Decurl, { globalInit, globalCleanup } from 'https://deno.land/x/decurl/decurl.ts'

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
```

Run with `deno run -A --unstable`.

More examples in the `tests` folder.

## Requirements
- Deno >= 1.37.1<sup>[1]</sup>
- Curl >= 7.73.0<sup>[2]</sup>

<sup>[1]</sup> You can use older versions of Deno as well, but then you will have to call the method [`Decurl.cleanup()`](https://curl.se/libcurl/c/curl_easy_cleanup.html) manually because you won't be able to use [`using`](https://devblogs.microsoft.com/typescript/announcing-typescript-5-2/#using-declarations-and-explicit-resource-management).

<sup>[2]</sup> On Windows you probably won't need to install Curl as Decurl will download and cache [`libcurl.dll`](https://deno.land/x/decurl/lib/libcurl-x64.dll) automatically on first execution.

## Roadmap
- Async operations.