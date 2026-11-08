# Aoi Teacher — Android app (TWA)

This folder holds the Trusted Web Activity (TWA) config used to wrap the
hosted PWA (`https://julia-rodrigo.github.io/aoi/`) into an installable
Android APK via [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap).

`twa-manifest.json` is the generated config (package id, colors, icon URLs,
etc.) — safe to keep here, no secrets in it.

**The signing keystore is intentionally not committed here** — a keystore
plus its password, if public, would let anyone resign a malicious "update"
that Android would treat as coming from the same app. It was sent to you
directly instead; keep it somewhere private. You need it (and its password)
to build any future update that Android will accept as an upgrade rather
than a different app requiring a fresh install.

## To rebuild

```
npm install -g @bubblewrap/cli
bubblewrap init --manifest=https://julia-rodrigo.github.io/aoi/manifest.json
# answer the prompts: domain julia-rodrigo.github.io, path /aoi/, point the
# signing key at your saved keystore file instead of creating a new one
bubblewrap build
```
