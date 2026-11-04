---
key: resolution
name: Resolution matches purpose
type: principle
level: architecture
---

# Resolution matches purpose

Software interfaces with an external technology at the resolution its purpose requires: no
coarser, which would be a wrapper it does not need, and no finer, which would be a dependency on
details that do not concern it. Where software does reach a finer resolution, it wraps what it
reaches and presents its own, coarser interface upward, so awareness of the finer detail runs
downward only.

The organizing pattern is the one a layered standard library already follows. Go's `net/http` is
written over `net`, `net` over `syscall`; a package that needs an HTTP client uses `net/http`,
neither a framework above it nor `syscall` beneath it. Each layer that reaches lower wraps that
reach and presents a coarser interface to the layer above.

Interfacing with an external technology (a database engine, an object store, a telemetry
pipeline) follows the same rule. The organization's infrastructure libraries offer each
technology at two resolutions ([service tiers](service-tiers.md)), and a consumer interfaces at
the resolution its purpose requires. The libraries are layered so both resolutions are
reachable, and the software that consumes them is layered so the finer resolution never leaks
upward. This is "the lowest practical level of abstraction" made precise: practical means
matched to the purpose.
