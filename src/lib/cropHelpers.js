// Crop helpers — version 2 crops use relative zoom (1.0 = cover) + normalized offsets.
// Legacy crops (no version) used absolute scale from the editor's fitScale(),
// which when applied as CSS transform on object-cover images caused them to shrink.
// For legacy crops we fall back to plain object-cover (no transform) so the image
// always fills the container.

export function getBannerCropStyle(crop) {
  if (!crop) return {};
  if (crop.version === 2) {
    const zoom = Math.max(1, crop.zoom || 1);
    return {
      transform: `scale(${zoom}) translate(${crop.offsetXPct || 0}%, ${crop.offsetYPct || 0}%)`,
      transformOrigin: "center center",
    };
  }
  // Legacy: absolute scale — fallback to object-cover (no transform)
  return {};
}

export function getAvatarCropStyle(crop) {
  if (!crop) return {};
  if (crop.version === 2) {
    const zoom = Math.max(1, crop.zoom || 1);
    return {
      transform: `scale(${zoom}) translate(${crop.offsetXPct || 0}%, ${crop.offsetYPct || 0}%)`,
      transformOrigin: "center center",
    };
  }
  // Legacy: fallback to object-cover
  return {};
}