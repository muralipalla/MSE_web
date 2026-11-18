(function () {
  "use strict";
  const controls = ["phi", "beta", "stress", "crss"].reduce((items, id) => {
    items[id] = document.getElementById(id);
    return items;
  }, {});
  const output = (id, value) => { document.getElementById(id).textContent = value; };
  let updateScene = () => {};

  function update() {
    const phi = Number(controls.phi.value);
    const beta = Number(controls.beta.value);
    const stress = Number(controls.stress.value);
    const critical = Number(controls.crss.value);
    const radians = Math.PI / 180;
    const cosLambda = Math.sin(phi * radians) * Math.cos(beta * radians);
    const lambda = Math.acos(Math.max(-1, Math.min(1, cosLambda))) / radians;
    const factor = Math.abs(Math.cos(phi * radians) * cosLambda);
    const resolved = stress * factor;
    output("phi-value", phi + "°");
    output("beta-value", beta + "°");
    output("stress-value", stress + " MPa");
    output("crss-value", critical + " MPa");
    output("lambda-value", lambda.toFixed(1) + "°");
    output("factor-value", factor.toFixed(3));
    output("rss-value", resolved.toFixed(1) + " MPa");
    output("threshold-value", factor < 1e-10 ? "No finite value" : (critical / factor).toFixed(1) + " MPa");
    const status = document.getElementById("status");
    const reached = resolved >= critical;
    status.textContent = reached ? "The resolved shear stress reaches the critical value." : "The resolved shear stress is below the critical value.";
    status.classList.toggle("below", !reached);
    updateScene(phi * radians, beta * radians, stress);
  }

  Object.values(controls).forEach(control => control.addEventListener("input", update));
  const host = document.getElementById("scene");
  try {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    host.replaceChildren(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(6, 4.1, 8);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x73729d, 2));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(3, 6, 7);
    scene.add(light);
    const model = new THREE.Group();
    scene.add(model);
    document.getElementById("rotate-left").addEventListener("click", () => { model.rotation.y -= Math.PI / 6; });
    document.getElementById("rotate-right").addEventListener("click", () => { model.rotation.y += Math.PI / 6; });
    document.getElementById("reset-view").addEventListener("click", () => { model.rotation.set(0, 0, 0); });
    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(.75, .75, 4, 64, 1, false),
      new THREE.MeshPhongMaterial({ color: 0x8f9fc7, transparent: true, opacity: .25, side: THREE.DoubleSide, depthWrite: false }));
    model.add(cylinder);
    const rimMaterial = new THREE.LineBasicMaterial({ color: 0x5b6a95, transparent: true, opacity: .55 });
    for (const height of [-2, 2]) {
      const points = [];
      for (let i = 0; i < 64; i += 1) {
        const angle = i * 2 * Math.PI / 64;
        points.push(new THREE.Vector3(.75 * Math.cos(angle), height, .75 * Math.sin(angle)));
      }
      model.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), rimMaterial));
    }
    const axisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -2.25, 0), new THREE.Vector3(0, 2.25, 0)
    ]);
    const axis = new THREE.Line(axisGeometry, new THREE.LineDashedMaterial({
      color: 0x514a7e, dashSize: .04, gapSize: .06, depthTest: false
    }));
    axis.computeLineDistances();
    axis.renderOrder = 3;
    model.add(axis);
    function arrow(direction, origin, length, color) {
      const item = new THREE.ArrowHelper(direction, origin, length, color, .22, .12);
      model.add(item);
      return item;
    }
    const forceArrows = [
      arrow(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 2.04, 0), .65, 0xc93b1f),
      arrow(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, -2.04, 0), .65, 0xc93b1f)
    ];
    const forceCanvas = document.createElement("canvas");
    forceCanvas.width = 64;
    forceCanvas.height = 64;
    const forceContext = forceCanvas.getContext("2d");
    forceContext.font = "bold 44px sans-serif";
    forceContext.textAlign = "center";
    forceContext.textBaseline = "middle";
    forceContext.fillStyle = "#a9311c";
    forceContext.fillText("F", 32, 32);
    const forceLabelMaterial = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(forceCanvas), transparent: true, depthTest: false });
    const forceLabels = [1, -1].map(sign => {
      const label = new THREE.Sprite(forceLabelMaterial);
      label.scale.set(.3, .3, 1);
      label.position.set(.23, sign * 2.23, 0);
      label.renderOrder = 5;
      model.add(label);
      return label;
    });
    const planeMaterial = new THREE.MeshPhongMaterial({ color: 0xe48d37, side: THREE.DoubleSide, transparent: true, opacity: .66, depthWrite: false });
    let plane;
    const normalArrow = arrow(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1.4, 0x2873ae);
    const slipArrow = arrow(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1.25, 0x7546a8);
    const axisDirection = new THREE.Vector3(0, 1, 0);
    function angleMarker(label, color) {
      const line = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color, depthTest: false }));
      line.renderOrder = 4;
      model.add(line);
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 64;
      const context = canvas.getContext("2d");
      context.font = "bold 40px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = color === 0x2873ae ? "#155787" : "#593389";
      context.fillText(label, 64, 32);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false }));
      sprite.scale.set(.5, .25, 1);
      sprite.renderOrder = 5;
      model.add(sprite);
      return { line, sprite };
    }
    const phiMarker = angleMarker("φ", 0x2873ae);
    const lambdaMarker = angleMarker("λ", 0x7546a8);
    function drawAngle(marker, direction, radius) {
      const angle = axisDirection.angleTo(direction);
      const points = [];
      const rotationAxis = new THREE.Vector3().crossVectors(axisDirection, direction).normalize();
      for (let i = 0; i <= 48; i += 1) {
        points.push(axisDirection.clone().applyAxisAngle(rotationAxis, angle * i / 48).multiplyScalar(radius));
      }
      marker.line.geometry.dispose();
      marker.line.geometry = new THREE.BufferGeometry().setFromPoints(points);
      marker.sprite.position.copy(axisDirection).applyAxisAngle(rotationAxis, angle / 2).multiplyScalar(radius + .16);
    }
    updateScene = (phi, beta, stress) => {
      const forceLength = .65 * stress / 300;
      forceArrows.forEach((forceArrow, index) => {
        const visible = stress > 0;
        forceArrow.visible = visible;
        forceLabels[index].visible = visible;
        if (visible) {
          forceArrow.setLength(forceLength, forceLength * .32, forceLength * .18);
          forceLabels[index].position.y = (index === 0 ? 1 : -1) * (2.04 + forceLength / 2);
        }
      });
      const normal = new THREE.Vector3(Math.sin(phi), Math.cos(phi), 0);
      const inPlane = new THREE.Vector3(Math.cos(phi), -Math.sin(phi), 0);
      const direction = inPlane.clone().multiplyScalar(-Math.cos(beta)).add(new THREE.Vector3(0, 0, -Math.sin(beta)));
      normalArrow.setDirection(normal);
      slipArrow.setDirection(direction);
      drawAngle(phiMarker, normal, .56);
      drawAngle(lambdaMarker, direction, .87);
      if (plane) { model.remove(plane); plane.geometry.dispose(); }
      const vertices = [0, 0, 0];
      const segments = 96;
      for (let i = 0; i <= segments; i += 1) {
        const angle = i * 2 * Math.PI / segments;
        const x = .75 * Math.cos(angle);
        vertices.push(x, -Math.tan(phi) * x, .75 * Math.sin(angle));
      }
      const indices = [];
      for (let i = 1; i <= segments; i += 1) indices.push(0, i, i + 1);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      plane = new THREE.Mesh(geometry, planeMaterial);
      model.add(plane);
    };
    function resize() {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(host);
    resize();
    let last = null;
    renderer.domElement.addEventListener("pointerdown", event => {
      last = [event.clientX, event.clientY];
      renderer.domElement.setPointerCapture(event.pointerId);
    });
    renderer.domElement.addEventListener("pointermove", event => {
      if (!last) return;
      model.rotation.y += (event.clientX - last[0]) * .01;
      model.rotation.x = Math.max(-1.1, Math.min(1.1, model.rotation.x + (event.clientY - last[1]) * .01));
      last = [event.clientX, event.clientY];
    });
    renderer.domElement.addEventListener("pointerup", () => { last = null; });
    renderer.domElement.addEventListener("pointercancel", () => { last = null; });
    function render() { renderer.render(scene, camera); requestAnimationFrame(render); }
    render();
  } catch (error) {
    console.warn("3D view unavailable", error);
  }
  update();
}());
