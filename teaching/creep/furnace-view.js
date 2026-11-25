(function () {
  "use strict";

  window.createCreepFurnaceView = function (canvas) {
    const THREE = window.THREE;
    if (!THREE) return null;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    } catch {
      return null;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x191931);
    const camera = new THREE.OrthographicCamera(-4, 4, 4, -4, .1, 45);
    const keyLight = new THREE.DirectionalLight(0xffecd9, 2.3);
    keyLight.position.set(-3, 7, 5);
    scene.add(keyLight, new THREE.HemisphereLight(0xf6f1ff, 0x675a80, 1.65));

    const rig = new THREE.Group();
    rig.position.x = -.65;
    scene.add(rig);
    const frame = new THREE.MeshStandardMaterial({ color: 0x62658a, roughness: .62 });
    const housing = new THREE.MeshStandardMaterial({ color: 0x9b7c86, roughness: .65 });
    const refractory = new THREE.MeshStandardMaterial({ color: 0xb65b43, roughness: .87, side: THREE.DoubleSide });
    const lining = new THREE.MeshStandardMaterial({ color: 0x62273a, roughness: .92, side: THREE.BackSide });
    const heater = new THREE.MeshStandardMaterial({ color: 0xe48d55, emissive: 0xff561f, emissiveIntensity: .65 });
    const grip = new THREE.MeshStandardMaterial({ color: 0x8d9db0, metalness: .4, roughness: .39 });
    const steel = new THREE.MeshStandardMaterial({ color: 0xccdef3, metalness: .28, roughness: .3 });
    const gaugeInk = new THREE.MeshBasicMaterial({ color: 0xffdf82 });
    const weight = new THREE.MeshStandardMaterial({ color: 0x58789b, metalness: .33, roughness: .43 });

    function box(size, x, y, z, material) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(x, y, z);
      rig.add(mesh);
    }

    function cylinder(radius, length, y, material, parent = rig) {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 32), material);
      mesh.position.y = y;
      parent.add(mesh);
      return mesh;
    }

    const platformTop = .29;
    box([4.35, .24, 3.1], 0, platformTop - .12, -.46, frame);
    box([4.08, .28, .72], 0, 6.56, -.05, frame);
    for (const x of [-1.85, 1.85]) {
      box([.29, 6.15, .36], x, 3.4, -.15, frame);
      box([.52, .15, .63], x, .36, -.15, housing);
      box([.47, .17, .56], x, 6.33, -.15, housing);
      box([.56, .28, .46], x * .93, 3.94, -.21, frame);
    }

    // Leave the front of the cylindrical chamber open to expose the specimen and heater rings.
    const opening = 1.08;
    const sweep = 2 * (Math.PI - opening);
    const outerRadius = 1.55;
    const innerRadius = 1.27;
    const chamberHeight = 3.03;
    const chamberY = 4.04;
    for (const [radius, material] of [[outerRadius, housing], [innerRadius, lining]]) {
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, chamberHeight, 56, 1, true, opening, sweep), material);
      wall.position.y = chamberY;
      rig.add(wall);
    }
    for (const y of [chamberY - chamberHeight / 2, chamberY + chamberHeight / 2]) {
      const rim = new THREE.Mesh(new THREE.RingGeometry(innerRadius, outerRadius + .035, 56, 1, opening - Math.PI / 2, sweep), refractory);
      rim.rotation.x = -Math.PI / 2;
      rim.position.y = y;
      rig.add(rim);
    }
    for (const angle of [opening, -opening]) {
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(outerRadius - innerRadius, chamberHeight), refractory);
      const radius = (innerRadius + outerRadius) / 2;
      edge.position.set(radius * Math.sin(angle), chamberY, radius * Math.cos(angle));
      edge.rotation.y = angle - Math.PI / 2;
      rig.add(edge);
    }
    for (let ring = 0; ring < 8; ring++) {
      const points = Array.from({ length: 23 }, (_, index) => {
        const angle = opening + .17 + (sweep - .34) * index / 22;
        return new THREE.Vector3(1.22 * Math.sin(angle), 2.75 + .36 * ring, 1.22 * Math.cos(angle));
      });
      const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 40, .035, 6, false);
      rig.add(new THREE.Mesh(tube, heater));
    }

    const gaugeTop = 4.84;
    const gaugeLength = 1.36;
    const gaugeBottom = gaugeTop - gaugeLength;
    const gaugeRadius = .15;
    const gripRadius = .28;
    const movingEnd = new THREE.Group();
    rig.add(movingEnd);
    cylinder(.16, .56, 6.15, grip);
    cylinder(.34, .32, 5.73, grip);
    cylinder(gripRadius, .62, 5.3, steel);
    const shoulder = new THREE.CylinderGeometry(gripRadius, gaugeRadius, .28, 32);
    const upperShoulder = new THREE.Mesh(shoulder, steel);
    const lowerShoulder = new THREE.Mesh(shoulder, steel);
    upperShoulder.position.y = gaugeTop + .14;
    lowerShoulder.position.y = gaugeBottom - .14;
    lowerShoulder.rotation.z = Math.PI;
    rig.add(upperShoulder);
    movingEnd.add(lowerShoulder);
    const upperGauge = cylinder(gaugeRadius, 1, gaugeTop, steel);
    const lowerGauge = cylinder(gaugeRadius, 1, gaugeBottom, steel, movingEnd);
    cylinder(gaugeRadius + .01, .055, gaugeTop - .035, gaugeInk);
    cylinder(gaugeRadius + .01, .055, gaugeBottom + .035, gaugeInk, movingEnd);
    cylinder(gripRadius, .15, 3.14, steel, movingEnd);
    cylinder(.34, .31, 2.94, grip, movingEnd);
    cylinder(.105, 1.21, 2.21, grip, movingEnd);

    const stack = new THREE.Group();
    stack.position.y = 1.72;
    movingEnd.add(stack);
    const plateCentres = [-.095, -.25, -.405];
    const plateHeight = .135;
    const stackDepth = -plateCentres[plateCentres.length - 1] + plateHeight / 2;
    for (const [plate, y] of plateCentres.entries()) {
      cylinder(.53 - .025 * plate, plateHeight, y, weight, stack);
    }
    const pull = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(.79, 1.66, .47),
      .59, 0xffa685, .15, .14);
    movingEnd.add(pull);

    const bracketGeometry = new THREE.BufferGeometry();
    const bracketPoints = new Float32Array(12);
    bracketGeometry.setAttribute("position", new THREE.BufferAttribute(bracketPoints, 3));
    const bracket = new THREE.Line(bracketGeometry, new THREE.LineBasicMaterial({ color: 0xffdf82, depthTest: false }));
    bracket.frustumCulled = false;
    rig.add(bracket);

    function callout(ink, x, y, z, parent = rig) {
      const surface = document.createElement("canvas");
      surface.width = 420;
      surface.height = 92;
      const context = surface.getContext("2d");
      const map = new THREE.CanvasTexture(surface);
      map.colorSpace = THREE.SRGBColorSpace;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, depthTest: false }));
      sprite.position.set(x, y, z);
      sprite.scale.set(2.65, .58, 1);
      parent.add(sprite);
      return {
        sprite,
        write(text) {
          context.clearRect(0, 0, surface.width, surface.height);
          context.font = "700 43px system-ui";
          const width = context.measureText(text).width + 28;
          context.fillStyle = "#191931";
          context.fillRect((surface.width - width) / 2, 11, width, 70);
          context.fillStyle = ink;
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.fillText(text, 210, 46);
          map.needsUpdate = true;
        }
      };
    }

    const temperatureLabel = callout("#ffc19d", 2.62, 5.27, .57);
    const gaugeLabel = callout("#ffdf82", 2.7, 4.07, .94);
    gaugeLabel.write("Gauge length");
    const forceLabel = callout("#ffd1bd", 1.96, 1.42, .59, movingEnd);
    forceLabel.write("Fixed load");

    let lastWidth;
    let lastHeight;
    let lastTemperature;
    let azimuth = .16;
    let pointerX;

    function render() {
      const { clientWidth: width, clientHeight: height } = canvas;
      if (!width || !height) return;
      if (width !== lastWidth || height !== lastHeight) {
        const aspect = width / height;
        const halfHeight = Math.max(3.59, 3.35 / aspect);
        Object.assign(camera, { left: -halfHeight * aspect, right: halfHeight * aspect, top: halfHeight, bottom: -halfHeight });
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(width, height, false);
        lastWidth = width;
        lastHeight = height;
      }
      camera.position.set(15 * Math.sin(azimuth), 6.32, 15 * Math.cos(azimuth));
      camera.lookAt(0, 3.41, 0);
      renderer.render(scene, camera);
    }

    function orbit(change) {
      azimuth = THREE.MathUtils.clamp(azimuth + change, -.5, .67);
      render();
    }

    canvas.addEventListener("pointerdown", event => {
      if (!event.isPrimary || event.button !== 0) return;
      canvas.setPointerCapture(event.pointerId);
      pointerX = event.clientX;
    });
    canvas.addEventListener("pointermove", event => {
      if (pointerX === undefined || !canvas.hasPointerCapture(event.pointerId)) return;
      orbit((pointerX - event.clientX) * 2.7 / canvas.clientWidth);
      pointerX = event.clientX;
    });
    canvas.addEventListener("lostpointercapture", () => { pointerX = undefined; });
    canvas.addEventListener("keydown", event => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      orbit(event.key === "ArrowLeft" ? -.12 : .12);
    });

    return function update(strain, temperature, stress, ruptured) {
      // Strain is in percent. Amplify the gauge extension so both ends are easy to follow.
      const extension = .41 * strain;
      const halfGauge = (gaugeLength + extension) / 2;
      stack.scale.y = stress / 450;
      // At rupture the detached lower assembly drops until the weight reaches the base.
      const travel = ruptured ? stack.position.y - stackDepth * stack.scale.y - platformTop : extension;
      movingEnd.position.y = -travel;
      upperGauge.position.y = gaugeTop - halfGauge / 2;
      lowerGauge.position.y = gaugeBottom + halfGauge / 2;
      upperGauge.scale.y = lowerGauge.scale.y = halfGauge;
      pull.visible = !ruptured;

      const yTop = gaugeTop + .08;
      const yBottom = gaugeBottom - travel + .15;
      bracketPoints.set([1.27, yTop, .94, 1.52, yTop, .94, 1.52, yBottom, .94, 1.27, yBottom, .94]);
      bracketGeometry.attributes.position.needsUpdate = true;
      bracket.visible = !ruptured;
      gaugeLabel.sprite.position.y = (yTop + yBottom) / 2;
      gaugeLabel.sprite.visible = forceLabel.sprite.visible = !ruptured;
      if (temperature !== lastTemperature) {
        heater.emissiveIntensity = .42 + .46 * (temperature - 625) / 35;
        temperatureLabel.write(temperature + " °C furnace");
        lastTemperature = temperature;
      }
      render();
    };
  };
}());
