import * as THREE from "./three.module.js";

/* =========================================================
   LEXA SPEED RACE 3D
   COINS + CHECKPOINT + FINISH + VICTORY SYSTEM
========================================================= */

let scene;
let camera;
let renderer;
let clock;

let player;
let roadGroup;
let environmentGroup;
let enemyGroup;
let coinGroup;
let checkpointGroup;
let finishGroup;

let gameRunning = false;
let gameWon = false;
let gameOver = false;

let currentLevel = 1;
let selectedStartLevel = 1;

let distance = 0;
let levelDistance = 0;
let score = 0;

let totalCoins = Number(localStorage.getItem("lexaTotalCoins") || 0);

let speed = 0;
let maxPlayerSpeed = 0.22;
let acceleration = 0.006;
let braking = 0.012;
let friction = 0.003;

let playerX = 0;
let steering = 0;

let gasPressed = false;
let brakePressed = false;
let leftPressed = false;
let rightPressed = false;

let lastTime = 0;

const WORLD_LENGTH = 1200;
const ROAD_SEGMENT_LENGTH = 12;
const ROAD_WIDTH = 14;

const LEVEL_DISTANCE = 500;
const CHECKPOINT_DISTANCE = 250;

const roadSegments = [];
const roadObjects = [];
const enemies = [];
const coins = [];

let checkpointPassed = false;
let checkpointMesh = null;
let finishMesh = null;

const tempVector = new THREE.Vector3();

/* =========================================================
   MAP DATA
========================================================= */

const MAPS = {
  1: {
    name: "GREEN VALLEY",
    description: "Jalan hijau dengan pepohonan",
    sky: 0x87ceeb,
    road: 0x292929,
    shoulder: 0x777777,
    grass: 0x3d8b3d,
    curveStrength: 1.0
  },

  2: {
    name: "FOREST ROAD",
    description: "Hutan lebat dengan tikungan",
    sky: 0x76a5af,
    road: 0x252525,
    shoulder: 0x666666,
    grass: 0x285c2b,
    curveStrength: 1.25
  },

  3: {
    name: "MOUNTAIN ROAD",
    description: "Jalan pegunungan berkelok",
    sky: 0x9bb7d4,
    road: 0x292929,
    shoulder: 0x777777,
    grass: 0x496b45,
    curveStrength: 1.5
  },

  4: {
    name: "DESERT HIGHWAY",
    description: "Highway panjang di padang pasir",
    sky: 0xe9c78a,
    road: 0x303030,
    shoulder: 0x8b806d,
    grass: 0xb99a5c,
    curveStrength: 1.15
  },

  5: {
    name: "NIGHT CITY",
    description: "Highway kota pada malam hari",
    sky: 0x101522,
    road: 0x202020,
    shoulder: 0x4b4b4b,
    grass: 0x181c24,
    curveStrength: 1.35
  }
};

/* =========================================================
   INIT
========================================================= */

init();

function init() {
  setupRenderer();
  setupScene();
  setupCamera();
  setupLights();

  createWorld();
  createPlayer();
  createEnemies();
  createCoins();
  createCheckpoint();
  createFinishLine();

  setupControls();
  updateHUD();

  clock = new THREE.Clock();

  window.addEventListener("resize", onResize);

  animate();

  // Hilangkan layar LOADING setelah game siap
  const loading = document.getElementById("loading");

  if (loading) {
    loading.style.display = "none";
  }

  // Tampilkan menu utama
  showMenu();
}

/* =========================================================
   RENDERER
========================================================= */

function setupRenderer() {
  renderer = new THREE.WebGLRenderer({
    antialias: true
  });

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, 1.5)
  );

  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  document.body.appendChild(renderer.domElement);
}

/* =========================================================
   SCENE
========================================================= */

function setupScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(MAPS[1].sky);

  scene.fog = new THREE.Fog(
    MAPS[1].sky,
    90,
    500
  );
}

/* =========================================================
   CAMERA
========================================================= */

function setupCamera() {
  camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.1,
    1500
  );

  camera.position.set(0, 6, 14);
}

/* =========================================================
   LIGHT
========================================================= */

function setupLights() {
  const ambient = new THREE.HemisphereLight(
    0xffffff,
    0x444444,
    1.2
  );

  scene.add(ambient);

  const sun = new THREE.DirectionalLight(
    0xffffff,
    1.5
  );

  sun.position.set(40, 80, 30);

  sun.castShadow = true;

  sun.shadow.mapSize.width = 1024;
  sun.shadow.mapSize.height = 1024;

  scene.add(sun);
}

/* =========================================================
   WORLD
========================================================= */

function createWorld() {
  roadGroup = new THREE.Group();
  environmentGroup = new THREE.Group();
  enemyGroup = new THREE.Group();
  coinGroup = new THREE.Group();
  checkpointGroup = new THREE.Group();
  finishGroup = new THREE.Group();

  scene.add(roadGroup);
  scene.add(environmentGroup);
  scene.add(enemyGroup);
  scene.add(coinGroup);
  scene.add(checkpointGroup);
  scene.add(finishGroup);

  createRoad();
  createEnvironment();
}

/* =========================================================
   ROAD CURVE
========================================================= */

function getRoadCurve(z) {
  const normalized =
    ((Math.abs(z) % WORLD_LENGTH) / WORLD_LENGTH);

  const map = MAPS[currentLevel];

  const longWave =
    Math.sin(normalized * Math.PI * 2.2 + 0.7) * 3.8;

  const mediumWave =
    Math.sin(normalized * Math.PI * 4.0 + 2.0) * 1.45;

  const gentleWave =
    Math.sin(normalized * Math.PI * 7.0 + 1.0) * 0.45;

  return (
    longWave +
    mediumWave +
    gentleWave
  ) * map.curveStrength;
}

function getRoadDirection(z) {
  const sample = 0.5;

  const x1 = getRoadCurve(z - sample);
  const x2 = getRoadCurve(z + sample);

  return Math.atan2(
    x2 - x1,
    sample * 2
  );
}

function getRoadHeight(z) {
  return (
    Math.sin(z * 0.018) * 0.08 +
    Math.sin(z * 0.006) * 0.05
  );
}

/* =========================================================
   ROAD
========================================================= */

function createRoad() {
  for (
    let z = -WORLD_LENGTH / 2;
    z < WORLD_LENGTH / 2;
    z += ROAD_SEGMENT_LENGTH
  ) {
    createRoadSegment(z);
  }
}

function createRoadSegment(z) {
  const group = new THREE.Group();

  const roadMaterial = new THREE.MeshStandardMaterial({
    color: MAPS[1].road,
    roughness: 0.9
  });

  const road = new THREE.Mesh(
    new THREE.BoxGeometry(
      ROAD_WIDTH,
      0.22,
      ROAD_SEGMENT_LENGTH + 0.4
    ),
    roadMaterial
  );

  road.receiveShadow = true;

  group.add(road);

  /* CENTER MARK */

  const centerMark = new THREE.Mesh(
    new THREE.BoxGeometry(
      0.18,
      0.03,
      6.2
    ),
    new THREE.MeshStandardMaterial({
      color: 0xffffff
    })
  );

  centerMark.position.y = 0.14;

  group.add(centerMark);

  /* LANE MARKINGS */

  const laneLeft = new THREE.Mesh(
    new THREE.BoxGeometry(
      0.10,
      0.025,
      5
    ),
    new THREE.MeshStandardMaterial({
      color: 0xffffff
    })
  );

  laneLeft.position.set(
    -ROAD_WIDTH * 0.25,
    0.14,
    0
  );

  group.add(laneLeft);

  const laneRight = laneLeft.clone();

  laneRight.position.x =
    ROAD_WIDTH * 0.25;

  group.add(laneRight);

  /* EDGE LINES */

  const edgeMaterial =
    new THREE.MeshStandardMaterial({
      color: 0xf5f5f5
    });

  const edgeLeft = new THREE.Mesh(
    new THREE.BoxGeometry(
      0.18,
      0.03,
      ROAD_SEGMENT_LENGTH
    ),
    edgeMaterial
  );

  edgeLeft.position.set(
    -ROAD_WIDTH / 2 + 0.25,
    0.14,
    0
  );

  group.add(edgeLeft);

  const edgeRight = edgeLeft.clone();

  edgeRight.position.x =
    ROAD_WIDTH / 2 - 0.25;

  group.add(edgeRight);

  /* SHOULDER */

  const shoulderMaterial =
    new THREE.MeshStandardMaterial({
      color: MAPS[1].shoulder
    });

  const shoulderLeft = new THREE.Mesh(
    new THREE.BoxGeometry(
      1.5,
      0.16,
      ROAD_SEGMENT_LENGTH
    ),
    shoulderMaterial
  );

  shoulderLeft.position.set(
    -ROAD_WIDTH / 2 - 0.8,
    -0.02,
    0
  );

  group.add(shoulderLeft);

  const shoulderRight =
    shoulderLeft.clone();

  shoulderRight.position.x =
    ROAD_WIDTH / 2 + 0.8;

  group.add(shoulderRight);

  updateRoadObjectTransform(
    group,
    z
  );

  roadGroup.add(group);

  roadSegments.push({
    group,
    z
  });

  roadObjects.push(group);
}

function updateRoadObjectTransform(
  object,
  z
) {
  object.position.x =
    getRoadCurve(z);

  object.position.y =
    getRoadHeight(z);

  object.position.z = z;

  object.rotation.y =
    getRoadDirection(z);
}

/* =========================================================
   ENVIRONMENT
========================================================= */

function createEnvironment() {
  const map = MAPS[1];

  /* GRASS */

  const grassMaterial =
    new THREE.MeshStandardMaterial({
      color: map.grass
    });

  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(
      260,
      WORLD_LENGTH
    ),
    grassMaterial
  );

  grass.rotation.x =
    -Math.PI / 2;

  grass.position.y = -0.2;

  environmentGroup.add(grass);

  /* TREES */

  for (let i = 0; i < 120; i++) {
    const z =
      -WORLD_LENGTH / 2 +
      Math.random() * WORLD_LENGTH;

    const side =
      Math.random() < 0.5
        ? -1
        : 1;

    const roadX =
      getRoadCurve(z);

    const tree = createTree();

    tree.position.set(
      roadX +
        side *
          (ROAD_WIDTH / 2 +
            7 +
            Math.random() * 25),
      0,
      z
    );

    environmentGroup.add(tree);
  }

  /* BUSHES */

  for (let i = 0; i < 160; i++) {
    const z =
      -WORLD_LENGTH / 2 +
      Math.random() * WORLD_LENGTH;

    const side =
      Math.random() < 0.5
        ? -1
        : 1;

    const bush =
      createBush();

    bush.position.set(
      getRoadCurve(z) +
        side *
          (ROAD_WIDTH / 2 +
            3 +
            Math.random() * 15),
      0,
      z
    );

    environmentGroup.add(bush);
  }

  /* MOUNTAINS */

  for (let i = 0; i < 25; i++) {
    const z =
      -WORLD_LENGTH / 2 +
      Math.random() * WORLD_LENGTH;

    const mountain =
      createMountain();

    const side =
      i % 2 === 0
        ? -1
        : 1;

    mountain.position.set(
      getRoadCurve(z) +
        side * (35 + Math.random() * 35),
      0,
      z
    );

    environmentGroup.add(mountain);
  }

  /* STREET LIGHTS */

  for (let i = 0; i < 110; i++) {
    const z =
      -WORLD_LENGTH / 2 +
      Math.random() * WORLD_LENGTH;

    const side =
      i % 2 === 0
        ? -1
        : 1;

    const light =
      createStreetLight();

    light.position.set(
      getRoadCurve(z) +
        side * (ROAD_WIDTH / 2 + 3),
      0,
      z
    );

    light.rotation.y =
      getRoadDirection(z);

    environmentGroup.add(light);
  }
}

function createTree() {
  const group = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(
      0.35,
      0.5,
      3,
      8
    ),
    new THREE.MeshStandardMaterial({
      color: 0x704214
    })
  );

  trunk.position.y = 1.5;

  group.add(trunk);

  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(
      2.2,
      5,
      8
    ),
    new THREE.MeshStandardMaterial({
      color: 0x197b30
    })
  );

  leaves.position.y = 4;

  group.add(leaves);

  group.scale.setScalar(
    0.7 + Math.random() * 0.8
  );

  return group;
}

function createBush() {
  const bush = new THREE.Mesh(
    new THREE.SphereGeometry(
      0.8 + Math.random() * 0.6,
      8,
      6
    ),
    new THREE.MeshStandardMaterial({
      color: 0x236b2b
    })
  );

  bush.position.y = 0.5;

  return bush;
}

function createMountain() {
  const mountain = new THREE.Mesh(
    new THREE.ConeGeometry(
      12 + Math.random() * 10,
      25 + Math.random() * 20,
      7
    ),
    new THREE.MeshStandardMaterial({
      color: 0x626262
    })
  );

  mountain.position.y =
    mountain.geometry.parameters.height / 2;

  return mountain;
}

function createStreetLight() {
  const group = new THREE.Group();

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(
      0.08,
      0.12,
      5,
      6
    ),
    new THREE.MeshStandardMaterial({
      color: 0x555555
    })
  );

  pole.position.y = 2.5;

  group.add(pole);

  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(
      0.22,
      8,
      8
    ),
    new THREE.MeshStandardMaterial({
      color: 0xffffaa,
      emissive: 0xffff55,
      emissiveIntensity: 0.7
    })
  );

  lamp.position.y = 5;

  group.add(lamp);

  return group;
}

/* =========================================================
   PLAYER
========================================================= */

function createPlayer() {
  player = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(
      2.2,
      0.65,
      4.2
    ),
    new THREE.MeshStandardMaterial({
      color: 0xff2020,
      metalness: 0.3,
      roughness: 0.5
    })
  );

  body.position.y = 0.75;

  body.castShadow = true;

  player.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(
      1.6,
      0.65,
      1.7
    ),
    new THREE.MeshStandardMaterial({
      color: 0x202d40,
      metalness: 0.1,
      roughness: 0.3
    })
  );

  cabin.position.set(
    0,
    1.2,
    -0.2
  );

  player.add(cabin);

  createWheels(player);

  player.position.set(
    getRoadCurve(5),
    getRoadHeight(5),
    5
  );

  scene.add(player);
}

function createWheels(car) {
  const wheelMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x111111
    });

  const positions = [
    [-1.15, 0.45, -1.35],
    [1.15, 0.45, -1.35],
    [-1.15, 0.45, 1.35],
    [1.15, 0.45, 1.35]
  ];

  positions.forEach(pos => {
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.45,
        0.45,
        0.3,
        12
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

    car.add(wheel);
  });
}

/* =========================================================
   ENEMIES
========================================================= */

function createEnemies() {
  const count =
    [4, 4, 5, 5, 6][currentLevel - 1];

  for (let i = 0; i < count; i++) {
    const enemy =
      createEnemyCar(i);

    enemy.userData.lane =
      [-2, -1, 0, 1, 2][
        i % 5
      ];

    enemy.userData.speed =
      0.075 +
      currentLevel * 0.012 +
      Math.random() * 0.045;

    enemy.userData.maxSpeed =
      0.17 +
      currentLevel * 0.025;

    enemy.userData.changeTimer =
      100 +
      Math.random() * 250;

    enemy.userData.z =
      -60 -
      i * 70 -
      Math.random() * 80;

    positionEnemy(enemy);

    enemyGroup.add(enemy);

    enemies.push(enemy);
  }
}

function createEnemyCar(index) {
  const car = new THREE.Group();

  const colors = [
    0x1565c0,
    0xffc107,
    0x8e24aa,
    0xffffff,
    0xff6f00,
    0x00acc1
  ];

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(
      2.2,
      0.65,
      4.2
    ),
    new THREE.MeshStandardMaterial({
      color:
        colors[index % colors.length]
    })
  );

  body.position.y = 0.75;

  body.castShadow = true;

  car.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(
      1.6,
      0.65,
      1.7
    ),
    new THREE.MeshStandardMaterial({
      color: 0x1d2939
    })
  );

  cabin.position.set(
    0,
    1.2,
    -0.2
  );

  car.add(cabin);

  createWheels(car);

  return car;
}

function positionEnemy(enemy) {
  const laneWidth =
    ROAD_WIDTH / 5;

  const z =
    enemy.userData.z;

  enemy.position.x =
    getRoadCurve(z) +
    enemy.userData.lane *
      laneWidth;

  enemy.position.y =
    getRoadHeight(z);

  enemy.position.z =
    z;

  enemy.rotation.y =
    getRoadDirection(z);
}

/* =========================================================
   COINS
========================================================= */

function createCoins() {
  clearGroup(coinGroup);
  coins.length = 0;

  for (
    let i = 0;
    i < 45;
    i++
  ) {
    const coin =
      createCoin();

    const z =
      20 +
      i * 10 +
      Math.random() * 7;

    const lane =
      Math.floor(
        Math.random() * 5
      ) - 2;

    const laneWidth =
      ROAD_WIDTH / 5;

    coin.userData.z = z;
    coin.userData.lane = lane;

    coin.position.x =
      getRoadCurve(z) +
      lane * laneWidth;

    coin.position.y =
      1.4 +
      getRoadHeight(z);

    coin.position.z =
      z;

    coin.rotation.y =
      getRoadDirection(z);

    coinGroup.add(coin);

    coins.push(coin);
  }
}

function createCoin() {
  const coin = new THREE.Mesh(
    new THREE.CylinderGeometry(
      0.5,
      0.5,
      0.14,
      20
    ),
    new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.8,
      roughness: 0.25,
      emissive: 0x6b4f00,
      emissiveIntensity: 0.25
    })
  );

  coin.rotation.x =
    Math.PI / 2;

  coin.castShadow = true;

  return coin;
}

/* =========================================================
   CHECKPOINT
========================================================= */

function createCheckpoint() {
  clearGroup(checkpointGroup);

  checkpointPassed = false;

  checkpointMesh =
    createGate(
      0x00e5ff,
      "CHECKPOINT"
    );

  checkpointGroup.add(
    checkpointMesh
  );

  updateCheckpointPosition();
}

function updateCheckpointPosition() {
  if (!checkpointMesh) return;

  checkpointMesh.position.x =
    getRoadCurve(
      CHECKPOINT_DISTANCE
    );

  checkpointMesh.position.y =
    getRoadHeight(
      CHECKPOINT_DISTANCE
    );

  checkpointMesh.position.z =
    CHECKPOINT_DISTANCE;

  checkpointMesh.rotation.y =
    getRoadDirection(
      CHECKPOINT_DISTANCE
    );
}

/* =========================================================
   FINISH LINE
========================================================= */

function createFinishLine() {
  clearGroup(finishGroup);

  finishMesh =
    createGate(
      0xffd700,
      "FINISH"
    );

  finishGroup.add(
    finishMesh
  );

  updateFinishPosition();
}

function updateFinishPosition() {
  if (!finishMesh) return;

  finishMesh.position.x =
    getRoadCurve(
      LEVEL_DISTANCE
    );

  finishMesh.position.y =
    getRoadHeight(
      LEVEL_DISTANCE
    );

  finishMesh.position.z =
    LEVEL_DISTANCE;

  finishMesh.rotation.y =
    getRoadDirection(
      LEVEL_DISTANCE
    );
}

function createGate(color, text) {
  const group = new THREE.Group();

  const material =
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.45
    });

  const poleLeft = new THREE.Mesh(
    new THREE.BoxGeometry(
      0.45,
      7,
      0.45
    ),
    material
  );

  poleLeft.position.set(
    -ROAD_WIDTH / 2,
    3.5,
    0
  );

  group.add(poleLeft);

  const poleRight =
    poleLeft.clone();

  poleRight.position.x =
    ROAD_WIDTH / 2;

  group.add(poleRight);

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(
      ROAD_WIDTH + 0.8,
      0.45,
      0.45
    ),
    material
  );

  top.position.y = 7;

  group.add(top);

  /* FINISH STRIPES */

  for (
    let i = 0;
    i < 10;
    i++
  ) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(
        ROAD_WIDTH / 10,
        0.04,
        1.0
      ),
      new THREE.MeshStandardMaterial({
        color:
          i % 2 === 0
            ? 0xffffff
            : color
      })
    );

    stripe.position.x =
      -ROAD_WIDTH / 2 +
      ROAD_WIDTH / 20 +
      i *
        (ROAD_WIDTH / 10);

    stripe.position.y =
      0.15;

    group.add(stripe);
  }

  return group;
}

/* =========================================================
   LEVEL SETUP
========================================================= */

function startLevel(level) {
  currentLevel = level;
  selectedStartLevel = level;

  distance =
    (level - 1) * LEVEL_DISTANCE;

  levelDistance = 0;

  score = 0;

  speed = 0;

  playerX = 0;

  gameRunning = true;
  gameWon = false;
  gameOver = false;

  checkpointPassed = false;

  updateMapVisuals();

  createCoins();

  updateCheckpointPosition();
  updateFinishPosition();

  resetEnemies();

  positionPlayer();

  hideAllScreens();

  showLevelNotification();

  updateHUD();
}

function resetEnemies() {
  enemies.forEach(
    (enemy, index) => {
      enemy.userData.z =
        -60 -
        index * 70 -
        Math.random() * 80;

      enemy.userData.lane =
        [-2, -1, 0, 1, 2][
          index % 5
        ];

      enemy.userData.speed =
        0.075 +
        currentLevel * 0.012 +
        Math.random() * 0.045;

      positionEnemy(enemy);
    }
  );
}

function positionPlayer() {
  player.position.x =
    getRoadCurve(5);

  player.position.y =
    getRoadHeight(5);

  player.position.z = 5;

  player.rotation.y =
    getRoadDirection(5);
}

/* =========================================================
   MAP VISUALS
========================================================= */

function updateMapVisuals() {
  const map =
    MAPS[currentLevel];

  scene.background =
    new THREE.Color(
      map.sky
    );

  scene.fog.color =
    new THREE.Color(
      map.sky
    );

  roadSegments.forEach(
    segment => {
      segment.group.traverse(
        child => {
          if (
            child.material &&
            child.material.color
          ) {
            const old =
              child.material.color
                .getHex();

            if (
              old === 0x292929 ||
              old === 0x252525 ||
              old === 0x303030 ||
              old === 0x202020
            ) {
              child.material.color.set(
                map.road
              );
            }
          }
        }
      );
    }
  );

  updateEnvironmentTheme();
}

function updateEnvironmentTheme() {
  environmentGroup.traverse(
    object => {
      if (
        !object.material ||
        !object.material.color
      ) {
        return;
      }

      const hex =
        object.material.color
          .getHex();

      if (
        hex === 0x3d8b3d ||
        hex === 0x285c2b ||
        hex === 0x496b45 ||
        hex === 0xb99a5c ||
        hex === 0x181c24
      ) {
        object.material.color.set(
          MAPS[currentLevel].grass
        );
      }
    }
  );
}

/* =========================================================
   GAME LOOP
========================================================= */

function animate() {
  requestAnimationFrame(
    animate
  );

  const delta =
    Math.min(
      clock.getDelta(),
      0.05
    );

  if (gameRunning) {
    updatePlayer(delta);
    updateEnemies(delta);
    updateCoins(delta);
    updateWorldMovement(delta);
    updateCheckpoint();
    updateFinish();

    checkCollisions();

    updateHUD();
  }

  renderer.render(
    scene,
    camera
  );
}

/* =========================================================
   PLAYER UPDATE
========================================================= */

function updatePlayer(delta) {
  /* =========================
     GAS & BRAKE
  ========================= */

  if (gasPressed) {
    speed += acceleration;
  } else {
    speed -= friction;
  }

  if (brakePressed) {
    speed -= braking;
  }

  speed = THREE.MathUtils.clamp(
    speed,
    0,
    maxPlayerSpeed
  );


  /* =========================
     STEERING
  ========================= */

  let steerInput = 0;

  if (leftPressed) {
    steerInput -= 1;
  }

  if (rightPressed) {
    steerInput += 1;
  }

  /*
    Kecepatan belok mengikuti kecepatan mobil.
    Semakin cepat, semakin responsif.
  */
  const steeringSpeed =
    0.055 + speed * 0.12;

  playerX +=
    steerInput *
    steeringSpeed *
    delta *
    60;


  /* =========================
     STEERING AUTO CENTER
  ========================= */

  /*
    Kalau tidak menekan kiri/kanan,
    posisi mobil perlahan stabil.
  */
  if (steerInput === 0) {
    playerX *= 0.96;
  }


  /* =========================
     BATAS JALAN
  ========================= */

  const maxOffset =
    ROAD_WIDTH / 2 - 1.5;

  playerX =
    THREE.MathUtils.clamp(
      playerX,
      -maxOffset,
      maxOffset
    );


  /* =========================
     POSISI MOBIL
  ========================= */

  const roadCenter =
    getRoadCurve(5);

  player.position.x =
    roadCenter +
    playerX;

  player.position.y =
    getRoadHeight(5);

  player.position.z = 5;


  /* =========================
     ROTASI MOBIL
  ========================= */

  const roadDirection =
    getRoadDirection(5);

  /*
    Mobil mengikuti arah jalan.
    Input kiri/kanan hanya memberikan
    sedikit tambahan rotasi.
  */
  player.rotation.y =
    roadDirection +
    steerInput * 0.12;


  /* =========================
     CAMERA
  ========================= */

  camera.position.x =
    THREE.MathUtils.lerp(
      camera.position.x,
      player.position.x,
      0.08
    );

  camera.position.y =
    THREE.MathUtils.lerp(
      camera.position.y,
      6.2,
      0.08
    );

  camera.position.z = 14;


  /* =========================
     CAMERA LOOK AHEAD
  ========================= */

  const lookZ = -12;

  const lookX =
    getRoadCurve(lookZ);

  const lookY =
    1.2 +
    getRoadHeight(lookZ);

  camera.lookAt(
    lookX,
    lookY,
    lookZ
  );
}

/* =========================================================
   WORLD MOVEMENT
========================================================= */

function updateWorldMovement(delta) {
  const movement =
    speed * 60 * delta;

  distance += movement;

  levelDistance +=
    movement;

  roadSegments.forEach(
    segment => {
      segment.z += movement;

      if (
        segment.z >
        WORLD_LENGTH / 2
      ) {
        segment.z -=
          WORLD_LENGTH;
      }

      updateRoadObjectTransform(
        segment.group,
        segment.z
      );
    }
  );

  updateEnvironmentMovement(
    movement
  );

  enemies.forEach(
    enemy => {
      enemy.userData.z +=
        movement;

      if (
        enemy.userData.z >
        WORLD_LENGTH / 2
      ) {
        enemy.userData.z -=
          WORLD_LENGTH;
      }

      positionEnemy(enemy);
    }
  );

  coins.forEach(
    coin => {
      coin.userData.z +=
        movement;

      if (
        coin.userData.z >
        WORLD_LENGTH / 2
      ) {
        coin.userData.z -=
          WORLD_LENGTH;
      }

      const laneWidth =
        ROAD_WIDTH / 5;

      coin.position.x =
        getRoadCurve(
          coin.userData.z
        ) +
        coin.userData.lane *
          laneWidth;

      coin.position.y =
        1.4 +
        getRoadHeight(
          coin.userData.z
        );

      coin.position.z =
        coin.userData.z;

      coin.rotation.y +=
        0.06;
    }
  );

  if (checkpointMesh) {
    checkpointMesh.position.z =
      CHECKPOINT_DISTANCE -
      levelDistance;

    checkpointMesh.position.x =
      getRoadCurve(
        checkpointMesh.position.z
      );

    checkpointMesh.position.y =
      getRoadHeight(
        checkpointMesh.position.z
      );
  }

  if (finishMesh) {
    finishMesh.position.z =
      LEVEL_DISTANCE -
      levelDistance;

    finishMesh.position.x =
      getRoadCurve(
        finishMesh.position.z
      );

    finishMesh.position.y =
      getRoadHeight(
        finishMesh.position.z
      );
  }
}

/* =========================================================
   ENVIRONMENT MOVEMENT
========================================================= */

function updateEnvironmentMovement(
  movement
) {
  environmentGroup.children.forEach(
    object => {
      if (
        object ===
        environmentGroup.children[0]
      ) {
        return;
      }

      object.position.z +=
        movement;

      if (
        object.position.z >
        WORLD_LENGTH / 2
      ) {
        object.position.z -=
          WORLD_LENGTH;
      }

      const roadX =
        getRoadCurve(
          object.position.z
        );

      const side =
        object.position.x >=
        roadX
          ? 1
          : -1;

      if (
        Math.abs(
          object.position.x -
          roadX
        ) < ROAD_WIDTH
      ) {
        object.position.x =
          roadX +
          side *
            (ROAD_WIDTH / 2 +
              8);
      }
    }
  );
}

/* =========================================================
   ENEMIES UPDATE
========================================================= */

function updateEnemies(delta) {
  enemies.forEach(
    enemy => {
      const aggression =
        1 +
        currentLevel *
          0.08;

      enemy.userData.z +=
        enemy.userData.speed *
        aggression;

      enemy.userData.changeTimer -=
        delta * 60;

      if (
        enemy.userData.changeTimer <= 0
      ) {
        enemy.userData.changeTimer =
          150 +
          Math.random() *
            300;

        const direction =
          Math.random() < 0.5
            ? -1
            : 1;

        enemy.userData.lane +=
          direction;

        enemy.userData.lane =
          THREE.MathUtils.clamp(
            enemy.userData.lane,
            -2,
            2
          );
      }

      if (
        enemy.userData.z >
        WORLD_LENGTH / 2
      ) {
        enemy.userData.z -=
          WORLD_LENGTH;
      }

      positionEnemy(enemy);
    }
  );
}

/* =========================================================
   COIN UPDATE
========================================================= */

function updateCoins(delta) {
  coins.forEach(
    coin => {
      coin.rotation.z +=
        delta * 3;
    }
  );
}

/* =========================================================
   CHECKPOINT
========================================================= */

function updateCheckpoint() {
  if (
    checkpointPassed
  ) {
    return;
  }

  if (
    levelDistance >=
    CHECKPOINT_DISTANCE
  ) {
    checkpointPassed = true;

    score += 500;

    showMessage(
      "CHECKPOINT!",
      "+500 SCORE"
    );
  }
}

/* =========================================================
   FINISH
========================================================= */

function updateFinish() {
  if (
    levelDistance >=
    LEVEL_DISTANCE
  ) {
    winLevel();
  }
}

function winLevel() {
  if (
    gameWon ||
    gameOver
  ) {
    return;
  }

  gameWon = true;
  gameRunning = false;

  score += 1000;

  saveCoins();

  const nextLevel =
    currentLevel < 5
      ? currentLevel + 1
      : 5;

  unlockLevel(
    nextLevel
  );

  showVictoryScreen();
}

/* =========================================================
   COLLISION
========================================================= */

function checkCollisions() {
  /* COINS */

  coins.forEach(
    coin => {
      if (
        coin.userData.collected
      ) {
        return;
      }

      const dx =
        player.position.x -
        coin.position.x;

      const dz =
        player.position.z -
        coin.position.z;

      const distanceToCoin =
        Math.sqrt(
          dx * dx +
          dz * dz
        );

      if (
        distanceToCoin <
        1.8
      ) {
        collectCoin(
          coin
        );
      }
    }
  );

  /* ENEMIES */

  enemies.forEach(
    enemy => {
      const dx =
        player.position.x -
        enemy.position.x;

      const dz =
        player.position.z -
        enemy.position.z;

      if (
        Math.abs(dx) <
          1.8 &&
        Math.abs(dz) <
          2.6
      ) {
        triggerGameOver();
      }
    }
  );
}

function collectCoin(coin) {
  coin.userData.collected =
    true;

  coin.visible = false;

  totalCoins += 1;

  score += 100;

  localStorage.setItem(
    "lexaTotalCoins",
    totalCoins
  );

  updateHUD();
}

/* =========================================================
   GAME OVER
========================================================= */

function triggerGameOver() {
  if (
    gameOver ||
    gameWon
  ) {
    return;
  }

  gameOver = true;
  gameRunning = false;

  saveCoins();

  document
    .getElementById(
      "finalDistance"
    ).textContent =
    Math.floor(
      levelDistance
    ) + " m";

  document
    .getElementById(
      "finalScore"
    ).textContent =
    score;

  document
    .getElementById(
      "finalBestScore"
    ).textContent =
    getBestScore();

  document
    .getElementById(
      "finalLevel"
    ).textContent =
    currentLevel;

  document
    .getElementById(
      "gameOver"
    )
    .classList.remove(
      "hidden"
    );
}

/* =========================================================
   VICTORY SCREEN
========================================================= */

function showVictoryScreen() {
  let overlay =
    document.getElementById(
      "victoryScreen"
    );

  if (!overlay) {
    overlay =
      document.createElement(
        "div"
      );

    overlay.id =
      "victoryScreen";

    overlay.className =
      "game-over";

    overlay.innerHTML = `
      <div class="game-over-box">

        <div class="crash-title">
          🏆 FINISH!
        </div>

        <div class="result-row">
          <span>LEVEL</span>
          <strong id="victoryLevel">1</strong>
        </div>

        <div class="result-row">
          <span>NAME</span>
          <strong id="victoryName">GREEN VALLEY</strong>
        </div>

        <div class="result-row">
          <span>SCORE</span>
          <strong id="victoryScore">0</strong>
        </div>

        <div class="result-row">
          <span>TOTAL COINS</span>
          <strong id="victoryCoins">0</strong>
        </div>

        <div id="victoryNextText"
             style="
               margin:20px 0;
               font-weight:bold;
               text-align:center;
             ">
        </div>

        <button
          id="nextLevelButton"
          class="menu-button primary">
          LEVEL BERIKUTNYA ▶
        </button>

        <button
          id="victoryMenuButton"
          class="menu-button">
          🏠 MENU UTAMA
        </button>

      </div>
    `;

    document
      .getElementById(
        "game"
      )
      .appendChild(
        overlay
      );

    document
      .getElementById(
        "nextLevelButton"
      )
      .addEventListener(
        "click",
        () => {
          if (
            currentLevel < 5
          ) {
            startLevel(
              currentLevel + 1
            );
          } else {
            showMenu();
          }
        }
      );

    document
      .getElementById(
        "victoryMenuButton"
      )
      .addEventListener(
        "click",
        () => {
          showMenu();
        }
      );
  }

  document
    .getElementById(
      "victoryLevel"
    ).textContent =
    currentLevel;

  document
    .getElementById(
      "victoryName"
    ).textContent =
    MAPS[currentLevel].name;

  document
    .getElementById(
      "victoryScore"
    ).textContent =
    score;

  document
    .getElementById(
      "victoryCoins"
    ).textContent =
    totalCoins;

  const nextText =
    document.getElementById(
      "victoryNextText"
    );

  const nextButton =
    document.getElementById(
      "nextLevelButton"
    );

  if (
    currentLevel < 5
  ) {
    nextText.textContent =
      `LEVEL ${currentLevel + 1} TERBUKA!`;

    nextButton.style.display =
      "block";
  } else {
    nextText.textContent =
      "🎉 SEMUA LEVEL SELESAI!";

    nextButton.textContent =
      "🏠 KEMBALI KE MENU";

    nextButton.style.display =
      "block";
  }

  overlay.classList.remove(
    "hidden"
  );
}

/* =========================================================
   MESSAGE
========================================================= */

function showMessage(
  title,
  subtitle
) {
  let message =
    document.getElementById(
      "gameMessage"
    );

  if (!message) {
    message =
      document.createElement(
        "div"
      );

    message.id =
      "gameMessage";

    message.style.position =
      "fixed";

    message.style.top =
      "35%";

    message.style.left =
      "50%";

    message.style.transform =
      "translate(-50%, -50%)";

    message.style.textAlign =
      "center";

    message.style.color =
      "white";

    message.style.fontWeight =
      "bold";

    message.style.textShadow =
      "0 3px 8px black";

    message.style.zIndex =
      "999";

    message.innerHTML = `
      <div id="messageTitle"
           style="font-size:42px;">
      </div>

      <div id="messageSubtitle"
           style="font-size:22px;">
      </div>
    `;

    document.body.appendChild(
      message
    );
  }

  document
    .getElementById(
      "messageTitle"
    ).textContent =
    title;

  document
    .getElementById(
      "messageSubtitle"
    ).textContent =
    subtitle;

  message.style.opacity =
    "1";

  setTimeout(() => {
    message.style.transition =
      "opacity .5s";

    message.style.opacity =
      "0";
  }, 1200);
}

/* =========================================================
   LEVEL NOTIFICATION
========================================================= */

function showLevelNotification() {
  const box =
    document.getElementById(
      "levelNotification"
    );

  if (!box) return;

  document
    .getElementById(
      "levelNumber"
    ).textContent =
    "LEVEL " +
    currentLevel;

  document
    .getElementById(
      "levelName"
    ).textContent =
    MAPS[currentLevel].name;

  box.classList.remove(
    "hidden"
  );

  setTimeout(() => {
    box.classList.add(
      "hidden"
    );
  }, 2200);
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

  const bestElement =
    document.getElementById(
      "bestScore"
    );

  if (speedElement) {
    speedElement.textContent =
      Math.floor(
        speed * 850
      );
  }

  if (distanceElement) {
    distanceElement.textContent =
      Math.floor(
        levelDistance
      );
  }

  if (scoreElement) {
    scoreElement.textContent =
      score;
  }

  if (levelElement) {
    levelElement.textContent =
      currentLevel;
  }

  if (bestElement) {
    bestElement.textContent =
      getBestScore();
  }

  updateCoinHUD();
}

function updateCoinHUD() {
  let coinHUD =
    document.getElementById(
      "coinHUD"
    );

  if (!coinHUD) {
    coinHUD =
      document.createElement(
        "div"
      );

    coinHUD.id =
      "coinHUD";

    coinHUD.style.position =
      "fixed";

    coinHUD.style.top =
      "115px";

    coinHUD.style.right =
      "15px";

    coinHUD.style.padding =
      "8px 14px";

    coinHUD.style.background =
      "rgba(0,0,0,.55)";

    coinHUD.style.borderRadius =
      "12px";

    coinHUD.style.color =
      "white";

    coinHUD.style.fontWeight =
      "bold";

    coinHUD.style.fontSize =
      "18px";

    coinHUD.style.zIndex =
      "20";

    document.body.appendChild(
      coinHUD
    );
  }

  coinHUD.textContent =
    "🪙 " + totalCoins;
}

/* =========================================================
   SCORE
========================================================= */

function getBestScore() {
  return Number(
    localStorage.getItem(
      "lexaBestScore" +
        currentLevel
    ) || 0
  );
}

function saveBestScore() {
  const best =
    getBestScore();

  if (
    score > best
  ) {
    localStorage.setItem(
      "lexaBestScore" +
        currentLevel,
      score
    );
  }
}

function saveCoins() {
  localStorage.setItem(
    "lexaTotalCoins",
    totalCoins
  );

  saveBestScore();
}

/* =========================================================
   LEVEL UNLOCK
========================================================= */

function getUnlockedLevel() {
  return Number(
    localStorage.getItem(
      "lexaUnlockedLevel"
    ) || 1
  );
}

function unlockLevel(level) {
  const unlocked =
    getUnlockedLevel();

  if (
    level > unlocked
  ) {
    localStorage.setItem(
      "lexaUnlockedLevel",
      Math.min(
        level,
        5
      )
    );
  }

  updateMenuLevel();
}

/* =========================================================
   MENU
========================================================= */

function showMenu() {
  gameRunning = false;

  hideAllScreens();

  const mainMenu =
    document.getElementById(
      "mainMenu"
    );

  if (mainMenu) {
    mainMenu.classList.remove(
      "hidden"
    );
  }

  updateMenuLevel();
}

function showLevelMenu() {
  hideAllScreens();

  const levelMenu =
    document.getElementById(
      "levelMenu"
    );

  if (levelMenu) {
    levelMenu.classList.remove(
      "hidden"
    );
  }

  buildLevelList();
}

function hideAllScreens() {
  [
    "mainMenu",
    "levelMenu",
    "gameOver",
    "victoryScreen"
  ].forEach(id => {
    const el =
      document.getElementById(
        id
      );

    if (el) {
      el.classList.add(
        "hidden"
      );
    }
  });

  const game =
    document.getElementById(
      "game"
    );

  if (game) {
    game.classList.remove(
      "hidden"
    );
  }
}

function updateMenuLevel() {
  const element =
    document.getElementById(
      "menuUnlockedLevel"
    );

  if (element) {
    element.textContent =
      getUnlockedLevel();
  }
}

function buildLevelList() {
  const list =
    document.getElementById(
      "levelList"
    );

  if (!list) return;

  list.innerHTML = "";

  const unlocked =
    getUnlockedLevel();

  for (
    let level = 1;
    level <= 5;
    level++
  ) {
    const card =
      document.createElement(
        "div"
      );

    card.className =
      "level-card";

    if (
      level <= unlocked
    ) {
      card.classList.add(
        "unlocked"
      );

      card.innerHTML = `
        <div class="level-number">
          LEVEL ${level}
        </div>

        <div class="level-info">

          <div class="level-name">
            ${MAPS[level].name}
          </div>

          <div class="level-description">
            ${MAPS[level].description}
          </div>

          <div class="level-status">
            🔓 TERBUKA
          </div>

        </div>
      `;

      card.addEventListener(
        "click",
        () => {
          startLevel(
            level
          );
        }
      );
    } else {
      card.classList.add(
        "locked"
      );

      card.innerHTML = `
        <div class="level-number">
          LEVEL ${level}
        </div>

        <div class="level-info">

          <div class="level-name">
            ${MAPS[level].name}
          </div>

          <div class="level-description">
            ${MAPS[level].description}
          </div>

          <div class="level-status">
            🔒 TERKUNCI
          </div>

        </div>
      `;
    }

    list.appendChild(
      card
    );
  }
}

/* =========================================================
   CONTROLS
========================================================= */

function setupControls() {
  const gas =
    document.getElementById(
      "gas"
    );

  const brake =
    document.getElementById(
      "brake"
    );

  const left =
    document.getElementById(
      "left"
    );

  const right =
    document.getElementById(
      "right"
    );

  setupButton(
    gas,
    () =>
      gasPressed = true,
    () =>
      gasPressed = false
  );

  setupButton(
    brake,
    () =>
      brakePressed = true,
    () =>
      brakePressed = false
  );

  setupButton(
    left,
    () =>
      leftPressed = true,
    () =>
      leftPressed = false
  );

  setupButton(
    right,
    () =>
      rightPressed = true,
    () =>
      rightPressed = false
  );

  window.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "ArrowUp" ||
        event.key.toLowerCase() ===
          "w"
      ) {
        gasPressed = true;
      }

      if (
        event.key === "ArrowDown" ||
        event.key.toLowerCase() ===
          "s"
      ) {
        brakePressed = true;
      }

      if (
        event.key === "ArrowLeft" ||
        event.key.toLowerCase() ===
          "a"
      ) {
        leftPressed = true;
      }

      if (
        event.key === "ArrowRight" ||
        event.key.toLowerCase() ===
          "d"
      ) {
        rightPressed = true;
      }
    }
  );

  window.addEventListener(
    "keyup",
    event => {
      if (
        event.key === "ArrowUp" ||
        event.key.toLowerCase() ===
          "w"
      ) {
        gasPressed = false;
      }

      if (
        event.key === "ArrowDown" ||
        event.key.toLowerCase() ===
          "s"
      ) {
        brakePressed = false;
      }

      if (
        event.key === "ArrowLeft" ||
        event.key.toLowerCase() ===
          "a"
      ) {
        leftPressed = false;
      }

      if (
        event.key === "ArrowRight" ||
        event.key.toLowerCase() ===
          "d"
      ) {
        rightPressed = false;
      }
    }
  );

  /* MENU */

  const playButton =
    document.getElementById(
      "playButton"
    );

  if (playButton) {
    playButton.addEventListener(
      "click",
      () => {
        startLevel(
          getUnlockedLevel()
        );
      }
    );
  }

  const levelButton =
    document.getElementById(
      "levelButton"
    );

  if (levelButton) {
    levelButton.addEventListener(
      "click",
      showLevelMenu
    );
  }

  const backMenu =
    document.getElementById(
      "backMenuButton"
    );

  if (backMenu) {
    backMenu.addEventListener(
      "click",
      showMenu
    );
  }

  const restart =
    document.getElementById(
      "restartButton"
    );

  if (restart) {
    restart.addEventListener(
      "click",
      () => {
        startLevel(
          selectedStartLevel
        );
      }
    );
  }

  const menuButton =
    document.getElementById(
      "menuButton"
    );

  if (menuButton) {
    menuButton.addEventListener(
      "click",
      showMenu
    );
  }
}

function setupButton(
  element,
  onDown,
  onUp
) {
  if (!element) return;

  element.addEventListener(
    "pointerdown",
    event => {
      event.preventDefault();
      onDown();
    }
  );

  element.addEventListener(
    "pointerup",
    event => {
      event.preventDefault();
      onUp();
    }
  );

  element.addEventListener(
    "pointercancel",
    onUp
  );

  element.addEventListener(
    "pointerleave",
    event => {
      if (
        event.buttons === 0
      ) {
        onUp();
      }
    }
  );
}

/* =========================================================
   UTILITIES
========================================================= */

function clearGroup(group) {
  if (!group) return;

  while (
    group.children.length
  ) {
    group.remove(
      group.children[0]
    );
  }
}

function onResize() {
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
   STARTUP
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    updateMenuLevel();
  }
);