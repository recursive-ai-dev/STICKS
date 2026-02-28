const BASE_CHARACTER_TEMPLATE = {
  sprite: {
    size: 100,
    scale: 1,
    directions: ["right", "left", "front", "back"],
    frameCount: 6,
    lineWidth: 2,
  },
  anchors: {
    headY: 28,
    bodyTop: 42,
    bodyBottom: 74,
    groundY: 90,
    shoulderOffset: 6,
    armLength: 18,
    legLength: 22,
  },
  animation: {
    bobFrequency: 2,
    bobAmplitudeRange: [0.6, 1.1],
    armSwingDegrees: [14, 24],
    legSwingDegrees: [12, 18],
    strideRange: [12, 18],
  },
};

function createGenreTemplate(overrides = {}) {
  return {
    sprite: { ...BASE_CHARACTER_TEMPLATE.sprite, ...(overrides.sprite || {}) },
    anchors: { ...BASE_CHARACTER_TEMPLATE.anchors, ...(overrides.anchors || {}) },
    animation: {
      ...BASE_CHARACTER_TEMPLATE.animation,
      ...(overrides.animation || {}),
    },
  };
}

module.exports = {
  BASE_CHARACTER_TEMPLATE,
  createGenreTemplate,
};
