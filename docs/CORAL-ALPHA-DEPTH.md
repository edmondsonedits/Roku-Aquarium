# Coral alpha layers and closed fish shells

The six coarse occlusion polygons are replaced by an actual transparent reef asset retaining the birthday plaque and coral arrangement. Water is a separate blue gradient behind the reef. Rear fish draw behind the alpha silhouette; near fish draw in front. A separately generated coral cluster and taller swaying ribbon seaweed sit closer with stronger parallax.

The old fish mesh comprised unjoined sheets with zero-thickness tails. It now uses a closed 64×48 silhouette-cell mesh, joined side walls and thin fin volume. Independent UVs sample painted artwork on the side walls. Saved drawings are never modified. Deliberate transparent holes remain holes. Faint/sub-cell art that cannot yield visible volume triggers the original Canvas fallback instead of disappearing.

Depth paths rise while crossing the reef plane, then descend behind/in front. The rise runs after school separation; review found the previous placement was undone by its y clamp, now covered by a regression test.

## Verification and review
Two independent source reviewers checked geometry and renderer integration. Reviews found and corrected the post-separation clamp and faint-art disappearance defects. Geometry tests verify welded closed edges, thin fin thickness, indices/budget, original-data preservation, and fallback. Motion tests check depth, heading, reduced motion and production-order rise. Typecheck, lint and production build are rerun for the final reconstruction.

The execution workspace reset during delivery, so assets/source were recovered, reviewed and tested again in the persistent workspace. Both supplied clipping images were identical screenshots. Actual cut may have involved both old polygon masks and open mesh edges.

## Limits
Generated cutouts are not pixel-identical segmentation. Source is 2172×724, not native 4K. This is layered 2.5D plus shallow drawing-textured volume, not a recovered 3D reef or species-specific sculpt. Geometric watertightness does not prove every rendered alpha edge is hole-free; 40-fish GPU performance and precise appearance remain unverified. Chromium was retried in the replacement executor and still failed at socket permissions before loading a page. No visual browser pass is claimed.

Original videos, fish saves and Windows migration startup fix are preserved. No user computer or security settings changed.
