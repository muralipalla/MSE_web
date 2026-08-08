import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const elements = {
  viewer: document.querySelector("#intro-diamond-viewer"),
  canvas: document.querySelector("#intro-diamond-canvas"),
  fallback: document.querySelector("#intro-diamond-fallback"),
  networkView: document.querySelector("#intro-diamond-network-view"),
  layerView: document.querySelector("#intro-diamond-layer-view"),
  status: document.querySelector("#intro-diamond-status")
};

const graphiteElements = {
  viewer: document.querySelector("#intro-graphite-viewer"),
  canvas: document.querySelector("#intro-graphite-canvas"),
  fallback: document.querySelector("#intro-graphite-fallback"),
  stackedView: document.querySelector("#intro-graphite-stacked-view"),
  sheetView: document.querySelector("#intro-graphite-sheet-view"),
  status: document.querySelector("#intro-graphite-status")
};

if (elements.viewer && elements.canvas) {
  initialiseDiamondViewer();
}

if (graphiteElements.viewer && graphiteElements.canvas) {
  initialiseGraphiteViewer();
}

function initialiseDiamondViewer() {
  let renderer;
  let resizeObserver;

  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas: elements.canvas,
      powerPreference: "low-power"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setClearColor(0x000000, 0);

    elements.canvas.removeAttribute("aria-hidden");
    elements.canvas.setAttribute("role", "img");
    elements.canvas.setAttribute(
      "aria-label",
      "Interactive three-dimensional model of a three by three by three diamond-cubic network. Many connected carbon tetrahedra and several atomic layers are visible. Use the two view buttons for keyboard-accessible perspectives."
    );

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xdcecff, 0x17143c, 2.15));

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(4.5, 6, 7);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x8caeff, 2.1);
    rimLight.position.set(-6, -2, -4);
    scene.add(rimLight);

    const network = buildDiamondNetwork();
    scene.add(network.group);

    const controls = new OrbitControls(camera, elements.canvas);
    controls.enableDamping = false;
    controls.enablePan = false;
    controls.minDistance = 4.6;
    controls.maxDistance = 12;
    controls.target.set(0, 0, 0);
    elements.canvas.style.touchAction = "pan-y pinch-zoom";

    const render = () => renderer.render(scene, camera);
    controls.addEventListener("change", render);

    const setView = (position, up, message) => {
      camera.up.copy(up).normalize();
      camera.position.copy(position);
      controls.target.set(0, 0, 0);
      controls.update();
      render();
      elements.status.textContent = message;
    };

    const showTetrahedralView = () => {
      network.layerGuides.visible = false;
      setView(
        new THREE.Vector3(5.2, 4.3, 5.8),
        new THREE.Vector3(0, 1, 0),
        `Showing ${network.atomCount} carbon sites in a 3 × 3 × 3 repeating section. The larger orange atom and its four larger gold neighbours highlight one tetrahedral environment.`
      );
    };

    const showLayerView = () => {
      network.layerGuides.visible = true;
      setView(
        new THREE.Vector3(8.2, 0, 0),
        new THREE.Vector3(0, 0, 1),
        "Viewing the repeating (001) atomic planes edge-on. Gold guide lines mark successive layers, which remain connected by tetrahedral bonds."
      );
    };

    elements.networkView.addEventListener("click", showTetrahedralView);
    elements.layerView.addEventListener("click", showLayerView);

    const resize = () => {
      const width = elements.viewer.clientWidth;
      const height = elements.viewer.clientHeight;
      if (width < 2 || height < 2) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      render();
    };

    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(elements.viewer);
    } else {
      window.addEventListener("resize", resize);
    }

    elements.canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      elements.fallback.hidden = false;
      elements.canvas.setAttribute("aria-hidden", "true");
      elements.canvas.removeAttribute("role");
      elements.canvas.removeAttribute("aria-label");
      setFallbackMessage(
        elements,
        "The 3D view stopped",
        "The WebGL context was lost. Reload the page to restart the model."
      );
      elements.status.textContent = "The 3D view stopped because the WebGL context was lost.";
      elements.networkView.disabled = true;
      elements.layerView.disabled = true;
    });

    showTetrahedralView();
    resize();
    elements.fallback.hidden = true;
    elements.networkView.disabled = false;
    elements.layerView.disabled = false;
    elements.viewer.classList.add("is-ready");
  } catch (error) {
    console.warn("The diamond-cubic viewer could not be rendered.", error);
    if (resizeObserver) resizeObserver.disconnect();
    if (renderer) renderer.dispose();
    elements.fallback.hidden = false;
    elements.canvas.setAttribute("aria-hidden", "true");
    elements.canvas.removeAttribute("role");
    elements.canvas.removeAttribute("aria-label");
    setFallbackMessage(elements,
      "The interactive carbon network could not start",
      "The bonding explanation remains available below. Try a current browser with WebGL enabled."
    );
    elements.networkView.disabled = true;
    elements.layerView.disabled = true;
    elements.status.textContent = "The interactive model is unavailable, but the bonding description below remains available.";
  }
}

function initialiseGraphiteViewer() {
  let renderer;
  let resizeObserver;

  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas: graphiteElements.canvas,
      powerPreference: "low-power"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setClearColor(0x000000, 0);

    graphiteElements.canvas.removeAttribute("aria-hidden");
    graphiteElements.canvas.setAttribute("role", "img");
    graphiteElements.canvas.setAttribute(
      "aria-label",
      "Interactive three-dimensional model of four ABAB-stacked graphite sheets. Each sheet is a honeycomb network of carbon atoms. Use the two view buttons for keyboard-accessible perspectives."
    );

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xdcecff, 0x17143c, 2.15));

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.1);
    keyLight.position.set(6, -4, 9);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x9caeff, 1.9);
    rimLight.position.set(-7, 5, -3);
    scene.add(rimLight);

    const network = buildGraphiteNetwork();
    scene.add(network.group);

    const controls = new OrbitControls(camera, graphiteElements.canvas);
    controls.enableDamping = false;
    controls.enablePan = false;
    controls.minDistance = 8;
    controls.maxDistance = 28;
    controls.target.set(0, 0, 0);
    graphiteElements.canvas.style.touchAction = "pan-y pinch-zoom";

    const render = () => renderer.render(scene, camera);
    controls.addEventListener("change", render);

    const setView = (position, target, up, message) => {
      camera.up.copy(up).normalize();
      camera.position.copy(position);
      controls.target.copy(target);
      controls.update();
      render();
      graphiteElements.status.textContent = message;
    };

    const showStackedView = () => {
      network.layers.forEach((layer) => {
        layer.visible = true;
      });
      setView(
        new THREE.Vector3(11.5, -13.5, 10.5),
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 1),
        `Showing ${network.atomCount} carbon sites in four ABAB-stacked sheets. Adjacent sheets are separated by 2.36 bond lengths (about 3.35 Å); colours only distinguish the A and B registries.`
      );
    };

    const showSheetView = () => {
      network.layers.forEach((layer, index) => {
        layer.visible = index === network.sheetViewIndex;
      });
      const target = network.layerTargets[network.sheetViewIndex];
      setView(
        target.clone().add(new THREE.Vector3(0, 0, 16)),
        target,
        new THREE.Vector3(0, 1, 0),
        "Showing one graphene sheet normal to its plane. Every interior carbon has three in-plane neighbours at 120°, forming the honeycomb network."
      );
    };

    graphiteElements.stackedView.addEventListener("click", showStackedView);
    graphiteElements.sheetView.addEventListener("click", showSheetView);

    const resize = () => {
      const width = graphiteElements.viewer.clientWidth;
      const height = graphiteElements.viewer.clientHeight;
      if (width < 2 || height < 2) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      render();
    };

    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(graphiteElements.viewer);
    } else {
      window.addEventListener("resize", resize);
    }

    graphiteElements.canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      graphiteElements.fallback.hidden = false;
      graphiteElements.canvas.setAttribute("aria-hidden", "true");
      graphiteElements.canvas.removeAttribute("role");
      graphiteElements.canvas.removeAttribute("aria-label");
      setFallbackMessage(
        graphiteElements,
        "The graphite view stopped",
        "The WebGL context was lost. Reload the page to restart the model."
      );
      graphiteElements.status.textContent = "The 3D graphite view stopped because the WebGL context was lost.";
      graphiteElements.stackedView.disabled = true;
      graphiteElements.sheetView.disabled = true;
    });

    showStackedView();
    resize();
    graphiteElements.fallback.hidden = true;
    graphiteElements.stackedView.disabled = false;
    graphiteElements.sheetView.disabled = false;
    graphiteElements.viewer.classList.add("is-ready");
  } catch (error) {
    console.warn("The graphite viewer could not be rendered.", error);
    if (resizeObserver) resizeObserver.disconnect();
    if (renderer) renderer.dispose();
    graphiteElements.fallback.hidden = false;
    graphiteElements.canvas.setAttribute("aria-hidden", "true");
    graphiteElements.canvas.removeAttribute("role");
    graphiteElements.canvas.removeAttribute("aria-label");
    setFallbackMessage(
      graphiteElements,
      "The interactive graphite layers could not start",
      "The bonding explanation remains available below. Try a current browser with WebGL enabled."
    );
    graphiteElements.stackedView.disabled = true;
    graphiteElements.sheetView.disabled = true;
    graphiteElements.status.textContent = "The interactive graphite model is unavailable, but the bonding description below remains available.";
  }
}

function setFallbackMessage(targetElements, heading, message) {
  const headingElement = targetElements.fallback?.querySelector("strong");
  const messageElement = targetElements.fallback?.querySelector("span");
  if (headingElement) headingElement.textContent = heading;
  if (messageElement) messageElement.textContent = message;
}

function buildDiamondNetwork() {
  const cellCount = 3;
  const basis = [
    [0, 0, 0],
    [0, 0.5, 0.5],
    [0.5, 0, 0.5],
    [0.5, 0.5, 0],
    [0.25, 0.25, 0.25],
    [0.25, 0.75, 0.75],
    [0.75, 0.25, 0.75],
    [0.75, 0.75, 0.25]
  ];
  const rawPositions = [];

  for (let x = 0; x < cellCount; x += 1) {
    for (let y = 0; y < cellCount; y += 1) {
      for (let z = 0; z < cellCount; z += 1) {
        basis.forEach(([bx, by, bz]) => {
          rawPositions.push(new THREE.Vector3(x + bx, y + by, z + bz));
        });
      }
    }
  }

  const bounds = new THREE.Box3().setFromPoints(rawPositions);
  const centre = bounds.getCenter(new THREE.Vector3());
  const positions = rawPositions.map((position) => position.clone().sub(centre));
  const nearestNeighbourDistance = Math.sqrt(3) / 4;
  const bonds = [];

  for (let first = 0; first < positions.length; first += 1) {
    for (let second = first + 1; second < positions.length; second += 1) {
      const distance = positions[first].distanceTo(positions[second]);
      if (Math.abs(distance - nearestNeighbourDistance) < 1e-5) {
        bonds.push([first, second]);
      }
    }
  }

  const focusTarget = new THREE.Vector3(1.25, 1.25, 1.25);
  let focusIndex = 0;
  let focusDistance = Number.POSITIVE_INFINITY;
  rawPositions.forEach((position, index) => {
    const distance = position.distanceToSquared(focusTarget);
    if (distance < focusDistance) {
      focusDistance = distance;
      focusIndex = index;
    }
  });

  const focusNeighbours = new Set();
  bonds.forEach(([first, second]) => {
    if (first === focusIndex) focusNeighbours.add(second);
    if (second === focusIndex) focusNeighbours.add(first);
  });
  const highlightedAtoms = new Set([focusIndex, ...focusNeighbours]);
  const regularAtomPositions = positions.filter((_, index) => !highlightedAtoms.has(index));
  const neighbourPositions = [...focusNeighbours].map((index) => positions[index]);
  const ordinaryBonds = bonds.filter(([first, second]) => first !== focusIndex && second !== focusIndex);
  const focusBonds = bonds.filter(([first, second]) => first === focusIndex || second === focusIndex);

  const group = new THREE.Group();

  group.add(createAtomInstances(regularAtomPositions, 0x6aaeff, 0.073));
  group.add(createAtomInstances(neighbourPositions, 0xffcf7b, 0.1));
  group.add(createAtomInstances([positions[focusIndex]], 0xff573d, 0.12));
  group.add(createBondInstances(positions, ordinaryBonds, 0xb8d7f4, 0.016, 0.56));
  group.add(createBondInstances(positions, focusBonds, 0xff9673, 0.032, 1));

  const boxSize = bounds.getSize(new THREE.Vector3());
  const boxGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(boxSize.x, boxSize.y, boxSize.z));
  const box = new THREE.LineSegments(
    boxGeometry,
    new THREE.LineBasicMaterial({ color: 0x9eb8dd, opacity: 0.34, transparent: true })
  );
  group.add(box);

  const uniqueLayerHeights = [...new Set(rawPositions.map((position) => position.z))]
    .sort((first, second) => first - second)
    .map((height) => height - centre.z);
  const layerPoints = [];
  uniqueLayerHeights.forEach((height) => {
    layerPoints.push(
      new THREE.Vector3(0, -boxSize.y / 2, height),
      new THREE.Vector3(0, boxSize.y / 2, height)
    );
  });
  const layerGuides = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(layerPoints),
    new THREE.LineBasicMaterial({
      color: 0xffcf7b,
      depthTest: false,
      opacity: 0.52,
      transparent: true
    })
  );
  layerGuides.renderOrder = 5;
  layerGuides.visible = false;
  group.add(layerGuides);

  return {
    atomCount: positions.length,
    bondCount: bonds.length,
    group,
    layerGuides
  };
}

function buildGraphiteNetwork() {
  const bondLength = 1;
  const interlayerSpacing = 2.36;
  const rootThree = Math.sqrt(3);
  const a1 = new THREE.Vector3(rootThree, 0, 0);
  const a2 = new THREE.Vector3(rootThree / 2, 1.5, 0);
  const basis = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 1, 0)
  ];
  const layerDefinitions = [
    { registry: "A", shift: new THREE.Vector3(0, 0, -1.5 * interlayerSpacing) },
    { registry: "B", shift: new THREE.Vector3(0, 1, -0.5 * interlayerSpacing) },
    { registry: "A", shift: new THREE.Vector3(0, 0, 0.5 * interlayerSpacing) },
    { registry: "B", shift: new THREE.Vector3(0, 1, 1.5 * interlayerSpacing) }
  ];
  const rawLayers = layerDefinitions.map(({ shift }) => {
    const layer = [];
    for (let first = -2; first <= 2; first += 1) {
      for (let second = -2; second <= 2; second += 1) {
        const cellOrigin = a1.clone().multiplyScalar(first).add(a2.clone().multiplyScalar(second));
        basis.forEach((site) => {
          layer.push(cellOrigin.clone().add(site).add(shift));
        });
      }
    }
    return layer;
  });

  const allRawPositions = rawLayers.flat();
  const combinedBounds = new THREE.Box3().setFromPoints(allRawPositions);
  const centre = combinedBounds.getCenter(new THREE.Vector3());
  const layerPositions = rawLayers.map((layer) => layer.map((position) => position.clone().sub(centre)));
  const group = new THREE.Group();
  const layers = [];
  const layerTargets = [];
  const colours = {
    A: 0x6aaeff,
    B: 0xff755b
  };
  let bondCount = 0;

  layerPositions.forEach((positions, layerIndex) => {
    const bonds = [];
    for (let first = 0; first < positions.length; first += 1) {
      for (let second = first + 1; second < positions.length; second += 1) {
        const distance = positions[first].distanceTo(positions[second]);
        if (Math.abs(distance - bondLength) < 1e-5) {
          bonds.push([first, second]);
        }
      }
    }
    bondCount += bonds.length;

    const colour = colours[layerDefinitions[layerIndex].registry];
    const layer = new THREE.Group();
    const layerBounds = new THREE.Box3().setFromPoints(positions);
    const layerSize = layerBounds.getSize(new THREE.Vector3());
    const layerCentre = layerBounds.getCenter(new THREE.Vector3());
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(layerSize.x + 0.85, layerSize.y + 0.85),
      new THREE.MeshBasicMaterial({
        color: colour,
        depthWrite: false,
        opacity: 0.055,
        side: THREE.DoubleSide,
        transparent: true
      })
    );
    plane.position.copy(layerCentre);
    layer.add(plane);
    layer.add(createBondInstances(positions, bonds, colour, 0.05, 0.78));
    layer.add(createAtomInstances(positions, colour, 0.17));
    group.add(layer);
    layers.push(layer);
    layerTargets.push(layerCentre);
  });

  return {
    atomCount: allRawPositions.length,
    bondCount,
    group,
    interlayerSpacing,
    layers,
    layerTargets,
    sheetViewIndex: 2
  };
}

function createAtomInstances(positions, colour, radius) {
  const geometry = new THREE.SphereGeometry(radius, 18, 14);
  const material = new THREE.MeshStandardMaterial({
    color: colour,
    emissive: colour,
    emissiveIntensity: 0.12,
    metalness: 0.04,
    roughness: 0.28
  });
  const mesh = new THREE.InstancedMesh(geometry, material, positions.length);
  const matrix = new THREE.Matrix4();

  positions.forEach((position, index) => {
    matrix.makeTranslation(position.x, position.y, position.z);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function createBondInstances(positions, bonds, colour, radius, opacity) {
  const geometry = new THREE.CylinderGeometry(radius, radius, 1, 8, 1);
  const material = new THREE.MeshStandardMaterial({
    color: colour,
    emissive: colour,
    emissiveIntensity: 0.05,
    opacity,
    roughness: 0.42,
    transparent: opacity < 1
  });
  const mesh = new THREE.InstancedMesh(geometry, material, bonds.length);
  const up = new THREE.Vector3(0, 1, 0);
  const midpoint = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const matrix = new THREE.Matrix4();

  bonds.forEach(([first, second], index) => {
    direction.subVectors(positions[second], positions[first]);
    midpoint.copy(positions[first]).add(positions[second]).multiplyScalar(0.5);
    quaternion.setFromUnitVectors(up, direction.clone().normalize());
    scale.set(1, direction.length(), 1);
    matrix.compose(midpoint, quaternion, scale);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}
