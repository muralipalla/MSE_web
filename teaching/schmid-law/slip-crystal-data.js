(function (root) {
  'use strict';
  const ratio = Math.sqrt(8 / 3);
  const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
  const add = (a, b) => a.map((value, i) => value + b[i]);
  const scale = (a, factor) => a.map(value => value * factor);
  const unit = a => scale(a, 1 / Math.hypot(...a));
  const canonical = (a, hexDirection = false) => {
    const sign = hexDirection && a[3] ? Math.sign(a[3]) : Math.sign(a.find(value => value !== 0));
    return a.map(value => value === 0 ? 0 : value * sign);
  };
  const unique = arrays => [...new Map(arrays.map(a => [a.join(','), a])).values()];
  function cubicFamily(seed) {
    const [a, b, c] = seed;
    const permutations = [[a,b,c],[a,c,b],[b,a,c],[b,c,a],[c,a,b],[c,b,a]];
    return unique(permutations.flatMap(p => [1,-1].flatMap(x => [1,-1].flatMap(y => [1,-1].map(z => canonical([p[0]*x,p[1]*y,p[2]*z]))))));
  }
  function hexRotations(seed) {
    const result = [];
    let current = seed;
    for (let i = 0; i < 6; i += 1) {
      result.push(current);
      current = [-current[1], -current[2], -current[0], current[3]].map(value => value || 0);
    }
    return result;
  }
  function hexDirection(indices) {
    const [u, v, t, w] = indices;
    return [u - (v+t)/2, Math.sqrt(3)*(v-t)/2, w*ratio];
  }
  function hexNormal(indices) {
    const [h, k, , l] = indices;
    return [h, (h+2*k)/Math.sqrt(3), l/ratio];
  }
  const families = {
    fcc: [{id:'fcc111', label:'{111} ⟨110⟩', seed:[1,1,1], directions:[1,1,0], expected:12}],
    bcc: [
      {id:'bcc110', label:'{110} ⟨111⟩', seed:[1,1,0], directions:[1,1,1], expected:12},
      {id:'bcc112', label:'{112} ⟨111⟩', seed:[1,1,2], directions:[1,1,1], expected:12},
      {id:'bcc123', label:'{123} ⟨111⟩', seed:[1,2,3], directions:[1,1,1], expected:24}
    ],
    hcp: [
      {id:'basal', label:'Basal ⟨a⟩ · {0001}', seed:[0,0,0,1], directions:[2,-1,-1,0], expected:3},
      {id:'prismatic', label:'Prismatic ⟨a⟩ · {101\u03050}', seed:[1,0,-1,0], directions:[2,-1,-1,0], expected:3},
      {id:'pyramidal', label:'Pyramidal I ⟨c+a⟩ · {101\u03051}', seed:[1,0,-1,1], directions:[2,-1,-1,3], expected:12}
    ]
  };
  // A direction is admitted only if it lies in the selected plane.
  for (const [structure, choices] of Object.entries(families)) {
    for (const family of choices) {
      const hex = structure === 'hcp';
      const planes = hex ? unique(hexRotations(family.seed).map(p => p[3] ? p : canonical(p))) : cubicFamily(family.seed);
      const directions = hex ? unique(hexRotations(family.directions).map(d => canonical(d, true))) : cubicFamily(family.directions);
      family.systems = [];
      for (const plane of planes) {
        const normal = hex ? hexNormal(plane) : plane;
        for (const direction of directions) {
          const vector = hex ? hexDirection(direction) : direction;
          if (Math.abs(dot(unit(normal), unit(vector))) > 1e-9) continue;
          // Cubic coordinates are centred on the cell. FCC uses an atomic {111}
          // layer; the BCC choices pass through the body-centred atom.
          const offset = hex ? 1 - plane[3]/2 : Math.floor(plane.reduce((s,v) => s+v,0)/2) - plane.reduce((s,v) => s+v,0)/2;
          family.systems.push({plane, direction, normal:unit(normal), vector:unit(vector), offset:offset/Math.hypot(...normal)});
        }
      }
      if (family.systems.length !== family.expected) throw new Error('Incorrect slip-system count: '+family.id);
    }
  }
  const cubeVertices = [];
  for (const x of [-.5,.5]) for (const y of [-.5,.5]) for (const z of [-.5,.5]) cubeVertices.push([x,y,z]);
  const cubeEdges = [];
  cubeVertices.forEach((a,i) => cubeVertices.forEach((b,j) => {if (j>i && Math.abs(Math.hypot(...a.map((v,k)=>v-b[k]))-1)<1e-8) cubeEdges.push([i,j]);}));
  const hexVertices = [-ratio/2,ratio/2].flatMap(z => Array.from({length:6},(_,i)=>[Math.cos(i*Math.PI/3),Math.sin(i*Math.PI/3),z]));
  const hexEdges = [];
  for(let i=0;i<6;i+=1) hexEdges.push([i,(i+1)%6],[i+6,(i+1)%6+6],[i,i+6]);
  const cubeBounds = [0,1,2].flatMap(i => [1,-1].map(sign => ({normal:[0,1,2].map(j=>i===j?sign:0),offset:.5})));
  const hexBounds = Array.from({length:6},(_,i)=>({normal:[Math.cos(Math.PI/6+i*Math.PI/3),Math.sin(Math.PI/6+i*Math.PI/3),0],offset:Math.sqrt(3)/2}));
  hexBounds.push({normal:[0,0,1],offset:ratio/2},{normal:[0,0,-1],offset:ratio/2});
  const cells = {
    fcc:{vertices:cubeVertices,edges:cubeEdges,bounds:cubeBounds,atoms:[...cubeVertices,...[0,1,2].flatMap(i=>[-.5,.5].map(sign=>[0,1,2].map(j=>i===j?sign:0)))],displayScale:2.25},
    bcc:{vertices:cubeVertices,edges:cubeEdges,bounds:cubeBounds,atoms:[...cubeVertices,[0,0,0]],displayScale:2.25},
    hcp:{vertices:hexVertices,edges:hexEdges,bounds:hexBounds,atoms:[...hexVertices,[0,0,-ratio/2],[0,0,ratio/2],[0,1/Math.sqrt(3),0],[-.5,-1/(2*Math.sqrt(3)),0],[.5,-1/(2*Math.sqrt(3)),0]],displayScale:1.4}
  };
  function polygon(cell, system) {
    const points = [];
    const include = p => {if(!points.some(q=>Math.hypot(...p.map((v,i)=>v-q[i]))<1e-7)) points.push(p);};
    for (const [a,b] of cell.edges) {
      const p=cell.vertices[a],q=cell.vertices[b];
      const dp=dot(system.normal,p)-system.offset,dq=dot(system.normal,q)-system.offset;
      if(Math.abs(dp)<1e-8) include(p);
      if(Math.abs(dq)<1e-8) include(q);
      if(dp*dq < -1e-14) include(add(p,scale(q.map((v,i)=>v-p[i]),dp/(dp-dq))));
    }
    const centre=scale(points.reduce(add,[0,0,0]),1/points.length);
    const u=system.vector,n=system.normal;
    const v=[n[1]*u[2]-n[2]*u[1],n[2]*u[0]-n[0]*u[2],n[0]*u[1]-n[1]*u[0]];
    points.sort((a,b)=>{
      const ap=a.map((value,i)=>value-centre[i]),bp=b.map((value,i)=>value-centre[i]);
      return Math.atan2(dot(ap,v),dot(ap,u))-Math.atan2(dot(bp,v),dot(bp,u));
    });
    return {points,centre};
  }
  function lineSpan(cell, centre, direction) {
    let min=-Infinity,max=Infinity;
    for(const bound of cell.bounds) {
      const divisor=dot(bound.normal,direction);
      if(Math.abs(divisor)<1e-9) continue;
      const limit=(bound.offset-dot(bound.normal,centre))/divisor;
      if(divisor>0) max=Math.min(max,limit);else min=Math.max(min,limit);
    }
    return {min,max};
  }
  const api={ratio,families,cells,polygon,lineSpan,dot,add,scale,hexDirection,hexNormal};
  if(typeof module !== 'undefined' && module.exports) module.exports=api;
  else root.SlipCrystalGeometry=api;
}(typeof window !== 'undefined' ? window : this));
