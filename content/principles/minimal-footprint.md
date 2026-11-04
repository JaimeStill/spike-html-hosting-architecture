---
key: minimal-footprint
name: A minimal, deliberate dependency footprint
type: principle
level: architecture
---

# A minimal, deliberate dependency footprint

Every dependency is deliberately chosen. A dependency admits code the organization does not
author into what it ships. Its vulnerabilities become the program's vulnerabilities, and its
upgrade and deprecation cycles become technical debt on a schedule the organization does not
control. The bounding guideline: operate as close to the lowest level idiomatic standard
necessary to meet your requirements. Reach for the platform and its standard library first, and
adopt an established idiom above them only when a requirement demands it.

The principle states the [architecture](../architecture.md)'s supply-chain purpose in
principle form, and carries both of its dimensions: mitigating what a dependency admits, and
establishing the deliberate maintenance boundaries that keep a dependency set current. A
handful of deliberately sourced dependencies can be held pinned and current the week upstream
releases; fifty cannot. [Rolling currency](rolling-currency.md) states that second dimension as
its own principle, and the two justify each other.

Heavy dependencies, such as vendor SDKs and database drivers, are isolated behind sub-modules
that present a light interface. A consumer that needs only the interface never compiles the
weight. [Service tiers](service-tiers.md) applies this to infrastructure libraries: the base
module defines the standard tier, and each provider sub-module pins its own vendor library.

Where the dependency line is drawn, meaning what a base module may take at all, is not fixed
at the architecture level. Each standard draws its own line as part of its definition, and a
module may enhance it, tightening it further for its own scope and never loosening it.
