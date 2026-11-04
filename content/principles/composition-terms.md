---
key: composition-terms
name: Composition terms
type: principle
level: architecture
---

# Composition terms

These terms name how a [composition root](composition-root.md) describes an application's
dependencies and how the application layer's lifecycle runs them. Every application type uses
the same terms, so a CLI command and a web service describe and run their dependencies the same
way, and a standard keeps the terms in its language's idiom.

## The terms

- **Graph**: the composition root's description of the application's dependencies, as nodes.
  Describing a graph constructs nothing. Only the composition root, its test fixtures, and the
  SDKs that run a graph import `graph`. Every package below the root takes its dependencies as
  plain values through its constructor and never sees a node, a scope, or the system, so the
  graph's API can change without reaching them.
- **Node**: one dependency in the graph, a name and a constructor. A constructor declares the
  nodes it depends on by using them, and those uses are the graph's edges.
- **System**: what one build of the graph constructs. A build starts from a set of root nodes and
  constructs each node they reach once, and no other node, so a build of a subset of the roots
  brings up only that subset's dependencies.
- **Layer**: a set of a system's nodes whose dependencies all sit in lower layers, so the nodes of
  one layer can start together once every lower layer has started. A graph computes the layers
  from its edges, so the composition root does not assign them. A layer in this sense is a startup
  layer, distinct from the architecture's layers (the application layer, the domain layer) that a
  composition root's files follow.
- **Subsystem**: a node whose value takes part in the lifecycle: it starts, shuts down, or both. A
  node whose value takes no part, such as a configuration value, is still a node, and the nodes
  that depend on it still receive its value.
- **Coordinator**: the application layer's lifecycle executor. It runs one system once: it starts
  the layers lowest first, each layer's subsystems concurrently, and on every path, success,
  failure, or cancellation, shuts them down in reverse.
- **Exec and Run**: the coordinator's two forms. Exec starts the system, runs one function, and
  shuts down; a CLI command uses it. Run starts the system, serves until its context ends, and
  shuts down; a long-running service uses it.

## Retired and kept terms

- **Stage** is retired. A stage is a startup position the composition root assigns by number, and
  a hand-assigned order can disagree with the dependencies it encodes. A layer is computed from
  those dependencies, so it cannot.
- **Service** keeps its meanings for the deployed application, such as a web service, and for the
  infrastructure tiers, such as an infrastructure service. It does not name a subsystem.

## Why one graph serves every application type

A graph lets each entry point build only what it reaches. A CLI runs one command per process, so
a command that declares only the database never constructs the object store, and help or a usage
error constructs nothing. A web service builds every node its serving path reaches and runs that
system for the process lifetime. One coordinator runs both, and
[go-core](https://github.com/standards-lab/go-core)'s `graph` and `lifecycle` realize it:
[go-web-service](https://github.com/standards-lab/go-web-service) describes its composition root
as one graph on that coordinator, and the CLI application type builds on the same one.

How a standard realizes participation, startup, and shutdown is stated at the standard's level:
Go Elemental's is [Lifecycle and context ownership](../standards/go-elemental/principles/lifecycle-and-context.md).
