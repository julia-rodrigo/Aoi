# Aoi Teacher — Android app (TWA)

This folder holds the Trusted Web Activity (TWA) config used to wrap the
hosted PWA (`https://julia-rodrigo.github.io/aoi/`) into an installable
Android APK via [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap).
It's a thin wrapper, not a static snapshot: the installed app loads the live
site at runtime, so future pushes to `main` show up automatically with no
new APK needed.

`twa-manifest.json` is the generated config (package id, colors, icon URLs,
etc.) — safe to keep here, no secrets in it.

**The signing keystore is intentionally not committed here, and nothing
persists it between build sessions** — a keystore plus its password, if
public, would let anyone resign a malicious "update" that Android would
treat as coming from the same app. Each time this gets rebuilt from a fresh
environment, there is no earlier keystore to reuse, so a *new* one gets
generated, which means: **if an earlier build of this APK is already
installed on a phone, Android will refuse to install the new one as an
update** (different signing key = a different app as far as Android is
concerned) — uninstall the old one first, then install the new one. This is
expected, not a bug. The current build is `appVersionCode: 2` (first
rebuild since the original `1`); the keystore used to sign it exists only in
the session that built it and was not saved anywhere durable — there's
nothing to hand over for a true in-place "update" later, only a fresh
install each time this is rebuilt from scratch.

## To rebuild

```
npm install -g @bubblewrap/cli
keytool -genkeypair -v -keystore ./android.keystore -alias android \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Aoi Teacher, OU=Aoi, O=julia-rodrigo, L=Unknown, ST=Unknown, C=US"
# edit twa-manifest.json's signingKey.path to point at that file, bump
# appVersionCode/appVersionName, then from the same directory as this file:
bubblewrap build
```

### Notes if rebuilding in a sandboxed environment

Two network issues can come up if the build runs behind an outbound-only
HTTPS proxy with no direct egress (as in a sandboxed CI/agent environment):

- Node's own `fetch` doesn't read `HTTPS_PROXY` by default. Set
  `NODE_USE_ENV_PROXY=1` to enable its experimental env-proxy support for the
  `bubblewrap` CLI's own DNS/HTTP calls.
- Bubblewrap's project generator (`@bubblewrap/core`'s `fetchUtils`, used to
  download the manifest/icons) uses `fetch-h2` by default, which does its own
  TLS/HTTP2 handshake outside of Node's global settings and can hang or
  reject a local redirect's self-signed cert even with
  `NODE_TLS_REJECT_UNAUTHORIZED=0` set. Switching it to the `node-fetch`
  engine (`core.fetchUtils.setFetchEngine('node-fetch')`, e.g. in a small
  driver script that calls `TwaGenerator.createTwaProject` directly instead
  of going through the CLI) avoids both the HTTP/2 hang and respects
  `NODE_EXTRA_CA_CERTS` normally. If the real domain isn't reachable by DNS
  at all in that environment, mirroring the site's `manifest.json`/icons
  under a local HTTPS server, pointing `/etc/hosts` for the real hostname at
  `127.0.0.1`, and trusting that local server's cert via
  `NODE_EXTRA_CA_CERTS` works around it; `bubblewrap build` itself (the
  actual Gradle/signing step, once `twa-manifest.json` and
  `manifest-checksum.txt` are in place) doesn't need network access to the
  real domain at all.
- The Android SDK's `cmdline-tools` package doesn't include a legacy
  `tools/bin` folder some tooling still expects; a symlink
  (`tools/bin -> cmdline-tools/latest/bin`) fixes it if asset/SDK lookups
  fail.
