import * as THREE from "./three.module.js";

// ======================================================
// LEXA SPEED RACE 3D
// ======================================================
// MENU + LEVEL SELECT
// 5 LEVEL
// MULTIPLE ENEMY CARS / TRAFFIC
// SCORE + LEVEL + BEST SCORE
// COLLISION
// GAS + BRAKE
// NITRO / BOOST
// SPEED EFFECT
// LOW FOLLOW CAMERA
// CAMERA SHAKE
// HIGH SPEED EFFECT
// ======================================================


// ======================================================
// THREE.JS
// ======================================================

let scene;
let camera;
let renderer;

let car;

let road;
let ground;

let enemyCars = [];
let roadObjects = [];

let clock;


// ======================================================
// GAME STATE
// ======================================================

let gameStarted = false;
let gameFinished = false;

let currentLevel = 1;

let speed = 0;
let distanceTravelled = 0;
let score = 0;

let bestScore =
  Number(localStorage.getItem("lexaBestScore")) || 0;

let unlockedLevel =
  Number(localStorage.getItem("lexaUnlockedLevel")) || 1;


// ======================================================
// CONTROLS
// ======================================================

let leftPressed = false;
let rightPressed = false;
let gasPressed = false;
let brakePressed = false;
let nitroPressed = false;


// ======================================================
// PLAYER MOVEMENT
// ======================================================

let playerTargetX = 0;
let steering = 0;

const MAX_SPEED = 0.80;

const ACCELERATION = 0.035;

const BRAKE_POWER = 0.055;

const FRICTION = 0.004;

const MAX_PLAYER_X = 8.2;


// ======================================================
// NITRO SYSTEM
// ======================================================

let nitroAmount = 100;

const NITRO_MAX = 100;

const NITRO_DRAIN = 30;

const NITRO_RECHARGE = 7;

const NITRO_POWER = 0.55;


// ======================================================
// CAMERA EFFECT
// ======================================================

let cameraShake = 0;

let cameraShakeTarget = 0;

let cameraRoll = 0;


// ======================================================
// ROAD
// ======================================================

const ROAD_WIDTH = 20;

const LANE_COUNT = 5;

const LANE_WIDTH =
  ROAD_WIDTH / LANE_COUNT;

const WORLD_LENGTH = 1200;

const LEVEL_DISTANCE = 500;


// ======================================================
// TRAFFIC
// ======================================================

const TRAFFIC_COUNT = 12;


// ======================================================
// LEVEL DATA
// ======================================================

const levels = {

  1: {
    name: "GREEN VALLEY",
    road: 0x303030,
    ground: 0x438f43,
    sky: 0x87ceeb
  },

  2: {
    name: "FOREST ROAD",
    road: 0x292929,
    ground: 0x285f28,
    sky: 0x82b8d9
  },

  3: {
    name: "MOUNTAIN ROAD",
    road: 0x353535,
    ground: 0x607760,
    sky: 0x9bb7ca
  },

  4: {
    name: "DESERT HIGHWAY",
    road: 0x363636,
    ground: 0xc9a85b,
    sky: 0xf0c98b
  },

  5: {
    name: "NIGHT CITY",
    road: 0x202020,
    ground: 0x111318,
    sky: 0x080a1c
  }

};


// ======================================================
// INIT
// ======================================================

function init() {

  console.log(
    "Lexa Speed Race 3D dimulai"
  );

  clock =
    new THREE.Clock();


  // ====================================================
  // SCENE
  // ====================================================

  scene =
    new THREE.Scene();

  scene.background =
    new THREE.Color(
      levels[1].sky
    );

  scene.fog =
    new THREE.Fog(
      levels[1].sky,
      100,
      700
    );


  // ====================================================
  // CAMERA
  // ====================================================

  camera =
    new THREE.PerspectiveCamera(
      68,
      window.innerWidth /
      window.innerHeight,
      0.1,
      2000
    );


  // CAMERA LEBIH RENDAH

  camera.position.set(
    0,
    2.7,
    10.5
  );


  // ====================================================
  // RENDERER
  // ====================================================

  renderer =
    new THREE.WebGLRenderer({
      antialias: true
    });

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );

  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio,
      2
    )
  );

  renderer.shadowMap.enabled =
    true;

  renderer.shadowMap.type =
    THREE.PCFSoftShadowMap;

  if (
    "outputColorSpace" in renderer
  ) {

    renderer.outputColorSpace =
      THREE.SRGBColorSpace;

  }


  document
    .getElementById("game")
    .appendChild(
      renderer.domElement
    );


  // ====================================================
  // LIGHTING
  // ====================================================

  const ambient =
    new THREE.AmbientLight(
      0xffffff,
      1.5
    );

  scene.add(
    ambient
  );


  const sun =
    new THREE.DirectionalLight(
      0xffffff,
      2
    );

  sun.position.set(
    10,
    20,
    10
  );

  sun.castShadow =
    true;

  sun.shadow.mapSize.width =
    2048;

  sun.shadow.mapSize.height =
    2048;

  scene.add(
    sun
  );


  // ====================================================
  // WORLD
  // ====================================================

  createRoad();

  createEnvironment();

  createPlayerCar();

  createEnemies();

  createLevelButtons();


  // ====================================================
  // HUD
  // ====================================================

  updateHUD();

  updateNitroHUD();


  // ====================================================
  // RESIZE
  // ====================================================

  window.addEventListener(
    "resize",
    onResize
  );


  // ====================================================
  // BUTTONS
  // ====================================================

  setupButtons();


  // ====================================================
  // LOADING
  // ====================================================

  const loading =
    document.getElementById(
      "loading"
    );

  if (loading) {

    loading.style.display =
      "none";

  }


  // ====================================================
  // GAME LOOP
  // ====================================================

  animate();

}


// ======================================================
// ROAD CURVE
// ======================================================

function getRoadCurve(z) {

  return (
    Math.sin(z * 0.004) * 5 +
    Math.sin(z * 0.009) * 2
  );

}


function getRoadDirection(z) {

  const d =
    Math.cos(z * 0.004) * 0.02 +
    Math.cos(z * 0.009) * 0.018;

  return d;

}


// ======================================================
// CREATE ROAD
// ======================================================

function createRoad() {

  const data =
    levels[currentLevel];


  // ====================================================
  // GROUND
  // ====================================================

  const groundGeometry =
    new THREE.PlaneGeometry(
      200,
      WORLD_LENGTH
    );

  const groundMaterial =
    new THREE.MeshStandardMaterial({
      color: data.ground
    });

  ground =
    new THREE.Mesh(
      groundGeometry,
      groundMaterial
    );

  ground.rotation.x =
    -Math.PI / 2;

  ground.position.z =
    -WORLD_LENGTH / 2;

  ground.receiveShadow =
    true;

  scene.add(
    ground
  );


  // ====================================================
  // SHOULDER
  // ====================================================

  const shoulderGeometry =
    new THREE.PlaneGeometry(
      28,
      WORLD_LENGTH
    );

  const shoulderMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x555555
    });

  const shoulder =
    new THREE.Mesh(
      shoulderGeometry,
      shoulderMaterial
    );

  shoulder.rotation.x =
    -Math.PI / 2;

  shoulder.position.y =
    0.01;

  shoulder.position.z =
    -WORLD_LENGTH / 2;

  scene.add(
    shoulder
  );


  // ====================================================
  // ROAD
  // ====================================================

  const roadGeometry =
    new THREE.PlaneGeometry(
      ROAD_WIDTH,
      WORLD_LENGTH
    );

  const roadMaterial =
    new THREE.MeshStandardMaterial({
      color: data.road
    });

  road =
    new THREE.Mesh(
      roadGeometry,
      roadMaterial
    );

  road.rotation.x =
    -Math.PI / 2;

  road.position.y =
    0.02;

  road.position.z =
    -WORLD_LENGTH / 2;

  road.receiveShadow =
    true;

  scene.add(
    road
  );


  // ====================================================
  // CENTER LINES
  // ====================================================

  for (
    let z = -10;
    z > -WORLD_LENGTH;
    z -= 12
  ) {

    const lineGeometry =
      new THREE.BoxGeometry(
        0.16,
        0.025,
        5
      );

    const lineMaterial =
      new THREE.MeshBasicMaterial({
        color: 0xffffff
      });

    const line =
      new THREE.Mesh(
        lineGeometry,
        lineMaterial
      );

    line.position.set(
      getRoadCurve(z),
      0.045,
      z
    );

    scene.add(
      line
    );

    roadObjects.push(
      line
    );

  }


  // ====================================================
  // EDGE LINES
  // ====================================================

  for (
    let z = -4;
    z > -WORLD_LENGTH;
    z -= 8
  ) {

    for (
      const x of [-9.65, 9.65]
    ) {

      const lineGeometry =
        new THREE.BoxGeometry(
          0.22,
          0.03,
          4
        );

      const lineMaterial =
        new THREE.MeshBasicMaterial({
          color: 0xffd000
        });

      const line =
        new THREE.Mesh(
          lineGeometry,
          lineMaterial
        );

      line.position.set(
        getRoadCurve(z) + x,
        0.05,
        z
      );

      scene.add(
        line
      );

      roadObjects.push(
        line
      );

    }

  }


  // ====================================================
  // ROAD BARRIERS
  // ====================================================

  for (
    let z = -10;
    z > -WORLD_LENGTH;
    z -= 18
  ) {

    for (
      const x of [-11.5, 11.5]
    ) {

      const postGeometry =
        new THREE.BoxGeometry(
          0.25,
          1.1,
          0.25
        );

      const postMaterial =
        new THREE.MeshStandardMaterial({
          color: 0xeeeeee
        });

      const post =
        new THREE.Mesh(
          postGeometry,
          postMaterial
        );

      post.position.set(
        getRoadCurve(z) + x,
        0.55,
        z
      );

      scene.add(
        post
      );

      roadObjects.push(
        post
      );


      const reflectorGeometry =
        new THREE.BoxGeometry(
          0.35,
          0.22,
          0.08
        );

      const reflectorMaterial =
        new THREE.MeshBasicMaterial({
          color: 0xff3030
        });

      const reflector =
        new THREE.Mesh(
          reflectorGeometry,
          reflectorMaterial
        );

      reflector.position.set(
        getRoadCurve(z) + x,
        0.75,
        z
      );

      scene.add(
        reflector
      );

      roadObjects.push(
        reflector
      );

    }

  }

}


// ======================================================
// CREATE PLAYER CAR
// ======================================================

function createPlayerCar() {

  car =
    new THREE.Group();

  car.position.set(
    0,
    0,
    5
  );


  // ====================================================
  // BODY
  // ====================================================

  const bodyGeometry =
    new THREE.BoxGeometry(
      2.15,
      0.55,
      3.8
    );

  const bodyMaterial =
    new THREE.MeshStandardMaterial({
      color: 0xe63946,
      metalness: 0.25,
      roughness: 0.35
    });

  const body =
    new THREE.Mesh(
      bodyGeometry,
      bodyMaterial
    );

  body.position.y =
    0.55;

  body.castShadow =
    true;

  car.add(
    body
  );


  // ====================================================
  // FRONT NOSE
  // ====================================================

  const noseGeometry =
    new THREE.BoxGeometry(
      1.75,
      0.35,
      0.9
    );

  const noseMaterial =
    new THREE.MeshStandardMaterial({
      color: 0xc1121f
    });

  const nose =
    new THREE.Mesh(
      noseGeometry,
      noseMaterial
    );

  nose.position.set(
    0,
    0.68,
    -1.95
  );

  nose.castShadow =
    true;

  car.add(
    nose
  );


  // ====================================================
  // CABIN
  // ====================================================

  const cabinGeometry =
    new THREE.BoxGeometry(
      1.45,
      0.55,
      1.65
    );

  const cabinMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x101820,
      metalness: 0.15,
      roughness: 0.25
    });

  const cabin =
    new THREE.Mesh(
      cabinGeometry,
      cabinMaterial
    );

  cabin.position.set(
    0,
    1.0,
    -0.25
  );

  cabin.castShadow =
    true;

  car.add(
    cabin
  );


  // ====================================================
  // WINDSHIELD
  // ====================================================

  const windshieldGeometry =
    new THREE.BoxGeometry(
      1.2,
      0.35,
      0.05
    );

  const windshieldMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x4fc3f7,
      metalness: 0.1,
      roughness: 0.15
    });

  const windshield =
    new THREE.Mesh(
      windshieldGeometry,
      windshieldMaterial
    );

  windshield.position.set(
    0,
    1.05,
    -1.08
  );

  windshield.rotation.x =
    -0.15;

  car.add(
    windshield
  );


  // ====================================================
  // REAR WINDOW
  // ====================================================

  const rearWindowGeometry =
    new THREE.BoxGeometry(
      1.2,
      0.32,
      0.05
    );

  const rearWindowMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x263238
    });

  const rearWindow =
    new THREE.Mesh(
      rearWindowGeometry,
      rearWindowMaterial
    );

  rearWindow.position.set(
    0,
    1.05,
    0.58
  );

  car.add(
    rearWindow
  );


  // ====================================================
  // CENTER STRIPE
  // ====================================================

  const stripeGeometry =
    new THREE.BoxGeometry(
      0.24,
      0.025,
      3.4
    );

  const stripeMaterial =
    new THREE.MeshBasicMaterial({
      color: 0xffffff
    });

  const stripe =
    new THREE.Mesh(
      stripeGeometry,
      stripeMaterial
    );

  stripe.position.set(
    0,
    0.85,
    0
  );

  car.add(
    stripe
  );


  // ====================================================
  // SIDE SKIRTS
  // ====================================================

  for (
    const x of [-1.05, 1.05]
  ) {

    const skirtGeometry =
      new THREE.BoxGeometry(
        0.12,
        0.28,
        2.8
      );

    const skirtMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x101010
      });

    const skirt =
      new THREE.Mesh(
        skirtGeometry,
        skirtMaterial
      );

    skirt.position.set(
      x,
      0.4,
      0
    );

    car.add(
      skirt
    );

  }


  // ====================================================
  // SPOILER
  // ====================================================

  const spoilerBarGeometry =
    new THREE.BoxGeometry(
      1.65,
      0.12,
      0.18
    );

  const spoilerMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x080808
    });

  const spoilerBar =
    new THREE.Mesh(
      spoilerBarGeometry,
      spoilerMaterial
    );

  spoilerBar.position.set(
    0,
    1.12,
    1.65
  );

  car.add(
    spoilerBar
  );


  // ====================================================
  // SPOILER POSTS
  // ====================================================

  for (
    const x of [-0.55, 0.55]
  ) {

    const postGeometry =
      new THREE.BoxGeometry(
        0.08,
        0.35,
        0.08
      );

    const post =
      new THREE.Mesh(
        postGeometry,
        spoilerMaterial
      );

    post.position.set(
      x,
      0.95,
      1.65
    );

    car.add(
      post
    );

  }


  // ====================================================
  // HEADLIGHTS
  // ====================================================

  for (
    const x of [-0.68, 0.68]
  ) {

    const lightGeometry =
      new THREE.BoxGeometry(
        0.35,
        0.15,
        0.08
      );

    const lightMaterial =
      new THREE.MeshBasicMaterial({
        color: 0xffffaa
      });

    const light =
      new THREE.Mesh(
        lightGeometry,
        lightMaterial
      );

    light.position.set(
      x,
      0.72,
      -2.0
    );

    car.add(
      light
    );

  }


  // ====================================================
  // REAR LIGHTS
  // ====================================================

  for (
    const x of [-0.68, 0.68]
  ) {

    const lightGeometry =
      new THREE.BoxGeometry(
        0.38,
        0.16,
        0.08
      );

    const lightMaterial =
      new THREE.MeshBasicMaterial({
        color: 0xff0000
      });

    const light =
      new THREE.Mesh(
        lightGeometry,
        lightMaterial
      );

    light.position.set(
      x,
      0.72,
      1.93
    );

    car.add(
      light
    );

  }


  // ====================================================
  // WHEELS
  // ====================================================

  for (
    const x of [-1.05, 1.05]
  ) {

    for (
      const z of [-1.25, 1.25]
    ) {

      createWheel(
        car,
        x,
        z
      );

    }

  }


  // ====================================================
  // NITRO
  // ====================================================

  createNitroExhaust(
    car,
    -0.45
  );

  createNitroExhaust(
    car,
    0.45
  );


  scene.add(
    car
  );

}


// ======================================================
// CREATE WHEEL
// ======================================================

function createWheel(
  parent,
  x,
  z
) {

  const tireGeometry =
    new THREE.CylinderGeometry(
      0.42,
      0.42,
      0.28,
      20
    );

  const tireMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x050505,
      roughness: 0.8
    });

  const tire =
    new THREE.Mesh(
      tireGeometry,
      tireMaterial
    );

  tire.rotation.z =
    Math.PI / 2;

  tire.position.set(
    x,
    0.42,
    z
  );

  tire.castShadow =
    true;

  parent.add(
    tire
  );


  const rimGeometry =
    new THREE.CylinderGeometry(
      0.2,
      0.2,
      0.30,
      16
    );

  const rimMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x999999,
      metalness: 0.7,
      roughness: 0.3
    });

  const rim =
    new THREE.Mesh(
      rimGeometry,
      rimMaterial
    );

  rim.rotation.z =
    Math.PI / 2;

  rim.position.set(
    x,
    0.42,
    z
  );

  parent.add(
    rim
  );

}


// ======================================================
// NITRO EXHAUST
// ======================================================

function createNitroExhaust(
  parent,
  x
) {

  const geometry =
    new THREE.ConeGeometry(
      0.14,
      0.6,
      12
    );

  const material =
    new THREE.MeshBasicMaterial({
      color: 0x00cfff,
      transparent: true,
      opacity: 0.8
    });

  const flame =
    new THREE.Mesh(
      geometry,
      material
    );

  flame.rotation.x =
    -Math.PI / 2;

  flame.position.set(
    x,
    0.43,
    2.12
  );

  flame.visible =
    false;

  flame.userData.nitroFlame =
    true;

  parent.add(
    flame
  );

}


// ======================================================
// CREATE ENEMIES / TRAFFIC
// ======================================================

function createEnemies() {

  enemyCars = [];


  const enemyColors = [

    0x1565c0,
    0xffc107,
    0x7b1fa2,
    0x00897b,
    0xffffff,
    0xff5722,
    0x37474f,
    0x00acc1,
    0xd32f2f,
    0x6a1b9a,
    0x455a64,
    0xf57c00

  ];


  for (
    let i = 0;
    i < TRAFFIC_COUNT;
    i++
  ) {

    const enemy =
      createEnemyCar(
        enemyColors[
          i %
          enemyColors.length
        ]
      );


    const lane =
      Math.floor(
        Math.random() *
        LANE_COUNT
      );


    const laneX =
      (lane - 2) *
      LANE_WIDTH;


    enemy.position.x =
      laneX;


    enemy.position.z =
      -35 -
      i * 70 -
      Math.random() * 70;


    enemy.userData.speed =
      0.12 +
      Math.random() * 0.13;


    enemy.userData.lane =
      lane;


    enemy.userData.changeTimer =
      2 +
      Math.random() * 5;


    enemy.userData.roadOffset =
      laneX;


    enemy.userData.baseRotation =
      0;


    scene.add(
      enemy
    );

    enemyCars.push(
      enemy
    );

  }

}


// ======================================================
// CREATE ENEMY CAR
// ======================================================

function createEnemyCar(
  color
) {

  const group =
    new THREE.Group();


  // BODY

  const bodyGeometry =
    new THREE.BoxGeometry(
      2.05,
      0.55,
      3.6
    );

  const bodyMaterial =
    new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.35,
      metalness: 0.2
    });

  const body =
    new THREE.Mesh(
      bodyGeometry,
      bodyMaterial
    );

  body.position.y =
    0.55;

  body.castShadow =
    true;

  group.add(
    body
  );


  // CABIN

  const cabinGeometry =
    new THREE.BoxGeometry(
      1.4,
      0.55,
      1.55
    );

  const cabinMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x202a30,
      roughness: 0.25
    });

  const cabin =
    new THREE.Mesh(
      cabinGeometry,
      cabinMaterial
    );

  cabin.position.set(
    0,
    1,
    -0.15
  );

  cabin.castShadow =
    true;

  group.add(
    cabin
  );


  // WINDOWS

  const windowGeometry =
    new THREE.BoxGeometry(
      1.16,
      0.3,
      0.06
    );

  const windowMaterial =
    new THREE.MeshBasicMaterial({
      color: 0x263238
    });


  const frontWindow =
    new THREE.Mesh(
      windowGeometry,
      windowMaterial
    );

  frontWindow.position.set(
    0,
    1.04,
    -0.98
  );

  group.add(
    frontWindow
  );


  const rearWindow =
    new THREE.Mesh(
      windowGeometry,
      windowMaterial
    );

  rearWindow.position.set(
    0,
    1.04,
    0.7
  );

  group.add(
    rearWindow
  );


  // FRONT LIGHTS

  for (
    const x of [-0.68, 0.68]
  ) {

    const lightGeometry =
      new THREE.BoxGeometry(
        0.35,
        0.15,
        0.08
      );

    const lightMaterial =
      new THREE.MeshBasicMaterial({
        color: 0xffffaa
      });

    const light =
      new THREE.Mesh(
        lightGeometry,
        lightMaterial
      );

    light.position.set(
      x,
      0.72,
      -1.84
    );

    group.add(
      light
    );

  }


  // REAR LIGHTS

  for (
    const x of [-0.68, 0.68]
  ) {

    const lightGeometry =
      new THREE.BoxGeometry(
        0.35,
        0.15,
        0.08
      );

    const lightMaterial =
      new THREE.MeshBasicMaterial({
        color: 0xff0000
      });

    const light =
      new THREE.Mesh(
        lightGeometry,
        lightMaterial
      );

    light.position.set(
      x,
      0.72,
      1.84
    );

    group.add(
      light
    );

  }


  // WHEELS

  for (
    const x of [-1.02, 1.02]
  ) {

    for (
      const z of [-1.2, 1.2]
    ) {

      const wheelGeometry =
        new THREE.CylinderGeometry(
          0.40,
          0.40,
          0.26,
          16
        );

      const wheelMaterial =
        new THREE.MeshStandardMaterial({
          color: 0x050505
        });

      const wheel =
        new THREE.Mesh(
          wheelGeometry,
          wheelMaterial
        );

      wheel.rotation.z =
        Math.PI / 2;

      wheel.position.set(
        x,
        0.42,
        z
      );

      group.add(
        wheel
      );

    }

  }


  return group;

}


// ======================================================
// ENVIRONMENT
// ======================================================

function createEnvironment() {

  // ====================================================
  // TREES
  // ====================================================

  for (
    let i = 0;
    i < 50;
    i++
  ) {

    const side =
      Math.random() > 0.5
        ? 1
        : -1;

    const tree =
      createTree();


    const z =
      -20 -
      Math.random() * 500;


    const x =
      getRoadCurve(z) +
      side *
      (13 + Math.random() * 12);


    tree.position.set(
      x,
      0,
      z
    );


    const scale =
      0.7 +
      Math.random() * 1.4;

    tree.scale.setScalar(
      scale
    );


    scene.add(
      tree
    );

    roadObjects.push(
      tree
    );

  }


  // ====================================================
  // BUSHES
  // ====================================================

  for (
    let i = 0;
    i < 70;
    i++
  ) {

    const side =
      Math.random() > 0.5
        ? 1
        : -1;

    const bush =
      createBush();


    const z =
      -10 -
      Math.random() * 500;


    const x =
      getRoadCurve(z) +
      side *
      (11 + Math.random() * 12);


    bush.position.set(
      x,
      0,
      z
    );


    const scale =
      0.5 +
      Math.random() * 0.9;

    bush.scale.setScalar(
      scale
    );


    scene.add(
      bush
    );

    roadObjects.push(
      bush
    );

  }


  // ====================================================
  // STREET LIGHTS
  // ====================================================

  for (
    let z = -25;
    z > -500;
    z -= 35
  ) {

    for (
      const side of [-1, 1]
    ) {

      const lamp =
        createStreetLight();


      lamp.position.set(
        getRoadCurve(z) +
        side * 13,
        0,
        z
      );


      scene.add(
        lamp
      );

      roadObjects.push(
        lamp
      );

    }

  }


  // ====================================================
  // NIGHT CITY
  // ====================================================

  if (
    currentLevel === 5
  ) {

    for (
      let i = 0;
      i < 40;
      i++
    ) {

      const side =
        Math.random() > 0.5
          ? 1
          : -1;


      const building =
        createBuilding();


      const z =
        -30 -
        Math.random() * 500;


      building.position.set(
        getRoadCurve(z) +
        side *
        (20 + Math.random() * 15),
        0,
        z
      );


      scene.add(
        building
      );

      roadObjects.push(
        building
      );

    }

  }

}


// ======================================================
// TREE
// ======================================================

function createTree() {

  const group =
    new THREE.Group();


  const trunkGeometry =
    new THREE.CylinderGeometry(
      0.22,
      0.35,
      2.2,
      8
    );

  const trunkMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x6d4c41
    });

  const trunk =
    new THREE.Mesh(
      trunkGeometry,
      trunkMaterial
    );

  trunk.position.y =
    1.1;

  trunk.castShadow =
    true;

  group.add(
    trunk
  );


  const leafGeometry =
    new THREE.SphereGeometry(
      1.3,
      10,
      8
    );

  const leafMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x238b45
    });

  const leaves =
    new THREE.Mesh(
      leafGeometry,
      leafMaterial
    );

  leaves.position.y =
    2.7;

  leaves.castShadow =
    true;

  group.add(
    leaves
  );


  return group;

}


// ======================================================
// BUSH
// ======================================================

function createBush() {

  const geometry =
    new THREE.SphereGeometry(
      0.8,
      8,
      6
    );

  const material =
    new THREE.MeshStandardMaterial({
      color: 0x2f7d32
    });

  return new THREE.Mesh(
    geometry,
    material
  );

}


// ======================================================
// STREET LIGHT
// ======================================================

function createStreetLight() {

  const group =
    new THREE.Group();


  const poleGeometry =
    new THREE.CylinderGeometry(
      0.08,
      0.12,
      4.5,
      8
    );

  const poleMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x444444
    });

  const pole =
    new THREE.Mesh(
      poleGeometry,
      poleMaterial
    );

  pole.position.y =
    2.25;

  group.add(
    pole
  );


  const armGeometry =
    new THREE.BoxGeometry(
      1.2,
      0.08,
      0.08
    );

  const arm =
    new THREE.Mesh(
      armGeometry,
      poleMaterial
    );

  arm.position.set(
    0.5,
    4.4,
    0
  );

  group.add(
    arm
  );


  const lampGeometry =
    new THREE.SphereGeometry(
      0.18,
      8,
      8
    );

  const lampMaterial =
    new THREE.MeshBasicMaterial({
      color: 0xffffcc
    });

  const lamp =
    new THREE.Mesh(
      lampGeometry,
      lampMaterial
    );

  lamp.position.set(
    1.0,
    4.25,
    0
  );

  group.add(
    lamp
  );


  return group;

}


// ======================================================
// BUILDING
// ======================================================

function createBuilding() {

  const height =
    4 +
    Math.random() * 12;

  const width =
    3 +
    Math.random() * 4;

  const depth =
    3 +
    Math.random() * 4;


  const geometry =
    new THREE.BoxGeometry(
      width,
      height,
      depth
    );

  const material =
    new THREE.MeshStandardMaterial({
      color:
        0x171b25 +
        Math.floor(
          Math.random() * 0x101010
        )
    });

  const building =
    new THREE.Mesh(
      geometry,
      material
    );

  building.position.y =
    height / 2;

  building.castShadow =
    true;

  return building;

}


// ======================================================
// START GAME
// ======================================================

function startGame(
  levelNumber
) {

  currentLevel =
    Math.max(
      1,
      Math.min(
        5,
        levelNumber
      )
    );


  gameStarted =
    true;

  gameFinished =
    false;


  speed =
    0.12;

  distanceTravelled =
    0;

  score =
    0;


  nitroAmount =
    NITRO_MAX;


  playerTargetX =
    0;

  steering =
    0;

  cameraShake =
    0;

  cameraShakeTarget =
    0;

  cameraRoll =
    0;


  // RESET PLAYER

  if (car) {

    car.position.x =
      0;

    car.position.y =
      0;

    car.position.z =
      5;

    car.rotation.set(
      0,
      0,
      0
    );

  }


  // RESET CAMERA

  camera.position.set(
    0,
    2.7,
    10.5
  );


  camera.rotation.set(
    0,
    0,
    0
  );


  // RESET ENEMIES

  resetEnemies();


  // LEVEL

  applyLevelVisual();


  // SHOW GAME

  document
    .getElementById(
      "mainMenu"
    )
    .classList.add(
      "hidden"
    );

  document
    .getElementById(
      "levelMenu"
    )
    .classList.add(
      "hidden"
    );

  document
    .getElementById(
      "game"
    )
    .classList.remove(
      "hidden"
    );

  document
    .getElementById(
      "gameOver"
    )
    .classList.add(
      "hidden"
    );


  showLevelNotification();

  updateHUD();

  updateNitroHUD();

}


// ======================================================
// RESET ENEMIES
// ======================================================

function resetEnemies() {

  enemyCars.forEach(
    (enemy, i) => {

      const lane =
        Math.floor(
          Math.random() *
          LANE_COUNT
        );


      enemy.userData.lane =
        lane;


      enemy.userData.roadOffset =
        (lane - 2) *
        LANE_WIDTH;


      enemy.position.x =
        enemy.userData.roadOffset;


      enemy.position.z =
        -40 -
        i * 70 -
        Math.random() * 100;


      enemy.userData.speed =
        0.12 +
        Math.random() * 0.13;


      enemy.userData.changeTimer =
        2 +
        Math.random() * 5;

    }
  );

}


// ======================================================
// LEVEL VISUAL
// ======================================================

function applyLevelVisual() {

  const data =
    levels[currentLevel];


  scene.background =
    new THREE.Color(
      data.sky
    );


  scene.fog =
    new THREE.Fog(
      data.sky,
      100,
      700
    );


  if (ground) {

    ground.material.color.setHex(
      data.ground
    );

  }


  if (road) {

    road.material.color.setHex(
      data.road
    );

  }

}


// ======================================================
// LEVEL NOTIFICATION
// ======================================================

function showLevelNotification() {

  const notification =
    document.getElementById(
      "levelNotification"
    );

  const number =
    document.getElementById(
      "levelNumber"
    );

  const name =
    document.getElementById(
      "levelName"
    );


  if (
    !notification ||
    !number ||
    !name
  ) {

    return;

  }


  number.textContent =
    `LEVEL ${currentLevel}`;


  name.textContent =
    levels[currentLevel].name;


  notification.classList.remove(
    "hidden"
  );


  notification.style.animation =
    "none";

  void notification.offsetWidth;

  notification.style.animation =
    "levelPop 2.2s ease forwards";


  setTimeout(
    () => {

      notification.classList.add(
        "hidden"
      );

    },
    2200
  );

}


// ======================================================
// PLAYER UPDATE
// ======================================================

function updatePlayer(delta) {

  if (
    !gameStarted ||
    gameFinished
  ) {

    return;

  }


  const frame =
    delta * 60;


  // ====================================================
  // GAS
  // ====================================================

  if (gasPressed) {

    speed +=
      ACCELERATION *
      frame;

  } else {

    speed -=
      FRICTION *
      frame;

  }


  // ====================================================
  // BRAKE
  // ====================================================

  if (brakePressed) {

    speed -=
      BRAKE_POWER *
      frame;

  }


  // ====================================================
  // NITRO
  // ====================================================

  const nitroActive =
    nitroPressed &&
    nitroAmount > 0 &&
    speed > 0.08;


  if (nitroActive) {

    speed +=
      NITRO_POWER *
      frame *
      0.06;


    nitroAmount -=
      NITRO_DRAIN *
      delta;


    if (
      nitroAmount < 0
    ) {

      nitroAmount =
        0;

    }

  } else {

    nitroAmount +=
      NITRO_RECHARGE *
      delta;


    if (
      nitroAmount > NITRO_MAX
    ) {

      nitroAmount =
        NITRO_MAX;

    }

  }


  // ====================================================
  // SPEED LIMIT
  // ====================================================

  const actualMaxSpeed =
    nitroActive
      ? MAX_SPEED + 0.55
      : MAX_SPEED;


  speed =
    THREE.MathUtils.clamp(
      speed,
      0,
      actualMaxSpeed
    );


  // ====================================================
  // STEERING
  // ====================================================

  let steeringTarget =
    0;


  if (leftPressed) {

    steeringTarget =
      -1;

  }


  if (rightPressed) {

    steeringTarget =
      1;

  }


  steering =
    THREE.MathUtils.lerp(
      steering,
      steeringTarget,
      Math.min(
        1,
        0.18 * frame
      )
    );


  // ====================================================
  // LANE MOVEMENT
  // ====================================================

  const steeringPower =
    0.15 +
    speed * 0.55;


  playerTargetX +=
    steering *
    steeringPower *
    frame;


  playerTargetX =
    THREE.MathUtils.clamp(
      playerTargetX,
      -MAX_PLAYER_X,
      MAX_PLAYER_X
    );


  car.position.x =
    THREE.MathUtils.lerp(
      car.position.x,
      playerTargetX,
      Math.min(
        1,
        0.18 * frame
      )
    );


  // ====================================================
  // CAR LEAN
  // ====================================================

  car.rotation.z =
    THREE.MathUtils.lerp(
      car.rotation.z,
      -steering * 0.10,
      Math.min(
        1,
        0.12 * frame
      )
    );


  // ====================================================
  // CAR YAW
  // ====================================================

  const roadDirection =
    getRoadDirection(
      car.position.z
    );


  car.rotation.y =
    THREE.MathUtils.lerp(
      car.rotation.y,
      -roadDirection * 0.5 -
      steering * 0.025,
      Math.min(
        1,
        0.08 * frame
      )
    );


  // ====================================================
  // NITRO FLAME
  // ====================================================

  car.traverse(
    child => {

      if (
        child.userData &&
        child.userData.nitroFlame
      ) {

        child.visible =
          nitroActive;


        if (nitroActive) {

          const scale =
            0.8 +
            Math.random() * 0.9;

          child.scale.set(
            1,
            scale,
            1
          );

        }

      }

    }
  );


  // ====================================================
  // BODY VIBRATION
  // ====================================================

  if (
    speed > 0.6
  ) {

    car.position.y =
      Math.sin(
        performance.now() * 0.025
      ) * 0.015;

  } else {

    car.position.y =
      0;

  }


  // ====================================================
  // CAMERA SHAKE POWER
  // ====================================================

  const speedRatio =
    THREE.MathUtils.clamp(
      speed / 0.8,
      0,
      1
    );


  cameraShakeTarget =
    speedRatio *
    0.035;


  if (
    nitroActive
  ) {

    cameraShakeTarget +=
      0.045;

  }


  cameraShake =
    THREE.MathUtils.lerp(
      cameraShake,
      cameraShakeTarget,
      Math.min(
        1,
        delta * 8
      )
    );


  // ====================================================
  // NITRO CLASS
  // ====================================================

  if (nitroActive) {

    document.body.classList.add(
      "nitro-active"
    );

  } else {

    document.body.classList.remove(
      "nitro-active"
    );

  }

}


// ======================================================
// WORLD UPDATE
// ======================================================

function updateWorld(delta) {

  if (
    !gameStarted ||
    gameFinished
  ) {

    return;

  }


  const frame =
    delta * 60;


  const movement =
    speed * frame;


  distanceTravelled +=
    movement;


  score +=
    movement * 3;


  // ====================================================
  // ROAD OBJECTS
  // ====================================================

  roadObjects.forEach(
    object => {

      object.position.z +=
        movement;


      const curve =
        getRoadCurve(
          object.position.z
        );


      if (
        object !== ground &&
        object !== road
      ) {

        if (
          Math.abs(
            object.position.x
          ) < 15
        ) {

          const direction =
            object.position.x >= 0
              ? 1
              : -1;


          object.position.x =
            curve +
            direction *
            Math.min(
              Math.abs(
                object.position.x -
                curve
              ),
              20
            );

        }

      }


      // RECYCLE

      if (
        object.position.z >
        30
      ) {

        object.position.z -=
          WORLD_LENGTH;

      }

    }
  );

}


// ======================================================
// UPDATE ENEMIES
// ======================================================

function updateEnemies(delta) {

  if (
    !gameStarted ||
    gameFinished
  ) {

    return;

  }


  const frame =
    delta * 60;


  enemyCars.forEach(
    enemy => {

      // ==================================================
      // RELATIVE TRAFFIC MOVEMENT
      // ==================================================

      enemy.position.z +=
        speed * frame -
        enemy.userData.speed *
        frame;


      // ==================================================
      // ROAD CURVE
      // ==================================================

      const roadCenter =
        getRoadCurve(
          enemy.position.z
        );


      const targetX =
        roadCenter +
        enemy.userData.roadOffset;


      enemy.position.x =
        THREE.MathUtils.lerp(
          enemy.position.x,
          targetX,
          Math.min(
            1,
            0.05 * frame
          )
        );


      // ==================================================
      // LANE CHANGING
      // ==================================================

      enemy.userData.changeTimer -=
        delta;


      if (
        enemy.userData.changeTimer <= 0
      ) {

        enemy.userData.changeTimer =
          2.5 +
          Math.random() * 5;


        if (
          Math.random() < 0.30
        ) {

          let newLane =
            enemy.userData.lane +
            (
              Math.random() > 0.5
                ? 1
                : -1
            );


          newLane =
            THREE.MathUtils.clamp(
              newLane,
              0,
              LANE_COUNT - 1
            );


          enemy.userData.lane =
            newLane;


          enemy.userData.roadOffset =
            (newLane - 2) *
            LANE_WIDTH;

        }

      }


      // ==================================================
      // SMALL TRAFFIC LEAN
      // ==================================================

      const trafficCurve =
        getRoadDirection(
          enemy.position.z
        );


      enemy.rotation.y =
        THREE.MathUtils.lerp(
          enemy.rotation.y,
          -trafficCurve * 0.5,
          Math.min(
            1,
            0.05 * frame
          )
        );


      // ==================================================
      // RECYCLE
      // ==================================================

      if (
        enemy.position.z >
        35
      ) {

        const farthestZ =
          Math.min(
            ...enemyCars.map(
              e =>
                e.position.z
            )
          );


        enemy.position.z =
          farthestZ -
          70 -
          Math.random() * 100;


        const lane =
          Math.floor(
            Math.random() *
            LANE_COUNT
          );


        enemy.userData.lane =
          lane;


        enemy.userData.roadOffset =
          (lane - 2) *
          LANE_WIDTH;


        enemy.userData.speed =
          0.12 +
          Math.random() * 0.13;

      }

    }
  );

}


// ======================================================
// COLLISION
// ======================================================

function checkCollision() {

  if (
    !gameStarted ||
    gameFinished
  ) {

    return;

  }


  const playerBox =
    new THREE.Box3()
      .setFromObject(
        car
      );


  playerBox.expandByScalar(
    -0.25
  );


  for (
    const enemy of enemyCars
  ) {

    const enemyBox =
      new THREE.Box3()
        .setFromObject(
          enemy
        );


    enemyBox.expandByScalar(
      -0.25
    );


    if (
      playerBox.intersectsBox(
        enemyBox
      )
    ) {

      // COLLISION SHAKE

      cameraShake =
        0.16;


      finishGame(
        false
      );


      return;

    }

  }

}


// ======================================================
// CAMERA
// ======================================================

function updateCamera(delta) {

  if (!car) {

    return;

  }


  const nitroActive =
    nitroPressed &&
    nitroAmount > 0 &&
    speed > 0.08;


  const speedCamera =
    Math.min(
      speed,
      1.35
    );


  // ====================================================
  // LOWER CAMERA
  // ====================================================

  const targetX =
    car.position.x *
    0.32;


  const targetY =
    2.45 +
    speedCamera *
    0.65;


  const targetZ =
    nitroActive
      ? 13.2
      : 10.7;


  camera.position.x =
    THREE.MathUtils.lerp(
      camera.position.x,
      targetX,
      Math.min(
        1,
        delta * 6
      )
    );


  camera.position.y =
    THREE.MathUtils.lerp(
      camera.position.y,
      targetY,
      Math.min(
        1,
        delta * 6
      )
    );


  camera.position.z =
    THREE.MathUtils.lerp(
      camera.position.z,
      targetZ,
      Math.min(
        1,
        delta * 6
      )
    );


  // ====================================================
  // CAMERA SHAKE
  // ====================================================

  const shakeX =
    (
      Math.random() -
      0.5
    ) *
    cameraShake;


  const shakeY =
    (
      Math.random() -
      0.5
    ) *
    cameraShake;


  const shakeZ =
    (
      Math.random() -
      0.5
    ) *
    cameraShake *
    0.5;


  camera.position.x +=
    shakeX;

  camera.position.y +=
    shakeY;

  camera.position.z +=
    shakeZ;


  // ====================================================
  // CAMERA LOOK
  // ====================================================

  const lookX =
    car.position.x *
    0.28;


  const lookY =
    0.85 +
    speedCamera *
    0.18;


  const lookZ =
    -18 -
    speedCamera *
    6;


  camera.lookAt(
    lookX,
    lookY,
    lookZ
  );


  // ====================================================
  // CAMERA ROLL
  // ====================================================

  const targetRoll =
    -steering *
    0.025;


  cameraRoll =
    THREE.MathUtils.lerp(
      cameraRoll,
      targetRoll,
      Math.min(
        1,
        delta * 6
      )
    );


  camera.rotation.z =
    cameraRoll;


  // ====================================================
  // FOV
  // ====================================================

  const targetFOV =
    nitroActive
      ? 82
      : 68 +
        speed *
        6;


  camera.fov =
    THREE.MathUtils.lerp(
      camera.fov,
      targetFOV,
      Math.min(
        1,
        delta * 5
      )
    );


  camera.updateProjectionMatrix();

}


// ======================================================
// SPEED EFFECT
// ======================================================

function updateSpeedEffect() {

  const speedLines =
    document.getElementById(
      "speedLines"
    );


  if (!speedLines) {

    return;

  }


  const normalSpeed =
    THREE.MathUtils.clamp(
      speed / 0.8,
      0,
      1
    );


  let opacity =
    normalSpeed *
    0.14;


  if (
    speed > 0.65
  ) {

    opacity +=
      0.05;

  }


  if (
    nitroPressed &&
    nitroAmount > 0
  ) {

    opacity =
      0.28 +
      normalSpeed *
      0.22;

  }


  speedLines.style.opacity =
    opacity;


  const scale =
    1 +
    normalSpeed *
    0.20;


  speedLines.style.transform =
    `scale(${scale})`;

}


// ======================================================
// HUD
// ======================================================

function updateHUD() {

  const speedElement =
    document.getElementById(
      "speed"
    );

  const distanceElement =
    document.getElementById(
      "distance"
    );

  const scoreElement =
    document.getElementById(
      "score"
    );

  const levelElement =
    document.getElementById(
      "level"
    );

  const bestElement =
    document.getElementById(
      "bestScore"
    );


  if (speedElement) {

    speedElement.textContent =
      Math.round(
        speed * 600
      );

  }


  if (distanceElement) {

    distanceElement.textContent =
      Math.floor(
        distanceTravelled
      );

  }


  if (scoreElement) {

    scoreElement.textContent =
      Math.floor(
        score
      );

  }


  if (levelElement) {

    levelElement.textContent =
      currentLevel;

  }


  if (bestElement) {

    bestElement.textContent =
      Math.floor(
        bestScore
      );

  }

}


// ======================================================
// NITRO HUD
// ======================================================

function updateNitroHUD() {

  const fill =
    document.getElementById(
      "nitroFill"
    );

  const percent =
    document.getElementById(
      "nitroPercent"
    );


  const value =
    THREE.MathUtils.clamp(
      nitroAmount,
      0,
      100
    );


  if (fill) {

    fill.style.width =
      `${value}%`;

  }


  if (percent) {

    percent.textContent =
      `${Math.round(value)}%`;

  }

}


// ======================================================
// GAME OVER
// ======================================================

function finishGame(
  completed
) {

  if (gameFinished) {

    return;

  }


  gameFinished =
    true;

  gameStarted =
    false;


  document.body.classList.remove(
    "nitro-active"
  );


  // ====================================================
  // BEST SCORE
  // ====================================================

  if (
    score >
    bestScore
  ) {

    bestScore =
      Math.floor(
        score
      );


    localStorage.setItem(
      "lexaBestScore",
      bestScore
    );

  }


  // ====================================================
  // UNLOCK NEXT LEVEL
  // ====================================================

  if (
    completed &&
    currentLevel < 5
  ) {

    const nextLevel =
      currentLevel + 1;


    if (
      nextLevel >
      unlockedLevel
    ) {

      unlockedLevel =
        nextLevel;


      localStorage.setItem(
        "lexaUnlockedLevel",
        unlockedLevel
      );

    }

  }


  // ====================================================
  // FINAL HUD
  // ====================================================

  const finalDistance =
    document.getElementById(
      "finalDistance"
    );

  const finalScore =
    document.getElementById(
      "finalScore"
    );

  const finalBest =
    document.getElementById(
      "finalBestScore"
    );

  const finalLevel =
    document.getElementById(
      "finalLevel"
    );


  if (finalDistance) {

    finalDistance.textContent =
      `${Math.floor(
        distanceTravelled
      )} m`;

  }


  if (finalScore) {

    finalScore.textContent =
      Math.floor(
        score
      );

  }


  if (finalBest) {

    finalBest.textContent =
      Math.floor(
        bestScore
      );

  }


  if (finalLevel) {

    finalLevel.textContent =
      currentLevel;

  }


  document
    .getElementById(
      "gameOver"
    )
    .classList.remove(
      "hidden"
    );


  updateHUD();

}


// ======================================================
// LEVEL COMPLETE
// ======================================================

function checkLevelCompletion() {

  if (
    !gameStarted ||
    gameFinished
  ) {

    return;

  }


  if (
    distanceTravelled >=
    LEVEL_DISTANCE
  ) {

    finishGame(
      true
    );

  }

}


// ======================================================
// LEVEL BUTTONS
// ======================================================

function createLevelButtons() {

  const levelList =
    document.getElementById(
      "levelList"
    );

  const unlockedDisplay =
    document.getElementById(
      "menuUnlockedLevel"
    );


  if (!levelList) {

    return;

  }


  levelList.innerHTML =
    "";


  if (unlockedDisplay) {

    unlockedDisplay.textContent =
      unlockedLevel;

  }


  for (
    let i = 1;
    i <= 5;
    i++
  ) {

    const button =
      document.createElement(
        "button"
      );


    button.className =
      "level-button";


    if (
      i <= unlockedLevel
    ) {

      button.classList.add(
        "unlocked"
      );


      button.textContent =
        `LEVEL ${i} — ${levels[i].name}`;


      button.addEventListener(
        "click",
        () => {

          startGame(
            i
          );

        }
      );

    } else {

      button.classList.add(
        "locked"
      );


      button.textContent =
        `🔒 LEVEL ${i} — TERKUNCI`;

    }


    levelList.appendChild(
      button
    );

  }

}


// ======================================================
// MENU
// ======================================================

function showMainMenu() {

  gameStarted =
    false;

  gameFinished =
    false;


  document.body.classList.remove(
    "nitro-active"
  );


  document
    .getElementById(
      "game"
    )
    .classList.add(
      "hidden"
    );


  document
    .getElementById(
      "levelMenu"
    )
    .classList.add(
      "hidden"
    );


  document
    .getElementById(
      "gameOver"
    )
    .classList.add(
      "hidden"
    );


  document
    .getElementById(
      "mainMenu"
    )
    .classList.remove(
      "hidden"
    );


  createLevelButtons();

}


// ======================================================
// LEVEL MENU
// ======================================================

function showLevelMenu() {

  document
    .getElementById(
      "mainMenu"
    )
    .classList.add(
      "hidden"
    );


  document
    .getElementById(
      "levelMenu"
    )
    .classList.remove(
      "hidden"
    );


  createLevelButtons();

}


// ======================================================
// BUTTON SETUP
// ======================================================

function setupButtons() {

  // ====================================================
  // PLAY
  // ====================================================

  document
    .getElementById(
      "playButton"
    )
    .addEventListener(
      "click",
      () => {

        startGame(
          1
        );

      }
    );


  // ====================================================
  // LEVEL
  // ====================================================

  document
    .getElementById(
      "levelButton"
    )
    .addEventListener(
      "click",
      showLevelMenu
    );


  // ====================================================
  // BACK
  // ====================================================

  document
    .getElementById(
      "backMenuButton"
    )
    .addEventListener(
      "click",
      showMainMenu
    );


  // ====================================================
  // RESTART
  // ====================================================

  document
    .getElementById(
      "restartButton"
    )
    .addEventListener(
      "click",
      () => {

        startGame(
          currentLevel
        );

      }
    );


  // ====================================================
  // MENU
  // ====================================================

  document
    .getElementById(
      "menuButton"
    )
    .addEventListener(
      "click",
      showMainMenu
    );


  // ====================================================
  // MOBILE LEFT
  // ====================================================

  setupHoldButton(
    "left",
    value => {

      leftPressed =
        value;

    }
  );


  // ====================================================
  // MOBILE RIGHT
  // ====================================================

  setupHoldButton(
    "right",
    value => {

      rightPressed =
        value;

    }
  );


  // ====================================================
  // MOBILE GAS
  // ====================================================

  setupHoldButton(
    "gas",
    value => {

      gasPressed =
        value;

    }
  );


  // ====================================================
  // MOBILE BRAKE
  // ====================================================

  setupHoldButton(
    "brake",
    value => {

      brakePressed =
        value;

    }
  );


  // ====================================================
  // MOBILE NITRO
  // ====================================================

  setupHoldButton(
    "nitro",
    value => {

      nitroPressed =
        value;

    }
  );


  // ====================================================
  // KEYBOARD
  // ====================================================

  window.addEventListener(
    "keydown",
    event => {

      if (
        event.code ===
        "ArrowLeft"
      ) {

        leftPressed =
          true;

      }


      if (
        event.code ===
        "ArrowRight"
      ) {

        rightPressed =
          true;

      }


      if (
        event.code ===
        "ArrowUp" ||
        event.code ===
        "Space"
      ) {

        gasPressed =
          true;

      }


      if (
        event.code ===
        "ArrowDown" ||
        event.code ===
        "KeyS"
      ) {

        brakePressed =
          true;

      }


      if (
        event.code ===
        "ShiftLeft" ||
        event.code ===
        "ShiftRight"
      ) {

        nitroPressed =
          true;

      }

    }
  );


  // ====================================================
  // KEYBOARD RELEASE
  // ====================================================

  window.addEventListener(
    "keyup",
    event => {

      if (
        event.code ===
        "ArrowLeft"
      ) {

        leftPressed =
          false;

      }


      if (
        event.code ===
        "ArrowRight"
      ) {

        rightPressed =
          false;

      }


      if (
        event.code ===
        "ArrowUp" ||
        event.code ===
        "Space"
      ) {

        gasPressed =
          false;

      }


      if (
        event.code ===
        "ArrowDown" ||
        event.code ===
        "KeyS"
      ) {

        brakePressed =
          false;

      }


      if (
        event.code ===
        "ShiftLeft" ||
        event.code ===
        "ShiftRight"
      ) {

        nitroPressed =
          false;

      }

    }
  );

}


// ======================================================
// HOLD BUTTON
// ======================================================

function setupHoldButton(
  id,
  callback
) {

  const button =
    document.getElementById(
      id
    );


  if (!button) {

    return;

  }


  const start =
    event => {

      event.preventDefault();

      button.classList.add(
        "active"
      );

      callback(
        true
      );

    };


  const end =
    event => {

      event.preventDefault();

      button.classList.remove(
        "active"
      );

      callback(
        false
      );

    };


  button.addEventListener(
    "pointerdown",
    start
  );


  button.addEventListener(
    "pointerup",
    end
  );


  button.addEventListener(
    "pointercancel",
    end
  );


  button.addEventListener(
    "pointerleave",
    end
  );


  button.addEventListener(
    "pointerout",
    end
  );

}


// ======================================================
// RESIZE
// ======================================================

function onResize() {

  camera.aspect =
    window.innerWidth /
    window.innerHeight;


  camera.updateProjectionMatrix();


  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );


  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio,
      2
    )
  );

}


// ======================================================
// ANIMATE
// ======================================================

function animate() {

  requestAnimationFrame(
    animate
  );


  const delta =
    Math.min(
      clock.getDelta(),
      0.05
    );


  if (
    gameStarted &&
    !gameFinished
  ) {

    updatePlayer(
      delta
    );

    updateWorld(
      delta
    );

    updateEnemies(
      delta
    );

    checkCollision();

    checkLevelCompletion();

  }


  updateCamera(
    delta
  );

  updateHUD();

  updateNitroHUD();

  updateSpeedEffect();


  renderer.render(
    scene,
    camera
  );

}


// ======================================================
// START
// ======================================================

init();