---
key: repository-topology
name: Repository topology
type: principle
level: architecture
---

# Repository topology

A repository is scoped to one concern of its standard. A reader who opens an infrastructure
library sees the organization's conventions for that technology and nothing else, and a consumer
who depends on it pulls in exactly one service. The organization defines five repository tiers,
and every member repository of a standard belongs to exactly one:

- **Core SDK** — the common primitives useful across all of a standard's application types:
  configuration, process lifecycle, logging. One repository per standard, at the bottom of the
  dependency graph, with no knowledge of its dependents.
- **Application SDKs** — one repository per application type, defining what makes that type of
  program: a web service SDK, a command-line SDK, each created once a consumer warrants it. An
  application SDK builds on the core SDK and never on an infrastructure library.
- **Infrastructure libraries** — one repository per external technology, presenting that
  technology as a service in two tiers ([service tiers](service-tiers.md)): a base module
  defining the standard tier, with providers as independently versioned sub-modules. An
  infrastructure library builds on the core SDK and never on an application SDK.
- **Templates** — one repository per application SDK. A template scaffolds an initial
  application of its SDK's type: minimal, runnable, and free of any provider, so a generated
  application chooses its own infrastructure.
- **Reference architectures** — the holistic reference for an application SDK: one application
  composing the SDK with the services a production system of its type requires, on one declared
  stack.

A standard's adjacent libraries stand beside the five tiers rather than in one, and the
agent-tooling repositories and the organization-context repositories stand outside them.

## Adjacent libraries

A module repository may stand adjacent to a standard rather than in it: a standalone library any
project on the standard's technology can adopt on its own. It is not an infrastructure library,
because it presents no one external technology as a service, and it keeps its guide in its own
repository. An adjacent library follows the standard's engineering principles (naming, module
layout, releases and CI, tests and documentation) without being a member of any tier. It is
consumed downward like any library: a tier may depend on it, and it depends on no tier, though
it may build on another adjacent library.

## Dependencies run downward, one tier at a time

A reference architecture depends on its application SDK, the infrastructure libraries, adjacent
libraries, and providers it composes, and the core SDK. A template depends on the core SDK and its
one application SDK. An application SDK and an infrastructure library never depend on each other;
both depend on the core SDK and on no other tier. The core SDK depends only on what its standard's
dependency line admits. Knowledge follows the same direction: a repository documents its
dependencies and never names its dependents ([dependencies flow downward
only](downward-dependencies.md)).

## Versioning across the tiers

Each repository releases independently ([independent releases](independent-releases.md)). The
core SDK is a dependency shared by every repository above it; a change to it releases first and is
taken up by the coordinated releases that follow.
