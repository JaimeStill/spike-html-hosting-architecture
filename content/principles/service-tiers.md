---
key: service-tiers
name: Service tiers
type: principle
level: architecture
---

# Service tiers

An infrastructure library presents its technology (a database engine, an object store, a telemetry
pipeline) as a service in two tiers, and a consumer targets one tier or the other per use. A
consumer is either exercising a standard feature, usable across any provider of the technology, or a
feature native to one implementation. There is no third case to reason about.

- **Standard** — the interface every provider of the technology implements, and it is exactly
  the technology's common standard:
  - SQL in ISO/IEC 9075
  - HTTP in RFC 9110 and RFC 9457
  - observability in OpenTelemetry

  The standard tier stays compliant with that standard and does not grow past it. Where no
  formal standard exists, as in object storage, the organization establishes the common
  interface for that technology itself: the operations the target APIs share, kept minimal. The
  tier is never the a-priori intersection of providers, which neuters it, nor the union of their
  features, which bloats it.
- **Native** — the provider's own API, reached through the handle the library exposes: the pool
  behind a database wrapper, an object store's vendor operations. A feature that several
  providers happen to share but no standard defines is still native. Native use is first-class;
  it is how an application reaches the features that make a technology worth choosing, and the
  standard tier never asks an application to forgo them.

## Native use is wrapped beneath standard use

What keeps native use from spreading a provider across a codebase is the [resolution
rule](resolution.md) applied to provider imports. An application's
[composition root](composition-root.md) is the package where it assembles its dependencies: it
constructs the providers, the pools, the loggers, and the configuration, and passes them to the
packages that use them. A package that interfaces at the native tier wraps that use and presents
the standard tier upward: the domain package that owns engine-specific SQL exposes plain queries
and commands to its callers. Only the composition root, the binaries, and the packages the
design documentation declares import a provider; every other package works against the standard
tier and stays provider-free.

The boundary is declared in the application's design documentation and held in review: it is a
discipline, not a lint step. The discipline belongs to the consumer; a library never names the
consumers it protects. The consequence is that a port to another provider is a list of packages:
the composition root, the migrations, and the domain packages that declare native use. Nothing
has to be discovered.

## Three classes of technology, by swap cost

How much work moving between providers of a technology requires is declared, never assumed: the
consuming application's design documentation classes each technology it composes and states what
changes when the provider does.

- **Interchangeable** — moving providers is a configuration change. The application exercises
  the service only through the standard tier: a telemetry backend behind OpenTelemetry, which
  changes only the collector's configuration.
- **Interchangeable with review** — moving providers is a configuration change plus a review of
  the behavior the common API leaves unstated: the consistency of an object store, and the ETag
  it mints.
- **Schema-bound** — moving providers is a port. The application owns provider-specific
  artifacts the library cannot abstract: a SQL schema and the domain SQL that reads and writes
  it.

Full interchangeability is a limit the classes approach; no technology fully reaches it, and the
declaration is what makes the difference legible.

## Providers are adapters behind one interface

The library reaches every provider of a technology through one interface per capability, and a
provider is an adapter beneath that interface. The interface is defined where it is consumed,
in the library, and a new provider is a new adapter, never a change to the interface. Adapters
isolate vendor churn: a provider's SDK changes without the interface changing.

The organization's SQL support is the reference pattern. The dialect interface is defined in
the [SQL templating library](https://github.com/standards-lab/sqlate) and implemented by each
engine sub-module, and the database infrastructure library constructs the pool over the
provider and supplies no dialect of its own.

## Providers and platforms

A provider is one implementation of one target API, and the boundary between self-hosted and
managed lies inside it: a Postgres provider covers a local container and a managed PostgreSQL
service alike, through its connection string; an Azure Blob provider covers Azurite and Azure
Blob Storage. Moving between providers of the same technology costs what the service's class
says it costs.

"Platform-agnostic" in this organization refers to the deployment platform: one artifact
deployable on any cloud with any CI system, differing only in parameters. It does not claim that
an application runs on any provider of a technology by configuration; that claim is made per
service, by class.
