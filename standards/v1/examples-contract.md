# Examples Contract

Vanilla TypeScript/DOM is the portability baseline for script-tag, CDN, H5,
and web-view hosts. React is the complete reference implementation and should
exercise the same public SDK API as the main Demo. The SDK runtime package must
remain independent of UI frameworks.

Add Vue, Vite, CDN, and WeChat Official Account H5 or mini-program `web-view`
examples when the manifest declares those surfaces. A surface declared
unsupported must be documented as unsupported rather than represented by a
placeholder link. Every runnable example has an install/run command and points
to the current SDK package version.
