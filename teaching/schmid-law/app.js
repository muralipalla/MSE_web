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
    updateScene(phi * radians, beta * radians);
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
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(.75, .75, 4, 48)),
      new THREE.LineBasicMaterial({ color: 0x5b6a95, transparent: true, opacity: .55 }));
    model.add(edges);
    const axis = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -2.45, 0), new THREE.Vector3(0, 2.45, 0)]),
      new THREE.LineDashedMaterial({ color: 0x777190, dashSize: .12, gapSize: .09 }));
    axis.computeLineDistances();
    model.add(axis);
    function arrow(direction, origin, length, color) {
      const item = new THREE.ArrowHelper(direction, origin, length, color, .22, .12);
      model.add(item);
      return item;
    }
    arrow(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 2.04, 0), .65, 0xc93b1f);
    arrow(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, -2.04, 0), .65, 0xc93b1f);
    const planeMaterial = new THREE.MeshPhongMaterial({ color: 0xe48d37, side: THREE.DoubleSide, transparent: true, opacity: .66, depthWrite: false });
    let plane;
    const normalArrow = arrow(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1.4, 0x2873ae);
    const slipArrow = arrow(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1.25, 0x7546a8);
    updateScene = (phi, beta) => {
      const normal = new THREE.Vector3(Math.sin(phi), Math.cos(phi), 0);
      const inPlane = new THREE.Vector3(Math.cos(phi), -Math.sin(phi), 0);
      const direction = inPlane.clone().multiplyScalar(Math.cos(beta)).add(new THREE.Vector3(0, 0, Math.sin(beta)));
      normalArrow.setDirection(normal);
      slipArrow.setDirection(direction);
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
