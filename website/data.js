import {
  STLLoader
} from './jsm/loaders/STLLoader.js';

let raining = false;

var windChange = false;
var rainChange = false;

var testGrassAngleEnabled = false;
var grassAngle = 40.0;
var grassStartXY = [null, null];
var grassEndXY = [null, null];

var grassWindSpeed = 2.5;
var grassDirectionX = 0.0; 
var grassDirectionY = 0.0;

var halfAngle = -0.6;
var canvas = document.getElementById("canvas");

const mobile = (navigator.userAgent.match(/Android/i) ||
  navigator.userAgent.match(/webOS/i) ||
  navigator.userAgent.match(/iPhone/i) ||
  navigator.userAgent.match(/BlackBerry/i) ||
  navigator.userAgent.match(/Windows Phone/i)
);
var joints = 4;
var bladeWidth = 0.50;
var bladeHeight = 1;
var width = 100;
var resolution = 32;
var delta = width / resolution;
var radius = 120;
var speed = 2;
var pos = new THREE.Vector2(0, 0);

var instances = 6000;

var elevation = 0;
var azimuthDirection = true;
var azimuth = 2.34;

var fogFade = 0.005;

//Lighting variables for grass
var ambientStrength = 0.6;
var translucencyStrength = 1.4;
var specularStrength = 0.5;
var diffuseStrength = 2.2;
var shininess = 256;
var sunColour = new THREE.Vector3(1.0, 1.0, 1.0);
var specularColour = new THREE.Vector3(1.0, 1.0, 1.0);
var rotate = false;

var cloud;

var scene = new THREE.Scene();
//Sky scene
var backgroundScene = new THREE.Scene();

var renderer = new THREE.WebGLRenderer({
  antialias: true,
  canvas: canvas
});
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMapEnabled = true;

//Camera
var distance = 1500;

var FOV = 22; //2 * Math.atan(window.innerHeight / distance) * 180 / Math.PI;

var camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 1, 200000);

camera.position.set(-90, 20, -70);
camera.lookAt(new THREE.Vector3(0, 0, 0));

scene.add(camera);
backgroundScene.add(camera);

//Light for ground plane
var ambientLight = new THREE.AmbientLight(0xe0e0e0, 0.1);
scene.add(ambientLight);

{
  var light = new THREE.DirectionalLight(0xffffff, 0.5);
  light.position.set(50, 200, 100);
  light.position.multiplyScalar(1.3);

  light.castShadow = true;

  light.shadow.mapSize.width = 1024;
  light.shadow.mapSize.height = 1024;

  var d = 300;

  light.shadow.camera.left = -d;
  light.shadow.camera.right = d;
  light.shadow.camera.top = d;
  light.shadow.camera.bottom = -d;
  light.shadow.darkness = 0.6;
  light.shadow.camera.near = 0.1;

  light.shadow.camera.far = 1000;

  scene.add(light);
} { 
  var light = new THREE.DirectionalLight(0xffffff, 0.5);
  light.position.set(-100, 100, -100);
  light.position.multiplyScalar(1.3);
  light.castShadow = false;
  scene.add(light);
}

const qhyMeshPositionY = 9;
var qhyMesh; {
  var loaderStl = new STLLoader();
  loaderStl.load('models/device1.stl', function(geometry) {

    var textureLoader = new THREE.TextureLoader();
    var textureNoiseColor = textureLoader.load("shaders/matcap/disturb.jpg");
    textureNoiseColor.repeat.set(1, 1);
    textureNoiseColor.wrapS = textureNoiseColor.wrapT = THREE.RepeatWrapping;
    textureNoiseColor.encoding = THREE.sRGBEncoding;

    var material = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      shininess: 50
    });


    var cubeGeometry = new THREE.BoxBufferGeometry(150, 150, 150);

    var mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(0, qhyMeshPositionY, 0.6);
    mesh.rotation.set(0, -Math.PI / 2, 0);
    mesh.scale.set(0.03, 0.03, 0.03);

    mesh.rotation.y = Math.PI / 2 / 100 * 55;

    mesh.castShadow = true;

    qhyMesh = mesh;
    scene.add(mesh);
  });
}

{
  var geometry = new THREE.CylinderBufferGeometry(4, 4, 2, 32);
  var material = new THREE.MeshPhongMaterial({
    color: 0xffffff
  });

  mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.x -= 0.0;
  mesh.position.z += 0.5;
  mesh.position.y += 1.0;
  scene.add(mesh);
}


//OrbitControls.js for camera manipulation
var controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.autoRotate = rotate;
controls.autoRotateSpeed = 1.0;
controls.maxDistance = 80.0;

controls.minDistance = 5.0;
//Disable keys to stop arrow keys from moving the camera
controls.enableKeys = false;
controls.update();

window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  renderer.setSize(window.innerWidth, window.innerHeight);
  backgroundMaterial.uniforms.resolution.value = new THREE.Vector2(canvas.width, canvas.height);
  //FOV = 2 * Math.atan(window.innerHeight / distance) * 180 / Math.PI;
  camera.fov = FOV;
  camera.updateProjectionMatrix();
  backgroundMaterial.uniforms.fov.value = FOV;
}

const backgroundMaterial = new THREE.ShaderMaterial({
  uniforms: {
    sunDirection: {
      type: 'vec3',
      value: new THREE.Vector3(Math.sin(azimuth), Math.sin(elevation), -Math.cos(azimuth))
    },
    resolution: {
      type: 'vec2',
      value: new THREE.Vector2(canvas.width, canvas.height)
    },
    fogFade: {
      type: 'float',
      value: fogFade
    },
    fov: {
      type: 'float',
      value: FOV
    }
  },
  vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4( position, 1.0 );
            }
    `,
  fragmentShader: fragmentShader
});
backgroundMaterial.castShadow = true;
backgroundMaterial.receiveShadow = true;
backgroundMaterial.depthWrite = false;
var backgroundGeometry = new THREE.PlaneBufferGeometry(2, 2, 1, 1);
var background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
background.castShadow = true;
background.receiveShadow = true;
backgroundScene.add(background);

// jancee - ground
var loaderxx = new THREE.TextureLoader();
loaderxx.castShadow = true;
loaderxx.receiveShadow = true;
var groundTexture = loaderxx.load('./src/grasslight-big.jpg');
groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
groundTexture.repeat.set(25, 25);
groundTexture.anisotropy = 16;
groundTexture.encoding = THREE.sRGBEncoding;
groundTexture.castShadow = true;
var groundMaterialxx = new THREE.MeshLambertMaterial({
  map: groundTexture
});
groundMaterialxx.castShadow = true;
groundMaterialxx.receiveShadow = true;
var meshxx = new THREE.Mesh(new THREE.PlaneBufferGeometry(width, width), groundMaterialxx);
meshxx.position.y = 0;
meshxx.rotation.x = -Math.PI / 2;
meshxx.castShadow = true;
meshxx.receiveShadow = true;
scene.add(meshxx);

if (false) {
  var grid = new THREE.GridHelper(200, 20, 0x000000, 0x000000);
  grid.material.opacity = 0.2;
  grid.material.transparent = true;
  scene.add(grid);

  var helper = new THREE.AxisHelper(10);
  scene.add(helper);
}

if (false) {
  var geometry = new THREE.BoxBufferGeometry(6, 6, 6);
  var material = new THREE.MeshPhongMaterial({
    color: 0x003300
  });
  var mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.y = 3;
  scene.add(mesh);
}

renderer.autoClear = false;

//************** Ground **************
//Ground material is a modification of the existing THREE.MeshPhongMaterial rather than one from scratch
var groundBaseGeometry = new THREE.PlaneBufferGeometry(width, width, resolution, resolution);
groundBaseGeometry.lookAt(new THREE.Vector3(0, 1, 0));
groundBaseGeometry.verticesNeedUpdate = true;
groundBaseGeometry.castShadow = true;
groundBaseGeometry.receiveShadow = true;

var groundGeometry = new THREE.PlaneBufferGeometry(width, width, resolution, resolution);
groundGeometry.addAttribute('basePosition', groundBaseGeometry.getAttribute("position"));
groundGeometry.lookAt(new THREE.Vector3(0, 1, 0));
groundGeometry.verticesNeedUpdate = true;
groundGeometry.castShadow = true;
groundGeometry.receiveShadow = true;

var groundMaterial = new THREE.MeshPhongMaterial({
  color: 0x000300
});
groundMaterial.castShadow = true;
groundGeometry.receiveShadow = true;

var groundVertexPrefix = `
    attribute vec3 basePosition;
    uniform float delta;
    uniform float posX;
    uniform float posZ;
    uniform float radius;
    uniform float width;

    float placeOnSphere(vec3 v){
      float theta = acos(v.z/radius);
      float phi = acos(v.x/(radius * sin(theta)));
      float sV = radius * sin(theta) * sin(phi);
      //If undefined, set to default value
      if(sV != sV){
        sV = v.y;
      }
      return sV;
    }

    vec3 norm;
    vec3 pos;

    //Get the position of the ground from the [x,z] coordinates, the sphere and the noise height field
    vec3 getPosition(vec3 pos, float epsX, float epsZ){
      vec3 temp;
      temp.x = pos.x + epsX;
      temp.z = pos.z + epsZ;
      temp.y = max(0.0, placeOnSphere(temp)) - radius;
      //temp.y += getYPosition(vec2(basePosition.x+epsX+delta*floor(posX), basePosition.z+epsZ+delta*floor(posZ)));
      return temp;
    }

    //Find the normal at pos as the cross product of the central-differences in x and z directions
    vec3 getNormal(vec3 pos){
      float eps = 1e-1;

      vec3 tempP = getPosition(pos, eps, 0.0);
      vec3 tempN = getPosition(pos, -eps, 0.0);

      vec3 slopeX = tempP - tempN;

      tempP = getPosition(pos, 0.0, eps);
      tempN = getPosition(pos, 0.0, -eps);

      vec3 slopeZ = tempP - tempN;

      vec3 norm = normalize(cross(slopeZ, slopeX));
      return norm;
    }
    `;

var groundShader;
groundMaterial.onBeforeCompile = function(shader) {
  shader.uniforms.delta = {
    value: delta
  };
  shader.uniforms.posX = {
    value: pos.x
  };
  shader.uniforms.posZ = {
    value: pos.z
  };
  shader.uniforms.radius = {
    value: radius
  };
  shader.uniforms.width = {
    value: width
  };
  shader.vertexShader = groundVertexPrefix + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace(
    '#include <beginnormal_vertex>',
    `//https://dev.to/maurobringolf/a-neat-trick-to-compute-modulo-of-negative-numbers-111e
          pos.x = basePosition.x - mod(mod((delta*posX),delta) + delta, delta) + 1;
          pos.z = basePosition.z - mod(mod((delta*posZ),delta) + delta, delta);
          pos.y = max(0.0, placeOnSphere(pos)) - radius;
          //pos.y += 10.0*getYPosition(vec2(basePosition.x+delta*floor(posX), basePosition.z+delta*floor(posZ)));
          vec3 objectNormal = getNormal(pos);
    #ifdef USE_TANGENT
          vec3 objectTangent = vec3( tangent.xyz );
    #endif`
  );
  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    `vec3 transformed = vec3(pos);`
  );
  groundShader = shader;
};

var ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.castShadow = true;
ground.receiveShadow = true;
ground.geometry.computeVertexNormals();
scene.add(ground);

//************** Grass **************
var grassVertexSource = `
    precision mediump float;
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec3 offset;
    attribute vec2 uv;
    attribute vec2 halfRootAngle;
    attribute float scale;
    attribute float index;
    uniform float time;
    uniform float halfxx;
    uniform float grassDirectionX;
    uniform float grassDirectionY;

    uniform float delta;
    uniform float posX;
    uniform float posZ;
    uniform float radius;
    uniform float width;

    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying float frc;
    varying float idx;

    //https://www.geeks3d.com/20141201/how-to-rotate-a-vertex-by-a-quaternion-in-glsl/
    vec3 rotateVectorByQuaternion(vec3 v, vec4 q){
      return 2.0 * cross(q.xyz, v * q.w + cross(q.xyz, v)) + v;
    }

    float placeOnSphere(vec3 v){
      float theta = acos(v.z/radius);
      float phi = acos(v.x/(radius * sin(theta)));
      float sV = radius * sin(theta) * sin(phi);
      //If undefined, set to default value
      if(sV != sV){
        sV = v.y;
      }
      return sV;
    }

    void main() {

        //Vertex height in blade geometry
        frc = position.y / float(` + bladeHeight + `);

        //Scale vertices
      vec3 vPosition = position;
        vPosition.y *= scale;

        //Invert scaling for normals
        vNormal = normal;
        vNormal.y /= scale;

        //Rotate blade around Y axis
      vec4 direction = vec4(0.0, halfRootAngle.x, 0.0, halfRootAngle.y);
        vPosition = rotateVectorByQuaternion(vPosition, direction);
        vNormal = rotateVectorByQuaternion(vNormal, direction);

      //UV for texture
      vUv = uv;

        vec3 pos;
        vec3 globalPos;
        vec3 tile;

        globalPos.x = offset.x-posX*delta;
        globalPos.z = offset.z-posZ*delta;

        tile.x = floor((globalPos.x + 0.5 * width) / width);
        tile.z = floor((globalPos.z + 0.5 * width) / width);

        pos.x = globalPos.x - tile.x * width;
        pos.z = globalPos.z - tile.z * width;

        pos.y = 0.0;
        //pos.y += 10.0*getYPosition(pos.xz);

        //Wind is sine waves in time
        float noise = sin(0.1 * pos.x + time);
        float halfAngle = noise * 0.1;
        noise = 0.5 + 0.5 * cos(0.05 * pos.x + 0.25 * time);
        // halfAngle -= noise * 0.2;
        halfAngle = halfxx;

        float sss;
        float xxx = -8.0 * 3.14159265 / 180.0;
        direction = normalize(vec4(grassDirectionX, 1.0, grassDirectionY, 0.0));

        //Rotate blade and normals according to the wind
      vPosition = rotateVectorByQuaternion(vPosition, direction);
        vNormal = rotateVectorByQuaternion(vNormal, direction);

        //Move vertex to global location
        vPosition += pos;

        //Index of instance for varying colour in fragment shader
        idx = index;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition, 1.0);

    }`;

//Define base geometry that will be instanced. We use a plane for an individual blade of grass
var grassBaseGeometry = new THREE.PlaneBufferGeometry(bladeWidth, bladeHeight, 1, joints);
grassBaseGeometry.translate(0, bladeHeight / 2, 0);
grassBaseGeometry.castShadow = true;
grassBaseGeometry.receiveShadow = true;

//Define the bend of the grass blade as the combination of three quaternion rotations
let vertex = new THREE.Vector3();
vertex.castShadow = true;
vertex.receiveShadow = true;
let quaternion0 = new THREE.Quaternion();
quaternion0.castShadow = true;
quaternion0.receiveShadow = true;
let quaternion1 = new THREE.Quaternion();
quaternion1.castShadow = true;
quaternion1.receiveShadow = true;
let x, y, z, w, angle, sinAngle, rotationAngle;

//Rotate around Y
angle = 0.05;
sinAngle = Math.sin(angle / 2.0);
var rotationAxis = new THREE.Vector3(0, 1, 0);
x = rotationAxis.x * sinAngle;
y = rotationAxis.y * sinAngle;
z = rotationAxis.z * sinAngle;
w = Math.cos(angle / 2.0);
quaternion0.set(x, y, z, w);

//Rotate around X
angle = 0.3;
sinAngle = Math.sin(angle / 2.0);
rotationAxis.set(1, 0, 0);
x = rotationAxis.x * sinAngle;
y = rotationAxis.y * sinAngle;
z = rotationAxis.z * sinAngle;
w = Math.cos(angle / 2.0);
quaternion1.set(x, y, z, w);

//Combine rotations to a single quaternion
quaternion0.multiply(quaternion1);

//Rotate around Z
angle = 0.1;
sinAngle = Math.sin(angle / 2.0);
rotationAxis.set(0, 0, 1);
x = rotationAxis.x * sinAngle;
y = rotationAxis.y * sinAngle;
z = rotationAxis.z * sinAngle;
w = Math.cos(angle / 2.0);
quaternion1.set(x, y, z, w);

//Combine rotations to a single quaternion
quaternion0.multiply(quaternion1);

let quaternion2 = new THREE.Quaternion();
quaternion2.castShadow = true;

//Bend grass base geometry for more organic look
for (let v = 0; v < grassBaseGeometry.attributes.position.array.length; v += 3) {
  quaternion2.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  vertex.x = grassBaseGeometry.attributes.position.array[v];
  vertex.y = grassBaseGeometry.attributes.position.array[v + 1];
  vertex.z = grassBaseGeometry.attributes.position.array[v + 2];
  let frac = vertex.y / bladeHeight;
  quaternion2.slerp(quaternion0, frac);
  vertex.applyQuaternion(quaternion2);
  grassBaseGeometry.attributes.position.array[v] = vertex.x;
  grassBaseGeometry.attributes.position.array[v + 1] = vertex.y;
  grassBaseGeometry.attributes.position.array[v + 2] = vertex.z;
}

grassBaseGeometry.computeFaceNormals();
grassBaseGeometry.computeVertexNormals();
var baseMaterial = new THREE.MeshNormalMaterial({
  side: THREE.DoubleSide
});
baseMaterial.castShadow = true;
baseMaterial.receiveShadow = true;
var baseBlade = new THREE.Mesh(grassBaseGeometry, baseMaterial);
//Show grass base geometry
//scene.add(baseBlade);

var instancedGeometry = new THREE.InstancedBufferGeometry();
instancedGeometry.castShadow = true;
instancedGeometry.receiveShadow = true;

instancedGeometry.index = grassBaseGeometry.index;
instancedGeometry.attributes.position = grassBaseGeometry.attributes.position;
instancedGeometry.attributes.uv = grassBaseGeometry.attributes.uv;
instancedGeometry.attributes.normal = grassBaseGeometry.attributes.normal;

// Each instance has its own data for position, orientation and scale
var indices = [];
var offsets = [];
var scales = [];
var halfRootAngles = [];

// For each instance of the grass blade
for (let i = 0; i < instances; i++) {

  indices.push(i / instances);

  // 草根的位置
  //Offset of the roots
  x = Math.random() * width - width / 2;
  z = Math.random() * width - width / 2;
  y = 0;
  offsets.push(x, y, z);

  //Random orientation
  let angle = Math.PI - Math.random() * (2 * Math.PI);
  halfRootAngles.push(Math.sin(0.5 * angle), Math.cos(0.5 * angle));

  //Define variety in height
  if (i % 3 != 0) {
    scales.push(2.0 + Math.random() * 1.25);
  } else {
    scales.push(2.0 + Math.random());
  }
}

var offsetAttribute = new THREE.InstancedBufferAttribute(new Float32Array(offsets), 3);
var scaleAttribute = new THREE.InstancedBufferAttribute(new Float32Array(scales), 1);
var halfRootAngleAttribute = new THREE.InstancedBufferAttribute(new Float32Array(halfRootAngles), 2);
var indexAttribute = new THREE.InstancedBufferAttribute(new Float32Array(indices), 1);

instancedGeometry.setAttribute('offset', offsetAttribute);
instancedGeometry.setAttribute('scale', scaleAttribute);
instancedGeometry.setAttribute('halfRootAngle', halfRootAngleAttribute);
instancedGeometry.setAttribute('index', indexAttribute);

//Get alpha map and blade texture
//These have been taken from "Realistic real-time grass rendering" by Eddie Lee, 2010
var loader = new THREE.TextureLoader();
loader.crossOrigin = '';
var texture = loader.load('./src/blade_diffuse.jpg');
var alphaMap = loader.load('./src/blade_alpha.jpg');

//Define the material, specifying attributes, uniforms, shaders etc.
var grassMaterial = new THREE.RawShaderMaterial({
  uniforms: {
    time: {
      type: 'float',
      value: 0
    },
    halfxx: {
      type: 'float',
      value: 0.1
    },
    grassDirectionX: {
      type: 'float',
      value: 0.0
    },
    grassDirectionY: {
      type: 'float',
      value: 0.0
    },
    delta: {
      type: 'float',
      value: delta
    },
    posX: {
      type: 'float',
      value: pos.x
    },
    posZ: {
      type: 'float',
      value: pos.z
    },
    radius: {
      type: 'float',
      value: radius
    },
    width: {
      type: 'float',
      value: width
    },
    map: {
      value: texture
    },
    alphaMap: {
      value: alphaMap
    },
    sunDirection: {
      type: 'vec3',
      value: new THREE.Vector3(Math.sin(azimuth), Math.sin(elevation), -Math.cos(azimuth))
    },
    cameraPosition: {
      type: 'vec3',
      value: camera.position
    },
    ambientStrength: {
      type: 'float',
      value: ambientStrength
    },
    translucencyStrength: {
      type: 'float',
      value: translucencyStrength
    },
    diffuseStrength: {
      type: 'float',
      value: diffuseStrength
    },
    specularStrength: {
      type: 'float',
      value: specularStrength
    },
    shininess: {
      type: 'float',
      value: shininess
    },
    lightColour: {
      type: 'vec3',
      value: sunColour
    },
    specularColour: {
      type: 'vec3',
      value: specularColour
    },
  },
  vertexShader: grassVertexSource,
  fragmentShader: grassFragmentSource,
  side: THREE.DoubleSide
});
grassMaterial.castShadow = true;
grassMaterial.receiveShadow = true;


// var grass = new THREE.Mesh(instancedGeometry, grassMaterial);
var grass = new THREE.Mesh(instancedGeometry, grassMaterial);
grass.castShadow = true;
scene.add(grass);

//************** User movement **************
var forward = false;
var backward = false;
var left = false;
var right = false;
var spaceKey = false;
var keepJumpingTimer;

function keyDown(e) {
  if (e.keyCode == 38 || e.keyCode == 40) {
    e.preventDefault();
  }
  if (e.keyCode == 87 || e.keyCode == 38) {
    forward = true;
  }
  if (e.keyCode == 83 || e.keyCode == 40) {
    backward = true;
  }
  if (e.keyCode == 65 || e.keyCode == 37) {
    left = true;
  }
  if (e.keyCode == 68 || e.keyCode == 39) {
    right = true;
  }
  if (e.keyCode == 32) {
    spaceKey = true;
    if (!keepJumpingTimer) {
      keepJumpingTimer = setTimeout(() => {
        let addRobotCycle = () => {
          addRobot();
          setTimeout(() => {
            if (spaceKey === true) {
              addRobotCycle();
            }
          }, 0.1 * 1000);
        };
        addRobotCycle();
      }, 5 * 1000);
    }
  }
};

function keyUp(e) {
  if (e.keyCode == 87 || e.keyCode == 38) {
    forward = false;
  }
  if (e.keyCode == 83 || e.keyCode == 40) {
    backward = false;
  }
  if (e.keyCode == 65 || e.keyCode == 37) {
    left = false;
  }
  if (e.keyCode == 68 || e.keyCode == 39) {
    right = false;
  }
  if (e.keyCode == 32) {
    spaceKey = false;
    if (keepJumpingTimer) {
      clearTimeout(keepJumpingTimer);
      keepJumpingTimer = undefined;
    }
  }
};

document.addEventListener('keydown', keyDown);
document.addEventListener('keyup', keyUp);

function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

var viewDirection = new THREE.Vector3();
var upVector = new THREE.Vector3(0, 1, 0);

// Find the height of the spherical world at given x,z position
function placeOnSphere(v) {
  let theta = Math.acos(v.z / radius);
  let phi = Math.acos(v.x / (radius * Math.sin(theta)));
  let sV = radius * Math.sin(theta) * Math.sin(phi);
  //If undefined, set to default value
  if (sV != sV) {
    sV = v.y;
  }
  return sV;
}

// draw 
function keyboardMoveGrass(dT) {
  let groundHeight = placeOnSphere(camera.position) - radius;
  let p = camera.position;
  camera.position.set(p.x, Math.max(p.y, groundHeight + 1.0), p.z);

  camera.getWorldDirection(viewDirection);
  length = Math.sqrt(viewDirection.x * viewDirection.x + viewDirection.z * viewDirection.z);
  viewDirection.x /= length;
  viewDirection.z /= length;
  if (forward) {
    pos.x += dT * speed * viewDirection.x;
    pos.y += dT * speed * viewDirection.z;
  }
  if (backward) {
    pos.x -= dT * speed * viewDirection.x;
    pos.y -= dT * speed * viewDirection.z;
  }
  if (left) {
    var rightVector = cross(upVector, viewDirection);
    pos.x += dT * speed * rightVector.x;
    pos.y += dT * speed * rightVector.z;
  }
  if (right) {
    var rightVector = cross(upVector, viewDirection);
    pos.x -= dT * speed * rightVector.x;
    pos.y -= dT * speed * rightVector.z;
  }

  if (groundShader) {
    groundShader.uniforms.posX.value = pos.x;
    groundShader.uniforms.posZ.value = pos.y;
    groundShader.uniforms.radius.value = radius;
  }
  grassMaterial.uniforms.posX.value = pos.x;
  grassMaterial.uniforms.posZ.value = pos.y;
  grassMaterial.uniforms.radius.value = radius;
}

var isJumping = false;
var jumpDirection = true;
var jumpHeight = 0.0;
const jumpAimHeight = 10;

function keyboardMoveQhy(dT) {
  length = Math.sqrt(viewDirection.x * viewDirection.x + viewDirection.z * viewDirection.z);
  viewDirection.x /= length;
  viewDirection.z /= length;
  if (forward) {
    qhyMesh.position.setX(qhyMesh.position.x - dT * speed * viewDirection.x * 3);
    qhyMesh.position.setZ(qhyMesh.position.z - dT * speed * viewDirection.z * 3);
  }
  if (backward) {
    qhyMesh.position.setX(qhyMesh.position.x + dT * speed * viewDirection.x * 3);
    qhyMesh.position.setZ(qhyMesh.position.z + dT * speed * viewDirection.z * 3);
  }
  if (left) {
    var rightVector = cross(upVector, viewDirection);
    qhyMesh.position.setX(qhyMesh.position.x - dT * speed * rightVector.x * 3);
    qhyMesh.position.setZ(qhyMesh.position.z - dT * speed * rightVector.z * 3);
  }
  if (right) {
    var rightVector = cross(upVector, viewDirection);
    qhyMesh.position.setX(qhyMesh.position.x + dT * speed * rightVector.x * 3);
    qhyMesh.position.setZ(qhyMesh.position.z + dT * speed * rightVector.z * 3);
  }
  if (spaceKey) {
    if (!isJumping) {
      isJumping = true;
      jumpDirection = true;
    }
  }

  if (isJumping) {
    if (jumpDirection) { // up ing
      robotModels.forEach((robotModel) => {
        robotModel.position.y += dT * speed * 2;
      });
      qhyMesh.position.y += dT * speed * 2;
      if (qhyMesh.position.y >= jumpAimHeight) {
        jumpDirection = false;
      }
    } else { // down ing
      robotModels.forEach((robotModel) => {
        robotModel.position.y -= dT * speed * 2;
      });
      qhyMesh.position.y -= dT * speed * 2;
      if (qhyMesh.position.y <= qhyMeshPositionY) {
        qhyMesh.position.y = qhyMeshPositionY;
        robotModels.forEach((robotModel) => {
          robotModel.position.y = 0;
        });
        isJumping = false;
      }
    }
  }
}

//******* Sun uniform update *******
function updateSunPosition() {
  var sunDirection = new THREE.Vector3(Math.sin(azimuth), Math.sin(elevation), -Math.cos(azimuth));
  grassMaterial.uniforms.sunDirection.value = sunDirection;
  backgroundMaterial.uniforms.sunDirection.value = sunDirection;
}

//************** Draw **************
var time = Date.now() - 1000;
var lastFrame = Date.now();
var thisFrame;

import {
  GUI
} from './jsm/libs/dat.gui.module.js';
import {
  GLTFLoader
} from './jsm/loaders/GLTFLoader.js';

var robotModels = [];
var addRobot;

var api = {
  state: 'Running'
}; {
  var mixers = [];
  var container, stats, clock, gui, actions, activeAction, previousAction;
  var model, face;

  clock = new THREE.Clock();

  addRobot = function() {
    var loader = new GLTFLoader();
    loader.load('models/RobotExpressive.glb', function(gltf) {
      model = gltf.scene;
      model.castShadow = true;
      model.receiveShadow = true;
      model.position.x = 50 - Math.random() * 100;
      model.position.z = 50 - Math.random() * 100;
      model.rotation.y = -2.5 + (0.5 - Math.random()) * 1.5;
      // expressions
      let face = model.getObjectByName('Head_2');
      face.morphTargetDictionary = {
        Angry: Math.random().toFixed(2),
        Surprised: Math.random().toFixed(2),
        Sad: Math.random().toFixed(2)
      };
      face.morphTargetInfluences = [
        Math.random().toFixed(2),
        Math.random().toFixed(2),
        Math.random().toFixed(2)
      ];
      robotModels.push(model);
      scene.add(model);
      createGUI(model, gltf.animations);
    }, undefined, function(e) {
      console.error(e);
    });
  };

  function createGUI(model, animations) {
    var states = ['Idle', 'Walking', 'Running', 'Dance', 'Death', 'Standing'];
    var emotes = ['Jump', 'Yes', 'No', 'Wave', 'Punch', 'ThumbsUp'];

    // gui = new GUI();

    var mixer = new THREE.AnimationMixer(model);
    mixers.push(mixer);

    actions = {};

    for (let i = 0; i < animations.length; i++) {

      var clip = animations[i];
      var action = mixer.clipAction(clip);
      actions[clip.name] = action;

      if (emotes.indexOf(clip.name) >= 0 || states.indexOf(clip.name) >= 4) {

        action.clampWhenFinished = true;
        action.loop = THREE.LoopOnce;

      }

    }

    function createEmoteCallback(name) {

      api[name] = function() {

        fadeToAction(name, 0.2);

        mixer.addEventListener('finished', restoreState);

      };

    }

    function restoreState() {

      mixer.removeEventListener('finished', restoreState);

      fadeToAction(api.state, 0.2);

    }

    for (var i = 0; i < emotes.length; i++) {

      createEmoteCallback(emotes[i]);

    }
    face = model.getObjectByName('Head_2');

    var expressions = Object.keys(face.morphTargetDictionary);
    for (let i = 0; i < expressions.length; i++) {
    }
    activeAction = actions[states[1 + Math.floor(Math.random() * 4)]];
    activeAction.play();
  }

  function fadeToAction(name, duration) {

    previousAction = activeAction;
    activeAction = actions[name];

    if (previousAction !== activeAction) {

      previousAction.fadeOut(duration);

    }

    activeAction
      .reset()
      .setEffectiveTimeScale(1)
      .setEffectiveWeight(1)
      .fadeIn(duration)
      .play();
  }
}

function createParticles(size, transparent, opacity, vertexColors, sizeAttenuation, colorx, strength) {
  var texture = new THREE.TextureLoader().load("src/rain.png");
  var geom = new THREE.Geometry();

  var material = new THREE.PointsMaterial({
    size: size,
    transparent: transparent,
    opacity: opacity,
    vertexColors: vertexColors,
    sizeAttenuation: sizeAttenuation,
    color: colorx,
    map: texture,
    depthTest: false
  });

  var range = 120;
  for (var i = 0; i < strength; i++) {
    //
    var particle = new THREE.Vector3(Math.random() * range - range / 2, Math.random() * range - range / 2, Math.random() * range - range / 2);
    particle.velocityY = 0.1 + Math.random() / 5;
    particle.velocityX = (Math.random() - 0.5) / 3;
    geom.vertices.push(particle);
    var color = new THREE.Color(0xffffff);
    geom.colors.push(color);
  }

  cloud = new THREE.Points(geom, material);
  cloud.verticesNeedUpdate = true;

  cloud.castShadow = true;

  scene.add(cloud);
}

function animate() {
  requestAnimationFrame(animate);
  draw();
}


var noiseCounter = 0;
var angleRateNoise = 1;


var qhyRotationDirection = true;
var qhyRotationDirectionChangeAngle = Math.PI / 2 / 100 * 55;

function draw() {
  // Update time
  thisFrame = Date.now();
  var dT = (thisFrame - lastFrame) / 200.0;
  time += dT;
  lastFrame = thisFrame;

  keyboardMoveGrass(dT);
  keyboardMoveQhy(dT);


  // grassMaterial.uniforms.time.value = time;
  // grassMaterial.uniforms.halfxx.value = halfAngle;

  if (testGrassAngleEnabled) {
    var xCha = grassEndXY[0] - grassStartXY[0];
    var yCha = grassEndXY[1] - grassStartXY[1];
    if ((xCha >= -0.01 && xCha <= 0.01) && (yCha >= -0.01 && yCha <= 0.01)) {
      // console.log(xCha, yCha)
    } else {
      grassStartXY = [grassStartXY[0] += (xCha * dT), grassStartXY[1] += (yCha * dT)];
    }
  }

  grassMaterial.uniforms.grassDirectionX.value = grassStartXY[0];
  grassMaterial.uniforms.grassDirectionY.value = grassStartXY[1];
  
  if (!raining) {} else {
    particlesRender(dT);
  }

  if (azimuthDirection) {
    azimuth += 0.001 * dT;
  } else {
    azimuth -= 0.001 * dT;
  }
  if (azimuth > 2.7) {
    azimuthDirection = false;
  } else if (azimuth < 1.8) {
    azimuthDirection = true
  }
  updateSunPosition();
  mixers.forEach((mixer) => {
    mixer.update(dT / 5);
  });
  renderer.clear();
  renderer.render(backgroundScene, camera);
  renderer.render(scene, camera);

  if (rotate) {
    controls.update();
  }
}

function particlesRender(dT) {
  var vertices = cloud.geometry.vertices;
  vertices.forEach(function(v) {

    v.y = v.y - (v.velocityY) * 3;
    v.x = v.x - (v.velocityX) * .5;

    if (v.y <= -60) v.y = 60;
    if (v.x <= -20 || v.x >= 20) v.velocityX = v.velocityX * -1;
  });

  cloud.geometry.verticesNeedUpdate = true;
}

function startRaining(strength = 15) {
  if (!raining) {
    raining = true;
    createParticles(1, true, 0.6, true, true, 0xffffff, strength * 1000);
  }
}

function stopRaining() {
  if (raining) {
    raining = false;
    scene.remove(cloud);
  }
}

function getxyNum(deg) {
  const grassAngleDeepDegree = 4; // grassAngleDeepDegree除以grassWindSpeed
  var x, y;
  if (deg >= 270) {
    x = (deg - 270) * (1.0 / 90.0) / grassAngleDeepDegree * grassWindSpeed;
    y = (deg - 360) * (1.0 / 90.0) / grassAngleDeepDegree * grassWindSpeed;
  } else if (deg >= 180) {
    x = (deg - 270) * (1.0 / 90.0) / grassAngleDeepDegree * grassWindSpeed;
    y = (180 - deg) * (1.0 / 90.0) / grassAngleDeepDegree * grassWindSpeed;
  } else if (deg >= 90) {
    x = (90 - deg) * (1.0 / 90.0) / grassAngleDeepDegree * grassWindSpeed;
    y = (180 - deg) * (1.0 / 90.0) / grassAngleDeepDegree * grassWindSpeed;
  } else if (deg >= 0) {
    x = (90 - deg) * (1.0 / 90.0) / grassAngleDeepDegree * grassWindSpeed;
    y = (deg - 0.0) * (1.0 / 90.0) / grassAngleDeepDegree * grassWindSpeed;
  } else {}
  return {
    x: x * angleRateNoise,
    y: y * angleRateNoise
  }
}

/**
 * 
 */
function testGrassAngle() {
  testGrassAngleEnabled = true;
}
testGrassAngle();
animate();


function getDirectionText(deg) {
  var degNow = 0;
  if (deg >= 85 && deg <= 175) {
    degNow = (deg - 130).toFixed(1);
    return degNow == 0 ? 'East' : (degNow < 0 ? 'Eastnorth' + Math.abs(degNow) + '°' : 'Eastsouth' + degNow + '°');
  } else if (deg >= 175 && deg <= 265) {
    degNow = (deg - 220).toFixed(1);
    return degNow == 0 ? 'South' : (degNow < 0 ? 'Southeast' + Math.abs(degNow) + '°' : 'Southwest' + degNow + '°');
  } else if (deg >= 265 && deg <= 355) {
    degNow = (deg - 310).toFixed(1);
    return degNow == 0 ? 'West' : (degNow < 0 ? 'Westsouth' + Math.abs(degNow) + '°' : 'Westnorth' + degNow + '°');
  } else {
    if (deg > 0 && deg < 85) {
      degNow = (deg - 40).toFixed(1);
      return degNow == 0 ? 'North' : (degNow < 0 ? 'Northwest' + Math.abs(degNow) + '°' : 'Northeast' + degNow + '°');
    } else {
      degNow = (359.9 - deg + 40).toFixed(1);
      return 'Northwest' + degNow + '°';
    }
  }
}

// 
window.onload = function() {
  var currenValues = {
    1: 0, 
    2: 0, 
    3: 0, 
    4: 0, 
    5: 0, 
    6: 0, 
    7: null 
  };

  function WebSocketTest() {
    if ("WebSocket" in window) {
      var ws = new WebSocket("ws://"+window.location.hostname+":9998");
      ws.onopen = function() {
        ws.send("send data");
      };
      ws.onmessage = function(evt) {
        var received_msg = evt.data;
        // update cache
        var receivedArr = received_msg && received_msg.length > 0 ? (JSON.parse(received_msg) ? JSON.parse(received_msg) : '') : null;
        for (var i = 0; i < receivedArr.length; i++) {
          var receivedMap = receivedArr[i];
          if (receivedMap.value != null) {
            windChange = receivedMap.type == 5 ? (currenValues[receivedMap.type] == receivedMap.value ? false : true) : false;
            if (receivedMap.type == 7) {
              if (currenValues[receivedMap.type] < receivedMap.value) {
                rainChange = receivedMap.type == 7 ? (currenValues[receivedMap.type] == receivedMap.value ? rainChange : (receivedMap.value == 0 ? rainChange : (currenValues[receivedMap.type] != null ? true : rainChange))) : rainChange;
                currenValues[receivedMap.type] = receivedMap.value;
              }
            } else {
              currenValues[receivedMap.type] = receivedMap.value;
            }
          }
        };
        $(".value-per.4097 .value span").text(currenValues[1]);
        $(".value-per.4098 .value span").text(currenValues[2]);
        $(".value-per.4101 .value span").text(currenValues[3]);
        $(".value-per.4105 .value span").text(currenValues[4]);
        $(".value-per.4099 .value span").text(currenValues[6]);
        grassWindSpeed = currenValues[4] >= 4 ? 4 : currenValues[4];
        if (windChange) {
          var endGrass = currenValues[5] < 50 ? (309.9 + currenValues[5]) : currenValues[5] - 50;
          $(".value-per.4104 .value span").text(getDirectionText(endGrass));
          endGrass = endGrass >= 359.9 ? 359.9 : endGrass;
          grassEndXY = [getxyNum(endGrass).x, getxyNum(endGrass).y];
          if (grassStartXY[0] == null && grassStartXY[1] == null) {
            grassStartXY = [getxyNum(grassAngle).x, getxyNum(grassAngle).y];
          }
          console.log(currenValues[5])
        }
        if (rainChange) {
          $(".value-per.4113 .value span").text(currenValues[7]);
          stopRaining();
          startRaining(15);
          rainChange = false;
          var rainTimer = setTimeout(() => {
            stopRaining();
            rainChange = false;
            clearTimeout(rainTimer);
            rainTimer = null;
          }, 10000);
        }
      };
      ws.onclose = function() {
        ws.send("send data");
        console.error("connection closed...");
      };
    } else {
      console.error("Not support websocket...");
    }
  }

  WebSocketTest()
}
