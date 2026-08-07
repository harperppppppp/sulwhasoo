import * as THREE from 'three';
import { createConvexBottleGeometry, createWrappedDecalGeometry } from './createConvexBottleGeometry.js';

// Profiles are traced from sul2/img/sul.png at 1 unit = 354.5 reference pixels.
// Reference silhouette, measured by luminance bounding box on the source photo:
// whole bottle 1952x5577 px (width/height 0.350), cap 505 px of the 1594 px height,
// body base 0.73 of the shoulder, cap widest just under the dome.
const BODY_EXPONENT = 3.15;
const CAP_EXPONENT = 3.0;

// Widths below are read straight off the reference silhouette, sampled every 2.5% of
// bottle height and normalised to the widest row. The body swells to its maximum at the
// vertical midpoint - not at the shoulder - and the cap is widest just under its crown.
const BODY_PROFILE = [
  { y: -1.720, halfWidth: 0.400, halfDepth: 0.300 },
  { y: -1.690, halfWidth: 0.470, halfDepth: 0.345 },
  { y: -1.610, halfWidth: 0.506, halfDepth: 0.367 },
  { y: -1.499, halfWidth: 0.534, halfDepth: 0.388 },
  { y: -1.388, halfWidth: 0.560, halfDepth: 0.407 },
  { y: -1.277, halfWidth: 0.586, halfDepth: 0.425 },
  { y: -1.055, halfWidth: 0.632, halfDepth: 0.459 },
  { y: -0.833, halfWidth: 0.673, halfDepth: 0.489 },
  { y: -0.611, halfWidth: 0.710, halfDepth: 0.515 },
  { y: -0.390, halfWidth: 0.738, halfDepth: 0.536 },
  { y: -0.168, halfWidth: 0.759, halfDepth: 0.551 },
  { y: 0.054, halfWidth: 0.773, halfDepth: 0.561 },
  { y: 0.276, halfWidth: 0.780, halfDepth: 0.566 },
  { y: 0.498, halfWidth: 0.786, halfDepth: 0.571 },
  { y: 0.719, halfWidth: 0.781, halfDepth: 0.567 },
  { y: 0.830, halfWidth: 0.773, halfDepth: 0.561 },
  { y: 0.941, halfWidth: 0.764, halfDepth: 0.555 },
  { y: 1.053, halfWidth: 0.750, halfDepth: 0.545 },
  { y: 1.164, halfWidth: 0.729, halfDepth: 0.529 },
  { y: 1.220, halfWidth: 0.645, halfDepth: 0.468 },
  { y: 1.274, halfWidth: 0.538, halfDepth: 0.391 },
  { y: 1.300, halfWidth: 0.470, halfDepth: 0.341 },
  { y: 1.330, halfWidth: 0.360, halfDepth: 0.285 },
];

const CAP_PROFILE = [
  { y: -0.690, halfWidth: 0.405, halfDepth: 0.294 },
  { y: -0.635, halfWidth: 0.412, halfDepth: 0.299 },
  { y: -0.525, halfWidth: 0.424, halfDepth: 0.308 },
  { y: -0.414, halfWidth: 0.435, halfDepth: 0.316 },
  { y: -0.303, halfWidth: 0.442, halfDepth: 0.321 },
  { y: -0.192, halfWidth: 0.446, halfDepth: 0.324 },
  { y: -0.081, halfWidth: 0.450, halfDepth: 0.327 },
  { y: 0.030, halfWidth: 0.453, halfDepth: 0.329 },
  { y: 0.141, halfWidth: 0.455, halfDepth: 0.330 },
  { y: 0.252, halfWidth: 0.456, halfDepth: 0.331 },
  { y: 0.362, halfWidth: 0.457, halfDepth: 0.332 },
  { y: 0.473, halfWidth: 0.460, halfDepth: 0.334 },
  { y: 0.584, halfWidth: 0.463, halfDepth: 0.336 },
  { y: 0.630, halfWidth: 0.440, halfDepth: 0.322 },
  { y: 0.665, halfWidth: 0.375, halfDepth: 0.278 },
  { y: 0.685, halfWidth: 0.230, halfDepth: 0.176 },
  { y: 0.692, halfWidth: 0.150, halfDepth: 0.118 },
  { y: 0.695, halfWidth: 0.055, halfDepth: 0.046 },
];

function createBodyGeometry() {
  return createConvexBottleGeometry(BODY_PROFILE, {
    crossSectionExponent: BODY_EXPONENT,
    radialSegments: 128,
    segmentsPerSection: 8,
  });
}

function createCapGeometry() {
  return createConvexBottleGeometry(CAP_PROFILE, {
    crossSectionExponent: CAP_EXPONENT,
    radialSegments: 128,
    segmentsPerSection: 8,
  });
}

function createCopyTexture(lines, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = options.color || '#6d6a64';
  context.textAlign = options.align || 'center';
  context.textBaseline = 'middle';
  const fontFamily = options.fontFamily || 'Arial, sans-serif';
  const fontStyle = options.fontStyle || 'normal';
  const fontWeight = options.fontWeight || 400;
  if (options.letterSpacing) context.letterSpacing = options.letterSpacing;

  let fontSize = options.fontSize || 58;
  // The wordmark is a condensed face: on the reference it stands 0.26 as tall as it is
  // wide, where an uncondensed serif manages 0.17. Oversize the glyphs, then squeeze
  // them back to the measured width.
  const condense = options.condense || 1;
  context.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;

  // The wordmark has to reach the silhouette edges the way it does on the bottle,
  // so fit it to a target width instead of trusting one font's metrics.
  if (options.fitWidth) {
    const measured = Math.max(...lines.map((line) => context.measureText(line).width), 1);
    fontSize = Math.round(fontSize * (options.fitWidth / condense / measured));
    context.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  }

  const lineHeight = options.lineHeight || fontSize * 1.35;
  const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;
  const textX = options.textX ?? canvas.width / 2;
  context.save();
  context.scale(condense, 1);
  lines.forEach((line, index) => context.fillText(line, textX / condense, startY + index * lineHeight));
  context.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createDecal(name, texture, dimensions, centerY) {
  const material = new THREE.MeshBasicMaterial({
    alphaTest: 0.012,
    map: texture,
    opacity: 1,
    side: THREE.FrontSide,
    toneMapped: false,
    transparent: true,
    depthWrite: false,
  });
  const geometry = createWrappedDecalGeometry(BODY_PROFILE, {
    centerY,
    crossSectionExponent: BODY_EXPONENT,
    height: dimensions.height,
    width: dimensions.width,
  });
  const decal = new THREE.Mesh(geometry, material);
  decal.name = name;
  decal.renderOrder = 3;
  return decal;
}

function enableShadows(object) {
  object.traverse((child) => {
    if (!child.isMesh || child.material?.transparent) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
}

export function createSulBottleModel() {
  const root = new THREE.Group();
  root.name = 'sul_bottle_root';

  const tiltRoot = new THREE.Group();
  tiltRoot.name = 'bottle_tilt_root';
  root.add(tiltRoot);

  const spinRoot = new THREE.Group();
  spinRoot.name = 'bottle_spin_root';
  tiltRoot.add(spinRoot);

  // Soft-touch matte ivory: the reference has no sharp specular, only a wide diffuse falloff.
  const ivoryMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf0e7d4,
    clearcoat: 0.2,
    clearcoatRoughness: 0.55,
    envMapIntensity: 1.15,
    metalness: 0,
    roughness: 0.48,
    sheen: 0.6,
    sheenColor: 0xfff6e6,
    sheenRoughness: 0.7,
  });
  const capMaterial = ivoryMaterial.clone();
  capMaterial.roughness = 0.45;
  const seamMaterial = ivoryMaterial.clone();
  seamMaterial.color.setHex(0xc0b299);
  seamMaterial.clearcoat = 0;
  seamMaterial.envMapIntensity = 0.4;
  seamMaterial.roughness = 0.78;
  seamMaterial.sheen = 0;

  const body = new THREE.Mesh(createBodyGeometry(), ivoryMaterial);
  body.name = 'bottle_body';
  body.position.y = -0.20;
  spinRoot.add(body);

  const cap = new THREE.Mesh(createCapGeometry(), capMaterial);
  cap.name = 'cap';
  cap.position.y = 1.82;
  spinRoot.add(cap);

  // The reference shows no metal collar - only the shoulder seam shadow under the cap.
  const neckRing = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.375, 0.22, 64), seamMaterial);
  neckRing.name = 'neck_ring';
  neckRing.position.y = 1.16;
  neckRing.scale.z = 0.72;
  spinRoot.add(neckRing);

  const upperTexture = createCopyTexture(['FIRST CARE', 'ACTIVATING SERUM VI', 'SÉRUM ACTIVATEUR VI'], {
    align: 'left',
    color: '#a99f92',
    fontSize: 55,
    fontWeight: 400,
    letterSpacing: '2px',
    lineHeight: 68,
    textX: 72,
  });
  const frontCopy = createDecal('front_copy_decal', upperTexture, { width: 1.337, height: 0.669 }, 0.746);
  body.add(frontCopy);

  // Bodoni MT is the closest installed face to the wordmark's thin hairlines and high
  // stroke contrast; the original is a proprietary typeface and is not shipped here.
  const brandTexture = createCopyTexture(['Sulwhasoo'], {
    color: '#e8672c',
    condense: 0.683,
    fitWidth: 972,
    fontFamily: "'Bodoni MT', 'Didot', 'Baskerville Old Face', 'Times New Roman', serif",
    fontSize: 300,
    fontWeight: 400,
  });
  const brand = createDecal('brand_decal', brandTexture, { width: 1.342, height: 0.671 }, -1.272);
  body.add(brand);

  enableShadows(spinRoot);
  spinRoot.updateMatrixWorld(true);
  const centeredBox = new THREE.Box3().setFromObject(spinRoot);
  const centeredPosition = centeredBox.getCenter(new THREE.Vector3());
  for (const child of [...spinRoot.children]) child.position.sub(centeredPosition);

  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: 0x7f694e,
    depthWrite: false,
    opacity: 0.16,
    transparent: true,
  });
  const contactShadow = new THREE.Mesh(new THREE.CircleGeometry(0.72, 64), shadowMaterial);
  contactShadow.name = 'contact_shadow';
  contactShadow.position.set(0, -2.24, -0.03);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.scale.set(1.20, 0.56, 1);
  root.add(contactShadow);

  const materials = { ivoryMaterial, capMaterial, seamMaterial, shadowMaterial };
  const parts = { body, cap, neckRing, frontCopy, brand, contactShadow };
  const manifest = {
    source: 'sul2/img/sul.png',
    buildPipeline: 'img2threejs',
    components: ['bottle_body', 'cap', 'neck_ring', 'front_copy_decal', 'brand_decal'],
    localSpinAxis: 'Y',
    usesReferenceTexture: false,
  };

  root.userData.sculptRuntime = {
    colliders: {},
    destructionGroups: {},
    meshes: parts,
    nodes: { root, tiltRoot, spinRoot },
    sockets: {},
  };

  return { root, tiltRoot, spinRoot, parts, materials, manifest };
}
