import * as THREE from './three.module.js';

/* =========================================================
   LEXA SPEED RACE 3D
   SMOOTH HIGHWAY EDITION
   ---------------------------------------------------------
   - Smooth continuous highway curve
   - Smooth road markings
   - Smooth shoulders
   - Competitive AI traffic
   - AI lane changing
   - 5 maps
   - Main menu
   - Level select
   - Score / Best Score
   - Collision
   - Mobile controls
========================================================= */


/* =========================================================
   THREE CORE
========================================================= */

let scene;
let camera;
let renderer;
let car;

let initialized = false;

let enemyCars = [];
let roadObjects = [];
let collisionParticles = [];


/* =========================================================
   GAME STATE
========================================================= */

let speed = 0;
let distance = 0;
let score = 0;
let level = 1;

let bestScore =
  Number(localStorage.getItem("lexaBestScore")) || 0;

let unlockedLevel =
  Number(localStorage.getItem("lexaUnlockedLevel")) || 1;

unlockedLevel =
  THREE.MathUtils.clamp(
    unlockedLevel,
    1,
    5
  );

let selectedStartLevel = 1;

let gameStarted = false;
let gameOverState = false;

let currentMap = 1;


/* =========================================================
   PLAYER PHYSICS
========================================================= */

const MAX_SPEED = 13;

const ACCELERATION = 0.22;
const NATURAL_DECELERATION = 0.07;
const BRAKE_POWER = 0.32;

const STEER_ACCELERATION = 0.045;
const STEER_MAX_SPEED = 0.30;
const STEER_DECELERATION = 0.065;

let steeringVelocity = 0;
let playerRoadOffset = 0;


/* =========================================================
   WORLD
========================================================= */

const WORLD_LENGTH = 720;

const ROAD_WIDTH = 12;

const ROAD_SEGMENT_LENGTH = 12;

const ROAD_LIMIT =
  ROAD_WIDTH / 2 - 1.25;


/* =========================================================
   LANES
========================================================= */

const LANES = [
  -3.2,
  -1.1,
  1.1,
  3.2
];


/* =========================================================
   WORLD SPEED
========================================================= */

const WORLD_SPEED_MULTIPLIER = 0.19;


/* =========================================================
   ENEMY DIFFICULTY
========================================================= */

const ENEMY_BASE_SPEED = [
  0.075,
  0.085,
  0.095,
  0.105,
  0.115
];

const ENEMY_MAX_SPEED = [
  0.17,
  0.20,
  0.23,
  0.27,
  0.31
];

const ENEMY_COUNT_BY_LEVEL = [
  4,
  4,
  5,
  5,
  6
];


/* =========================================================
   INPUT
========================================================= */

let steerLeft = false;
let steerRight = false;

let gasPressed = false;
let brakePressed = false;


/* =========================================================
   CAMERA
========================================================= */

let cameraShakeTime = 0;

const CAMERA_SHAKE_DURATION = 0.5;


/* =========================================================
   ENEMY COLORS
========================================================= */

const enemyColors = [
  0x1565c0,
  0xff9800,
  0x7b1fa2,
  0x212121,
  0x00897b,
  0xc62828
];


/* =========================================================
   MAPS
========================================================= */

const MAPS = {

  1: {
    name: "GREEN VALLEY",
    sky: 0x87ceeb,
    ground: 0x3f963f,
    shoulder: 0x6fa84a,
    road: 0x292929,
    edge: 0xffd600,

    curveStrength: 1.0,

    curveFrequency: 1.0
  },

  2: {
    name: "FOREST ROAD",
    sky: 0x78b7d0,
    ground: 0x285c35,
    shoulder: 0x4f7f4a,
    road: 0x252525,
    edge: 0xffc107,

    curveStrength: 1.25,

    curveFrequency: 0.95
  },

  3: {
    name: "MOUNTAIN ROAD",
    sky: 0x9ec8e8,
    ground: 0x65735c,
    shoulder: 0x858585,
    road: 0x303030,
    edge: 0xffffff,

    curveStrength: 1.55,

    curveFrequency: 0.85
  },

  4: {
    name: "DESERT HIGHWAY",
    sky: 0xe8b77d,
    ground: 0xc99b5b,
    shoulder: 0xb47c42,
    road: 0x343434,
    edge: 0xffe082,

    curveStrength: 1.1,

    curveFrequency: 0.9
  },

  5: {
    name: "NIGHT CITY",
    sky: 0x07152d,
    ground: 0x151b20,
    shoulder: 0x252a2f,
    road: 0x191919,
    edge: 0x00e5ff,

    curveStrength: 1.35,

    curveFrequency: 0.9
  }
};


/* =========================================================
   DOM
========================================================= */

const mainMenu =
  document.getElementById("mainMenu");

const levelMenu =
  document.getElementById("levelMenu");

const gameElement =
  document.getElementById("game");

const playButton =
  document.getElementById("playButton");

const levelButton =
  document.getElementById("levelButton");

const backMenuButton =
  document.getElementById("backMenuButton");

const levelList =
  document.getElementById("levelList");

const menuUnlockedLevel =
  document.getElementById("menuUnlockedLevel");

const restartButton =
  document.getElementById("restartButton");

const menuButton =
  document.getElementById("menuButton");

const loading =
  document.getElementById("loading");

const gameOver =
  document.getElementById("gameOver");

const levelNotification =
  document.getElementById("levelNotification");

const levelNumber =
  document.getElementById("levelNumber");

const levelName =
  document.getElementById("levelName");


/* =========================================================
   SMOOTH HIGHWAY SYSTEM
========================================================= */

/*
   Penting:

   Sistem lama menggunakan beberapa gelombang sinus pendek
   yang membuat arah jalan berubah terlalu cepat.

   Sekarang kita menggunakan kombinasi kurva panjang
   dengan easing sehingga perubahan arah lebih lembut.
*/


function smoothWave(
  value
) {

  return (
    Math.sin(value) *
    0.5 +
    Math.sin(value * 0.47 + 1.7) *
    0.30 +
    Math.sin(value * 0.23 + 3.1) *
    0.20
  );
}


function getRoadCurve(
  z
) {

  const map =
    MAPS[currentMap];

  const depth =
    Math.abs(z);

  const normalized =
    depth /
    WORLD_LENGTH;

  /*
     Kurva utama sangat panjang.
     Tidak ada perubahan arah tajam.
  */

  const longWave =
    Math.sin(
      normalized *
      Math.PI *
      2.2 +
      0.7
    ) *
    3.8;

  const mediumWave =
    Math.sin(
      normalized *
      Math.PI *
      4.0 +
      2.0
    ) *
    1.45;

  const gentleWave =
    Math.sin(
      normalized *
      Math.PI *
      7.0 +
      1.0
    ) *
    0.45;

  /*
     Semakin jauh, kurva tetap halus.
  */

  return (
    (
      longWave +
      mediumWave +
      gentleWave
    ) *
    map.curveStrength
  );
}


/* =========================================================
   ROAD SLOPE / DIRECTION
========================================================= */

function getRoadDirection(
  z
) {

  /*
     Gunakan beberapa sample dekat.
     Ini membuat arah jalan dihitung dari kurva,
     bukan dari patahan antarsegmen.
  */

  const sample =
    0.5;

  const x1 =
    getRoadCurve(
      z - sample
    );

  const x2 =
    getRoadCurve(
      z + sample
    );

  return Math.atan2(
    x1 - x2,
    sample * 2
  );
}


/* =========================================================
   ROAD HEIGHT
========================================================= */

function getRoadHeight(
  z
) {

  /*
     Sedikit undakan alami untuk membuat jalan
     tidak terasa seperti papan datar.

     Amplitudo sengaja sangat kecil supaya nyaman.
  */

  const depth =
    Math.abs(z);

  const normalized =
    depth /
    WORLD_LENGTH;

  return (
    Math.sin(
      normalized *
      Math.PI *
      2.5
    ) *
    0.10
  );
}


/* =========================================================
   MENU
========================================================= */

function updateMenu() {

  unlockedLevel =
    Number(
      localStorage.getItem(
        "lexaUnlockedLevel"
      )
    ) || 1;

  unlockedLevel =
    THREE.MathUtils.clamp(
      unlockedLevel,
      1,
      5
    );

  if (
    menuUnlockedLevel
  ) {

    menuUnlockedLevel.textContent =
      unlockedLevel;
  }

  renderLevelList();
}


/* =========================================================
   LEVEL SELECT
========================================================= */

function renderLevelList() {

  if (
    !levelList
  ) {

    return;
  }

  levelList.innerHTML = "";

  const descriptions = {

    1: "Green Valley",

    2: "Forest Road",

    3: "Mountain Road",

    4: "Desert Highway",

    5: "Night City"
  };

  for (
    let i = 1;
    i <= 5;
    i++
  ) {

    const unlocked =
      i <= unlockedLevel;

    const card =
      document.createElement(
        "button"
      );

    card.className =
      "level-card" +
      (
        unlocked
          ? ""
          : " locked"
      );

    card.innerHTML = `
      <div class="level-number">
        ${i}
      </div>

      <div class="level-info">

        <div class="level-name">
          ${MAPS[i].name}
        </div>

        <div class="level-description">
          ${descriptions[i]}
          ${
            unlocked
              ? ""
              : " • Selesaikan level sebelumnya"
          }
        </div>

      </div>

      <div class="level-status">
        ${unlocked ? "▶" : "🔒"}
      </div>
    `;

    if (
      unlocked
    ) {

      card.addEventListener(
        "click",
        () => {

          selectedStartLevel =
            i;

          startGame(i);
        }
      );
    }

    levelList.appendChild(
      card
    );
  }
}


/* =========================================================
   SHOW MAIN MENU
========================================================= */

function showMainMenu() {

  gameStarted = false;

  gameOverState = false;

  stopAllInput();

  mainMenu.classList.remove(
    "hidden"
  );

  levelMenu.classList.add(
    "hidden"
  );

  gameElement.classList.add(
    "hidden"
  );

  gameOver.classList.add(
    "hidden"
  );

  levelNotification.classList.add(
    "hidden"
  );

  updateMenu();
}


/* =========================================================
   LEVEL MENU
========================================================= */

function showLevelMenu() {

  mainMenu.classList.add(
    "hidden"
  );

  levelMenu.classList.remove(
    "hidden"
  );

  updateMenu();
}


/* =========================================================
   MENU EVENTS
========================================================= */

playButton.addEventListener(
  "click",
  () => {

    selectedStartLevel = 1;

    startGame(1);
  }
);


levelButton.addEventListener(
  "click",
  () => {

    showLevelMenu();
  }
);


backMenuButton.addEventListener(
  "click",
  () => {

    showMainMenu();
  }
);


menuButton.addEventListener(
  "click",
  () => {

    showMainMenu();
  }
);


restartButton.addEventListener(
  "click",
  () => {

    startGame(
      selectedStartLevel
    );
  }
);


/* =========================================================
   THREE INITIALIZATION
========================================================= */

function initThree() {

  if (
    initialized
  ) {

    return;
  }

  initialized = true;

  scene =
    new THREE.Scene();

  camera =
    new THREE.PerspectiveCamera(
      65,
      window.innerWidth /
        window.innerHeight,
      0.1,
      2000
    );

  camera.position.set(
    0,
    5,
    9
  );

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
      window.devicePixelRatio || 1,
      2
    )
  );

  renderer.shadowMap.enabled =
    true;

  gameElement.appendChild(
    renderer.domElement
  );

  window.addEventListener(
    "resize",
    onResize
  );

  createLights();

  createPlayerCar();

  createWorld();

  createEnemies();

  applyMapVisuals();

  animate();
}


/* =========================================================
   LIGHTING
========================================================= */

function createLights() {

  const ambient =
    new THREE.AmbientLight(
      0xffffff,
      0.7
    );

  scene.add(
    ambient
  );

  const sun =
    new THREE.DirectionalLight(
      0xffffff,
      1.15
    );

  sun.position.set(
    40,
    80,
    20
  );

  sun.castShadow =
    true;

  scene.add(
    sun
  );
}


/* =========================================================
   PLAYER CAR
========================================================= */

function createPlayerCar() {

  car =
    new THREE.Group();

  const bodyMaterial =
    new THREE.MeshStandardMaterial({
      color: 0xd71920,
      roughness: 0.32,
      metalness: 0.45
    });

  const blackMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x090909,
      roughness: 0.55,
      metalness: 0.2
    });

  const glassMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x00bcd4,
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: 0.72
    });

  const whiteMaterial =
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25
    });


  /* BODY */

  const body =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        2.4,
        0.55,
        4.3
      ),
      bodyMaterial
    );

  body.position.y =
    0.65;

  body.castShadow =
    true;

  car.add(body);


  /* NOSE */

  const nose =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        2.15,
        0.3,
        1.0
      ),
      bodyMaterial
    );

  nose.position.set(
    0,
    0.88,
    -1.8
  );

  car.add(nose);


  /* CABIN */

  const cabin =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        1.65,
        0.6,
        1.8
      ),
      blackMaterial
    );

  cabin.position.set(
    0,
    1.08,
    0.25
  );

  car.add(cabin);


  /* WINDSHIELD */

  const windshield =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        1.5,
        0.48,
        0.06
      ),
      glassMaterial
    );

  windshield.position.set(
    0,
    1.13,
    -0.68
  );

  windshield.rotation.x =
    THREE.MathUtils.degToRad(
      -15
    );

  car.add(
    windshield
  );


  /* REAR GLASS */

  const rearGlass =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        1.5,
        0.45,
        0.06
      ),
      glassMaterial
    );

  rearGlass.position.set(
    0,
    1.13,
    1.12
  );

  rearGlass.rotation.x =
    THREE.MathUtils.degToRad(
      15
    );

  car.add(
    rearGlass
  );


  /* CENTER STRIPE */

  const stripe =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        0.28,
        0.03,
        3.8
      ),
      whiteMaterial
    );

  stripe.position.set(
    0,
    0.94,
    -0.05
  );

  car.add(stripe);


  /* SPOILER */

  const spoilerBar =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        2.2,
        0.15,
        0.2
      ),
      blackMaterial
    );

  spoilerBar.position.set(
    0,
    1.25,
    1.9
  );

  car.add(
    spoilerBar
  );


  const spoilerLeft =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        0.15,
        0.55,
        0.15
      ),
      blackMaterial
    );

  spoilerLeft.position.set(
    -0.8,
    1.0,
    1.9
  );

  car.add(
    spoilerLeft
  );


  const spoilerRight =
    spoilerLeft.clone();

  spoilerRight.position.x =
    0.8;

  car.add(
    spoilerRight
  );


  /* HEADLIGHTS */

  const headlightMaterial =
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 2
    });

  [
    -0.75,
    0.75
  ].forEach(
    x => {

      const light =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            0.42,
            0.18,
            0.08
          ),
          headlightMaterial
        );

      light.position.set(
        x,
        0.88,
        -2.18
      );

      car.add(
        light
      );
    }
  );


  /* SIDE SKIRTS */

  [
    -1.22,
    1.22
  ].forEach(
    x => {

      const skirt =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            0.12,
            0.25,
            3.4
          ),
          blackMaterial
        );

      skirt.position.set(
        x,
        0.48,
        0
      );

      car.add(
        skirt
      );
    }
  );


  /* WHEELS */

  const wheelMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x080808,
      roughness: 0.7
    });

  const rimMaterial =
    new THREE.MeshStandardMaterial({
      color: 0xbdbdbd,
      metalness: 0.8,
      roughness: 0.2
    });

  const wheelPositions = [
    [-1.15, 0.42, -1.35],
    [1.15, 0.42, -1.35],
    [-1.15, 0.42, 1.35],
    [1.15, 0.42, 1.35]
  ];

  wheelPositions.forEach(
    pos => {

      const wheel =
        new THREE.Mesh(
          new THREE.CylinderGeometry(
            0.42,
            0.42,
            0.28,
            20
          ),
          wheelMaterial
        );

      wheel.rotation.z =
        Math.PI / 2;

      wheel.position.set(
        pos[0],
        pos[1],
        pos[2]
      );

      wheel.castShadow =
        true;

      car.add(
        wheel
      );


      const rim =
        new THREE.Mesh(
          new THREE.CylinderGeometry(
            0.19,
            0.19,
            0.3,
            16
          ),
          rimMaterial
        );

      rim.rotation.z =
        Math.PI / 2;

      rim.position.set(
        pos[0],
        pos[1],
        pos[2]
      );

      car.add(
        rim
      );
    }
  );


  car.position.set(
    0,
    0,
    5
  );

  scene.add(
    car
  );
}


/* =========================================================
   WORLD
========================================================= */

function createWorld() {

  const ground =
    new THREE.Mesh(
      new THREE.PlaneGeometry(
        1000,
        2000
      ),
      new THREE.MeshStandardMaterial({
        color:
          MAPS[1].ground
      })
    );

  ground.rotation.x =
    -Math.PI / 2;

  ground.position.z =
    -WORLD_LENGTH / 2;

  ground.receiveShadow =
    true;

  ground.userData.isGround =
    true;

  scene.add(
    ground
  );


  /*
     ROAD SEGMENTS

     Segmen masih digunakan untuk render,
     tetapi posisi dan arah setiap segmen
     sekarang mengikuti kurva kontinu.

     Karena panjang segmen diperkecil,
     sambungan menjadi jauh lebih halus.
  */

  for (
    let z = 0;
    z > -WORLD_LENGTH;
    z -= ROAD_SEGMENT_LENGTH
  ) {

    createRoadSegment(z);
  }


  createEnvironment();
}


/* =========================================================
   ROAD OBJECT REGISTER
========================================================= */

function registerRoadObject(
  object,
  roadZ,
  roadOffset = 0,
  roadY = 0,
  rotateWithRoad = true
) {

  object.userData.roadZ =
    roadZ;

  object.userData.roadOffset =
    roadOffset;

  object.userData.roadY =
    roadY;

  object.userData.rotateWithRoad =
    rotateWithRoad;

  object.userData.baseRotationY =
    object.rotation.y;

  roadObjects.push(
    object
  );

  scene.add(
    object
  );

  updateRoadObjectTransform(
    object
  );
}


/* =========================================================
   ROAD TRANSFORM
========================================================= */

function updateRoadObjectTransform(
  object
) {

  const roadZ =
    object.userData.roadZ;

  const offset =
    object.userData.roadOffset ||
    0;

  const roadX =
    getRoadCurve(
      roadZ
    );

  const roadY =
    getRoadHeight(
      roadZ
    );

  object.position.x =
    roadX +
    offset;

  object.position.z =
    roadZ;

  object.position.y =
    roadY +
    (
      object.userData.roadY ||
      0
    );


  if (
    object.userData.rotateWithRoad
  ) {

    const angle =
      getRoadDirection(
        roadZ
      );

    object.rotation.y =
      angle +
      object.userData.baseRotationY;
  }
}


/* =========================================================
   SMOOTH ROAD SEGMENT
========================================================= */

function createRoadSegment(
  z
) {

  const map =
    MAPS[currentMap];


  /* =====================================================
     ROAD
  ===================================================== */

  const road =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        ROAD_WIDTH,
        0.15,
        ROAD_SEGMENT_LENGTH +
          0.25
      ),
      new THREE.MeshStandardMaterial({
        color:
          map.road,

        roughness:
          0.92,

        metalness:
          0.05
      })
    );

  road.userData.roadType =
    "road";

  registerRoadObject(
    road,
    z,
    0,
    -0.05,
    true
  );

  road.receiveShadow =
    true;


  /* =====================================================
     CENTER MARKING
  ===================================================== */

  const centerDash =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        0.18,
        0.04,
        6.2
      ),
      new THREE.MeshStandardMaterial({
        color:
          0xf5f5f5,

        roughness:
          0.35
      })
    );

  centerDash.userData.roadType =
    "centerDash";

  registerRoadObject(
    centerDash,
    z,
    0,
    0.055,
    true
  );


  /* =====================================================
     LEFT LANE MARKING
  ===================================================== */

  const leftLane =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        0.09,
        0.025,
        5.0
      ),
      new THREE.MeshStandardMaterial({
        color:
          0xd9d9d9,

        roughness:
          0.4
      })
    );

  leftLane.userData.roadType =
    "laneDash";

  registerRoadObject(
    leftLane,
    z,
    -2.15,
    0.045,
    true
  );


  /* =====================================================
     RIGHT LANE MARKING
  ===================================================== */

  const rightLane =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        0.09,
        0.025,
        5.0
      ),
      new THREE.MeshStandardMaterial({
        color:
          0xd9d9d9,

        roughness:
          0.4
      })
    );

  rightLane.userData.roadType =
    "laneDash";

  registerRoadObject(
    rightLane,
    z,
    2.15,
    0.045,
    true
  );


  /* =====================================================
     ROAD EDGES
  ===================================================== */

  [
    -1,
    1
  ].forEach(
    side => {

      const edge =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            0.20,
            0.055,
            ROAD_SEGMENT_LENGTH
          ),
          new THREE.MeshStandardMaterial({
            color:
              map.edge,

            emissive:
              currentMap === 5
                ? map.edge
                : 0x000000,

            emissiveIntensity:
              currentMap === 5
                ? 1.2
                : 0
          })
        );

      edge.userData.roadType =
        "edge";

      registerRoadObject(
        edge,
        z,
        side *
        (
          ROAD_WIDTH / 2 -
          0.15
        ),
        0.055,
        true
      );
    }
  );


  /* =====================================================
     SHOULDER
  ===================================================== */

  [
    -1,
    1
  ].forEach(
    side => {

      const shoulder =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            2.4,
            0.10,
            ROAD_SEGMENT_LENGTH
          ),
          new THREE.MeshStandardMaterial({
            color:
              map.shoulder,

            roughness:
              1
          })
        );

      shoulder.userData.roadType =
        "shoulder";

      registerRoadObject(
        shoulder,
        z,
        side *
        (
          ROAD_WIDTH / 2 +
          1.25
        ),
        -0.02,
        true
      );
    }
  );
}


/* =========================================================
   ENVIRONMENT
========================================================= */

function createEnvironment() {

  /* TREES */

  for (
    let i = 0;
    i < 120;
    i++
  ) {

    const z =
      -20 -
      Math.random() *
      (
        WORLD_LENGTH -
        30
      );

    const side =
      Math.random() <
      0.5
        ? -1
        : 1;

    const offset =
      side *
      (
        ROAD_WIDTH / 2 +
        5 +
        Math.random() *
        20
      );

    createTree(
      z,
      offset
    );
  }


  /* BUSHES */

  for (
    let i = 0;
    i < 160;
    i++
  ) {

    const z =
      -20 -
      Math.random() *
      (
        WORLD_LENGTH -
        30
      );

    const side =
      Math.random() <
      0.5
        ? -1
        : 1;

    const offset =
      side *
      (
        ROAD_WIDTH / 2 +
        3 +
        Math.random() *
        25
      );

    createBush(
      z,
      offset
    );
  }


  /* MOUNTAINS */

  for (
    let i = 0;
    i < 25;
    i++
  ) {

    const z =
      -50 -
      Math.random() *
      (
        WORLD_LENGTH -
        50
      );

    const side =
      Math.random() <
      0.5
        ? -1
        : 1;

    createMountain(
      z,
      side *
      (
        35 +
        Math.random() *
        35
      )
    );
  }


  /* CACTUS */

  for (
    let i = 0;
    i < 30;
    i++
  ) {

    const z =
      -20 -
      Math.random() *
      (
        WORLD_LENGTH -
        30
      );

    const side =
      Math.random() <
      0.5
        ? -1
        : 1;

    createCactus(
      z,
      side *
      (
        ROAD_WIDTH / 2 +
        7 +
        Math.random() *
        18
      )
    );
  }


  /* BUILDINGS */

  for (
    let i = 0;
    i < 45;
    i++
  ) {

    const z =
      -20 -
      Math.random() *
      (
        WORLD_LENGTH -
        30
      );

    const side =
      Math.random() <
      0.5
        ? -1
        : 1;

    createBuilding(
      z,
      side *
      (
        ROAD_WIDTH / 2 +
        10 +
        Math.random() *
        22
      )
    );
  }


  /* STREET LIGHTS */

  for (
    let i = 0;
    i < 55;
    i++
  ) {

    const z =
      -20 -
      i * 13;

    createStreetLight(
      z,
      -1
    );

    createStreetLight(
      z,
      1
    );
  }
}


/* =========================================================
   TREE
========================================================= */

function createTree(
  z,
  offset
) {

  const tree =
    new THREE.Group();

  const trunk =
    new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.18,
        0.25,
        2.2,
        8
      ),
      new THREE.MeshStandardMaterial({
        color:
          0x6d421f
      })
    );

  trunk.position.y =
    1.1;

  tree.add(
    trunk
  );


  const leaves =
    new THREE.Mesh(
      new THREE.ConeGeometry(
        1.2,
        3.2,
        8
      ),
      new THREE.MeshStandardMaterial({
        color:
          currentMap === 2
            ? 0x164d2a
            : 0x208c3c
      })
    );

  leaves.position.y =
    3.0;

  tree.add(
    leaves
  );


  const scale =
    0.7 +
    Math.random() *
    1.0;

  tree.scale.set(
    scale,
    scale,
    scale
  );

  tree.userData.roadType =
    "tree";

  registerRoadObject(
    tree,
    z,
    offset,
    0,
    true
  );
}


/* =========================================================
   BUSH
========================================================= */

function createBush(
  z,
  offset
) {

  const bush =
    new THREE.Mesh(
      new THREE.SphereGeometry(
        0.65 +
        Math.random() *
        0.5,
        8,
        8
      ),
      new THREE.MeshStandardMaterial({
        color:
          currentMap === 4
            ? 0x597d35
            : 0x2f7d32
      })
    );

  bush.scale.y =
    0.65;

  bush.position.y =
    0.45;

  bush.userData.roadType =
    "bush";

  registerRoadObject(
    bush,
    z,
    offset,
    0,
    true
  );
}


/* =========================================================
   MOUNTAIN
========================================================= */

function createMountain(
  z,
  offset
) {

  const mountain =
    new THREE.Mesh(
      new THREE.ConeGeometry(
        8 +
        Math.random() *
        7,
        15 +
        Math.random() *
        12,
        6
      ),
      new THREE.MeshStandardMaterial({
        color:
          0x5d665e
      })
    );

  mountain.position.y =
    7;

  mountain.userData.roadType =
    "mountain";

  registerRoadObject(
    mountain,
    z,
    offset,
    0,
    false
  );
}


/* =========================================================
   CACTUS
========================================================= */

function createCactus(
  z,
  offset
) {

  const cactus =
    new THREE.Group();

  const material =
    new THREE.MeshStandardMaterial({
      color:
        0x3d7d3b
    });


  const main =
    new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.18,
        0.22,
        2.5,
        8
      ),
      material
    );

  main.position.y =
    1.25;

  cactus.add(
    main
  );


  const arm =
    new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.13,
        0.16,
        1.1,
        8
      ),
      material
    );

  arm.position.set(
    0.35,
    1.3,
    0
  );

  arm.rotation.z =
    Math.PI / 2;

  cactus.add(
    arm
  );


  cactus.userData.roadType =
    "cactus";

  registerRoadObject(
    cactus,
    z,
    offset,
    0,
    true
  );
}


/* =========================================================
   BUILDING
========================================================= */

function createBuilding(
  z,
  offset
) {

  const height =
    5 +
    Math.random() *
    14;

  const width =
    3 +
    Math.random() *
    5;

  const depth =
    3 +
    Math.random() *
    4;


  const building =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        width,
        height,
        depth
      ),
      new THREE.MeshStandardMaterial({
        color:
          0x27313a,

        roughness:
          0.8
      })
    );

  building.position.y =
    height / 2;

  building.userData.roadType =
    "building";


  if (
    currentMap === 5
  ) {

    const windowMaterial =
      new THREE.MeshStandardMaterial({
        color:
          0xffd54f,

        emissive:
          0xffb300,

        emissiveIntensity:
          1.5
      });


    for (
      let y = 2;
      y < height;
      y += 3
    ) {

      const window =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            width * 0.65,
            0.5,
            0.04
          ),
          windowMaterial
        );

      window.position.set(
        0,
        y,
        -depth / 2 -
          0.03
      );

      building.add(
        window
      );
    }
  }


  registerRoadObject(
    building,
    z,
    offset,
    0,
    false
  );
}


/* =========================================================
   STREET LIGHT
========================================================= */

function createStreetLight(
  z,
  side
) {

  const pole =
    new THREE.Group();

  const metal =
    new THREE.MeshStandardMaterial({
      color:
        0x555555,

      metalness:
        0.6
    });


  const post =
    new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.06,
        0.09,
        4.5,
        8
      ),
      metal
    );

  post.position.y =
    2.25;

  pole.add(
    post
  );


  const lamp =
    new THREE.Mesh(
      new THREE.SphereGeometry(
        0.16,
        10,
        10
      ),
      new THREE.MeshStandardMaterial({
        color:
          0xfff2b2,

        emissive:
          0xffc107,

        emissiveIntensity:
          currentMap === 5
            ? 2.5
            : 0.8
      })
    );

  lamp.position.set(
    0,
    4.55,
    0
  );

  pole.add(
    lamp
  );


  pole.userData.roadType =
    "streetLight";

  registerRoadObject(
    pole,
    z,
    side *
    (
      ROAD_WIDTH / 2 +
      2.2
    ),
    0,
    true
  );
}


/* =========================================================
   ENEMIES
========================================================= */

function createEnemies() {

  for (
    let i = 0;
    i < 6;
    i++
  ) {

    const enemy =
      createEnemyCar(
        enemyColors[
          i %
          enemyColors.length
        ]
      );

    enemy.userData.index =
      i;

    enemy.userData.active =
      true;

    enemy.userData.roadZ =
      -50 -
      i * 65;

    enemy.userData.laneOffset =
      LANES[
        i %
        LANES.length
      ];

    enemy.userData.targetLane =
      enemy.userData.laneOffset;

    enemy.userData.speed =
      ENEMY_BASE_SPEED[0];

    enemy.userData.changeTimer =
      3 +
      Math.random() *
      5;

    enemy.userData.aggression =
      0.5 +
      Math.random() *
      0.5;

    scene.add(
      enemy
    );

    enemyCars.push(
      enemy
    );

    updateEnemyTransform(
      enemy
    );
  }
}


/* =========================================================
   ENEMY CAR
========================================================= */

function createEnemyCar(
  color
) {

  const group =
    new THREE.Group();


  const material =
    new THREE.MeshStandardMaterial({
      color,
      roughness:
        0.4,
      metalness:
        0.3
    });


  const black =
    new THREE.MeshStandardMaterial({
      color:
        0x111111
    });


  /* BODY */

  const body =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        2.2,
        0.55,
        4.0
      ),
      material
    );

  body.position.y =
    0.62;

  body.castShadow =
    true;

  group.add(
    body
  );


  /* CABIN */

  const cabin =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        1.55,
        0.55,
        1.7
      ),
      black
    );

  cabin.position.set(
    0,
    1.0,
    0.2
  );

  group.add(
    cabin
  );


  /* WHEELS */

  const wheelMaterial =
    new THREE.MeshStandardMaterial({
      color:
        0x080808
    });


  const positions = [
    [-1.05, 0.4, -1.25],
    [1.05, 0.4, -1.25],
    [-1.05, 0.4, 1.25],
    [1.05, 0.4, 1.25]
  ];


  positions.forEach(
    pos => {

      const wheel =
        new THREE.Mesh(
          new THREE.CylinderGeometry(
            0.4,
            0.4,
            0.25,
            16
          ),
          wheelMaterial
        );

      wheel.rotation.z =
        Math.PI / 2;

      wheel.position.set(
        pos[0],
        pos[1],
        pos[2]
      );

      group.add(
        wheel
      );
    }
  );


  return group;
}


/* =========================================================
   ENEMY TRANSFORM
========================================================= */

function updateEnemyTransform(
  enemy
) {

  const roadZ =
    enemy.userData.roadZ;

  const roadX =
    getRoadCurve(
      roadZ
    );

  const roadY =
    getRoadHeight(
      roadZ
    );

  enemy.position.x =
    roadX +
    enemy.userData.laneOffset;

  enemy.position.z =
    roadZ;

  enemy.position.y =
    roadY;


  enemy.rotation.y =
    getRoadDirection(
      roadZ
    );
}


/* =========================================================
   MAP VISUALS
========================================================= */

function applyMapVisuals() {

  if (
    !scene
  ) {

    return;
  }

  const map =
    MAPS[currentMap];


  scene.background =
    new THREE.Color(
      map.sky
    );


  scene.fog =
    new THREE.Fog(
      map.sky,
      currentMap === 5
        ? 80
        : 130,

      currentMap === 5
        ? 650
        : 1000
    );


  scene.traverse(
    object => {

      if (
        object.userData &&
        object.userData.isGround
      ) {

        object.material.color.set(
          map.ground
        );
      }
    }
  );


  roadObjects.forEach(
    object => {

      const type =
        object.userData.roadType;


      if (
        type === "road"
      ) {

        object.material.color.set(
          map.road
        );
      }


      if (
        type === "edge"
      ) {

        object.material.color.set(
          map.edge
        );

        if (
          object.material.emissive
        ) {

          object.material.emissive.set(
            currentMap === 5
              ? map.edge
              : 0x000000
          );

          object.material.emissiveIntensity =
            currentMap === 5
              ? 1.2
              : 0;
        }
      }


      if (
        type === "centerDash"
      ) {

        object.material.color.set(
          0xf5f5f5
        );

        if (
          object.material.emissive
        ) {

          object.material.emissive.set(
            currentMap === 5
              ? 0x00e5ff
              : 0x000000
          );
        }
      }


      if (
        type === "laneDash"
      ) {

        object.material.color.set(
          currentMap === 5
            ? 0x9defff
            : 0xd9d9d9
        );
      }


      if (
        type === "shoulder"
      ) {

        object.material.color.set(
          map.shoulder
        );
      }


      if (
        type === "bush"
      ) {

        object.material.color.set(
          currentMap === 4
            ? 0x597d35
            : 0x2f7d32
        );
      }
    }
  );


  showLevelNotification();
}


/* =========================================================
   LEVEL NOTIFICATION
========================================================= */

let notificationTimer = null;

function showLevelNotification() {

  if (
    !levelNotification
  ) {

    return;
  }

  levelNumber.textContent =
    `LEVEL ${currentMap}`;

  levelName.textContent =
    MAPS[currentMap].name;

  levelNotification.classList.remove(
    "hidden"
  );

  clearTimeout(
    notificationTimer
  );

  notificationTimer =
    setTimeout(
      () => {

        levelNotification.classList.add(
          "hidden"
        );

      },
      1800
    );
}


/* =========================================================
   START GAME
========================================================= */

function startGame(
  startLevel = 1
) {

  selectedStartLevel =
    THREE.MathUtils.clamp(
      Number(startLevel) || 1,
      1,
      5
    );


  mainMenu.classList.add(
    "hidden"
  );

  levelMenu.classList.add(
    "hidden"
  );

  gameElement.classList.remove(
    "hidden"
  );

  gameOver.classList.add(
    "hidden"
  );

  loading.classList.add(
    "hidden"
  );


  gameStarted = true;

  gameOverState = false;


  /* RESET */

  speed = 0;

  score = 0;

  distance =
    (
      selectedStartLevel -
      1
    ) *
    100;

  level =
    selectedStartLevel;

  currentMap =
    selectedStartLevel;

  steeringVelocity = 0;

  playerRoadOffset = 0;

  cameraShakeTime = 0;


  stopAllInput();


  /* PLAYER */

  if (
    car
  ) {

    car.position.x =
      getRoadCurve(5);

    car.position.y =
      getRoadHeight(5);

    car.position.z =
      5;

    car.rotation.y =
      getRoadDirection(5);
  }


  resetEnemies();

  applyMapVisuals();

  updateHUD();
}


/* =========================================================
   RESET ENEMIES
========================================================= */

function resetEnemies() {

  const activeCount =
    ENEMY_COUNT_BY_LEVEL[
      currentMap - 1
    ];


  enemyCars.forEach(
    (
      enemy,
      i
    ) => {

      enemy.userData.active =
        i < activeCount;


      if (
        !enemy.userData.active
      ) {

        enemy.visible =
          false;

        return;
      }


      enemy.visible =
        true;


      const spacing =
        Math.max(
          38,
          72 -
          currentMap *
          6
        );


      enemy.userData.roadZ =
        -40 -
        i *
        spacing -
        Math.random() *
        45;


      enemy.userData.laneOffset =
        LANES[
          Math.floor(
            Math.random() *
            LANES.length
          )
        ];


      enemy.userData.targetLane =
        enemy.userData.laneOffset;


      enemy.userData.speed =
        getEnemySpeed(
          enemy
        );


      enemy.userData.changeTimer =
        2 +
        Math.random() *
        4;


      updateEnemyTransform(
        enemy
      );
    }
  );
}


/* =========================================================
   ENEMY SPEED
========================================================= */

function getEnemySpeed(
  enemy
) {

  const mapIndex =
    currentMap - 1;


  const base =
    ENEMY_BASE_SPEED[
      mapIndex
    ];


  const max =
    ENEMY_MAX_SPEED[
      mapIndex
    ];


  let result =
    base +
    Math.random() *
    (
      max -
      base
    );


  if (
    Math.random() <
    0.30 +
    currentMap *
    0.06
  ) {

    result +=
      0.025 +
      Math.random() *
      0.04;
  }


  return Math.min(
    result,
    max
  );
}


/* =========================================================
   ENEMY LANE CHOICE
========================================================= */

function chooseEnemyLane(
  enemy
) {

  const current =
    enemy.userData.laneOffset;


  const possible =
    LANES.filter(
      lane =>
        Math.abs(
          lane -
          current
        ) > 0.5
    );


  if (
    possible.length === 0
  ) {

    return;
  }


  let safeLanes =
    possible.filter(
      lane => {

        const playerLane =
          playerRoadOffset;

        return (
          Math.abs(
            lane -
            playerLane
          ) > 1.0
        );
      }
    );


  if (
    safeLanes.length === 0
  ) {

    safeLanes =
      possible;
  }


  const target =
    safeLanes[
      Math.floor(
        Math.random() *
        safeLanes.length
      )
    ];


  enemy.userData.targetLane =
    target;
}


/* =========================================================
   ENEMY LANE MOVEMENT
========================================================= */

function updateEnemyLane(
  enemy
) {

  const current =
    enemy.userData.laneOffset;

  const target =
    enemy.userData.targetLane;


  const laneSpeed =
    0.018 +
    currentMap *
    0.003;


  if (
    Math.abs(
      target -
      current
    ) <
    0.02
  ) {

    enemy.userData.laneOffset =
      target;

    return;
  }


  if (
    target >
    current
  ) {

    enemy.userData.laneOffset +=
      laneSpeed;

  } else {

    enemy.userData.laneOffset -=
      laneSpeed;
  }


  enemy.userData.laneOffset =
    THREE.MathUtils.clamp(
      enemy.userData.laneOffset,
      -3.2,
      3.2
    );
}


/* =========================================================
   PLAYER UPDATE
========================================================= */

function updatePlayer() {

  if (
    !gameStarted
  ) {

    return;
  }

  if (
    gameOverState
  ) {

    return;
  }


  /* ACCELERATION */

  if (
    gasPressed
  ) {

    speed +=
      ACCELERATION;

    if (
      speed >
      MAX_SPEED
    ) {

      speed =
        MAX_SPEED;
    }

  } else {

    speed -=
      NATURAL_DECELERATION;

    if (
      speed < 0
    ) {

      speed = 0;
    }
  }


  /* BRAKE */

  if (
    brakePressed
  ) {

    speed -=
      BRAKE_POWER;

    if (
      speed < 0
    ) {

      speed = 0;
    }
  }


  /* STEERING */

  if (
    steerLeft
  ) {

    steeringVelocity -=
      STEER_ACCELERATION;
  }


  if (
    steerRight
  ) {

    steeringVelocity +=
      STEER_ACCELERATION;
  }


  if (
    !steerLeft &&
    !steerRight
  ) {

    if (
      steeringVelocity > 0
    ) {

      steeringVelocity -=
        STEER_DECELERATION;

      if (
        steeringVelocity < 0
      ) {

        steeringVelocity = 0;
      }

    } else if (
      steeringVelocity < 0
    ) {

      steeringVelocity +=
        STEER_DECELERATION;

      if (
        steeringVelocity > 0
      ) {

        steeringVelocity = 0;
      }
    }
  }


  steeringVelocity =
    THREE.MathUtils.clamp(
      steeringVelocity,
      -STEER_MAX_SPEED,
      STEER_MAX_SPEED
    );


  /*
     Steering dibuat sedikit lebih lembut
     agar cocok dengan highway smooth.
  */

  playerRoadOffset +=
    steeringVelocity *
    (
      0.60 +
      speed *
      0.052
    );


  playerRoadOffset =
    THREE.MathUtils.clamp(
      playerRoadOffset,
      -ROAD_LIMIT,
      ROAD_LIMIT
    );


  /* PLAYER POSITION */

  const roadX =
    getRoadCurve(5);

  const roadY =
    getRoadHeight(5);


  car.position.x =
    roadX +
    playerRoadOffset;

  car.position.z =
    5;

  car.position.y =
    roadY +
    Math.sin(
      performance.now() *
      0.015
    ) *
    0.012;


  /*
     Mobil mengikuti arah highway
     secara halus.
  */

  const roadDirection =
    getRoadDirection(5);


  const steeringAngle =
    steeringVelocity *
    0.65;


  car.rotation.y =
    roadDirection +
    steeringAngle;


  /* DISTANCE */

  if (
    speed > 0
  ) {

    distance +=
      speed *
      0.045;

    score +=
      speed *
      0.08;
  }
}


/* =========================================================
   WORLD MOVEMENT
========================================================= */

function updateWorldMovement() {

  if (
    !gameStarted
  ) {

    return;
  }

  if (
    gameOverState
  ) {

    return;
  }

  if (
    speed <= 0
  ) {

    return;
  }


  const worldMove =
    speed *
    WORLD_SPEED_MULTIPLIER;


  roadObjects.forEach(
    object => {

      object.userData.roadZ +=
        worldMove;


      if (
        object.userData.roadZ >
        18
      ) {

        object.userData.roadZ -=
          WORLD_LENGTH;
      }


      updateRoadObjectTransform(
        object
      );
    }
  );
}


/* =========================================================
   UPDATE ENEMIES
========================================================= */

function updateEnemies() {

  if (
    !gameStarted
  ) {

    return;
  }

  if (
    gameOverState
  ) {

    return;
  }


  const worldMove =
    speed *
    WORLD_SPEED_MULTIPLIER;


  enemyCars.forEach(
    enemy => {

      if (
        !enemy.userData.active
      ) {

        return;
      }


      enemy.userData.roadZ +=
        enemy.userData.speed -
        worldMove;


      enemy.userData.changeTimer -=
        0.016;


      if (
        enemy.userData.changeTimer <=
        0
      ) {

        const changeChance =
          0.35 +
          currentMap *
          0.10;


        if (
          Math.random() <
          changeChance
        ) {

          chooseEnemyLane(
            enemy
          );
        }


        enemy.userData.changeTimer =
          Math.max(
            1.8,
            5.5 -
            currentMap *
            0.5
          ) +
          Math.random() *
          3;
      }


      updateEnemyLane(
        enemy
      );


      const relativeZ =
        enemy.userData.roadZ -
        5;


      if (
        relativeZ < -80
      ) {

        enemy.userData.speed +=
          0.0015;

      } else if (
        relativeZ > 8
      ) {

        enemy.userData.speed -=
          0.001;
      }


      const maxSpeed =
        ENEMY_MAX_SPEED[
          currentMap - 1
        ];


      enemy.userData.speed =
        THREE.MathUtils.clamp(
          enemy.userData.speed,

          ENEMY_BASE_SPEED[
            currentMap - 1
          ],

          maxSpeed
        );


      if (
        enemy.userData.roadZ >
        18
      ) {

        enemy.userData.roadZ =
          -WORLD_LENGTH +
          Math.random() *
          160;


        enemy.userData.laneOffset =
          LANES[
            Math.floor(
              Math.random() *
              LANES.length
            )
          ];


        enemy.userData.targetLane =
          enemy.userData.laneOffset;


        enemy.userData.speed =
          getEnemySpeed(
            enemy
          );


        enemy.userData.changeTimer =
          2 +
          Math.random() *
          4;
      }


      if (
        enemy.userData.roadZ <
        -WORLD_LENGTH -
        60
      ) {

        enemy.userData.roadZ =
          -WORLD_LENGTH +
          Math.random() *
          160;
      }


      updateEnemyTransform(
        enemy
      );


      checkCollision(
        enemy
      );
    }
  );
}


/* =========================================================
   COLLISION
========================================================= */

function checkCollision(
  enemy
) {

  const dx =
    Math.abs(
      car.position.x -
      enemy.position.x
    );


  const dz =
    Math.abs(
      car.position.z -
      enemy.position.z
    );


  if (
    dx < 1.8 &&
    dz < 2.7
  ) {

    createCollisionEffect(
      car.position.x,
      car.position.y +
      0.5,
      car.position.z
    );

    endGame();
  }
}


/* =========================================================
   COLLISION EFFECT
========================================================= */

function createCollisionEffect(
  x,
  y,
  z
) {

  cameraShakeTime =
    CAMERA_SHAKE_DURATION;


  for (
    let i = 0;
    i < 25;
    i++
  ) {

    const particle =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          0.06 +
          Math.random() *
          0.06,
          6,
          6
        ),
        new THREE.MeshBasicMaterial({
          color:
            Math.random() <
            0.5
              ? 0xff9800
              : 0xffeb3b
        })
      );


    particle.position.set(
      x,
      y,
      z
    );


    particle.userData.velocity =
      new THREE.Vector3(
        (
          Math.random() -
          0.5
        ) *
        0.25,

        Math.random() *
        0.25,

        (
          Math.random() -
          0.5
        ) *
        0.25
      );


    particle.userData.life =
      1;


    scene.add(
      particle
    );


    collisionParticles.push(
      particle
    );
  }
}


/* =========================================================
   PARTICLES
========================================================= */

function updateParticles() {

  for (
    let i =
      collisionParticles.length -
      1;

    i >= 0;

    i--
  ) {

    const particle =
      collisionParticles[i];


    particle.position.add(
      particle.userData.velocity
    );


    particle.userData.velocity.y -=
      0.01;


    particle.userData.life -=
      0.025;


    particle.scale.setScalar(
      particle.userData.life
    );


    if (
      particle.userData.life <=
      0
    ) {

      scene.remove(
        particle
      );


      particle.geometry.dispose();

      particle.material.dispose();


      collisionParticles.splice(
        i,
        1
      );
    }
  }
}


/* =========================================================
   CAMERA
========================================================= */

function updateCamera() {

  if (
    !car
  ) {

    return;
  }


  const roadX =
    getRoadCurve(5);


  const roadDirection =
    getRoadDirection(5);


  let targetX =
    roadX +
    playerRoadOffset;


  let targetY =
    5;


  if (
    cameraShakeTime > 0
  ) {

    cameraShakeTime -=
      0.016;


    targetX +=
      (
        Math.random() -
        0.5
      ) *
      0.35;


    targetY +=
      (
        Math.random() -
        0.5
      ) *
      0.25;
  }


  camera.position.x +=
    (
      targetX -
      camera.position.x
    ) *
    0.08;


  camera.position.y +=
    (
      targetY -
      camera.position.y
    ) *
    0.08;


  camera.position.z +=
    (
      9 -
      camera.position.z
    ) *
    0.08;


  /*
     Kamera sedikit mengikuti arah highway.
     Ini membuat tikungan terasa lebih natural.
  */

  const lookAheadX =
    getRoadCurve(
      -12
    );


  const smoothLookX =
    lookAheadX +
    playerRoadOffset *
    0.35;


  camera.lookAt(
    smoothLookX,
    1,
    -10
  );
}


/* =========================================================
   INPUT RESET
========================================================= */

function stopAllInput() {

  steerLeft = false;

  steerRight = false;

  gasPressed = false;

  brakePressed = false;
}


/* =========================================================
   MOBILE BUTTON
========================================================= */

function bindHoldButton(
  id,
  setter
) {

  const element =
    document.getElementById(
      id
    );


  if (
    !element
  ) {

    return;
  }


  const start =
    event => {

      event.preventDefault();

      setter(true);


      try {

        element.setPointerCapture(
          event.pointerId
        );

      } catch (
        error
      ) {

        /* ignore */
      }
    };


  const stop =
    event => {

      event.preventDefault();

      setter(false);
    };


  element.addEventListener(
    "pointerdown",
    start,
    {
      passive: false
    }
  );


  element.addEventListener(
    "pointerup",
    stop,
    {
      passive: false
    }
  );


  element.addEventListener(
    "pointercancel",
    stop,
    {
      passive: false
    }
  );


  element.addEventListener(
    "lostpointercapture",
    stop,
    {
      passive: false
    }
  );


  element.addEventListener(
    "contextmenu",
    event => {

      event.preventDefault();
    }
  );
}


/* =========================================================
   CONTROLS
========================================================= */

function setupControls() {

  bindHoldButton(
    "left",
    value => {

      steerLeft = value;
    }
  );


  bindHoldButton(
    "right",
    value => {

      steerRight = value;
    }
  );


  bindHoldButton(
    "gas",
    value => {

      gasPressed = value;
    }
  );


  bindHoldButton(
    "brake",
    value => {

      brakePressed = value;
    }
  );


  /* KEYBOARD */

  window.addEventListener(
    "keydown",
    event => {

      const key =
        event.key.toLowerCase();


      if (
        key === "arrowleft" ||
        key === "a"
      ) {

        steerLeft = true;
      }


      if (
        key === "arrowright" ||
        key === "d"
      ) {

        steerRight = true;
      }


      if (
        key === "arrowup" ||
        key === "w"
      ) {

        gasPressed = true;
      }


      if (
        key === "arrowdown" ||
        key === "s" ||
        key === " "
      ) {

        brakePressed = true;
      }


      if (
        [
          "arrowleft",
          "arrowright",
          "arrowup",
          "arrowdown",
          " "
        ].includes(key)
      ) {

        event.preventDefault();
      }
    },
    {
      passive: false
    }
  );


  window.addEventListener(
    "keyup",
    event => {

      const key =
        event.key.toLowerCase();


      if (
        key === "arrowleft" ||
        key === "a"
      ) {

        steerLeft = false;
      }


      if (
        key === "arrowright" ||
        key === "d"
      ) {

        steerRight = false;
      }


      if (
        key === "arrowup" ||
        key === "w"
      ) {

        gasPressed = false;
      }


      if (
        key === "arrowdown" ||
        key === "s" ||
        key === " "
      ) {

        brakePressed = false;
      }
    },
    {
      passive: false
    }
  );


  window.addEventListener(
    "blur",
    () => {

      stopAllInput();
    }
  );


  document.addEventListener(
    "visibilitychange",
    () => {

      if (
        document.hidden
      ) {

        stopAllInput();
      }
    }
  );
}


/* =========================================================
   RESIZE
========================================================= */

function onResize() {

  if (
    !camera ||
    !renderer
  ) {

    return;
  }


  camera.aspect =
    window.innerWidth /
    window.innerHeight;


  camera.updateProjectionMatrix();


  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );
}


/* =========================================================
   HUD
========================================================= */

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

  const bestScoreElement =
    document.getElementById(
      "bestScore"
    );


  if (
    speedElement
  ) {

    speedElement.textContent =
      Math.floor(
        speed * 12
      );
  }


  if (
    distanceElement
  ) {

    distanceElement.textContent =
      Math.floor(
        distance
      );
  }


  if (
    scoreElement
  ) {

    scoreElement.textContent =
      Math.floor(
        score
      );
  }


  if (
    levelElement
  ) {

    levelElement.textContent =
      currentMap;
  }


  if (
    bestScoreElement
  ) {

    bestScoreElement.textContent =
      Math.floor(
        bestScore
      );
  }
}


/* =========================================================
   LEVEL UPDATE
========================================================= */

function updateLevel() {

  const newMap =
    THREE.MathUtils.clamp(
      Math.floor(
        distance / 100
      ) + 1,
      1,
      5
    );


  if (
    newMap !==
    currentMap
  ) {

    currentMap =
      newMap;

    level =
      newMap;


    resetEnemies();

    applyMapVisuals();
  }


  checkUnlock();
}


/* =========================================================
   UNLOCK
========================================================= */

function checkUnlock() {

  let newUnlocked =
    unlockedLevel;


  if (
    distance >= 100
  ) {

    newUnlocked =
      Math.max(
        newUnlocked,
        2
      );
  }


  if (
    distance >= 200
  ) {

    newUnlocked =
      Math.max(
        newUnlocked,
        3
      );
  }


  if (
    distance >= 300
  ) {

    newUnlocked =
      Math.max(
        newUnlocked,
        4
      );
  }


  if (
    distance >= 400
  ) {

    newUnlocked =
      Math.max(
        newUnlocked,
        5
      );
  }


  if (
    newUnlocked !==
    unlockedLevel
  ) {

    unlockedLevel =
      newUnlocked;


    localStorage.setItem(
      "lexaUnlockedLevel",
      unlockedLevel
    );
  }
}


/* =========================================================
   GAME OVER
========================================================= */

function endGame() {

  if (
    gameOverState
  ) {

    return;
  }


  gameOverState =
    true;

  speed =
    0;


  stopAllInput();


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


  const finalDistance =
    document.getElementById(
      "finalDistance"
    );

  const finalScore =
    document.getElementById(
      "finalScore"
    );

  const finalBestScore =
    document.getElementById(
      "finalBestScore"
    );

  const finalLevel =
    document.getElementById(
      "finalLevel"
    );


  if (
    finalDistance
  ) {

    finalDistance.textContent =
      `${Math.floor(
        distance
      )} m`;
  }


  if (
    finalScore
  ) {

    finalScore.textContent =
      Math.floor(
        score
      );
  }


  if (
    finalBestScore
  ) {

    finalBestScore.textContent =
      Math.floor(
        bestScore
      );
  }


  if (
    finalLevel
  ) {

    finalLevel.textContent =
      currentMap;
  }


  gameOver.classList.remove(
    "hidden"
  );
}


/* =========================================================
   GAME LOOP
========================================================= */

function animate() {

  requestAnimationFrame(
    animate
  );


  updatePlayer();

  updateWorldMovement();

  updateEnemies();

  updateLevel();

  updateParticles();

  updateCamera();

  updateHUD();


  renderer.render(
    scene,
    camera
  );
}


/* =========================================================
   START
========================================================= */

setupControls();

initThree();

showMainMenu();