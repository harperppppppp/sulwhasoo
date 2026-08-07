# Projection route

- Decision: `not-required` for the runtime surface.
- Reason: the source is a front-only product photo with a black studio background and baked highlights. Projecting those pixels would bake lighting and background contamination into a rotating object.
- The visible gray product copy and orange wordmark are reconstructed as transparent generated canvas decals attached to the front shell. Body/cap albedo and PBR response are authored independently so side/rear orbit views remain coherent.
- Hidden side and rear artwork are left blank and explicitly treated as inferred, not copied.

