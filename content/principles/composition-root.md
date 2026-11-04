---
key: composition-root
name: The composition root
type: principle
level: architecture
---

# The composition root

Every application has exactly one composition root: the package where the application assembles
its dependencies. It constructs the infrastructure services, wires the transport, and declares
how they compose. Nothing else in the application constructs a dependency; everything else
receives its dependencies from the composition root.

The composition root sits directly beneath the application's entrypoint, its one neighbor above
it. The entrypoint owns the process; the composition root owns the composition.

## It declares; it does not execute

The composition root's output is a declared composition, and execution belongs to the
[application layer](../architecture.md): the root's run call hands the declaration to the
lifecycle coordinator, which executes it. The root states which infrastructure services exist and
what each depends on, which orders their startup in layers; which domain-service modules mount on
which routes; which Reactors run alongside the transport; and which middleware wraps it. A root is
not limited to one runner: the transport and any Reactors are subsystems of the same coordinator,
ordered in layers like any other. Keeping the root declarative keeps the application's entire
composition readable in one place: a reviewer can see everything the application is made of
without tracing execution. [Composition terms](composition-terms.md) defines the graph, layer,
subsystem, and coordinator this page uses.

## It is the boundary for provider imports

The composition root is where the [service tiers](service-tiers.md) import boundary anchors. Only
the composition root, the application's binaries, and the packages its design documentation
declares import a provider. The root constructs the provider and passes the resulting service
downward as an ordinary dependency, so every package below it stays provider-free and works
against the standard tier.

## The entrypoint owns process entry and exit

The entrypoint is minimal: process-level concerns only, nothing else. It traps the process
signals and derives the root context, passes that context to the composition root's run call,
and exits with the code that call returns.

A web service's entrypoint also loads the configuration and hands it to the composition root
before the run. A failure before the run, a configuration that does not load or a composition that
does not assemble, is reported by the entrypoint and becomes its exit code. The web service's
composition root receives the configuration and never loads it; subsystems receive the values they
need, never the configuration itself. This configuration rule applies to web services.

A CLI's configuration is a node of its graph instead. Its entrypoint loads nothing, and the
configuration is read only when a build reaches its node, so help, a usage error, or a command
that declares no node reads no configuration and cannot fail on it. A CLI runs one command per
process, and only the command knows which configuration it needs.

The entrypoint reaches the composition root only through its construction and its run call, and
nothing below the composition root reaches back up to it. Extending an application means editing
its composition root; the entrypoint stays untouched. What sits below the composition root, the
application's domain and infrastructure packages, stays the author's decision.

## It fails loudly, at startup

The composition root is written once and runs at boot, so every wiring mistake fails there,
immediately and loudly: a duplicate registration, a missing dependency, a malformed route
prefix. A loud failure at startup is cheap; the same mistake surfacing silently in production is
not. Implementations enforce this with panics at construction time, and a wiring mistake the
language can surface at compile time — a dependency that is a concrete field rather than a
looked-up entry — fails earlier still; the principle sets the latest acceptable moment, not the
preferred one.
