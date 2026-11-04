---
key: release-and-ci
name: Releases and CI
type: principle
level: go-elemental
---

# Releases and CI

How Go Elemental repositories are checked, kept current, versioned, and released. Every repository
releases independently ([independent releases](../../../principles/independent-releases.md)); this
page states the shared mechanics.

## One check per repository

Each repository has one check, `mise run check`, read-only and deterministic, stopping at the first
failure. For every module in the repository's module list, with the workspace file disabled
(`GOWORK=off`) so a broken version pin fails it, it runs the Go SDK's gates and then golangci-lint:

- `go build ./...`
- `go vet ./...`
- a `gofmt -l` formatting check
- `go fix -diff ./...`
- `go mod tidy -diff`
- `go test -race ./...`
- `golangci-lint run ./...`

A repository adds what its own code needs: sqlate, blobfs, go-messaging, and go-web-service run
the SQL conventions lint after the loop, and both templates and go-web-service vet, fix, and lint
with `-tags integration` so the integration suite compiles and lints too
([tests and documentation](tests-and-docs.md)). Each template's check runs inside its
`template/` subtree.

CI runs the same check, so the gate is the one a developer runs. Each repository's CI workflow has
one `check` job that installs the pinned tools with mise and runs `mise run check`, on every pull
request into `main` and every push to it; there is no per-module matrix, because the check loops
over the modules itself. A suite beyond the unit tier that CI runs has a job of its own:
go-storage's `acceptance` job runs `mise run acceptance`, azureblob against Azurite and s3 against
SeaweedFS. An `integration` job runs on push to `main` and on manual dispatch: both templates' and
go-web-service's run the integration tier, and go-messaging's runs its postgres and nats suites.
sqlate's and blobfs's postgres suites have no job; they run on a developer's machine
([tests and documentation](tests-and-docs.md)). A job that needs containers runs the same mise
task a developer runs, and the task prints the containers' logs when it fails. The Go toolchain
and golangci-lint versions are pinned in `mise.toml`, which CI and a developer's machine both
read, so the gate moves only by a deliberate bump.

## Currency and upgrade

Beside the check, two development-time tasks keep a repository current:

- `mise run currency` runs the repository's `scripts/currency.sh`, which reports every
  direct requirement, Go version, tool, and action pin, and where the repository has one, every
  container image tag, read from each compose service's Dockerfile `FROM` line, that trails its latest release, and exits non-zero when it reports
  any. It reads the network and writes nothing.
- `mise run upgrade` moves every module's `go` directive to the current Go minor, upgrades its
  direct requirements to their latest, tidies, and bumps the local mise tools, rewriting
  `go.mod` and `mise.toml`.

Currency is not a CI gate: no workflow runs it, so a new upstream release never turns a
repository's CI red. Dependabot covers security only: each repository has Dependabot security
updates enabled and no `dependabot.yml`, so no version-update pull requests open.

## Releases

A releasable artifact is released by pushing its tag: `v<semver>` for a module rooted at the
repository, `<path>/v<semver>` for a nested sub-module (`postgres/v0.1.0`, `template/v0.1.0`).
Each artifact keeps its own `CHANGELOG.md` in Keep-a-Changelog form: dated headings
(`## [vX.Y.Z] - YYYY-MM-DD`), a standing `[Unreleased]` section where changes accumulate
between cuts, and link-reference definitions resolving each bracketed heading to its compare or
tag URL. There is no umbrella version spanning a base module and its sub-modules.

Each repository's release workflow has one `release` job, triggered by a pushed tag. A
repository with sub-modules derives the module's path prefix and changelog from the tag; a
repository with one artifact names them in the workflow. The job extracts the matching changelog
section and creates the GitHub release; runs for the same tag are serialized.

Release preparation lands on `main` through a pull request, like any other change: the
changelog date, metadata edits, and the README brought current with the release's changes. A
ruleset on `main` in every repository requires the pull request and forbids deleting or
force-pushing the branch.

The tag is pushed only after `main`'s CI run passes, the integration job included where the
repository has one, so a release never points at a commit that failed CI. This is practice, not
a gate: no ruleset requires a status check, and the release workflow runs no CI of its own.

A tag whose release failed may be deleted and re-pushed at the same version once the fix is on
`main`. A released tag is never re-cut: once the module proxy has fetched a version, the
checksum database pins that commit permanently, and moving the tag leaves consumers with a
checksum mismatch they cannot resolve.

No release branch is retained; the tag is the durable artifact. Every other branch is deleted
when it merges.

## Coordinating a change across modules

Where a repository contains a base module and provider sub-modules, a committed root `go.work`
resolves them together during local development, so a change spanning them is built and tested
before anything is tagged. Pinned `require` versions are the committed steady state; a `replace`
directive is a transient bridge while a provider builds against unreleased base changes, and it
is removed once the base is tagged. The release ripple runs bottom-up: tag the base, bump the
provider's `require`, note it in the provider's changelog, tag the provider.

The tiers ripple the same way: a go-core change releases first and is taken up by coordinated
releases in the repositories above it, each pinning the versions it validated against.

The repositories are public: modules resolve through the public Go proxy and checksum database,
and CI needs no private-module configuration.

## What ships in a module zip

A module zip includes every committed file below its `go.mod`, `context/`, `CLAUDE.md`, and
`.claude/` among them. Go provides no supported way to exclude them, and they cost nothing: the
toolchain compiles only imported `.go` files, so they ship as committed. The templates are the
deliberate exception: each one's module boundary at `template/` exists so the management layer never
ships.

## Containers for tests and development

A repository that runs a suite or a development stack against containers defines them with Docker
Compose, in one layout:

- A root `compose.yml` names the project with `name:` and includes the files under `compose/`,
  one per service group.
- Every service builds from `compose/<service>/Dockerfile`. Its `FROM` line is the service's one
  image pin; no `image:` line names an image, in compose or in CI.
- The Dockerfile carries the service's configuration: `ENV` and `CMD`, and `COPY` for
  configuration files. Compose adds only the build context, the published port, and the data
  mount, and bind-mounts no configuration.
- Where the base image can run a probe, a `HEALTHCHECK` in the Dockerfile defines readiness, with
  `--start-period=30s --start-interval=1s --interval=5s --timeout=3s --retries=5`. A distroless
  image has no `HEALTHCHECK`, and compose waits on it as running.
- A stack starts with `docker compose up -d --wait --build` and stops with
  `docker compose down`.
- A test-only harness, such as go-storage's or go-messaging's (PostgreSQL and NATS), keeps its
  data on tmpfs, so every start is empty. A development stack keeps its data in named volumes,
  which `<group>:down` keeps and `<group>:reset` deletes.
- Every published port binds `127.0.0.1` and moves with an environment variable
  (`POSTGRES_PORT`, `AZURITE_BLOB_PORT`), and the repository's settings that name the port follow
  the variable. go-web-service's application settings are the exception: its README documents
  that they keep their own ports.
- mise tasks drive compose directly; no shell script backs a harness.

## Tasks

Each repository defines its developer tasks in `mise.toml`: `check`, `currency`, and `upgrade`,
and beside them conveniences such as `test`, `vet`, `fmt`, `tidy`, and `lint`, each wrapping a
plain command, plus `integration` or `acceptance` where the repository runs such a suite locally,
and tasks that start and stop the containers it runs against: `db:up`, `db:down`, and `db:reset`
for sqlate's, blobfs's, and go-web-service's development stacks, with go-web-service's `otel:*`
and `stack:*` beside them, and `up`, `down`, `acceptance:s3`, and `acceptance:azureblob` for
go-storage's test harness. go-messaging's test harness has `up` and `down` beside
`integration:postgres` and `integration:nats`, each of which runs one suite, and `integration`,
which runs both. A task name with more than one part is `<group>:<member>`, group first, joined by
a colon, which is mise's namespace separator, so `mise run 'db:*'` matches a group. The
repository works without mise; the tasks are a convenience.
