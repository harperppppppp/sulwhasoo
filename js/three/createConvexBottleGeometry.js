import * as THREE from 'three';

function signedPower(value, power) {
  return Math.sign(value) * Math.abs(value) ** power;
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

export function sampleProfileAt(profile, y) {
  if (y <= profile[0].y) return { halfWidth: profile[0].halfWidth, halfDepth: profile[0].halfDepth };
  const last = profile.at(-1);
  if (y >= last.y) return { halfWidth: last.halfWidth, halfDepth: last.halfDepth };

  for (let index = 0; index < profile.length - 1; index += 1) {
    const start = profile[index];
    const end = profile[index + 1];
    if (y > end.y) continue;
    const progress = (y - start.y) / (end.y - start.y);
    return {
      halfWidth: THREE.MathUtils.lerp(start.halfWidth, end.halfWidth, progress),
      halfDepth: THREE.MathUtils.lerp(start.halfDepth, end.halfDepth, progress),
    };
  }

  return { halfWidth: last.halfWidth, halfDepth: last.halfDepth };
}

function surfacePoint(halfWidth, halfDepth, angle, crossSectionPower) {
  return {
    x: halfWidth * signedPower(Math.sin(angle), crossSectionPower),
    z: halfDepth * signedPower(Math.cos(angle), crossSectionPower),
  };
}

/**
 * Angle is a poor parameter for a superellipse: near the front face x moves far faster
 * than the angle does, which magnifies whatever sits at the centre of a decal. Build an
 * arc-length table once so the label can be laid out in even surface steps instead.
 */
function buildArcTable(halfWidth, halfDepth, crossSectionPower, steps = 1024) {
  const limit = Math.PI / 2;
  const angles = [0];
  const arcs = [0];
  let arc = 0;
  let previous = surfacePoint(halfWidth, halfDepth, 0, crossSectionPower);

  for (let index = 1; index <= steps; index += 1) {
    const angle = (index / steps) * limit;
    const point = surfacePoint(halfWidth, halfDepth, angle, crossSectionPower);
    arc += Math.hypot(point.x - previous.x, point.z - previous.z);
    previous = point;
    angles.push(angle);
    arcs.push(arc);
  }

  return { angles, arcs, total: arc };
}

function angleAtArc(table, targetArc) {
  if (targetArc <= 0) return 0;
  if (targetArc >= table.total) return table.angles.at(-1);

  let low = 0;
  let high = table.arcs.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (table.arcs[middle] <= targetArc) low = middle;
    else high = middle;
  }

  const span = table.arcs[high] - table.arcs[low] || 1;
  const progress = (targetArc - table.arcs[low]) / span;
  return THREE.MathUtils.lerp(table.angles[low], table.angles[high], progress);
}

/**
 * Wraps a rectangular label onto the bottle shell so printed copy follows the real
 * surface instead of floating on a flat plane. Width is measured as arc length across
 * the front face, which is how the reference wordmark reaches the silhouette edges.
 */
export function createWrappedDecalGeometry(profile, options) {
  const { width, height, centerY } = options;
  const crossSectionExponent = options.crossSectionExponent || 2;
  const crossSectionPower = 2 / crossSectionExponent;
  const offset = options.offset ?? 0.004;
  const segmentsX = options.segmentsX || 48;
  const segmentsY = options.segmentsY || 12;

  const center = sampleProfileAt(profile, centerY);
  const arcTable = buildArcTable(center.halfWidth, center.halfDepth, crossSectionPower);
  const columnAngles = [];
  for (let column = 0; column <= segmentsX; column += 1) {
    const arcOffset = (column / segmentsX - 0.5) * width;
    columnAngles.push(Math.sign(arcOffset) * angleAtArc(arcTable, Math.abs(arcOffset)));
  }

  const positions = [];
  const uvs = [];
  const indices = [];

  for (let row = 0; row <= segmentsY; row += 1) {
    const v = row / segmentsY;
    const y = centerY - height / 2 + v * height;
    const ring = sampleProfileAt(profile, y);

    for (let column = 0; column <= segmentsX; column += 1) {
      const u = column / segmentsX;
      const { x, z } = surfacePoint(ring.halfWidth, ring.halfDepth, columnAngles[column], crossSectionPower);
      const gradientX = (crossSectionExponent / ring.halfWidth)
        * Math.abs(x / ring.halfWidth) ** (crossSectionExponent - 1) * Math.sign(x || 1);
      const gradientZ = (crossSectionExponent / ring.halfDepth)
        * Math.abs(z / ring.halfDepth) ** (crossSectionExponent - 1) * Math.sign(z || 1);
      const gradientLength = Math.hypot(gradientX, gradientZ) || 1;
      positions.push(x + (gradientX / gradientLength) * offset, y, z + (gradientZ / gradientLength) * offset);
      uvs.push(u, v);
    }
  }

  const stride = segmentsX + 1;
  for (let row = 0; row < segmentsY; row += 1) {
    for (let column = 0; column < segmentsX; column += 1) {
      const lower = row * stride + column;
      const upper = lower + stride;
      indices.push(lower, lower + 1, upper, lower + 1, upper + 1, upper);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.parameters = { width, height };
  return geometry;
}

function sampleProfile(profile, segmentsPerSection) {
  const rings = [];

  for (let index = 0; index < profile.length - 1; index += 1) {
    const start = profile[index];
    const end = profile[index + 1];

    for (let step = 0; step < segmentsPerSection; step += 1) {
      const progress = smoothstep(step / segmentsPerSection);
      rings.push({
        y: THREE.MathUtils.lerp(start.y, end.y, progress),
        halfWidth: THREE.MathUtils.lerp(start.halfWidth, end.halfWidth, progress),
        halfDepth: THREE.MathUtils.lerp(start.halfDepth, end.halfDepth, progress),
      });
    }
  }

  rings.push(profile.at(-1));
  return rings;
}

export function createConvexBottleGeometry(profile, options = {}) {
  const radialSegments = options.radialSegments || 64;
  const segmentsPerSection = options.segmentsPerSection || 6;
  const crossSectionExponent = options.crossSectionExponent || 2;
  const crossSectionPower = 2 / crossSectionExponent;
  const rings = sampleProfile(profile, segmentsPerSection);
  const positions = [];
  const uvs = [];
  const indices = [];

  rings.forEach((ring, ringIndex) => {
    for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
      const angle = (radialIndex / radialSegments) * Math.PI * 2;
      const sinAngle = Math.sin(angle);
      const cosAngle = Math.cos(angle);
      positions.push(
        ring.halfWidth * signedPower(sinAngle, crossSectionPower),
        ring.y,
        ring.halfDepth * signedPower(cosAngle, crossSectionPower),
      );
      uvs.push(radialIndex / radialSegments, ringIndex / (rings.length - 1));
    }
  });

  for (let ringIndex = 0; ringIndex < rings.length - 1; ringIndex += 1) {
    const lowerOffset = ringIndex * radialSegments;
    const upperOffset = (ringIndex + 1) * radialSegments;

    for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
      const next = (radialIndex + 1) % radialSegments;
      const lower = lowerOffset + radialIndex;
      const lowerNext = lowerOffset + next;
      const upper = upperOffset + radialIndex;
      const upperNext = upperOffset + next;
      indices.push(lower, lowerNext, upper, lowerNext, upperNext, upper);
    }
  }

  const bottomCenter = positions.length / 3;
  positions.push(0, rings[0].y, 0);
  uvs.push(0.5, 0.5);
  const topCenter = positions.length / 3;
  positions.push(0, rings.at(-1).y, 0);
  uvs.push(0.5, 0.5);
  const topOffset = (rings.length - 1) * radialSegments;

  for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
    const next = (radialIndex + 1) % radialSegments;
    indices.push(bottomCenter, next, radialIndex);
    indices.push(topCenter, topOffset + radialIndex, topOffset + next);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
