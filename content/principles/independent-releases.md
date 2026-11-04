---
key: independent-releases
name: Independent, artifact-keyed releases
type: principle
level: architecture
---

# Independent, artifact-keyed releases

Every standardized repository releases on its own tags, and every releasable artifact within a
repository is keyed to its own tag namespace: a base module, a provider sub-module, and a
template each version and release on their own schedule. No umbrella version spans them, so a
consumer taking one artifact is never entangled with another's version.

A consumer pins the releases it was validated against. Because the tiers of the [repository
topology](repository-topology.md) co-evolve, a library change and the application change that
proves it release as a coordinated snapshot: the library releases first, and the consumer's
release records the versions it validated.

