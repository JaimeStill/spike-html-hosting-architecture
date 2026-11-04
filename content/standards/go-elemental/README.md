---
key: go-elemental
name: Go Elemental
type: standard
architecture: elemental-architecture
status: active
---

# Go Elemental

The Go implementation of the [Elemental Architecture](../../architecture.md). Go Elemental
implements the architecture on the Go standard library, and its goal is to demonstrate what the
platform provides by itself: a complete reference architecture with the smallest deliberate
dependency surface, expressing the architecture's supply-chain purpose in its strictest form.

## The dependency line

Every Go Elemental module follows one dependency line: bottom-up, no provider in a base, kept
light. The [Dependencies](principles/dependencies.md) principle states it per tier, along with
when a capability is written in-house and when a library is sourced.

The declared stack of the standard's reference architecture selects one provider per service;
for SQL that provider is Postgres.

## Principles

The conventions every Go Elemental repository shares, enhancing the
[architecture principles](../../principles/README.md). A member repository may enhance one
further, stating the enhancement beside its link to the principle.

- [Dependencies](principles/dependencies.md) states the dependency line applied to each
  repository tier, when a library is sourced and where its weight is isolated, and how peers
  compose.
- [Baseline-standard ownership](principles/baseline-standards.md) states that a library takes
  an external standard as its baseline and never hardens organizational convention or policy
  into its contract, and that a consumer introduces a type only when it is needed.
- [Topology and naming](principles/topology-and-naming.md) states how repositories, modules,
  packages, and release tags are named, the module layout of each tier, and the composition
  root's layout.
- [Lifecycle and context ownership](principles/lifecycle-and-context.md) states the process
  lifecycle every web service follows, which package owns the signal context, how a value takes
  part in the lifecycle, and the wiring rule.
- [Domain package files](principles/domain-files.md) states the file each part of a domain
  package lives in, how a CLI splits a domain's API by dependency profile, and how a CLI domain's
  commands are shaped.
- [CLI applications](principles/cli-applications.md) states the conventions particular to
  a command-line tool: the composition root's layer files, a command building only the nodes it
  declares, exit codes and command words, and opt-in scenarios.
- [Timeouts and deadlines](principles/timeouts.md) states how a service bounds a request that
  moves a large body through a store: tight server timeouts with size-derived transfer
  deadlines, the store's per-try and idle bounds, and which party a timeout is charged to.
- [Times in UTC](principles/utc-times.md) states that every time a library returns is in
  `time.UTC`, the columns and read path that keep it so, log record times, how tests prove it,
  and where a caller converts.
- [Tests and documentation](principles/tests-and-docs.md) states the black-box unit tier and
  where its helpers and a composition root's fixtures live, the integration and acceptance suites
  and where each runs, the harness rules, and `doc.go` ownership of API documentation.
- [Releases and CI](principles/release-and-ci.md) states the one check every repository runs,
  currency and upgrade beside it, artifact-keyed tags, changelog discipline, and how a release
  lands.
- [DSL-driven services](principles/dsl-driven-services.md) states how a service whose
  expressive content is a language of its own is integrated, and the conventions the
  standard's authored SQL declares.

## Member repositories

By tier of the [repository topology](../../principles/repository-topology.md). Each
repository documents itself: its README states its place in the standard and the principles it
enhances, and its package documentation states its API.

| Tier | Repository | Purpose |
|------|------------|---------|
| Core SDK | [go-core](https://github.com/standards-lab/go-core) | The common primitives every Go Elemental application type uses: layered configuration, the process lifecycle, logging, the process sequence with its integration toolkit, the reactor that joins a source of occurrences to a handler, and the CloudEvents event envelope a domain raises its events in. |
| Infrastructure libraries | [go-database](https://github.com/standards-lab/go-database) | The SQL infrastructure service: the connection pool with its configuration, lifecycle, and readiness, the database admin service, the general sweeper (`sweep`), which runs a service's reclaimers as one reactor under a per-reclaimer advisory lock, and the PostgreSQL provider as a sub-module. |
| Infrastructure libraries | [go-messaging](https://github.com/standards-lab/go-messaging) | The messaging infrastructure service: the broker-agnostic contract a service emits events and runs reactors on, the transactional outbox and the idempotent inbox, with the PostgreSQL engine, which holds the outbox and inbox retentions, and the NATS JetStream provider as sub-modules. |
| Infrastructure libraries | [go-observability](https://github.com/standards-lab/go-observability) | The observability infrastructure service: OpenTelemetry configuration and process lifecycle, the trace-correlating log handler, HTTP server middleware, and the request-ID source function, with the OTLP exporters as a sub-module. |
| Infrastructure libraries | [go-storage](https://github.com/standards-lab/go-storage) | The object storage infrastructure service: the standard-tier client interface over the operations Azure Blob and S3 share, the lifecycle wrapper that bounds and gates it, and the conformance suite a provider proves itself against, with the Azure Blob and S3 providers as sub-modules. |
| Application SDKs | [go-web-sdk](https://github.com/standards-lab/go-web-sdk) | The SDK for Go Elemental web services: the server, routing, problem responses, paginated reads, the probes, middleware, and the integration toolkit. |
| Application SDKs | [go-cli-sdk](https://github.com/standards-lab/go-cli-sdk) | The SDK for Go Elemental command-line tools: a dispatcher on the standard library's `flag` whose commands build only the graph nodes they declare, and the scenario runner. |
| Templates | [go-web-sdk-template](https://github.com/standards-lab/go-web-sdk-template) | Scaffolds an initial Go Elemental web service, engine-free, with the composition root as one file per layer and the integration tier in place. |
| Templates | [go-cli-sdk-template](https://github.com/standards-lab/go-cli-sdk-template) | Scaffolds an initial Go Elemental CLI, engine-free, with the composition root as one file per layer and the integration tier in place. |
| Reference architectures | [go-web-service](https://github.com/standards-lab/go-web-service) | The holistic Go Elemental web service reference, grown in documented layers on the declared stack; versionless until its 1.0. |

Two libraries stand [adjacent](../../principles/repository-topology.md#adjacent-libraries) to
the standard rather than in it: standalone libraries any Go project can adopt on its own, each
with its guide in its own repository.

- [sqlate](https://github.com/standards-lab/sqlate) is the SQL templating library the
  standard's libraries consume: authored `.sql` files made dynamic and composable, with the
  PostgreSQL dialect and the conventions linter as sub-modules.
- [blobfs](https://github.com/standards-lab/blobfs) is a tree of directories and file metadata
  in SQL over any object store, built on sqlate, with the PostgreSQL engine and its migration
  set as a sub-module.
