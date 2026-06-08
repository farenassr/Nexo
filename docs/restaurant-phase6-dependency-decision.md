# Restaurant Phase 6 Dependency Decision

Phase 6 uses DOM/CSS positioning with pointer events for floor-plan editing.

React Konva or another canvas library is not added in this phase because the
current Phase 4 API already stores rectangular layout primitives, and the MVP
editor only needs table selection, drag movement, property edits, area zones,
status coloring and save layout. DOM/CSS keeps the bundle smaller, preserves
native text/tooltips/accessibility affordances, and fits the existing React
component structure.

Revisit a canvas dependency only if a future phase requires dense drag
performance, freeform drawing, import/export tooling, path editing or
multi-select transforms that are awkward to maintain with DOM elements.
