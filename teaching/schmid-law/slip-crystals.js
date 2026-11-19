(async function () {
  'use strict';
  const panel = document.getElementById('crystal-explorer');
  const data = window.SlipCrystalGeometry;
  if (!panel || !data) return;
  const get = id => document.getElementById('crystal-' + id);
  const tabs = [...panel.querySelectorAll('[data-crystal]')];
  const views = [...panel.querySelectorAll('[data-crystal-view]')];
  const indexed = (values, brackets) => brackets[0] + values.map(value => value < 0 ? Math.abs(value) + '\u0305' : value).join(' ') + brackets[1];
  const indexTeX = (values, brackets) => brackets[0] + values.map(value => value < 0 ? '\\bar{' + Math.abs(value) + '}' : value).join('') + brackets[1];
  const spokenIndices = values => values.map(value => value < 0 ? 'minus '+Math.abs(value) : value).join(', ');
  const indexHTML = (values, brackets) => '<span role="img" aria-label="' + brackets[0] + values.map(value => value < 0 ? 'minus '+Math.abs(value) : value).join(', ') + brackets[1] + '">' + brackets[0] + values.map(value => value < 0 ? '<span class="slip-negative">'+Math.abs(value)+'</span>' : value).join(' ') + brackets[1] + '</span>';
  const inline = (tex, fallback) => '<span data-tex="' + tex + '">' + fallback + '</span>';
  function mathValue(id, tex, fallback) {
    get(id).innerHTML = fallback;
    window.MSEMath?.render(get(id), tex);
  }
  let structure = 'fcc';
  let family = data.families.fcc[0];
  let system = family.systems[0];
  let draw = () => {};
  let changeView = () => {};
  let toggleAtoms = () => {};

  function updateSystem() {
    system = family.systems[Number(get('system').value)];
    mathValue('plane', indexTeX(system.plane,'()'), indexHTML(system.plane,'()'));
    mathValue('direction', indexTeX(system.direction,'[]'), indexHTML(system.direction,'[]'));
    mathValue('burgers', (structure === 'hcp' ? '\\frac{1}{3}' : '\\frac{a}{2}') + indexTeX(system.direction,'[]'), (structure === 'hcp' ? '1/3 ' : '<i>a</i>/2 ') + indexHTML(system.direction,'[]'));
    get('count').textContent = family.systems.length + ' geometrical slip systems in this family.';
    const descriptions = {
      fcc:'The selected close-packed ' + inline('\\{111\\}','{111}') + ' layer contains three distinct ' + inline('\\langle110\\rangle','⟨110⟩') + ' slip directions. Four plane orientations give 12 systems.',
      bcc:'The selected plane contains a ' + inline('\\langle111\\rangle','⟨111⟩') + ' slip direction. BCC has no close-packed planes; these are geometrical candidates whose activity depends on slip resistance and test conditions.',
      basal:'Basal ' + inline('\\langle a\\rangle','⟨a⟩') + ' slip lies in the close-packed basal layer. It produces no normal plastic strain along the ' + inline('c','c') + ' axis.',
      prismatic:'Prismatic ' + inline('\\langle a\\rangle','⟨a⟩') + ' slip lies in a plane parallel to the ' + inline('c','c') + ' axis. Its Burgers vector remains in the basal plane.',
      pyramidal:'Pyramidal ' + inline('\\langle c+a\\rangle','⟨c+a⟩') + ' slip has both basal and ' + inline('c','c') + '-axis components. The inclined plane contains the full slip direction.'
    };
    get('description').innerHTML = descriptions[structure === 'hcp' ? family.id : structure];
    get('geometry-note').innerHTML = structure === 'hcp'
      ? 'Ideal HCP geometry: ' + inline('c/a=\\sqrt{8/3}\\approx1.633','c/a = √(8/3) ≈ 1.633') + ', with ABAB stacking. Actual ' + inline('c/a','c/a') + ' varies between materials. In HCP, ' + inline('\\frac13[uvtw]','1/3[uvtw]') + ' is one third of the lattice-vector sum ' + inline('u\\mathbf a_1+v\\mathbf a_2+t\\mathbf a_3+w\\mathbf c','u a₁ + v a₂ + t a₃ + w c') + '.'
      : 'The cubic cell edge is ' + inline('a','a') + '. Orange atoms have their centres in the selected plane. The blue ' + inline('n','n') + ' arrow is the plane normal; the purple ' + inline('d','d') + ' arrow is an in-plane slip direction. The model shows perfect-dislocation Burgers vectors.';
    window.MSEMath?.renderAll(get('description'));
    window.MSEMath?.renderAll(get('geometry-note'));
    get('scene').setAttribute('aria-label', structure.toUpperCase() + ' crystal: plane (' + spokenIndices(system.plane) + '), slip direction [' + spokenIndices(system.direction) + ']. Plane normal is perpendicular to the slip direction. Use arrow keys or view buttons to rotate.');
    draw();
  }
  function selectFamily() {
    family = data.families[structure].find(item => item.id === get('family').value);
    get('system').replaceChildren(...family.systems.map((item, i) => {
      const option = new Option(indexed(item.plane,'()') + ' ' + indexed(item.direction,'[]'), String(i));
      option.setAttribute('aria-label','Plane (' + spokenIndices(item.plane) + '), direction [' + spokenIndices(item.direction) + ']');
      return option;
    }));
    updateSystem();
  }
  function selectStructure(value) {
    structure = value;
    tabs.forEach(tab => tab.setAttribute('aria-pressed', String(tab.dataset.crystal === value)));
    get('family').replaceChildren(...data.families[value].map(item => {
      const option = new Option(item.label,item.id);
      const name = {basal:'Basal a',prismatic:'Prismatic a',pyramidal:'First-order pyramidal c plus a'}[item.id] || value.toUpperCase();
      option.setAttribute('aria-label',name + ', plane family (' + spokenIndices(item.seed) + ')');
      return option;
    }));
    selectFamily();
    changeView('reset');
  }
  tabs.forEach(tab => tab.addEventListener('click', () => selectStructure(tab.dataset.crystal)));
  get('family').addEventListener('change', selectFamily);
  get('system').addEventListener('change', updateSystem);
  get('show-atoms').addEventListener('change', () => toggleAtoms());
  views.forEach(button => button.addEventListener('click', () => changeView(button.dataset.crystalView)));
  selectStructure('fcc');
  await window.MSEMath?.fontsReady();

  try {
    const host = get('scene');
    const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,2));
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-3,3,2.5,-2.5,.1,100);
    camera.position.set(5,3.8,1.7);
    camera.lookAt(0,0,0);
    scene.add(new THREE.HemisphereLight(0xffffff,0x737c93,2.2));
    const light = new THREE.DirectionalLight(0xffffff,2.5);
    light.position.set(4,6,7);
    scene.add(light);
    let model;
    let atoms;
    let needsFrame = false;
    let onscreen = true;
    let lastPointer = null;
    const orientation = new THREE.Euler(0,0,0);
    function invalidate() {
      if(needsFrame || !onscreen) return;
      needsFrame=true;
      requestAnimationFrame(() => {needsFrame=false;renderer.render(scene,camera);});
    }
    const world = p => new THREE.Vector3(p[0],p[2],-p[1]);
    const dispose = object => object.traverse(child => {
      child.geometry?.dispose();
      const materials=Array.isArray(child.material)?child.material:[child.material];
      materials.filter(Boolean).forEach(material=>{material.map?.dispose();material.dispose();});
    });
    function lines(points,color,opacity=1) {
      return new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity}));
    }
    function label(text,position,color,size=.16) {
      const canvas=document.createElement('canvas');
      canvas.width=256;canvas.height=96;
      const context=canvas.getContext('2d');
      context.font='italic 68px KaTeX_Math, "Cambria Math", serif';
      context.textAlign='center';context.textBaseline='middle';
      context.lineWidth=8;context.strokeStyle='rgba(246,247,251,.9)';
      context.fillStyle=color;
      const subscript = {'a₁':'1','a₂':'2','a₃':'3'}[text];
      if(subscript) {
        context.strokeText('a',120,43);context.fillText('a',120,43);
        context.font='36px KaTeX_Main, "Cambria Math", serif';
        context.lineWidth=4;
        context.strokeText(subscript,145,64);context.fillText(subscript,145,64);
      } else {
        context.strokeText(text,128,48);context.fillText(text,128,48);
      }
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),depthTest:false}));
      sprite.position.copy(world(position));
      sprite.scale.set(size*256/96,size,1);
      sprite.renderOrder=8;
      model.add(sprite);
    }
    function arrow(direction,origin,length,color) {
      const result=new THREE.ArrowHelper(world(direction).normalize(),world(origin),length,color,length*.2,length*.1);
      result.traverse(child=>{if(child.material){child.material.depthTest=false;child.material.depthWrite=false;child.material.transparent=true;child.renderOrder=6;}});
      model.add(result);
      return result;
    }
    draw = () => {
      if(model){scene.remove(model);dispose(model);}
      model=new THREE.Group();
      model.rotation.copy(orientation);
      const cell=data.cells[structure];
      model.scale.setScalar(cell.displayScale);
      scene.add(model);
      model.add(lines(cell.edges.flatMap(([a,b])=>[world(cell.vertices[a]),world(cell.vertices[b])]),0x66758a,.8));
      const section=data.polygon(cell,system);
      const positions=section.points.flatMap(p=>world(p).toArray());
      const triangles=[];
      for(let i=1;i<section.points.length-1;i+=1) triangles.push(0,i,i+1);
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      geometry.setIndex(triangles);geometry.computeVertexNormals();
      const plane=new THREE.Mesh(geometry,new THREE.MeshPhongMaterial({color:0xe79c3e,side:THREE.DoubleSide,transparent:true,opacity:.45,depthWrite:false}));
      plane.renderOrder=1;
      model.add(plane);
      const outline=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(section.points.map(world)),new THREE.LineBasicMaterial({color:0xb76a1d,depthTest:false}));
      outline.renderOrder=4;model.add(outline);
      atoms=new THREE.Group();
      const sphere=new THREE.SphereGeometry(structure==='hcp'?.065:.055,24,16);
      const ordinary=new THREE.MeshPhongMaterial({color:0x7a96b1,shininess:50});
      const onPlane=new THREE.MeshPhongMaterial({color:0xe8a23f,shininess:45});
      for(const position of cell.atoms) {
        const inPlane=Math.abs(data.dot(system.normal,position)-system.offset)<1e-7;
        const atom=new THREE.Mesh(sphere,inPlane?onPlane:ordinary);
        atom.position.copy(world(position));
        atoms.add(atom);
      }
      atoms.visible=get('show-atoms').checked;
      model.add(atoms);
      const span=data.lineSpan(cell,section.centre,system.vector);
      const start=data.add(section.centre,data.scale(system.vector,span.min*.75));
      const length=(span.max-span.min)*.75;
      arrow(system.vector,start,length,0x7546a8);
      label('d',data.add(start,data.scale(system.vector,length+.13)),'#633692',structure==='hcp'?.24:.18);
      const normalLength=structure==='hcp'?.63:.4;
      arrow(system.normal,section.centre,normalLength,0x2873ae);
      label('n',data.add(section.centre,data.scale(system.normal,normalLength+.11)),'#155787',structure==='hcp'?.24:.18);
      // A small lattice-axis key rotates with the crystal. It is separated from
      // the cell so that reference axes cannot be mistaken for slip arrows.
      const axisOrigin=structure==='hcp'?[-1.25,-.75,-data.ratio/2-.15]:[-.8,-.62,-.65];
      const axisLength=structure==='hcp'?.38:.25;
      const referenceAxes=structure==='hcp'
        ? [{v:[1,0,0],label:'a₁'},{v:[-.5,Math.sqrt(3)/2,0],label:'a₂'},{v:[-.5,-Math.sqrt(3)/2,0],label:'a₃'},{v:[0,0,1],label:'c'}]
        : [{v:[1,0,0],label:'x'},{v:[0,1,0],label:'y'},{v:[0,0,1],label:'z'}];
      for(const axis of referenceAxes) {
        arrow(axis.v,axisOrigin,axisLength,0x596574);
        label(axis.label,data.add(axisOrigin,data.scale(axis.v,axisLength+.08)),'#445064',structure==='hcp'?.22:.15);
      }
      host.dataset.crystalReady='true';
      host.dataset.system=family.id+':'+get('system').value;
      invalidate();
    };
    toggleAtoms=()=>{if(atoms) atoms.visible=get('show-atoms').checked;invalidate();};
    changeView=action=>{
      if(action==='reset') orientation.set(0,0,0);
      if(action==='rotate-left') orientation.y-=Math.PI/6;
      if(action==='rotate-right') orientation.y+=Math.PI/6;
      if(action==='plane') {
        // Align the normal with the existing camera direction; put the chosen
        // slip direction horizontally in the face-on view.
        const normal=world(system.normal).normalize();
        const direction=world(system.vector).normalize();
        const inPlane=new THREE.Vector3().crossVectors(normal,direction).normalize();
        const source=new THREE.Matrix4().makeBasis(direction,inPlane,normal);
        const targetNormal=camera.position.clone().normalize();
        const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
        const up=new THREE.Vector3().crossVectors(targetNormal,right).normalize();
        const target=new THREE.Matrix4().makeBasis(right,up,targetNormal);
        orientation.setFromRotationMatrix(target.multiply(source.transpose()));
      }
      if(model) model.rotation.copy(orientation);
      invalidate();
    };
    host.replaceChildren(renderer.domElement);
    function resize() {
      const width=host.clientWidth,height=host.clientHeight;
      if(!width||!height)return;
      const halfHeight=2.55*Math.max(1,height/width);
      camera.left=-halfHeight*width/height;camera.right=halfHeight*width/height;
      camera.top=halfHeight;camera.bottom=-halfHeight;
      camera.updateProjectionMatrix();renderer.setSize(width,height,false);invalidate();
    }
    new ResizeObserver(resize).observe(host);
    if('IntersectionObserver' in window) new IntersectionObserver(entries=>{onscreen=entries[0].isIntersecting;if(onscreen)invalidate();}).observe(host);
    renderer.domElement.addEventListener('pointerdown',event=>{lastPointer=[event.clientX,event.clientY];renderer.domElement.setPointerCapture(event.pointerId);});
    renderer.domElement.addEventListener('pointermove',event=>{
      if(!lastPointer)return;
      orientation.y+=(event.clientX-lastPointer[0])*.009;
      orientation.x+=(event.clientY-lastPointer[1])*.009;
      model.rotation.copy(orientation);lastPointer=[event.clientX,event.clientY];invalidate();
    });
    for(const event of ['pointerup','pointercancel','lostpointercapture']) renderer.domElement.addEventListener(event,()=>{lastPointer=null;});
    host.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key))return;
      event.preventDefault();
      if(event.key==='Home') orientation.set(0,0,0);
      if(event.key==='ArrowLeft') orientation.y-=Math.PI/12;
      if(event.key==='ArrowRight') orientation.y+=Math.PI/12;
      if(event.key==='ArrowUp') orientation.x-=Math.PI/12;
      if(event.key==='ArrowDown') orientation.x+=Math.PI/12;
      model.rotation.copy(orientation);invalidate();
    });
    resize();draw();
  } catch(error) {
    console.warn('Crystal view unavailable',error);
    views.forEach(button=>{button.disabled=true;});
    get('show-atoms').disabled=true;
  }
}());
