(function () {
  "use strict";

  window.createFatigueBeamView = function (canvas) {
    const THREE = window.THREE;
    if (!THREE) return null;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    } catch {
      return null;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f4f8);
    const camera = new THREE.OrthographicCamera(-7, 7, 4, -4, .1, 60);
    const light = new THREE.DirectionalLight(0xfff3db, 2.2);
    light.position.set(2, 8, 6);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x93819f, 1.5), light);
    const axis = 3.55;
    const gaugeCentre = -2.2;
    const steel = new THREE.MeshStandardMaterial({ color: 0x92b8da, metalness: .42, roughness: .32 });
    const base = new THREE.MeshStandardMaterial({ color: 0x819bbd, roughness: .72 });
    const housing = new THREE.MeshStandardMaterial({ color: 0xd8ac7b, roughness: .52 });
    const bronze = new THREE.MeshStandardMaterial({ color: 0xb98450, metalness: .25, roughness: .45 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x455570, roughness: .55 });
    const copper = new THREE.MeshStandardMaterial({ color: 0xc47255, metalness: .22, roughness: .48 });
    const yellow = new THREE.MeshBasicMaterial({ color: 0xffcf35 });

    function box(size, position, material, parent = scene) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...position);
      parent.add(mesh);
    }

    function axle(x, radius, length, material, parent = scene, y = axis) {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 32), material);
      mesh.position.set(x, y, 0);
      mesh.rotation.z = -Math.PI / 2;
      parent.add(mesh);
    }

    function label(text, x, y, z) {
      const surface = document.createElement("canvas");
      surface.width = 320;
      surface.height = 80;
      const context = surface.getContext("2d");
      context.font = "650 34px system-ui";
      const width = context.measureText(text).width + 25;
      context.fillStyle = "#fffcf9";
      context.fillRect((320 - width) / 2, 15, width, 50);
      context.fillStyle = "#2a2943";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(text, 160, 40);
      const texture = new THREE.CanvasTexture(surface);
      texture.colorSpace = THREE.SRGBColorSpace;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
      sprite.position.set(x, y, z);
      sprite.scale.set(3.6, .9, 1);
      scene.add(sprite);
    }

    box([12.4, .18, 2.45], [.35, .06, 0], dark);
    box([2.1, 2.67, 1.9], [-4.95, 1.51, 0], base);
    box([1.6, 2.67, 1.9], [.45, 1.51, 0], base);
    box([5.1, 2.42, 1.9], [3.72, 1.39, 0], base);
    for (const x of [-4.65, .25]) {
      box([.8, .76, 1.11], [x, 3.18, 0], housing);
      axle(x, .53, .55, housing);
      axle(x, .43, .61, dark);
    }

    const spindle = new THREE.Group();
    spindle.position.y = axis;
    scene.add(spindle);
    const shaft = new THREE.Mesh(new THREE.BufferGeometry(), steel);
    shaft.rotation.z = -Math.PI / 2;
    spindle.add(shaft);
    const marker = new THREE.Mesh(new THREE.SphereGeometry(.082, 16, 12), yellow);
    spindle.add(marker);
    for (const x of [-3.75, -.65]) {
      axle(x, .46, .24, bronze);
      for (const z of [-.36, .36]) {
        box([.15, 1.26, .14], [x, 2.92, z], bronze);
      }
    }
    for (const z of [-.36, .36]) box([3.23, .14, .14], [gaugeCentre, 2.3, z], bronze);
    box([.16, .14, .88], [gaugeCentre, 2.3, 0], bronze);
    box([.11, .71, .11], [gaugeCentre, 1.91, 0], bronze);

    const weights = new THREE.Group();
    weights.position.set(gaugeCentre, 1.56, 0);
    scene.add(weights);
    box([.85, .2, .65], [0, -.1, 0], housing, weights);
    box([1.05, .22, .81], [0, -.31, 0], bronze, weights);
    box([1.22, .12, .93], [0, -.48, 0], copper, weights);
    const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(gaugeCentre, 1.5, .6), 1.16, 0xb83052, .22, .19);
    scene.add(arrow);

    axle(1.18, .34, .64, dark, spindle, 0);
    for (const x of [.95, 1.2, 1.44]) axle(x, .38, .065, steel, spindle, 0);
    box([2.05, .19, 1.48], [3.03, 2.7, 0], copper);
    axle(3.03, .69, 1.85, bronze);
    for (const x of [2.25, 2.49, 2.73, 2.97, 3.21, 3.45, 3.69, 3.9]) {
      axle(x, .74, .12, housing);
    }
    axle(4.51, .16, 1.12, steel, spindle, 0);
    box([1.08, .17, 1.21], [5.19, 2.69, 0], copper);
    box([.93, 1.13, .87], [5.19, 3.34, 0], housing);

    const display = document.createElement("canvas");
    display.width = 128;
    display.height = 64;
    const digits = display.getContext("2d");
    const face = new THREE.CanvasTexture(display);
    face.colorSpace = THREE.SRGBColorSpace;
    const counter = new THREE.Mesh(new THREE.PlaneGeometry(.76, .38), new THREE.MeshBasicMaterial({ map: face }));
    counter.position.set(5.19, 3.47, .438);
    scene.add(counter);
    label("Bearing", -4.8, 2.57, 1.08);
    label("Specimen", gaugeCentre, 4.31, .1);
    label("Coupling", 1.16, 4.54, .1);
    label("Motor", 3.16, 4.7, .1);
    label("Counter", 5.28, 4.46, .1);
    label("Load F", gaugeCentre + 1.15, .59, .68);

    let previousWidth;
    let previousHeight;
    let previousDiameter;
    let previousTurns;
    let azimuth = .17;
    let pointer;

    function render() {
      const { clientWidth: width, clientHeight: height } = canvas;
      if (!width || !height) return;
      if (width !== previousWidth || height !== previousHeight) {
        const aspect = width / height;
        const halfWidth = Math.max(7.1, 3.35 * aspect);
        const halfHeight = halfWidth / aspect;
        Object.assign(camera, { left: -halfWidth, right: halfWidth, top: halfHeight, bottom: -halfHeight });
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(width, height, false);
        previousWidth = width;
        previousHeight = height;
      }
      camera.position.set(15 * Math.sin(azimuth), 7.6, 15 * Math.cos(azimuth));
      camera.lookAt(0, 2.45, 0);
      renderer.render(scene, camera);
    }

    function orbit(change) {
      azimuth = Math.max(-.78, Math.min(.78, azimuth + change));
      render();
    }

    canvas.addEventListener("pointerdown", event => {
      if (!event.isPrimary || event.button !== 0) return;
      canvas.setPointerCapture(event.pointerId);
      pointer = event.clientX;
    });
    canvas.addEventListener("pointermove", event => {
      if (pointer === undefined || !canvas.hasPointerCapture(event.pointerId)) return;
      orbit((pointer - event.clientX) / canvas.clientWidth * 3);
      pointer = event.clientX;
    });
    canvas.addEventListener("lostpointercapture", () => { pointer = undefined; });
    canvas.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      orbit(event.key === "ArrowLeft" ? -.12 : .12);
    });

    return function update(force, diameter, degrees) {
      if (diameter !== previousDiameter) {
        const radius = diameter * .026;
        const profile = [
          [0, -5.15], [.38, -5.15], [.38, -3.48], [.36, -3.03], [radius + .025, -2.66],
          [radius, -2.42], [radius, -1.98], [radius + .025, -1.74], [.36, -1.37], [.38, -.94],
          [.38, .88], [0, .88]
        ];
        shaft.geometry.dispose();
        shaft.geometry = new THREE.LatheGeometry(profile.map(point => new THREE.Vector2(...point)), 40);
        marker.position.set(gaugeCentre, radius, 0);
        previousDiameter = diameter;
      }
      spindle.rotation.x = THREE.MathUtils.degToRad(degrees % 360);
      weights.scale.y = .52 + .48 * (force - 100) / 700;
      const turns = Math.floor(degrees / 360);
      if (turns !== previousTurns) {
        digits.fillStyle = "#302c3b";
        digits.fillRect(0, 0, 128, 64);
        digits.fillStyle = "#ffe3a2";
        digits.font = "600 30px monospace";
        digits.textAlign = "center";
        digits.textBaseline = "middle";
        digits.fillText(String(turns).padStart(5, "0"), 64, 34, 117);
        face.needsUpdate = true;
        previousTurns = turns;
      }
      render();
    };
  };
}());
