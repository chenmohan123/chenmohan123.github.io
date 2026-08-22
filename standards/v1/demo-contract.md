# Single SDK Demo Contract

An SDK Demo focuses on one SDK/model. It is not a catalog and does not embed
another SDK's inference implementation.

## Semantic regions

1. Brand bar: SDK/model name, package version, GitHub link, and language toggle.
2. Controls: input selection, backend/precision selection when supported,
   run/reset, and model-cache cleanup.
3. Status: `idle`, `downloading`, `loading`, `ready`, `running`, `success`,
   `error`, or `unsupported`; show a human-readable label and stable error code.
4. Workspace: current model's input, preview, and result.
5. Information: model metadata, requested/actual runtime, execution mode,
   timing breakdown, compatibility matrix, and limitations.

Chinese is the initial language. Switching to English changes UI copy only;
refreshing may restore Chinese unless the Demo documents persistence.

The Demo exposes current-model cache usage, a current-model cleanup action, a
global cleanup action, and a privacy statement. It must not render broken image
previews for empty state. DOM markers such as `data-sdk-cache-clear`,
`data-sdk-model-info`, `data-sdk-runtime-info`, and `data-sdk-timing` make the
contract testable without prescribing a framework.

Use [ui-tokens.json](ui-tokens.json) for colors, spacing, radius, focus, and
status styles. Responsive layouts must not overflow on a 390px viewport.
