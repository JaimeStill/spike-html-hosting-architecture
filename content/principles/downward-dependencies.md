---
key: downward-dependencies
name: Dependencies flow downward only
type: principle
level: architecture
---

# Dependencies flow downward only

A repository depends only on repositories at lower tiers of the [repository
topology](repository-topology.md), and knowledge of a dependency runs the same direction: a
repository names its dependencies; no repository knows its dependents. Interfaces are defined
where they are consumed: a library declares the contract it needs from its dependencies, never
the contract a consumer might want from it, and a repository documents its dependencies without
naming its dependents.

