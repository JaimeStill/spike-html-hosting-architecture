---
key: topology-and-naming
name: Topology and naming
type: principle
level: go-elemental
---

# Topology and naming

How Go Elemental repositories, modules, packages, and release tags are named, and the module
layout of each tier. The tiers themselves are defined by the organizational
[repository topology](../../../principles/repository-topology.md).

## Repository names

A repository is named for its language and its tier, so the name states what a reader will find
and where it belongs.

- **Core SDK** — `go-core`.
- **Application SDKs** — `go-<application>-sdk`: `go-web-sdk`. The `-sdk` suffix marks a
  development kit and ends no other tier's name.

  A capability sub-module is a nested directory named for the concern, in lower-case words
  joined by hyphens, never for the library it wraps: `rate-limit`, not `httprate`. Its package
  name is that name with the hyphens removed: `ratelimit`.
- **Infrastructure libraries** — `go-<technology>`, named for the technology the library
  presents as a service: `go-database`, `go-storage`, `go-observability`.

  A provider sub-module is a nested directory named for the target API or system, never the
  driver it wraps: `postgres`, not `pgx`.
- **Templates** — the application SDK's name with `-template`: `go-web-sdk-template`.
- **Reference architectures** — named for the application built on the SDK: `go-web-service`.

An [adjacent library](../../../principles/repository-topology.md#adjacent-libraries) belongs to
no tier, so it takes no `go-` prefix: it presents no one technology and is named for what it
does, as `sqlate` and `blobfs` are.

## Module layout per tier

- A core SDK repository is one Go module rooted at the repository, with no sub-modules. An
  application SDK repository is one base module rooted at the repository, with a sub-module for
  each capability whose third-party dependency the rest of the module should not compile:
  `go-web-sdk`'s `middleware/rate-limit`, which carries its HTTP rate-limiting library. These are
  not providers — an application SDK has none, and nothing is swapped — and the base module never
  imports one. Packages keep their own short names (`config`, `lifecycle`, `logging`; `web`,
  `middleware`), so the import path names the repository and the identifier in code stays the
  package's: `web.Server`, `database.New`.
- An infrastructure library is one base module rooted at the repository, presenting the standard
  tier, with each provider a nested sub-module that has its own `go.mod`. Keeping the base and
  its providers in one repository makes a change spanning them atomic: it is made and exercised
  together through `go.work` before any tag is cut.
- A template repository roots its module at `template/`, so generation copies exactly the
  subtree and never the repository's management layer.
- A reference architecture's root module is the repository's only releasable artifact. A tool
  the repository carries is a nested module of its own, so the tool's dependencies never enter
  the service's module: `go-web-service`'s `tools/slab`.
- A package is split from its parent by growth or by dependency weight, never by topic alone: a
  sub-package is earned when its contents are a growth area or when a dependency is heavy enough
  that the rest of the module should not compile it.

## Application-layer import direction

Every Go Elemental application — whatever its type — divides into three tiers with one import
direction: of its own module's packages, `cmd/*` imports only `internal/*`; `internal/*` is the
composition root and may import any root-level package; and nothing at the root level imports
`internal/*`. Outside its module, `cmd/*` may import the SDK packages the application composes
over: go-core for process setup, whose `process` package owns the signal context and the exit
path, and the application SDK, such as go-cli-sdk, whose `cli.Streams` value carries a CLI's
standard streams from its entrypoint into the composition root. A `cmd/*` binary is initialization alone: it constructs the application from
`internal/*` and never reaches past it into its own module.
`internal/*`'s own layers import each other and the root-level packages that make up the
application's domain and infrastructure, but the reverse never happens — a root-level package
importing back into `internal/*` would make domain code depend on how it is wired, not on what it
is.

Go's `internal/` visibility rule enforces only the outer edge: nothing outside the module can
import a package under `internal/`. It enforces nothing on the inner one — within the module, a
root-level package importing `internal/domain` compiles. The direction is a convention, kept by
review and package documentation, not by the compiler.

The composition root, `internal/app`, describes the application as one dependency graph on
go-core's `graph`, one file per layer of the architecture. Each layer file defines its layer's
nodes in one define function: one file the infrastructure services, one the administrative
services, one the domain services, and one the reactors, and the administrative and domain files
also build their mounts. `server.go` defines the request edge: the readiness the probes report,
the router, and the server. The list of mounts and the middleware stack are each a file of their
own, and a layer the application adds, such as go-web-service's telemetry, is one more file.
Beside them, `app.go` holds the `Nodes` value, one handle per node; `New`, which describes the
graph and cannot fail; and `Run`, which builds the graph and runs it under the lifecycle
coordinator. The layer files are the architecture's layer list, and extending the application
means defining a node in its layer's define function, a reactor's node also joining
`Nodes.Reactors`, while the signatures, the entrypoint, and `Run` stay untouched. A package that
the layers share and that must not import the composition root, the application's database
infrastructure for one, lives at the root level.

This is an Application-layer principle, independent of application type: a web service's
`internal/app` is one realization, and [a CLI composes its own `internal/app` the same way](cli-applications.md#the-composition-roots-layer-files). It
does not apply to a core SDK or an application SDK, which are libraries, not applications, and
have no composition root of their own.

## Release tags

- A module rooted at the repository is tagged `v<semver>`.
- A nested sub-module is tagged with its full path from the repository root as prefix:
  `postgres/v0.1.0`, `template/v0.1.0`, `middleware/rate-limit/v0.1.0`. The prefix is a
  resolution requirement: the Go module proxy resolves a subdirectory module's versions from
  tags prefixed with exactly that subdirectory, at any depth.
