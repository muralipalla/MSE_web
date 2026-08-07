import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js";

const stage = document.querySelector("[data-materials-tetrahedron]");

if (stage) {
  initialiseMaterialsTetrahedron(stage);
}

function initialiseMaterialsTetrahedron(renderStage) {
  const figure = renderStage.closest(".materials-tetrahedron");
  if (!figure) {
    return;
  }

  try {
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderStage.append(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0.04, 6.8);

    scene.add(new THREE.AmbientLight(0xffffff, 1.8));

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(3.5, 4.5, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8cbcf0, 2.1);
    fillLight.position.set(-4, -1.5, 2);
    scene.add(fillLight);

    const concepts = [
      { key: "processing", colour: 0xf05030, position: new THREE.Vector3(1, 1, 1) },
      { key: "structure", colour: 0x9a89e0, position: new THREE.Vector3(-1, -1, 1) },
      { key: "properties", colour: 0x68a7d8, position: new THREE.Vector3(-1, 1, -1) },
      { key: "performance", colour: 0x54ad8d, position: new THREE.Vector3(1, -1, -1) }
    ];

    concepts.forEach((concept) => concept.position.multiplyScalar(1.2));

    const tetrahedron = new THREE.Group();
    tetrahedron.rotation.set(-0.18, 0.58, 0.05);
    scene.add(tetrahedron);

    const faceGeometry = new THREE.BufferGeometry().setFromPoints(
      concepts.map((concept) => concept.position)
    );
    faceGeometry.setIndex([
      0, 1, 2,
      0, 3, 1,
      0, 2, 3,
      1, 3, 2
    ]);
    faceGeometry.computeVertexNormals();

    const faces = new THREE.Mesh(
      faceGeometry,
      new THREE.MeshPhongMaterial({
        color: 0xc8d7ff,
        depthWrite: false,
        opacity: 0.13,
        shininess: 90,
        side: THREE.DoubleSide,
        transparent: true
      })
    );
    tetrahedron.add(faces);

    const edgeMaterial = new THREE.MeshBasicMaterial({
      color: 0xf2efff,
      opacity: 0.72,
      transparent: true
    });
    const edgePairs = [
      [0, 1], [0, 2], [0, 3],
      [1, 2], [1, 3], [2, 3]
    ];
    edgePairs.forEach(([startIndex, endIndex]) => {
      tetrahedron.add(createEdge(
        concepts[startIndex].position,
        concepts[endIndex].position,
        edgeMaterial
      ));
    });

    const vertexGeometry = new THREE.SphereGeometry(0.13, 28, 18);
    concepts.forEach((concept) => {
      const vertex = new THREE.Mesh(
        vertexGeometry,
        new THREE.MeshStandardMaterial({
          color: concept.colour,
          emissive: concept.colour,
          emissiveIntensity: 0.2,
          metalness: 0.08,
          roughness: 0.28
        })
      );
      vertex.position.copy(concept.position);
      tetrahedron.add(vertex);
    });

    const labels = new Map();
    concepts.forEach((concept) => {
      const label = figure.querySelector(`[data-tetrahedron-label="${concept.key}"]`);
      if (label) {
        labels.set(concept.key, label);
      }
    });

    const projectedPosition = new THREE.Vector3();
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let previousTime = 0;
    let isInView = true;
    let isDragging = false;
    let previousPointerX = 0;
    let previousPointerY = 0;
    let baseRotationX = -0.18;

    function updateLabels() {
      const width = renderStage.clientWidth;
      const height = renderStage.clientHeight;
      if (!width || !height) {
        return;
      }

      scene.updateMatrixWorld(true);
      concepts.forEach((concept) => {
        const label = labels.get(concept.key);
        if (!label) {
          return;
        }

        projectedPosition
          .copy(concept.position)
          .applyMatrix4(tetrahedron.matrixWorld)
          .project(camera);

        const halfWidth = label.offsetWidth / 2;
        const halfHeight = label.offsetHeight / 2;
        const x = clamp(
          (projectedPosition.x * 0.5 + 0.5) * width,
          halfWidth + 10,
          width - halfWidth - 10
        );
        const y = clamp(
          (-projectedPosition.y * 0.5 + 0.5) * height,
          halfHeight + 52,
          height - halfHeight - 48
        );

        label.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
        label.style.zIndex = String(Math.round((1 - projectedPosition.z) * 10) + 3);
      });
    }

    function renderScene() {
      renderer.render(scene, camera);
      updateLabels();
      figure.classList.add("is-ready");
    }

    function shouldAnimate() {
      return isInView && !document.hidden && !motionPreference.matches && !isDragging;
    }

    function animate(time) {
      animationFrame = 0;
      const elapsed = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
      previousTime = time;
      tetrahedron.rotation.y += elapsed * 0.22;
      tetrahedron.rotation.x = baseRotationX + Math.sin(time * 0.00028) * 0.055;
      renderScene();

      if (shouldAnimate()) {
        animationFrame = window.requestAnimationFrame(animate);
      }
    }

    function startAnimation() {
      if (shouldAnimate()) {
        if (!animationFrame) {
          previousTime = 0;
          animationFrame = window.requestAnimationFrame(animate);
        }
      } else {
        stopAnimation();
        renderScene();
      }
    }

    function stopAnimation() {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    }

    function resize() {
      const width = renderStage.clientWidth;
      const height = renderStage.clientHeight;
      if (!width || !height) {
        return;
      }
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderScene();
      startAnimation();
    }

    if (typeof ResizeObserver === "function") {
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(renderStage);
    } else {
      window.addEventListener("resize", resize);
    }

    if (typeof IntersectionObserver === "function") {
      const visibilityObserver = new IntersectionObserver((entries) => {
        isInView = entries[0]?.isIntersecting ?? true;
        startAnimation();
      }, { threshold: 0.05 });
      visibilityObserver.observe(figure);
    }

    document.addEventListener("visibilitychange", startAnimation);
    motionPreference.addEventListener?.("change", startAnimation);
    renderer.domElement.addEventListener("pointerdown", (event) => {
      isDragging = true;
      previousPointerX = event.clientX;
      previousPointerY = event.clientY;
      renderer.domElement.classList.add("is-dragging");
      renderer.domElement.setPointerCapture(event.pointerId);
      stopAnimation();
    });
    renderer.domElement.addEventListener("pointermove", (event) => {
      if (!isDragging) {
        return;
      }
      const movementX = event.clientX - previousPointerX;
      const movementY = event.clientY - previousPointerY;
      previousPointerX = event.clientX;
      previousPointerY = event.clientY;
      tetrahedron.rotation.y += movementX * 0.008;
      baseRotationX = clamp(baseRotationX + movementY * 0.006, -0.85, 0.85);
      tetrahedron.rotation.x = baseRotationX;
      renderScene();
    });

    const finishDrag = (event) => {
      if (!isDragging) {
        return;
      }
      isDragging = false;
      renderer.domElement.classList.remove("is-dragging");
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      startAnimation();
    };
    renderer.domElement.addEventListener("pointerup", finishDrag);
    renderer.domElement.addEventListener("pointercancel", finishDrag);
    renderer.domElement.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      stopAnimation();
      figure.classList.remove("is-ready");
    });

    resize();
  } catch (error) {
    figure.classList.remove("is-ready");
    console.warn("Materials tetrahedron could not be rendered.", error);
  }
}

function createEdge(start, end, material) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const edge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, length, 8, 1),
    material
  );
  edge.position.copy(start).add(end).multiplyScalar(0.5);
  edge.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize()
  );
  return edge;
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}
