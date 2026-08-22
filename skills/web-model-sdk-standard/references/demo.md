# Demo Migration Workflow

Use `standards/v1/demo-contract.md`, `performance-contract.md`, and
`ui-tokens.json` as the implementation references. Keep the Demo focused on
one SDK/model and map its framework of choice to the same semantic regions:
brand bar, controls, status, workspace, model info, runtime info, timings, and
cache cleanup.

The initial language is Chinese, language switching is in-page, empty previews
do not render broken images, and cleanup actions report their result. Render
requested and actual backend, main/worker execution mode, model source/cache
state, and the stable timing fields. Use React as the complete reference only;
Vanilla remains the CDN/H5/web-view compatibility baseline.
