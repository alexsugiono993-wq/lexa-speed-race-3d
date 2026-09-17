import * as THREE from "./three.module.js";

/* =========================================================
   LEXA SPEED RACE 3D
   ========================================================= */

/* =========================================================
   CONFIG
   ========================================================= */

const WORLD_LENGTH = 2400;
const ROAD_SEGMENT_LENGTH = 10;
const ROAD_WIDTH = 14;

const LEVEL_DISTANCES = [
  700,
  800,
  900,
  1000,
  1100
];

const TOTAL_LEVELS = 5;
const COINS_PER_LEVEL = 45;

const MAX_PLAYER_SPEED = 0.62;
const ACCELERATION = 0.015;
const BRAKING = 0.022;
const FRICTION = 0.004;

const ENEMY_BASE_SPEED = 0.20;
const ENEMY_SPEED_VARIATION = 0.065;

const PLAYER_Z = 5;

const ROAD_MARK_WIDTH = 0.28;
const ROAD_EDGE_WIDTH = 0.28;

const CHECKPOINT_VISIBLE_DISTANCE = 25;


/* =========================================================
   LEVEL DATA
   ========================================================= */

const levels = [
  {
    name: "GREEN VALLEY",
    sky: 0x87c9ff,
    ground: 0x3f8f3f,
    road: 0x303238,
    roadLine: 0xffffff,
    tree: 0x2e7d32
  },

  {
    name: "FOREST ROAD",
    sky: 0x78a9b7,
    ground: 0x285c35,
    road: 0x292d31,
    roadLine: 0xffffff,
    tree: 0x185c2c
  },

  {
    name: "MOUNTAIN ROAD",
    sky: 0x9db8cf,
    ground: 0x65706b,
    road: 0x303238,
    roadLine: 0xffffff,
    tree: 0x355d3b
  },

  {
    name: "DESERT HIGHWAY",
    sky: 0xe8b87b,
    ground: 0xc68b50,
    road: 0x34302c,
    roadLine: 0xffffff,
    tree: 0x6d7b38
  },

  {
    name: "NIGHT CITY",
    sky: 0x071126,
    ground: 0x11151e,
    road: 0x25272c,
    roadLine: 0xf8f8ff,
    tree: 0x202a36
  }
];


/* =========================================================
   GAME VARIABLES
   ========================================================= */

let scene;
let camera;
let renderer;
let clock;

let player;
let roadGroup;
let sceneryGroup;

let enemies = [];
let coins = [];

let checkpointMesh;
let finishMesh;

let speed = 0;
let playerX = 0;

let levelDistance = 0;
let score = 0;
let coinsCollected = 0;

let checkpointPassed = false;
let gameRunning = false;
let gameWon = false;

let currentLevel = 1;
let unlockedLevel = 1;

let leftPressed = false;
let rightPressed = false;
let gasPressed = false;
let brakePressed = false;

let lastTime = 0;

let messageTimeout = null;


/* =========================================================
   LOCAL STORAGE
   ========================================================= */

try {
  unlockedLevel = parseInt(
    localStorage.getItem("lexaUnlockedLevel") || "1",
    10
  );

  if (
    !Number.isFinite(unlockedLevel) ||
    unlockedLevel < 1 ||
    unlockedLevel > TOTAL_LEVELS
  ) {
    unlockedLevel = 1;
  }
} catch {
  unlockedLevel = 1;
}


/* =========================================================
   HELPER
   ========================================================= */

function getLevelDistance() {
  return LEVEL_DISTANCES[currentLevel - 1];
}


function getCheckpointDistance() {
  return Math.floor(getLevelDistance() * 0.5);
}


function getRoadCurve(z) {
  /*
    Tikungan dibuat lebih halus supaya nyaman
    ketika mobil bergerak cepat.
  */

  return (
    Math.sin(z * 0.0045) * 7 +
    Math.sin(z * 0.010 + 1.4) * 2.5 +
    Math.sin(z * 0.0018) * 5
  );
}


function getRoadDirection(z) {
  const step = 1;

  const x1 = getRoadCurve(z - step);
  const x2 = getRoadCurve(z + step);

  return Math.atan2(
    x2 - x1,
    step * 2
  );
}


function getRoadHeight(z) {
  return (
    Math.sin(z * 0.004) * 1.0 +
    Math.sin(z * 0.011) * 0.3
  );
}


/*
  Mengatur posisi objek yang berada di atas jalan.

  offset = posisi kiri/kanan terhadap tengah jalan.
*/
function setRoadObjectTransform(
  object,
  z,
  offset = 0,
  yOffset = 0
) {
  if (!object) return;

  const centerX = getRoadCurve(z);
  const roadY = getRoadHeight(z);
  const angle = getRoadDirection(z);

  const lateralX = Math.cos(angle);
  const lateralZ = -Math.sin(angle);

  object.position.x =
    centerX + lateralX * offset;

  object.position.y =
    roadY + yOffset;

  object.position.z =
    z + lateralZ * offset;

  object.rotation.y = angle;
}


/*
  Untuk objek pinggir jalan.
*/
function setSceneryTransform(
  object,
  z,
  offset
) {
  if (!object) return;

  const centerX = getRoadCurve(z);
  const roadY = getRoadHeight(z);
  const angle = getRoadDirection(z);

  const lateralX = Math.cos(angle);
  const lateralZ = -Math.sin(angle);

  object.position.x =
    centerX + lateralX * offset;

  object.position.z =
    z + lateralZ * offset;

  object.position.y =
    roadY;

  object.rotation.y = angle;
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

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type =
    THREE.PCFSoftShadowMap;

  renderer.domElement.style.position = "fixed";
  renderer.domElement.style.left = "0";
  renderer.domElement.style.top = "0";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";

  /*
    Canvas berada di belakang menu.
  */
  renderer.domElement.style.zIndex = "0";
  renderer.domElement.style.pointerEvents = "none";

  document.body.appendChild(
    renderer.domElement
  );

  const mainMenu =
    document.getElementById("mainMenu");

  const levelMenu =
    document.getElementById("levelMenu");

  const game =
    document.getElementById("game");

  if (mainMenu) {
    mainMenu.style.position = "fixed";
    mainMenu.style.zIndex = "100";
    mainMenu.style.pointerEvents = "auto";
  }

  if (levelMenu) {
    levelMenu.style.position = "fixed";
    levelMenu.style.zIndex = "100";
    levelMenu.style.pointerEvents = "auto";
  }

  if (game) {
    game.style.position = "relative";
    game.style.zIndex = "10";
  }
}


/* =========================================================
   SCENE
   ========================================================= */

function setupScene() {
  scene = new THREE.Scene();

  scene.background =
    new THREE.Color(
      levels[currentLevel - 1].sky
    );

  scene.fog = new THREE.Fog(
    levels[currentLevel - 1].sky,
    80,
    900
  );
}


/* =========================================================
   CAMERA
   ========================================================= */

function setupCamera() {
  camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth /
      window.innerHeight,
    0.1,
    1500
  );

  camera.position.set(
    0,
    6.2,
    14
  );
}


/* =========================================================
   LIGHTS
   ========================================================= */

function setupLights() {
  const ambient =
    new THREE.HemisphereLight(
      0xffffff,
      0x444444,
      1.4
    );

  scene.add(ambient);

  const directional =
    new THREE.DirectionalLight(
      0xffffff,
      1.5
    );

  directional.position.set(
    50,
    100,
    40
  );

  directional.castShadow = true;

  directional.shadow.mapSize.width = 1024;
  directional.shadow.mapSize.height = 1024;

  directional.shadow.camera.left = -100;
  directional.shadow.camera.right = 100;
  directional.shadow.camera.top = 100;
  directional.shadow.camera.bottom = -100;

  scene.add(directional);
}


/* =========================================================
   WORLD
   ========================================================= */

function createWorld() {
  roadGroup =
    new THREE.Group();

  sceneryGroup =
    new THREE.Group();

  scene.add(roadGroup);
  scene.add(sceneryGroup);

  createGround();
  createRoad();
  createRoadsideObjects();

  if (currentLevel === 5) {
    createNightCity();
  }
}


/* =========================================================
   GROUND
   ========================================================= */

function createGround() {
  const level =
    levels[currentLevel - 1];

  const material =
    new THREE.MeshStandardMaterial({
      color: level.ground,
      roughness: 1
    });

  const ground =
    new THREE.Mesh(
      new THREE.PlaneGeometry(
        3000,
        3000
      ),
      material
    );

  ground.rotation.x =
    -Math.PI / 2;

  ground.position.y = -0.2;
  ground.position.z = 0;

  ground.receiveShadow = true;

  ground.userData.isGround = true;

  scene.add(ground);
}


/* =========================================================
   ROAD
   ========================================================= */

function createRoad() {
  const level =
    levels[currentLevel - 1];

  const roadMaterial =
    new THREE.MeshStandardMaterial({
      color: level.road,
      roughness: 0.95
    });

  const markingMaterial =
    new THREE.MeshStandardMaterial({
      color: level.roadLine,
      roughness: 0.65
    });

  const edgeMaterial =
    new THREE.MeshStandardMaterial({
      color: 0xffd43b,
      roughness: 0.55
    });

  let segmentIndex = 0;

  for (
    let z = -WORLD_LENGTH / 2;
    z < WORLD_LENGTH / 2;
    z += ROAD_SEGMENT_LENGTH
  ) {
    /*
      ROAD SURFACE
    */

    const road =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          ROAD_WIDTH,
          0.25,
          ROAD_SEGMENT_LENGTH + 0.5
        ),
        roadMaterial
      );

    road.receiveShadow = true;

    road.userData.roadOffset = 0;
    road.userData.roadYOffset = 0;
    road.userData.roadObject = true;

    setRoadObjectTransform(
      road,
      z
    );

    roadGroup.add(road);


    /*
      MARKA DASHED
    */

    const showDash =
      segmentIndex % 3 !== 1;

    if (showDash) {
      /*
        MARKA TENGAH
      */

      const centerLine =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            ROAD_MARK_WIDTH,
            0.045,
            ROAD_SEGMENT_LENGTH * 0.72
          ),
          markingMaterial
        );

      centerLine.userData.roadOffset = 0;
      centerLine.userData.roadYOffset = 0.16;
      centerLine.userData.roadObject = true;

      setRoadObjectTransform(
        centerLine,
        z,
        0,
        0.16
      );

      roadGroup.add(
        centerLine
      );


      /*
        MARKA LAJUR KIRI
      */

      const leftLaneLine =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            ROAD_MARK_WIDTH,
            0.045,
            ROAD_SEGMENT_LENGTH * 0.72
          ),
          markingMaterial
        );

      leftLaneLine.userData.roadOffset = -2.4;
      leftLaneLine.userData.roadYOffset = 0.16;
      leftLaneLine.userData.roadObject = true;

      setRoadObjectTransform(
        leftLaneLine,
        z,
        -2.4,
        0.16
      );

      roadGroup.add(
        leftLaneLine
      );


      /*
        MARKA LAJUR KANAN
      */

      const rightLaneLine =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            ROAD_MARK_WIDTH,
            0.045,
            ROAD_SEGMENT_LENGTH * 0.72
          ),
          markingMaterial
        );

      rightLaneLine.userData.roadOffset = 2.4;
      rightLaneLine.userData.roadYOffset = 0.16;
      rightLaneLine.userData.roadObject = true;

      setRoadObjectTransform(
        rightLaneLine,
        z,
        2.4,
        0.16
      );

      roadGroup.add(
        rightLaneLine
      );
    }


    /*
      MARKA TEPI KIRI + KANAN
    */

    for (
      const side of [-1, 1]
    ) {
      const edgeOffset =
        side *
        (ROAD_WIDTH / 2 - 0.38);

      const edgeLine =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            ROAD_EDGE_WIDTH,
            0.05,
            ROAD_SEGMENT_LENGTH
          ),
          edgeMaterial
        );

      edgeLine.userData.roadOffset =
        edgeOffset;

      edgeLine.userData.roadYOffset =
        0.17;

      edgeLine.userData.roadObject =
        true;

      setRoadObjectTransform(
        edgeLine,
        z,
        edgeOffset,
        0.17
      );

      roadGroup.add(
        edgeLine
      );
    }

    segmentIndex++;
  }
}


/* =========================================================
   ROADSIDE OBJECTS
   ========================================================= */

function createRoadsideObjects() {
  const level =
    levels[currentLevel - 1];

  for (
    let z = -1150;
    z <= 900;
    z += 40
  ) {
    for (
      const side of [-1, 1]
    ) {
      const offset =
        side *
        (
          ROAD_WIDTH / 2 +
          7 +
          Math.random() * 18
        );

      /*
        TREE
      */

      const trunk =
        new THREE.Mesh(
          new THREE.CylinderGeometry(
            0.35,
            0.5,
            2.5,
            8
          ),
          new THREE.MeshStandardMaterial({
            color: 0x68452b
          })
        );

      const crown =
        new THREE.Mesh(
          new THREE.ConeGeometry(
            1.8,
            4.2,
            8
          ),
          new THREE.MeshStandardMaterial({
            color: level.tree,
            roughness: 1
          })
        );

      const tree =
        new THREE.Group();

      tree.add(trunk);
      tree.add(crown);

      trunk.position.y = 1.25;
      crown.position.y = 4;

      tree.userData.roadOffset =
        offset;

      setSceneryTransform(
        tree,
        z,
        offset
      );

      tree.position.y += 0.05;

      sceneryGroup.add(tree);
    }
  }
}


/* =========================================================
   NIGHT CITY
   ========================================================= */

function createNightCity() {
  /*
    Bintang
  */

  for (let i = 0; i < 100; i++) {
    const star =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          0.08,
          5,
          5
        ),
        new THREE.MeshBasicMaterial({
          color: 0xffffff
        })
      );

    star.position.set(
      (Math.random() - 0.5) * 800,
      40 + Math.random() * 150,
      -100 + Math.random() * 700
    );

    star.userData.citySky = true;

    scene.add(star);
  }


  /*
    Bulan
  */

  const moon =
    new THREE.Mesh(
      new THREE.SphereGeometry(
        8,
        24,
        24
      ),
      new THREE.MeshBasicMaterial({
        color: 0xffffdd
      })
    );

  moon.position.set(
    -120,
    100,
    -300
  );

  moon.userData.citySky = true;

  scene.add(moon);


  /*
    Gedung kota
  */

  for (let i = 0; i < 40; i++) {
    const width =
      5 + Math.random() * 10;

    const height =
      8 + Math.random() * 30;

    const depth =
      5 + Math.random() * 10;

    const building =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          width,
          height,
          depth
        ),
        new THREE.MeshStandardMaterial({
          color:
            0x151923,
          roughness: 0.85
        })
      );

    const side =
      Math.random() > 0.5
        ? 1
        : -1;

    building.position.z =
      -100 +
      Math.random() * 900;

    building.position.x =
      getRoadCurve(
        building.position.z
      ) +
      side *
      (
        ROAD_WIDTH / 2 +
        15 +
        Math.random() * 35
      );

    building.position.y =
      height / 2;

    building.userData.cityBuilding =
      true;

    scene.add(building);
  }
}


/* =========================================================
   PLAYER
   ========================================================= */

function createPlayer() {
  player =
    new THREE.Group();

  /*
    BODY
  */

  const body =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        2.1,
        0.65,
        4
      ),
      new THREE.MeshStandardMaterial({
        color: 0xd92828,
        roughness: 0.45,
        metalness: 0.25
      })
    );

  body.position.y =
    0.75;

  body.castShadow = true;

  player.add(body);


  /*
    CABIN
  */

  const cabin =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        1.55,
        0.65,
        1.8
      ),
      new THREE.MeshStandardMaterial({
        color: 0x202b3b,
        roughness: 0.2,
        metalness: 0.15
      })
    );

  cabin.position.y =
    1.25;

  cabin.position.z =
    -0.2;

  cabin.castShadow = true;

  player.add(cabin);


  /*
    WHEELS
  */

  const wheelMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.85
    });

  const wheelPositions = [
    [-1.05, 0.42, 1.25],
    [1.05, 0.42, 1.25],
    [-1.05, 0.42, -1.25],
    [1.05, 0.42, -1.25]
  ];

  for (
    const pos of wheelPositions
  ) {
    const wheel =
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.43,
          0.43,
          0.3,
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

    wheel.castShadow = true;

    player.add(wheel);
  }


  player.position.x =
    getRoadCurve(PLAYER_Z);

  player.position.y =
    getRoadHeight(PLAYER_Z);

  player.position.z =
    PLAYER_Z;

  scene.add(player);
}


/* =========================================================
   ENEMIES
   ========================================================= */

function createEnemies() {
  enemies = [];

  const enemyColors = [
    0x1e88e5,
    0xfbc02d,
    0x8e24aa,
    0xffffff,
    0xff6f00,
    0x00acc1,
    0x43a047,
    0x6d4c41,
    0xeeeeee,
    0xc62828
  ];

  for (let i = 0; i < 10; i++) {
    const enemy =
      createEnemyCar(
        enemyColors[
          i %
          enemyColors.length
        ]
      );

    enemy.userData.speed =
      ENEMY_BASE_SPEED +
      Math.random() *
      ENEMY_SPEED_VARIATION;

    enemy.userData.lane =
      (
        Math.floor(
          Math.random() * 5
        ) - 2
      ) * 2.4;

    enemy.userData.relativeOffset =
      enemy.userData.lane;

    enemy.position.z =
      -50 -
      i * 80 -
      Math.random() * 80;

    setRoadObjectTransform(
      enemy,
      enemy.position.z,
      enemy.userData.relativeOffset,
      0
    );

    enemy.position.y =
      getRoadHeight(
        enemy.position.z
      );

    scene.add(enemy);

    enemies.push(enemy);
  }
}


function createEnemyCar(color) {
  const car =
    new THREE.Group();

  const body =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        2.1,
        0.65,
        4
      ),
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.5,
        metalness: 0.2
      })
    );

  body.position.y =
    0.75;

  body.castShadow = true;

  car.add(body);


  const cabin =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        1.55,
        0.65,
        1.8
      ),
      new THREE.MeshStandardMaterial({
        color: 0x263746,
        roughness: 0.3
      })
    );

  cabin.position.y =
    1.25;

  cabin.position.z =
    -0.2;

  cabin.castShadow = true;

  car.add(cabin);


  const wheelMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x111111
    });

  const positions = [
    [-1.05, 0.42, 1.25],
    [1.05, 0.42, 1.25],
    [-1.05, 0.42, -1.25],
    [1.05, 0.42, -1.25]
  ];

  for (
    const pos of positions
  ) {
    const wheel =
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.43,
          0.43,
          0.3,
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

    car.add(wheel);
  }

  return car;
}


/* =========================================================
   COINS
   ========================================================= */

function createCoins() {
  coins = [];

  for (
    let i = 0;
    i < COINS_PER_LEVEL;
    i++
  ) {
    const coin =
      createCoin();

    const lane =
      (
        Math.floor(
          Math.random() * 5
        ) - 2
      ) * 2.4;

    coin.userData.lane =
      lane;

    coin.userData.offset =
      lane;

    coin.position.z =
      -30 -
      i * 10 -
      Math.random() * 8;

    setRoadObjectTransform(
      coin,
      coin.position.z,
      lane,
      1.5
    );

    scene.add(coin);

    coins.push(coin);
  }
}


function createCoin() {
  const geometry =
    new THREE.TorusGeometry(
      0.45,
      0.12,
      8,
      16
    );

  const material =
    new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.7,
      roughness: 0.25,
      emissive: 0x4a3500
    });

  const coin =
    new THREE.Mesh(
      geometry,
      material
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
  checkpointMesh =
    createGate(
      0xff3366,
      0xffcc00
    );

  checkpointMesh.userData.isCheckpoint =
    true;

  scene.add(
    checkpointMesh
  );

  /*
    Sengaja disembunyikan.
    Nanti muncul hanya ketika mobil
    sudah mendekati batas checkpoint.
  */
  checkpointMesh.visible =
    false;

  updateCheckpointPosition();
}


function updateCheckpointPosition() {
  if (!checkpointMesh) return;

  if (checkpointPassed) {
    checkpointMesh.visible =
      false;

    return;
  }

  const checkpointDistance =
    getCheckpointDistance();

  const z =
    -(
      checkpointDistance -
      levelDistance
    );

  const angle =
    getRoadDirection(z);

  const x =
    getRoadCurve(z);

  const y =
    getRoadHeight(z);

  checkpointMesh.position.set(
    x,
    y,
    z
  );

  checkpointMesh.rotation.y =
    angle;

  /*
    Gate hanya muncul ketika
    sudah dekat dengan mobil.
  */

  const distance =
    Math.abs(
      z - PLAYER_Z
    );

  checkpointMesh.visible =
    distance <=
    CHECKPOINT_VISIBLE_DISTANCE;
}


/* =========================================================
   FINISH
   ========================================================= */

function createFinishLine() {
  finishMesh =
    createGate(
      0x00ff66,
      0xffffff
    );

  finishMesh.userData.isFinish =
    true;

  scene.add(
    finishMesh
  );

  updateFinishPosition();
}


function updateFinishPosition() {
  if (!finishMesh) return;

  const finishDistance =
    getLevelDistance();

  const z =
    -(
      finishDistance -
      levelDistance
    );

  finishMesh.position.x =
    getRoadCurve(z);

  finishMesh.position.y =
    getRoadHeight(z);

  finishMesh.position.z =
    z;

  finishMesh.rotation.y =
    getRoadDirection(z);
}


/* =========================================================
   GATE
   ========================================================= */

function createGate(
  poleColor,
  topColor
) {
  const group =
    new THREE.Group();


  /*
    TIANG KIRI
  */

  const poleMaterial =
    new THREE.MeshStandardMaterial({
      color: poleColor,
      emissive:
        poleColor === 0xff3366
          ? 0x33000f
          : 0x003311,
      roughness: 0.35,
      metalness: 0.15
    });

  const poleGeometry =
    new THREE.BoxGeometry(
      0.5,
      4.8,
      0.5
    );

  const leftPole =
    new THREE.Mesh(
      poleGeometry,
      poleMaterial
    );

  leftPole.position.set(
    -5.5,
    2.4,
    0
  );

  leftPole.castShadow = true;

  group.add(
    leftPole
  );


  /*
    TIANG KANAN
  */

  const rightPole =
    new THREE.Mesh(
      poleGeometry,
      poleMaterial
    );

  rightPole.position.set(
    5.5,
    2.4,
    0
  );

  rightPole.castShadow = true;

  group.add(
    rightPole
  );


  /*
    BAGIAN ATAS
  */

  const top =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        11.5,
        0.6,
        0.6
      ),
      new THREE.MeshStandardMaterial({
        color: topColor,
        emissive:
          topColor === 0xffcc00
            ? 0x442200
            : 0x003322,
        roughness: 0.3,
        metalness: 0.2
      })
    );

  top.position.y =
    4.5;

  top.castShadow = true;

  group.add(top);


  /*
    STRIP CHECKER DI LANTAI
  */

  for (let i = -5; i < 5; i++) {
    const stripe =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          1.1,
          0.08,
          1.2
        ),
        new THREE.MeshStandardMaterial({
          color:
            i % 2 === 0
              ? poleColor
              : 0xffffff
        })
      );

    stripe.position.x =
      i * 1.1;

    stripe.position.y =
      0.16;

    stripe.position.z =
      0;

    group.add(stripe);
  }

  return group;
}


/* =========================================================
   CONTROLS
   ========================================================= */

function setupControls() {
  window.addEventListener(
    "keydown",
    event => {
      switch (
        event.code
      ) {
        case "ArrowLeft":
        case "KeyA":
          leftPressed = true;
          break;

        case "ArrowRight":
        case "KeyD":
          rightPressed = true;
          break;

        case "ArrowUp":
        case "KeyW":
          gasPressed = true;
          break;

        case "ArrowDown":
        case "KeyS":
          brakePressed = true;
          break;
      }
    }
  );


  window.addEventListener(
    "keyup",
    event => {
      switch (
        event.code
      ) {
        case "ArrowLeft":
        case "KeyA":
          leftPressed = false;
          break;

        case "ArrowRight":
        case "KeyD":
          rightPressed = false;
          break;

        case "ArrowUp":
        case "KeyW":
          gasPressed = false;
          break;

        case "ArrowDown":
        case "KeyS":
          brakePressed = false;
          break;
      }
    }
  );


  setupButton(
    document.getElementById("left"),
    () => {
      leftPressed = true;
    },
    () => {
      leftPressed = false;
    }
  );


  setupButton(
    document.getElementById("right"),
    () => {
      rightPressed = true;
    },
    () => {
      rightPressed = false;
    }
  );


  setupButton(
    document.getElementById("gas"),
    () => {
      gasPressed = true;
    },
    () => {
      gasPressed = false;
    }
  );


  setupButton(
    document.getElementById("brake"),
    () => {
      brakePressed = true;
    },
    () => {
      brakePressed = false;
    }
  );


  setupMenuButtons();
  setupGameOverButtons();
}


function setupButton(
  element,
  onDown,
  onUp
) {
  if (!element) return;

  element.style.position =
    "relative";

  element.style.zIndex =
    "200";

  element.style.pointerEvents =
    "auto";

  element.style.touchAction =
    "none";


  element.addEventListener(
    "pointerdown",
    event => {
      event.preventDefault();
      event.stopPropagation();

      onDown();

      if (
        element.setPointerCapture
      ) {
        try {
          element.setPointerCapture(
            event.pointerId
          );
        } catch {}
      }
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
    () => {
      onUp();
    }
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
   MENU
   ========================================================= */

function setupMenuButtons() {
  const playButton =
    document.getElementById(
      "playButton"
    );

  const levelButton =
    document.getElementById(
      "levelButton"
    );

  const backButton =
    document.getElementById(
      "backMenuButton"
    );


  if (playButton) {
    playButton.addEventListener(
      "click",
      () => {
        startLevel(
          currentLevel
        );
      }
    );
  }


  if (levelButton) {
    levelButton.addEventListener(
      "click",
      () => {
        showLevelMenu();
      }
    );
  }


  if (backButton) {
    backButton.addEventListener(
      "click",
      () => {
        showMenu();
      }
    );
  }
}


function setupGameOverButtons() {
  const restartButton =
    document.getElementById(
      "restartButton"
    );

  const menuButton =
    document.getElementById(
      "menuButton"
    );


  if (restartButton) {
    restartButton.addEventListener(
      "click",
      () => {
        startLevel(
          currentLevel
        );
      }
    );
  }


  if (menuButton) {
    menuButton.addEventListener(
      "click",
      () => {
        showMenu();
      }
    );
  }
}


/* =========================================================
   MENU DISPLAY
   ========================================================= */

function showMenu() {
  gameRunning = false;
  gameWon = false;

  const mainMenu =
    document.getElementById(
      "mainMenu"
    );

  const levelMenu =
    document.getElementById(
      "levelMenu"
    );

  const game =
    document.getElementById(
      "game"
    );

  const gameOver =
    document.getElementById(
      "gameOver"
    );


  if (mainMenu) {
    mainMenu.classList.remove(
      "hidden"
    );

    mainMenu.style.display =
      "flex";

    mainMenu.style.zIndex =
      "100";
  }


  if (levelMenu) {
    levelMenu.classList.add(
      "hidden"
    );

    levelMenu.style.display =
      "none";
  }


  if (game) {
    game.classList.add(
      "hidden"
    );
  }


  if (gameOver) {
    gameOver.classList.add(
      "hidden"
    );
  }


  const unlocked =
    document.getElementById(
      "menuUnlockedLevel"
    );

  if (unlocked) {
    unlocked.textContent =
      unlockedLevel;
  }
}


function showLevelMenu() {
  const mainMenu =
    document.getElementById(
      "mainMenu"
    );

  const levelMenu =
    document.getElementById(
      "levelMenu"
    );

  if (mainMenu) {
    mainMenu.classList.add(
      "hidden"
    );

    mainMenu.style.display =
      "none";
  }

  if (levelMenu) {
    levelMenu.classList.remove(
      "hidden"
    );

    levelMenu.style.display =
      "flex";

    levelMenu.style.zIndex =
      "100";
  }

  buildLevelList();
}


function buildLevelList() {
  const list =
    document.getElementById(
      "levelList"
    );

  if (!list) return;

  list.innerHTML = "";


  for (
    let i = 1;
    i <= TOTAL_LEVELS;
    i++
  ) {
    const button =
      document.createElement(
        "button"
      );

    button.className =
      "menu-button";


    if (i > unlockedLevel) {
      button.textContent =
        `🔒 LEVEL ${i} — TERKUNCI`;

      button.disabled = true;
    } else {
      button.textContent =
        `🏁 LEVEL ${i} — ${levels[i - 1].name}`;

      if (i === currentLevel) {
        button.classList.add(
          "primary"
        );
      }

      button.addEventListener(
        "click",
        () => {
          currentLevel = i;
          startLevel(i);
        }
      );
    }

    list.appendChild(
      button
    );
  }
}


/* =========================================================
   START LEVEL
   ========================================================= */

function startLevel(level) {
  currentLevel =
    THREE.MathUtils.clamp(
      level,
      1,
      TOTAL_LEVELS
    );

  gameRunning = true;
  gameWon = false;

  speed = 0;
  playerX = 0;

  levelDistance = 0;
  score = 0;
  coinsCollected = 0;

  checkpointPassed = false;

  leftPressed = false;
  rightPressed = false;
  gasPressed = false;
  brakePressed = false;


  /*
    Update environment.
  */

  updateLevelEnvironment();


  /*
    Reset player.
  */

  if (player) {
    player.position.x =
      getRoadCurve(
        PLAYER_Z
      );

    player.position.y =
      getRoadHeight(
        PLAYER_Z
      );

    player.position.z =
      PLAYER_Z;

    player.rotation.y =
      getRoadDirection(
        PLAYER_Z
      );

    player.rotation.z = 0;
  }


  resetEnemies();
  resetCoins();

  updateCheckpointPosition();
  updateFinishPosition();


  /*
    Hide game over.
  */

  const gameOver =
    document.getElementById(
      "gameOver"
    );

  if (gameOver) {
    gameOver.classList.add(
      "hidden"
    );
  }


  /*
    Show game.
  */

  const mainMenu =
    document.getElementById(
      "mainMenu"
    );

  const levelMenu =
    document.getElementById(
      "levelMenu"
    );

  const game =
    document.getElementById(
      "game"
    );


  if (mainMenu) {
    mainMenu.classList.add(
      "hidden"
    );

    mainMenu.style.display =
      "none";
  }


  if (levelMenu) {
    levelMenu.classList.add(
      "hidden"
    );

    levelMenu.style.display =
      "none";
  }


  if (game) {
    game.classList.remove(
      "hidden"
    );
  }


  showLevelNotification();

  updateHUD();
}


/* =========================================================
   LEVEL ENVIRONMENT
   ========================================================= */

function updateLevelEnvironment() {
  const level =
    levels[currentLevel - 1];

  scene.background =
    new THREE.Color(
      level.sky
    );

  if (scene.fog) {
    scene.fog.color =
      new THREE.Color(
        level.sky
      );

    scene.fog.near = 80;
    scene.fog.far = 900;
  }
}


/* =========================================================
   RESET ENEMIES
   ========================================================= */

function resetEnemies() {
  enemies.forEach(
    (enemy, index) => {
      enemy.userData.speed =
        ENEMY_BASE_SPEED +
        Math.random() *
        ENEMY_SPEED_VARIATION;

      enemy.userData.lane =
        (
          Math.floor(
            Math.random() * 5
          ) - 2
        ) * 2.4;

      enemy.userData.relativeOffset =
        enemy.userData.lane;

      enemy.position.z =
        -60 -
        index * 85 -
        Math.random() * 70;

      setRoadObjectTransform(
        enemy,
        enemy.position.z,
        enemy.userData.relativeOffset,
        0
      );

      enemy.position.y =
        getRoadHeight(
          enemy.position.z
        );
    }
  );
}


/* =========================================================
   RESET COINS
   ========================================================= */

function resetCoins() {
  coins.forEach(
    (coin, index) => {
      const lane =
        (
          Math.floor(
            Math.random() * 5
          ) - 2
        ) * 2.4;

      coin.userData.lane =
        lane;

      coin.userData.offset =
        lane;

      coin.position.z =
        -30 -
        index * 10 -
        Math.random() * 8;

      coin.visible = true;

      setRoadObjectTransform(
        coin,
        coin.position.z,
        lane,
        1.5
      );
    }
  );
}


/* =========================================================
   PLAYER UPDATE
   ========================================================= */

function updatePlayer(delta) {
  /*
    ACCELERATION
  */

  if (gasPressed) {
    speed +=
      ACCELERATION *
      delta *
      60;
  } else {
    speed -=
      FRICTION *
      delta *
      60;
  }


  /*
    BRAKE
  */

  if (brakePressed) {
    speed -=
      BRAKING *
      delta *
      60;
  }


  /*
    MAX SPEED 0.62
  */

  speed =
    THREE.MathUtils.clamp(
      speed,
      0,
      MAX_PLAYER_SPEED
    );


  /*
    STEERING
  */

  let steerInput = 0;

  if (leftPressed) {
    steerInput -= 1;
  }

  if (rightPressed) {
    steerInput += 1;
  }


  /*
    Steering dibuat sedikit lebih
    lembut supaya tetap nyaman
    pada speed tinggi.
  */

  const steeringSpeed =
    0.055 +
    speed * 0.14;

  playerX +=
    steerInput *
    steeringSpeed *
    delta *
    60;


  /*
    AUTO CENTER
  */

  if (steerInput === 0) {
    playerX *=
      Math.pow(
        0.82,
        delta * 60
      );
  }


  /*
    BATAS JALAN
  */

  const maxOffset =
    ROAD_WIDTH / 2 -
    1.5;

  playerX =
    THREE.MathUtils.clamp(
      playerX,
      -maxOffset,
      maxOffset
    );


  /*
    PLAYER POSITION
  */

  const roadCenter =
    getRoadCurve(
      PLAYER_Z
    );

  player.position.x =
    roadCenter +
    playerX;

  player.position.y =
    getRoadHeight(
      PLAYER_Z
    );

  player.position.z =
    PLAYER_Z;


  /*
    ROTATION
  */

  const roadDirection =
    getRoadDirection(
      PLAYER_Z
    );

  player.rotation.y =
    roadDirection +
    steerInput * 0.12;

  player.rotation.z =
    THREE.MathUtils.lerp(
      player.rotation.z,
      -steerInput * 0.06,
      0.15
    );


  /*
    CAMERA
  */

  camera.position.x =
    THREE.MathUtils.lerp(
      camera.position.x,
      player.position.x,
      0.08
    );

  camera.position.y =
    THREE.MathUtils.lerp(
      camera.position.y,
      6.2 +
      speed * 1.5,
      0.08
    );

  camera.position.z =
    14;


  /*
    CAMERA LOOK AHEAD
  */

  const lookZ = -28;

  const lookX =
    getRoadCurve(
      lookZ
    );

  const lookY =
    1.2 +
    getRoadHeight(
      lookZ
    );

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
    speed *
    60 *
    delta;


  /*
    DISTANCE
  */

  levelDistance +=
    movement;


  /*
    ROAD
  */

  if (roadGroup) {
    roadGroup.children.forEach(
      object => {
        object.position.z +=
          movement;

        if (
          object.position.z >
          80
        ) {
          object.position.z -=
            WORLD_LENGTH;
        }

        setRoadObjectTransform(
          object,
          object.position.z,
          object.userData.roadOffset || 0,
          object.userData.roadYOffset || 0
        );
      }
    );
  }


  /*
    SCENERY
  */

  if (sceneryGroup) {
    sceneryGroup.children.forEach(
      object => {
        object.position.z +=
          movement;

        if (
          object.position.z >
          80
        ) {
          object.position.z -=
            2100;
        }

        setSceneryTransform(
          object,
          object.position.z,
          object.userData.roadOffset || 0
        );
      }
    );
  }


  /*
    ENEMIES
  */

  enemies.forEach(
    enemy => {
      enemy.position.z +=
        movement -
        enemy.userData.speed *
        60 *
        delta;

      if (
        enemy.position.z >
        45
      ) {
        enemy.position.z =
          -600 -
          Math.random() *
          300;

        enemy.userData.lane =
          (
            Math.floor(
              Math.random() * 5
            ) - 2
          ) * 2.4;

        enemy.userData.relativeOffset =
          enemy.userData.lane;
      }

      setRoadObjectTransform(
        enemy,
        enemy.position.z,
        enemy.userData.relativeOffset,
        0
      );

      enemy.position.y =
        getRoadHeight(
          enemy.position.z
        );
    }
  );


  /*
    COINS
  */

  coins.forEach(
    coin => {
      coin.position.z +=
        movement;

      coin.rotation.y +=
        delta * 4;

      if (
        coin.position.z >
        40
      ) {
        coin.position.z =
          -650 -
          Math.random() *
          300;

        const lane =
          (
            Math.floor(
              Math.random() * 5
            ) - 2
          ) * 2.4;

        coin.userData.offset =
          lane;

        coin.visible = true;
      }

      setRoadObjectTransform(
        coin,
        coin.position.z,
        coin.userData.offset || 0,
        1.5
      );
    }
  );


  /*
    CHECKPOINT

    Posisi checkpoint dihitung
    berdasarkan progress level,
    bukan digerakkan bersama dunia.
  */

  updateCheckpointPosition();


  /*
    FINISH
  */

  updateFinishPosition();
}


/* =========================================================
   COIN COLLISION
   ========================================================= */

function updateCoins() {
  if (!player) return;

  coins.forEach(
    coin => {
      if (!coin.visible) {
        return;
      }

      const dx =
        coin.position.x -
        player.position.x;

      const dz =
        coin.position.z -
        player.position.z;

      const distance =
        Math.sqrt(
          dx * dx +
          dz * dz
        );

      if (
        distance < 2.2
      ) {
        coin.visible =
          false;

        coinsCollected++;

        score += 100;
      }
    }
  );
}


/* =========================================================
   CHECKPOINT
   ========================================================= */

function updateCheckpoint() {
  if (
    checkpointPassed ||
    !gameRunning
  ) {
    return;
  }

  const checkpointDistance =
    getCheckpointDistance();

  if (
    levelDistance >=
    checkpointDistance
  ) {
    checkpointPassed =
      true;

    score += 500;

    /*
      PENTING:
      Setelah lewat checkpoint,
      kotak langsung hilang dan
      tidak pernah muncul lagi
      sampai level berikutnya.
    */

    if (checkpointMesh) {
      checkpointMesh.visible =
        false;
    }

    showTemporaryMessage(
      "CHECKPOINT!",
      "500 POINTS"
    );
  }
}


/* =========================================================
   FINISH CHECK
   ========================================================= */

function updateFinish() {
  if (
    gameWon ||
    !gameRunning
  ) {
    return;
  }

  const finishDistance =
    getLevelDistance();

  if (
    levelDistance >=
    finishDistance
  ) {
    winLevel();
  }
}


/* =========================================================
   COLLISION
   ========================================================= */

function updateCollisions() {
  if (!player) return;

  for (
    const enemy of enemies
  ) {
    const dx =
      enemy.position.x -
      player.position.x;

    const dz =
      enemy.position.z -
      player.position.z;

    /*
      Karena kendaraan harus berada
      cukup dekat pada arah X dan Z.
    */

    if (
      Math.abs(dx) < 1.8 &&
      Math.abs(dz) < 2.7
    ) {
      crash();
      return;
    }
  }
}


/* =========================================================
   CRASH
   ========================================================= */

function crash() {
  if (!gameRunning) {
    return;
  }

  gameRunning = false;

  speed = 0;

  leftPressed = false;
  rightPressed = false;
  gasPressed = false;
  brakePressed = false;


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


  const best =
    getBestScore(
      currentLevel
    );


  if (score > best) {
    saveBestScore(
      currentLevel,
      score
    );
  }


  const newBest =
    getBestScore(
      currentLevel
    );


  if (finalDistance) {
    finalDistance.textContent =
      `${Math.floor(levelDistance)} m`;
  }

  if (finalScore) {
    finalScore.textContent =
      score;
  }

  if (finalBestScore) {
    finalBestScore.textContent =
      newBest;
  }

  if (finalLevel) {
    finalLevel.textContent =
      currentLevel;
  }


  const gameOver =
    document.getElementById(
      "gameOver"
    );

  if (gameOver) {
    gameOver.classList.remove(
      "hidden"
    );

    gameOver.style.display =
      "flex";

    gameOver.style.zIndex =
      "150";
  }
}


/* =========================================================
   WIN LEVEL
   ========================================================= */

function winLevel() {
  if (gameWon) {
    return;
  }

  gameWon = true;
  gameRunning = false;

  speed = 0;

  /*
    Bonus finish.
  */

  score += 1000;


  /*
    Unlock next level.
  */

  if (
    currentLevel <
    TOTAL_LEVELS
  ) {
    unlockedLevel =
      Math.max(
        unlockedLevel,
        currentLevel + 1
      );

    try {
      localStorage.setItem(
        "lexaUnlockedLevel",
        unlockedLevel
      );
    } catch {}
  }


  const best =
    getBestScore(
      currentLevel
    );

  if (score > best) {
    saveBestScore(
      currentLevel,
      score
    );
  }


  showVictoryScreen();
}


/* =========================================================
   VICTORY SCREEN
   ========================================================= */

function showVictoryScreen() {
  const gameOver =
    document.getElementById(
      "gameOver"
    );

  if (!gameOver) {
    return;
  }


  const box =
    gameOver.querySelector(
      ".game-over-box"
    );

  if (box) {
    box.innerHTML = `
      <div class="crash-title">
        🏆 MENANG!
      </div>

      <div class="result-row">
        <span>Level</span>
        <strong>${currentLevel}</strong>
      </div>

      <div class="result-row">
        <span>Jarak</span>
        <strong>${Math.floor(levelDistance)} m</strong>
      </div>

      <div class="result-row">
        <span>Koin</span>
        <strong>${coinsCollected}/${COINS_PER_LEVEL}</strong>
      </div>

      <div class="result-row">
        <span>Score</span>
        <strong>${score}</strong>
      </div>

      <div class="result-row">
        <span>Best Score</span>
        <strong>${getBestScore(currentLevel)}</strong>
      </div>

      ${
        currentLevel < TOTAL_LEVELS
          ? `
            <button id="nextLevelButton" class="menu-button primary">
              ▶ LEVEL BERIKUTNYA
            </button>
          `
          : `
            <div style="
              text-align:center;
              margin:12px 0;
              font-weight:bold;
            ">
              🎉 SEMUA LEVEL SELESAI!
            </div>
          `
      }

      <button id="restartButton" class="menu-button">
        🔄 MAIN LAGI
      </button>

      <button id="menuButton" class="menu-button">
        🏠 MENU UTAMA
      </button>
    `;


    const nextButton =
      document.getElementById(
        "nextLevelButton"
      );

    const restartButton =
      document.getElementById(
        "restartButton"
      );

    const menuButton =
      document.getElementById(
        "menuButton"
      );


    if (nextButton) {
      nextButton.addEventListener(
        "click",
        () => {
          currentLevel++;
          startLevel(
            currentLevel
          );
        }
      );
    }


    if (restartButton) {
      restartButton.addEventListener(
        "click",
        () => {
          startLevel(
            currentLevel
          );
        }
      );
    }


    if (menuButton) {
      menuButton.addEventListener(
        "click",
        () => {
          showMenu();
        }
      );
    }
  }


  gameOver.classList.remove(
    "hidden"
  );

  gameOver.style.display =
    "flex";

  gameOver.style.zIndex =
    "150";
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


  /*
    0.62 = sekitar 322 KM/H
  */

  if (speedElement) {
    speedElement.textContent =
      Math.floor(
        speed * 520
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
      getBestScore(
        currentLevel
      );
  }


  updateCoinHUD();
}


/* =========================================================
   COIN HUD
   ========================================================= */

function updateCoinHUD() {
  let coinHud =
    document.getElementById(
      "coinHUD"
    );

  if (!coinHud) {
    coinHud =
      document.createElement(
        "div"
      );

    coinHud.id =
      "coinHUD";

    coinHud.style.position =
      "fixed";

    coinHud.style.top =
      "125px";

    coinHud.style.right =
      "18px";

    coinHud.style.zIndex =
      "50";

    coinHud.style.padding =
      "8px 12px";

    coinHud.style.borderRadius =
      "10px";

    coinHud.style.background =
      "rgba(0,0,0,0.55)";

    coinHud.style.color =
      "#ffffff";

    coinHud.style.fontWeight =
      "bold";

    coinHud.style.fontSize =
      "16px";

    coinHud.style.pointerEvents =
      "none";

    document.body.appendChild(
      coinHud
    );
  }


  coinHud.textContent =
    `🪙 ${coinsCollected}/${COINS_PER_LEVEL}`;
}


/* =========================================================
   LEVEL NOTIFICATION
   ========================================================= */

function showLevelNotification() {
  const notification =
    document.getElementById(
      "levelNotification"
    );

  const levelNumber =
    document.getElementById(
      "levelNumber"
    );

  const levelName =
    document.getElementById(
      "levelName"
    );


  if (!notification) {
    return;
  }


  if (levelNumber) {
    levelNumber.textContent =
      `LEVEL ${currentLevel}`;
  }


  if (levelName) {
    levelName.textContent =
      levels[
        currentLevel - 1
      ].name;
  }


  notification.classList.remove(
    "hidden"
  );


  setTimeout(
    () => {
      notification.classList.add(
        "hidden"
      );
    },
    2200
  );
}


/* =========================================================
   TEMPORARY MESSAGE
   ========================================================= */

function showTemporaryMessage(
  title,
  subtitle
) {
  let message =
    document.getElementById(
      "temporaryMessage"
    );


  if (!message) {
    message =
      document.createElement(
        "div"
      );

    message.id =
      "temporaryMessage";

    message.style.position =
      "fixed";

    message.style.left =
      "50%";

    message.style.top =
      "35%";

    message.style.transform =
      "translate(-50%, -50%)";

    message.style.zIndex =
      "120";

    message.style.textAlign =
      "center";

    message.style.pointerEvents =
      "none";

    message.style.color =
      "#ffffff";

    message.style.textShadow =
      "0 3px 10px #000";

    document.body.appendChild(
      message
    );
  }


  message.innerHTML = `
    <div style="
      font-size:32px;
      font-weight:900;
    ">
      ${title}
    </div>

    <div style="
      font-size:18px;
      margin-top:6px;
    ">
      ${subtitle}
    </div>
  `;


  message.style.display =
    "block";


  if (messageTimeout) {
    clearTimeout(
      messageTimeout
    );
  }


  messageTimeout =
    setTimeout(
      () => {
        message.style.display =
          "none";
      },
      1400
    );
}


/* =========================================================
   BEST SCORE
   ========================================================= */

function getBestScore(level) {
  try {
    return parseInt(
      localStorage.getItem(
        `lexaBestScore_${level}`
      ) || "0",
      10
    );
  } catch {
    return 0;
  }
}


function saveBestScore(
  level,
  value
) {
  try {
    localStorage.setItem(
      `lexaBestScore_${level}`,
      String(value)
    );
  } catch {}
}


/* =========================================================
   RESIZE
   ========================================================= */

function onResize() {
  if (!camera || !renderer) {
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

    updateWorldMovement(
      delta
    );

    updateCoins();

    updateCheckpoint();

    updateFinish();

    updateCollisions();


    /*
      SCORE BERDASARKAN KECEPATAN
    */

    score += Math.floor(
      speed *
      delta *
      25
    );


    updateHUD();
  }


  if (player) {
    /*
      Sedikit animasi body ketika
      game sedang berjalan.
    */

    if (gameRunning) {
      player.children.forEach(
        child => {
          if (
            child.geometry &&
            child.geometry.type ===
              "CylinderGeometry"
          ) {
            child.rotation.x +=
              speed *
              delta *
              0.3;
          }
        }
      );
    }
  }


  renderer.render(
    scene,
    camera
  );
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

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

  clock =
    new THREE.Clock();

  window.addEventListener(
    "resize",
    onResize
  );

  animate();


  /*
    Hilangkan loading setelah
    semua objek utama siap.
  */

  const loading =
    document.getElementById(
      "loading"
    );

  if (loading) {
    loading.style.display =
      "none";
  }


  /*
    Tampilkan menu utama.
  */

  showMenu();
}


/* =========================================================
   START
   ========================================================= */

init();