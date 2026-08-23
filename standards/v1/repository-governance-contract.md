# Repository Governance and Deployment Contract

This contract applies to public Web Model SDK repositories and to the portal
repository. It governs how protected source and public Demo deployments are
changed. It does not change the framework-neutral SDK runtime contract.

## Evidence and compliance

Repository settings are remote state. Rulesets and Pages evidence must come
from the GitHub API; another hosting provider may supply equivalent deployment
API evidence. Evidence identifies the repository and Ruleset, environment, or
deployment, records the observed values and verification time, and omits
credentials. Local workflow files are supporting evidence, not proof that a
remote Ruleset, Pages setting, or deployment is active.

The offline `sdk:check` command reports remote rules as `skip`. A repository
with no local required failures is `locally-compliant`; it becomes
`compliant` only after every applicable required remote rule is verified.
Remote evidence is valid only for the observed repository state. Refresh it
before publishing compliance for a release and after any relevant setting
changes.

## Default branch Ruleset

`GOV-001` is required for a public GitHub repository. One active repository
Ruleset targets the default branch and provides all of these protections:

- branch deletion and non-fast-forward updates are blocked;
- changes enter through a pull request;
- the repository's required CI checks pass before merge;
- required checks apply to the latest commit before merge;
- review conversations are resolved before merge; and
- bypass actors are absent or limited to documented emergency or automation
  identities with the least privilege needed.

An independent approval is recommended when another maintainer is available.
A one-person repository may require pull requests with zero approvals; the
standard does not require self-approval or a permanent administrator bypass.
Dismissing stale approvals, requiring Code Owner review, linear history, and a
merge queue are recommended when the repository's collaboration model supports
them.

Do not make a post-merge Pages deployment a pull-request status check. The
pre-merge build and test workflow is the required check; production deployment
is verified after merge.

## Release tag Ruleset

`GOV-002` is required when the repository publishes GitHub Releases or package
artifacts from tags. One active tag Ruleset targets the documented release tag
pattern, normally `v*`, and blocks updating and deleting matching tags. Tag
creation is restricted only when the release process has a documented actor
that can create tags without receiving broader bypass access.

A published release tag is immutable. Correct a release with a new version and
tag instead of moving an existing tag. Bypass follows the same least-privilege
and evidence requirements as the default branch Ruleset.

## Demo deployment

`DEPLOY-001` is required for an SDK that declares a live Demo. The hosting
provider is not prescribed. The deployment must:

- serve the declared Demo URL over HTTPS;
- build from version-controlled source with a documented, reproducible command;
- deploy through a version-controlled workflow from the protected default
  branch or an immutable release tag;
- grant write credentials only to the deployment job and only for the duration
  of that job;
- serialize production deployments so concurrent runs cannot publish an older
  build over a newer one; and
- expose a successful deployment record tied to the source commit.

Secrets must not be embedded in the built site, workflow source, audit report,
or deployment artifact. A provider other than GitHub Pages is conforming when
it meets the same outcomes and supplies equivalent dated evidence.

## GitHub Pages

`PAGES-001` is conditionally required when GitHub Pages hosts the Demo. It is
not applicable when another provider hosts the declared Demo URL. A conforming
GitHub Pages deployment has:

- **Source** set to GitHub Actions rather than deployment from an unverified
  branch folder;
- a deployment job that targets the `github-pages` environment;
- job permissions limited to `contents: read`, `pages: write`, and
  `id-token: write`, with broader defaults disabled;
- a Pages artifact produced by the documented build and deployed by the
  official Pages actions;
- the environment URL set from the deployment result;
- HTTPS enforcement enabled, including for a configured custom domain; and
- deployment concurrency configured to prevent stale production publication.

The `github-pages` environment may restrict deployment branches or tags to the
same protected source described by `DEPLOY-001`. Environment approval is
optional for an automated public Demo and must not be used as a substitute for
the default branch Ruleset.

## Remote verification result

A future authenticated governance checker records each rule as `pass`, `fail`,
or `not-applicable`, plus the evidence source and `verifiedAt` timestamp. An API
permission error is `unknown`, not `pass`. The checker must be read-only unless
the user separately authorizes a remote mutation.
