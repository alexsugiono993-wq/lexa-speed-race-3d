import * as THREE from './three.module.js';

/*
=========================================================
LEXA SPEED RACE 3D
STEP 3 - VARIASI TIKUNGAN JALAN
=========================================================
Fitur:
- Jalan dengan tikungan kiri/kanan yang halus
- Tikungan berbentuk S
- Mobil player mengikuti bentuk jalan
- Mobil musuh mengikuti tikungan
- Lane tetap berada di atas jalan
- Lingkungan mengikuti arah jalan
- Physics mobil tetap dipertahankan
- Kontrol keyboard + HP
- Collision effect
- Camera shake
- Score
- Distance
- Level
- Best score
- Restart
=========================================================
*/

let scene;
let camera;
let renderer;
let car;

const enemyCars = [];
const roadObjects = [];

const jumlahEnemy = 4;

const enemyColors = [
    0x1565c0,
    0xff9800,
    0x7b1fa2,
    0x212121
];

// =====================================================
// GAME STATE
// =====================================================

let speed = 0;
let distance = 0;
let score = 0;
let level = 1;

let bestScore =
    Number(localStorage.getItem("lexaBestScore")) || 0;

let gameOverState = false;

// =====================================================
// PHYSICS
// =====================================================

const MAX_SPEED = 12;
const ACCELERATION = 0.12;
const NATURAL_DECELERATION = 0.055;
const BRAKE_POWER = 0.28;

// Steering
const STEER_ACCELERATION = 0.035;
const STEER_MAX_SPEED = 0.24;
const STEER_DECELERATION = 0.055;

let steeringVelocity = 0;
let playerRoadOffset = 0;

// =====================================================
// ROAD
// =====================================================

const WORLD_LENGTH = 720;
const ROAD_WIDTH = 12;
const ROAD_SEGMENT_LENGTH = 16;

// =====================================================
// CONTROLS
// =====================================================

let steerLeft = false;
let steerRight = false;
let gasPressed = false;
let brakePressed = false;

// =====================================================
// EFFECTS
// =====================================================

const collisionParticles = [];

let cameraShakeTime = 0;
const cameraShakeDuration = 0.5;

const cameraBasePosition = {
    x: 0,
    y: 5,
    z: 9
};

// =====================================================
// UTILITY
// =====================================================

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

// =====================================================
// ROAD CURVE SYSTEM
// =====================================================

/*
    Jalan menggunakan kombinasi dua gelombang sinus.

    Hasilnya:
    - tikungan kiri
    - tikungan kanan
    - S curve
    - transisi lembut
    - tidak terlalu tajam
*/

function getRoadCurve(z) {

    const angle1 =
        (2 * Math.PI * z) / WORLD_LENGTH + 0.7;

    const angle2 =
        (4 * Math.PI * z) / WORLD_LENGTH - 0.8;

    const curveX =
        2.2 * Math.sin(angle1) +
        0.9 * Math.sin(angle2);

    const derivative =
        2.2 *
        Math.cos(angle1) *
        (2 * Math.PI / WORLD_LENGTH)

        +

        0.9 *
        Math.cos(angle2) *
        (4 * Math.PI / WORLD_LENGTH);

    const curveAngle = Math.atan(derivative);

    return {
        x: curveX,
        angle: curveAngle
    };
}

// =====================================================
// ROAD OBJECT SYSTEM
// =====================================================

function registerRoadObject(
    object,
    roadZ,
    roadOffset,
    roadY = 0,
    rotateWithRoad = true,
    baseRotationY = 0
) {

    object.userData.roadZ = roadZ;
    object.userData.roadOffset = roadOffset;
    object.userData.roadY = roadY;
    object.userData.rotateWithRoad = rotateWithRoad;
    object.userData.baseRotationY = baseRotationY;

    roadObjects.push(object);

    updateRoadObjectTransform(object);
}


function updateRoadObjectTransform(object) {

    const roadZ = object.userData.roadZ;
    const roadOffset = object.userData.roadOffset || 0;

    const curve = getRoadCurve(roadZ);

    /*
        Local X = sisi jalan
        Local Z = arah jalan
    */

    object.position.x =
        curve.x +
        roadOffset * Math.cos(curve.angle);

    object.position.z =
        roadZ -
        roadOffset * Math.sin(curve.angle);

    object.position.y =
        object.userData.roadY || 0;

    if (object.userData.rotateWithRoad) {

        object.rotation.y =
            curve.angle +
            (object.userData.baseRotationY || 0);
    }
}

// =====================================================
// INIT
// =====================================================

function init() {

    scene = new THREE.Scene();

    scene.background =
        new THREE.Color(0x87ceeb);


    // =================================================
    // CAMERA
    // =================================================

    camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    camera.position.set(
        0,
        5,
        9
    );

    camera.lookAt(
        0,
        0,
        -10
    );


    // =================================================
    // RENDERER
    // =================================================

    renderer =
        new THREE.WebGLRenderer({
            antialias: true
        });

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, 2)
    );

    renderer.domElement.style.touchAction = "none";

    const gameElement =
        document.getElementById("game");

    if (gameElement) {
        gameElement.appendChild(
            renderer.domElement
        );
    }


    // =================================================
    // LIGHT
    // =================================================

    const ambientLight =
        new THREE.AmbientLight(
            0xffffff,
            1.5
        );

    scene.add(ambientLight);


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

    scene.add(sun);


    // =================================================
    // WORLD
    // =================================================

    createGround();
    createRoad();
    createPlayerCar();
    createEnemyCars();
    createEnvironment();


    // =================================================
    // CONTROLS
    // =================================================

    setupControls();


    // =================================================
    // RESIZE
    // =================================================

    window.addEventListener(
        "resize",
        onWindowResize
    );


    // =================================================
    // HUD
    // =================================================

    setText(
        "bestScore",
        bestScore
    );


    // =================================================
    // LOADING
    // =================================================

    const loading =
        document.getElementById("loading");

    if (loading) {
        loading.style.display = "none";
    }


    // =================================================
    // START
    // =================================================

    animate();
}

// =====================================================
// GROUND
// =====================================================

function createGround() {

    const groundGeometry =
        new THREE.PlaneGeometry(
            200,
            1000
        );

    const groundMaterial =
        new THREE.MeshLambertMaterial({
            color: 0x3f963f
        });

    const ground =
        new THREE.Mesh(
            groundGeometry,
            groundMaterial
        );

    ground.rotation.x =
        -Math.PI / 2;

    ground.position.y =
        -0.5;

    ground.position.z =
        -300;

    scene.add(ground);


    // Shoulder
    const shoulderGeometry =
        new THREE.PlaneGeometry(
            20,
            1000
        );

    const shoulderMaterial =
        new THREE.MeshLambertMaterial({
            color: 0x6fa84a
        });

    const shoulder =
        new THREE.Mesh(
            shoulderGeometry,
            shoulderMaterial
        );

    shoulder.rotation.x =
        -Math.PI / 2;

    shoulder.position.y =
        -0.47;

    shoulder.position.z =
        -300;

    scene.add(shoulder);
}

// =====================================================
// ROAD
// =====================================================

function createRoad() {

    // -------------------------------------------------
    // REUSABLE MATERIALS
    // -------------------------------------------------

    const roadMaterial =
        new THREE.MeshLambertMaterial({
            color: 0x292929
        });

    const shoulderMaterial =
        new THREE.MeshLambertMaterial({
            color: 0x6a6a6a
        });

    const whiteMaterial =
        new THREE.MeshLambertMaterial({
            color: 0xffffff
        });

    const yellowMaterial =
        new THREE.MeshLambertMaterial({
            color: 0xffd600
        });

    const redMaterial =
        new THREE.MeshLambertMaterial({
            color: 0xd32f2f
        });


    // -------------------------------------------------
    // REUSABLE GEOMETRIES
    // -------------------------------------------------

    const roadGeometry =
        new THREE.BoxGeometry(
            ROAD_WIDTH,
            0.08,
            ROAD_SEGMENT_LENGTH + 0.5
        );

    const shoulderGeometry =
        new THREE.BoxGeometry(
            20,
            0.06,
            ROAD_SEGMENT_LENGTH + 0.5
        );

    const centerLineGeometry =
        new THREE.BoxGeometry(
            0.28,
            0.05,
            6
        );

    const edgeLineGeometry =
        new THREE.BoxGeometry(
            0.16,
            0.05,
            5
        );

    const barrierPostGeometry =
        new THREE.BoxGeometry(
            0.18,
            0.8,
            0.18
        );

    const reflectorGeometry =
        new THREE.BoxGeometry(
            0.22,
            0.16,
            0.08
        );


    // -------------------------------------------------
    // ROAD SEGMENTS
    // -------------------------------------------------

    for (
        let i = 0;
        i < 45;
        i++
    ) {

        const z =
            20 -
            i * ROAD_SEGMENT_LENGTH;


        // ROAD
        const road =
            new THREE.Mesh(
                roadGeometry,
                roadMaterial
            );

        scene.add(road);

        registerRoadObject(
            road,
            z,
            0,
            -0.45,
            true,
            0
        );


        // SHOULDER
        const shoulder =
            new THREE.Mesh(
                shoulderGeometry,
                shoulderMaterial
            );

        scene.add(shoulder);

        registerRoadObject(
            shoulder,
            z,
            0,
            -0.47,
            true,
            0
        );


        // CENTER LINE
        const centerLine =
            new THREE.Mesh(
                centerLineGeometry,
                whiteMaterial
            );

        scene.add(centerLine);

        registerRoadObject(
            centerLine,
            z,
            0,
            -0.39,
            true,
            0
        );


        // LEFT EDGE
        const leftEdge =
            new THREE.Mesh(
                edgeLineGeometry,
                yellowMaterial
            );

        scene.add(leftEdge);

        registerRoadObject(
            leftEdge,
            z,
            -5.7,
            -0.39,
            true,
            0
        );


        // RIGHT EDGE
        const rightEdge =
            new THREE.Mesh(
                edgeLineGeometry,
                yellowMaterial
            );

        scene.add(rightEdge);

        registerRoadObject(
            rightEdge,
            z,
            5.7,
            -0.39,
            true,
            0
        );
    }


    // -------------------------------------------------
    // ROAD BARRIERS
    // -------------------------------------------------

    for (
        let i = 0;
        i < 23;
        i++
    ) {

        const z =
            10 -
            i * 32;


        // LEFT POST
        const leftPost =
            new THREE.Mesh(
                barrierPostGeometry,
                whiteMaterial
            );

        scene.add(leftPost);

        registerRoadObject(
            leftPost,
            z,
            -6.8,
            0,
            true,
            0
        );


        // LEFT REFLECTOR
        const leftReflector =
            new THREE.Mesh(
                reflectorGeometry,
                redMaterial
            );

        scene.add(leftReflector);

        registerRoadObject(
            leftReflector,
            z,
            -6.8,
            0.35,
            true,
            0
        );


        // RIGHT POST
        const rightPost =
            new THREE.Mesh(
                barrierPostGeometry,
                whiteMaterial
            );

        scene.add(rightPost);

        registerRoadObject(
            rightPost,
            z,
            6.8,
            0,
            true,
            0
        );


        // RIGHT REFLECTOR
        const rightReflector =
            new THREE.Mesh(
                reflectorGeometry,
                redMaterial
            );

        scene.add(rightReflector);

        registerRoadObject(
            rightReflector,
            z,
            6.8,
            0.35,
            true,
            0
        );
    }
}

// =====================================================
// PLAYER CAR
// =====================================================

function createPlayerCar() {

    car =
        new THREE.Group();


    // =================================================
    // BODY
    // =================================================

    const bodyGeometry =
        new THREE.BoxGeometry(
            2.15,
            0.55,
            3.8
        );

    const bodyMaterial =
        new THREE.MeshLambertMaterial({
            color: 0xe63946
        });

    const body =
        new THREE.Mesh(
            bodyGeometry,
            bodyMaterial
        );

    body.position.y =
        0.55;

    car.add(body);


    // =================================================
    // NOSE
    // =================================================

    const noseGeometry =
        new THREE.BoxGeometry(
            1.75,
            0.35,
            0.9
        );

    const noseMaterial =
        new THREE.MeshLambertMaterial({
            color: 0xc1121f
        });

    const nose =
        new THREE.Mesh(
            noseGeometry,
            noseMaterial
        );

    nose.position.set(
        0,
        0.48,
        -1.95
    );

    car.add(nose);


    // =================================================
    // CABIN
    // =================================================

    const cabinGeometry =
        new THREE.BoxGeometry(
            1.45,
            0.55,
            1.65
        );

    const cabinMaterial =
        new THREE.MeshLambertMaterial({
            color: 0x101820
        });

    const cabin =
        new THREE.Mesh(
            cabinGeometry,
            cabinMaterial
        );

    cabin.position.set(
        0,
        1,
        -0.25
    );

    car.add(cabin);


    // =================================================
    // WINDSHIELD
    // =================================================

    const windshieldGeometry =
        new THREE.BoxGeometry(
            1.25,
            0.32,
            0.08
        );

    const windshieldMaterial =
        new THREE.MeshLambertMaterial({
            color: 0x4fc3f7
        });

    const windshield =
        new THREE.Mesh(
            windshieldGeometry,
            windshieldMaterial
        );

    windshield.position.set(
        0,
        1.04,
        -1.08
    );

    windshield.rotation.x =
        -0.15;

    car.add(windshield);


    // =================================================
    // REAR WINDOW
    // =================================================

    const rearWindowGeometry =
        new THREE.BoxGeometry(
            1.25,
            0.32,
            0.08
        );

    const rearWindowMaterial =
        new THREE.MeshLambertMaterial({
            color: 0x263238
        });

    const rearWindow =
        new THREE.Mesh(
            rearWindowGeometry,
            rearWindowMaterial
        );

    rearWindow.position.set(
        0,
        1.04,
        0.58
    );

    rearWindow.rotation.x =
        0.15;

    car.add(rearWindow);


    // =================================================
    // CENTER STRIPE
    // =================================================

    const stripeGeometry =
        new THREE.BoxGeometry(
            0.28,
            0.04,
            3.65
        );

    const stripeMaterial =
        new THREE.MeshLambertMaterial({
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

    car.add(stripe);


    // =================================================
    // SIDE SKIRTS
    // =================================================

    const skirtGeometry =
        new THREE.BoxGeometry(
            0.18,
            0.22,
            2.8
        );

    const skirtMaterial =
        new THREE.MeshLambertMaterial({
            color: 0x111111
        });


    const leftSkirt =
        new THREE.Mesh(
            skirtGeometry,
            skirtMaterial
        );

    leftSkirt.position.set(
        -1.05,
        0.35,
        0
    );

    car.add(leftSkirt);


    const rightSkirt =
        new THREE.Mesh(
            skirtGeometry,
            skirtMaterial
        );

    rightSkirt.position.set(
        1.05,
        0.35,
        0
    );

    car.add(rightSkirt);


    // =================================================
    // SPOILER
    // =================================================

    const spoilerBarGeometry =
        new THREE.BoxGeometry(
            1.9,
            0.12,
            0.18
        );

    const spoilerMaterial =
        new THREE.MeshLambertMaterial({
            color: 0x111111
        });

    const spoilerBar =
        new THREE.Mesh(
            spoilerBarGeometry,
            spoilerMaterial
        );

    spoilerBar.position.set(
        0,
        1.15,
        1.72
    );

    car.add(spoilerBar);


    const spoilerPostGeometry =
        new THREE.BoxGeometry(
            0.12,
            0.35,
            0.12
        );


    const spoilerPostLeft =
        new THREE.Mesh(
            spoilerPostGeometry,
            spoilerMaterial
        );

    spoilerPostLeft.position.set(
        -0.65,
        1,
        1.65
    );

    car.add(spoilerPostLeft);


    const spoilerPostRight =
        new THREE.Mesh(
            spoilerPostGeometry,
            spoilerMaterial
        );

    spoilerPostRight.position.set(
        0.65,
        1,
        1.65
    );

    car.add(spoilerPostRight);


    // =================================================
    // HEADLIGHTS
    // =================================================

    const lightGeometry =
        new THREE.BoxGeometry(
            0.38,
            0.16,
            0.08
        );

    const headlightMaterial =
        new THREE.MeshLambertMaterial({
            color: 0xfff59d
        });


    const leftHeadlight =
        new THREE.Mesh(
            lightGeometry,
            headlightMaterial
        );

    leftHeadlight.position.set(
        -0.7,
        0.65,
        -1.98
    );

    car.add(leftHeadlight);


    const rightHeadlight =
        new THREE.Mesh(
            lightGeometry,
            headlightMaterial
        );

    rightHeadlight.position.set(
        0.7,
        0.65,
        -1.98
    );

    car.add(rightHeadlight);


    // =================================================
    // REAR LIGHTS
    // =================================================

    const rearLightMaterial =
        new THREE.MeshLambertMaterial({
            color: 0xff1744
        });


    const leftRearLight =
        new THREE.Mesh(
            lightGeometry,
            rearLightMaterial
        );

    leftRearLight.position.set(
        -0.7,
        0.65,
        1.98
    );

    leftRearLight.rotation.y =
        Math.PI;

    car.add(leftRearLight);


    const rightRearLight =
        new THREE.Mesh(
            lightGeometry,
            rearLightMaterial
        );

    rightRearLight.position.set(
        0.7,
        0.65,
        1.98
    );

    rightRearLight.rotation.y =
        Math.PI;

    car.add(rightRearLight);


    // =================================================
    // WHEELS
    // =================================================

    createWheel(
        -1.05,
        0.35,
        -1.25
    );

    createWheel(
        1.05,
        0.35,
        -1.25
    );

    createWheel(
        -1.05,
        0.35,
        1.25
    );

    createWheel(
        1.05,
        0.35,
        1.25
    );


    // =================================================
    // PLAYER POSITION
    // =================================================

    car.position.set(
        0,
        0,
        5
    );

    scene.add(car);

    updatePlayerPosition();
}

// =====================================================
// WHEEL
// =====================================================

function createWheel(
    x,
    y,
    z
) {

    const wheelGeometry =
        new THREE.CylinderGeometry(
            0.42,
            0.42,
            0.28,
            16
        );

    const wheelMaterial =
        new THREE.MeshLambertMaterial({
            color: 0x111111
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
        y,
        z
    );

    car.add(wheel);


    // Rim
    const rimGeometry =
        new THREE.CylinderGeometry(
            0.2,
            0.2,
            0.3,
            12
        );

    const rimMaterial =
        new THREE.MeshLambertMaterial({
            color: 0x888888
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
        y,
        z
    );

    car.add(rim);
}

// =====================================================
// PLAYER POSITION
// =====================================================

function updatePlayerPosition() {

    if (!car) return;

    const curve =
        getRoadCurve(5);

    car.position.x =
        curve.x +
        playerRoadOffset;

    car.position.z =
        5;

    car.position.y =
        0;

    if (!gameOverState) {

        car.rotation.y =
            curve.angle * 0.6;
    }
}

// =====================================================
// ENEMY CARS
// =====================================================

function createEnemyCars() {

    for (
        let i = 0;
        i < jumlahEnemy;
        i++
    ) {

        const enemy =
            createEnemyCar(
                enemyColors[i]
            );

        enemy.userData.laneOffset =
            getEnemyLane();

        enemy.userData.roadZ =
            -80 -
            i * 65;

        scene.add(enemy);

        enemyCars.push(enemy);

        updateEnemyPosition(enemy);
    }
}

// =====================================================
// CREATE ENEMY CAR
// =====================================================

function createEnemyCar(color) {

    const enemy =
        new THREE.Group();


    // BODY
    const bodyGeometry =
        new THREE.BoxGeometry(
            2.2,
            0.6,
            4
        );

    const bodyMaterial =
        new THREE.MeshLambertMaterial({
            color: color
        });

    const body =
        new THREE.Mesh(
            bodyGeometry,
            bodyMaterial
        );

    body.position.y =
        0.5;

    enemy.add(body);


    // CABIN
    const cabinGeometry =
        new THREE.BoxGeometry(
            1.5,
            0.65,
            1.8
        );

    const cabinMaterial =
        new THREE.MeshLambertMaterial({
            color: 0x111111
        });

    const cabin =
        new THREE.Mesh(
            cabinGeometry,
            cabinMaterial
        );

    cabin.position.set(
        0,
        1,
        -0.2
    );

    enemy.add(cabin);


    // WHEELS
    createEnemyWheel(
        enemy,
        -1.05,
        0.35,
        -1.3
    );

    createEnemyWheel(
        enemy,
        1.05,
        0.35,
        -1.3
    );

    createEnemyWheel(
        enemy,
        -1.05,
        0.35,
        1.3
    );

    createEnemyWheel(
        enemy,
        1.05,
        0.35,
        1.3
    );


    return enemy;
}

// =====================================================
// ENEMY WHEEL
// =====================================================

function createEnemyWheel(
    enemy,
    x,
    y,
    z
) {

    const geometry =
        new THREE.CylinderGeometry(
            0.42,
            0.42,
            0.28,
            16
        );

    const material =
        new THREE.MeshLambertMaterial({
            color: 0x111111
        });

    const wheel =
        new THREE.Mesh(
            geometry,
            material
        );

    wheel.rotation.z =
        Math.PI / 2;

    wheel.position.set(
        x,
        y,
        z
    );

    enemy.add(wheel);
}

// =====================================================
// ENEMY LANE
// =====================================================

function getEnemyLane() {

    const lanes = [
        -3.5,
        0,
        3.5
    ];

    return lanes[
        Math.floor(
            Math.random() *
            lanes.length
        )
    ];
}

// =====================================================
// UPDATE ENEMY POSITION
// =====================================================

function updateEnemyPosition(enemy) {

    const roadZ =
        enemy.userData.roadZ;

    const laneOffset =
        enemy.userData.laneOffset;

    const curve =
        getRoadCurve(roadZ);


    enemy.position.x =
        curve.x +
        laneOffset *
        Math.cos(curve.angle);


    enemy.position.z =
        roadZ -
        laneOffset *
        Math.sin(curve.angle);


    enemy.position.y =
        0;


    enemy.rotation.y =
        curve.angle;
}

// =====================================================
// RESET ENEMY
// =====================================================

function resetEnemy(
    enemy,
    index
) {

    enemy.userData.laneOffset =
        getEnemyLane();

    enemy.userData.roadZ =
        -100 -
        Math.random() * 220 -
        index * 40;

    updateEnemyPosition(enemy);
}

// =====================================================
// ENVIRONMENT
// =====================================================

function createEnvironment() {

    // TREES
    for (
        let i = 0;
        i < 50;
        i++
    ) {

        const side =
            Math.random() < 0.5
                ? -1
                : 1;

        const offset =
            side *
            (
                9 +
                Math.random() * 9
            );

        const z =
            Math.random() *
            -700;

        const tree =
            createTree();

        const scale =
            0.7 +
            Math.random() * 1.4;

        tree.scale.set(
            scale,
            scale,
            scale
        );

        scene.add(tree);

        registerRoadObject(
            tree,
            z,
            offset,
            0,
            true,
            Math.random() * Math.PI * 2
        );
    }


    // BUSHES
    for (
        let i = 0;
        i < 70;
        i++
    ) {

        const side =
            Math.random() < 0.5
                ? -1
                : 1;

        const offset =
            side *
            (
                7.5 +
                Math.random() * 9
            );

        const z =
            Math.random() *
            -700;

        const bush =
            createBush();

        const scale =
            0.4 +
            Math.random() * 0.8;

        bush.scale.set(
            scale,
            scale,
            scale
        );

        scene.add(bush);

        registerRoadObject(
            bush,
            z,
            offset,
            0,
            true,
            Math.random() * Math.PI * 2
        );
    }


    // STREET LIGHTS
    for (
        let z = -25;
        z > -700;
        z -= 35
    ) {

        const leftLight =
            createStreetLight();

        scene.add(leftLight);

        registerRoadObject(
            leftLight,
            z,
            -8,
            0,
            true,
            0
        );


        const rightLight =
            createStreetLight();

        rightLight.scale.x =
            -1;

        scene.add(rightLight);

        registerRoadObject(
            rightLight,
            z,
            8,
            0,
            true,
            0
        );
    }
}

// =====================================================
// TREE
// =====================================================

function createTree() {

    const group =
        new THREE.Group();


    const trunkGeometry =
        new THREE.CylinderGeometry(
            0.22,
            0.32,
            2.2,
            8
        );

    const trunkMaterial =
        new THREE.MeshLambertMaterial({
            color: 0x795548
        });

    const trunk =
        new THREE.Mesh(
            trunkGeometry,
            trunkMaterial
        );

    trunk.position.y =
        1.1;

    group.add(trunk);


    const leafMaterial =
        new THREE.MeshLambertMaterial({
            color: 0x2e7d32
        });


    const leaf1 =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.9,
                10,
                10
            ),
            leafMaterial
        );

    leaf1.position.set(
        0,
        2.4,
        0
    );

    group.add(leaf1);


    const leaf2 =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.75,
                10,
                10
            ),
            leafMaterial
        );

    leaf2.position.set(
        -0.55,
        1.9,
        0
    );

    group.add(leaf2);


    const leaf3 =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.75,
                10,
                10
            ),
            leafMaterial
        );

    leaf3.position.set(
        0.55,
        1.9,
        0
    );

    group.add(leaf3);


    return group;
}

// =====================================================
// BUSH
// =====================================================

function createBush() {

    const group =
        new THREE.Group();

    const material =
        new THREE.MeshLambertMaterial({
            color: 0x388e3c
        });


    const bush1 =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.7,
                8,
                8
            ),
            material
        );

    bush1.position.set(
        0,
        0.6,
        0
    );

    group.add(bush1);


    const bush2 =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.55,
                8,
                8
            ),
            material
        );

    bush2.position.set(
        -0.55,
        0.45,
        0
    );

    group.add(bush2);


    const bush3 =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.55,
                8,
                8
            ),
            material
        );

    bush3.position.set(
        0.55,
        0.45,
        0
    );

    group.add(bush3);


    return group;
}

// =====================================================
// STREET LIGHT
// =====================================================

function createStreetLight() {

    const group =
        new THREE.Group();


    const poleMaterial =
        new THREE.MeshLambertMaterial({
            color: 0x333333
        });


    // POLE
    const pole =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                0.14,
                4.2,
                0.14
            ),
            poleMaterial
        );

    pole.position.y =
        2.1;

    group.add(pole);


    // ARM
    const arm =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                1.2,
                0.12,
                0.12
            ),
            poleMaterial
        );

    arm.position.set(
        0.55,
        4.1,
        0
    );

    group.add(arm);


    // BULB
    const bulbMaterial =
        new THREE.MeshLambertMaterial({
            color: 0xfff176
        });

    const bulb =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.18,
                8,
                8
            ),
            bulbMaterial
        );

    bulb.position.set(
        1.1,
        4.0,
        0
    );

    group.add(bulb);


    return group;
}

// =====================================================
// CONTROLS
// =====================================================

function setupControls() {

    const left =
        document.getElementById("left");

    const right =
        document.getElementById("right");

    const gas =
        document.getElementById("gas");

    const brake =
        document.getElementById("brake");


    function bindButton(
        element,
        downFunction,
        upFunction
    ) {

        if (!element) return;


        element.addEventListener(
            "pointerdown",
            function (event) {

                event.preventDefault();

                downFunction();

                if (
                    element.setPointerCapture
                ) {
                    try {
                        element.setPointerCapture(
                            event.pointerId
                        );
                    } catch (error) {}
                }
            }
        );


        element.addEventListener(
            "pointerup",
            function (event) {

                event.preventDefault();

                upFunction();

                if (
                    element.releasePointerCapture
                ) {
                    try {
                        element.releasePointerCapture(
                            event.pointerId
                        );
                    } catch (error) {}
                }
            }
        );


        element.addEventListener(
            "pointercancel",
            function () {
                upFunction();
            }
        );


        element.addEventListener(
            "pointerleave",
            function () {
                upFunction();
            }
        );
    }


    bindButton(
        left,
        function () {
            steerLeft = true;
        },
        function () {
            steerLeft = false;
        }
    );


    bindButton(
        right,
        function () {
            steerRight = true;
        },
        function () {
            steerRight = false;
        }
    );


    bindButton(
        gas,
        function () {
            gasPressed = true;
        },
        function () {
            gasPressed = false;
        }
    );


    bindButton(
        brake,
        function () {
            brakePressed = true;
        },
        function () {
            brakePressed = false;
        }
    );


    // =================================================
    // KEYBOARD
    // =================================================

    window.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "ArrowLeft"
            ) {

                steerLeft = true;
                event.preventDefault();
            }


            if (
                event.key === "ArrowRight"
            ) {

                steerRight = true;
                event.preventDefault();
            }


            if (
                event.key === "ArrowUp" ||
                event.code === "Space"
            ) {

                gasPressed = true;
                event.preventDefault();
            }


            if (
                event.key === "ArrowDown" ||
                event.key.toLowerCase() === "s"
            ) {

                brakePressed = true;
                event.preventDefault();
            }
        }
    );


    window.addEventListener(
        "keyup",
        function (event) {

            if (
                event.key === "ArrowLeft"
            ) {
                steerLeft = false;
            }


            if (
                event.key === "ArrowRight"
            ) {
                steerRight = false;
            }


            if (
                event.key === "ArrowUp" ||
                event.code === "Space"
            ) {
                gasPressed = false;
            }


            if (
                event.key === "ArrowDown" ||
                event.key.toLowerCase() === "s"
            ) {
                brakePressed = false;
            }
        }
    );


    // Prevent accidental browser menu
    window.addEventListener(
        "contextmenu",
        function (event) {
            event.preventDefault();
        }
    );
}

// =====================================================
// GAME UPDATE
// =====================================================

function updateGame() {

    if (gameOverState) {
        return;
    }


    // =================================================
    // ACCELERATION
    // =================================================

    if (gasPressed) {

        speed += ACCELERATION;

        if (speed > MAX_SPEED) {
            speed = MAX_SPEED;
        }

    } else {

        speed -=
            NATURAL_DECELERATION;

        if (speed < 0) {
            speed = 0;
        }
    }


    // =================================================
    // BRAKE
    // =================================================

    if (brakePressed) {

        speed -= BRAKE_POWER;

        if (speed < 0) {
            speed = 0;
        }
    }


    // =================================================
    // STEERING
    // =================================================

    if (
        steerLeft &&
        !steerRight
    ) {

        steeringVelocity -=
            STEER_ACCELERATION;

    } else if (
        steerRight &&
        !steerLeft
    ) {

        steeringVelocity +=
            STEER_ACCELERATION;

    } else {

        // Return steering velocity to zero
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


    // =================================================
    // PLAYER LATERAL MOVEMENT
    // =================================================

    const steeringStrength =
        0.75 +
        speed * 0.03;

    playerRoadOffset +=
        steeringVelocity *
        steeringStrength;


    // Keep player on road
    playerRoadOffset =
        THREE.MathUtils.clamp(
            playerRoadOffset,
            -4.5,
            4.5
        );


    updatePlayerPosition();


    // =================================================
    // ROAD / ENVIRONMENT MOVEMENT
    // =================================================

    const movement =
        speed * 0.65;


    roadObjects.forEach(
        function (object) {

            object.userData.roadZ +=
                movement;


            if (
                object.userData.roadZ > 30
            ) {

                object.userData.roadZ -=
                    WORLD_LENGTH;
            }


            updateRoadObjectTransform(
                object
            );
        }
    );


    // =================================================
    // ENEMY MOVEMENT
    // =================================================

    enemyCars.forEach(
        function (enemy, index) {

            enemy.userData.roadZ +=
                movement *
                0.75;


            if (
                enemy.userData.roadZ > 35
            ) {

                resetEnemy(
                    enemy,
                    index
                );

                return;
            }


            updateEnemyPosition(
                enemy
            );
        }
    );


    // =================================================
    // DISTANCE
    // =================================================

    distance +=
        speed * 0.02;


    // =================================================
    // SCORE
    // =================================================

    score =
        Math.floor(
            distance * 10
        );


    // =================================================
    // LEVEL
    // =================================================

    level =
        Math.floor(
            distance / 100
        ) + 1;


    // =================================================
    // BEST SCORE
    // =================================================

    if (
        score > bestScore
    ) {

        bestScore = score;

        localStorage.setItem(
            "lexaBestScore",
            bestScore
        );
    }


    // =================================================
    // HUD
    // =================================================

    setText(
        "speed",
        Math.floor(
            speed * 10
        ) + " km/h"
    );

    setText(
        "distance",
        Math.floor(
            distance
        ) + " m"
    );

    setText(
        "score",
        score
    );

    setText(
        "level",
        level
    );

    setText(
        "bestScore",
        bestScore
    );


    // =================================================
    // COLLISION
    // =================================================

    checkCollisions();
}

// =====================================================
// COLLISION
// =====================================================

function checkCollisions() {

    if (gameOverState) {
        return;
    }


    for (
        let i = 0;
        i < enemyCars.length;
        i++
    ) {

        const enemy =
            enemyCars[i];


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
            dz < 2.5
        ) {

            gameOver();

            return;
        }
    }
}

// =====================================================
// COLLISION EFFECT
// =====================================================

function createCollisionEffect() {

    // Clear previous particles
    collisionParticles.forEach(
        function (particle) {

            scene.remove(
                particle.mesh
            );
        }
    );

    collisionParticles.length = 0;


    const particleColors = [
        0xff0000,
        0xff6d00,
        0xffff00,
        0xffffff
    ];


    for (
        let i = 0;
        i < 25;
        i++
    ) {

        const geometry =
            new THREE.BoxGeometry(
                0.12 +
                Math.random() * 0.18,
                0.12 +
                Math.random() * 0.18,
                0.12 +
                Math.random() * 0.18
            );


        const material =
            new THREE.MeshLambertMaterial({
                color:
                    particleColors[
                        Math.floor(
                            Math.random() *
                            particleColors.length
                        )
                    ]
            });


        const mesh =
            new THREE.Mesh(
                geometry,
                material
            );


        mesh.position.copy(
            car.position
        );


        mesh.position.x +=
            (Math.random() - 0.5) *
            2;


        mesh.position.y +=
            0.5 +
            Math.random() *
            1.5;


        mesh.position.z +=
            (Math.random() - 0.5) *
            2;


        scene.add(mesh);


        collisionParticles.push({
            mesh: mesh,

            velocity: new THREE.Vector3(
                (Math.random() - 0.5) *
                    0.25,

                Math.random() *
                    0.35,

                (Math.random() - 0.5) *
                    0.25
            ),

            life:
                0.7 +
                Math.random() *
                0.8
        });
    }


    cameraShakeTime =
        cameraShakeDuration;
}

// =====================================================
// UPDATE COLLISION EFFECT
// =====================================================

function updateCollisionEffect() {

    for (
        let i =
            collisionParticles.length - 1;
        i >= 0;
        i--
    ) {

        const particle =
            collisionParticles[i];


        particle.mesh.position.add(
            particle.velocity
        );


        particle.velocity.y -=
            0.018;


        particle.mesh.rotation.x +=
            0.15;

        particle.mesh.rotation.y +=
            0.2;


        particle.life -=
            0.016;


        if (
            particle.life <= 0
        ) {

            scene.remove(
                particle.mesh
            );

            collisionParticles.splice(
                i,
                1
            );
        }
    }


    // =================================================
    // CAMERA SHAKE
    // =================================================

    if (
        cameraShakeTime > 0
    ) {

        cameraShakeTime -=
            0.016;


        const intensity =
            cameraShakeTime /
            cameraShakeDuration;


        camera.position.x =
            cameraBasePosition.x +
            (
                Math.random() - 0.5
            ) *
            0.45 *
            intensity;


        camera.position.y =
            cameraBasePosition.y +
            (
                Math.random() - 0.5
            ) *
            0.35 *
            intensity;


        camera.position.z =
            cameraBasePosition.z +
            (
                Math.random() - 0.5
            ) *
            0.3 *
            intensity;
    }
}

// =====================================================
// GAME OVER
// =====================================================

function gameOver() {

    if (gameOverState) {
        return;
    }


    gameOverState = true;

    speed = 0;

    gasPressed = false;
    brakePressed = false;

    steerLeft = false;
    steerRight = false;

    steeringVelocity = 0;


    createCollisionEffect();


    // Dramatic crash rotation
    car.rotation.x =
        -0.15;

    car.rotation.z =
        0.18;


    // =================================================
    // GAME OVER SCREEN
    // =================================================

    const oldScreen =
        document.getElementById(
            "gameOverScreen"
        );

    if (oldScreen) {
        oldScreen.remove();
    }


    const screen =
        document.createElement(
            "div"
        );

    screen.id =
        "gameOverScreen";


    screen.style.position =
        "fixed";

    screen.style.left =
        "0";

    screen.style.top =
        "0";

    screen.style.width =
        "100%";

    screen.style.height =
        "100%";

    screen.style.display =
        "flex";

    screen.style.flexDirection =
        "column";

    screen.style.alignItems =
        "center";

    screen.style.justifyContent =
        "center";

    screen.style.background =
        "rgba(0,0,0,0.78)";

    screen.style.zIndex =
        "9999";

    screen.style.color =
        "white";

    screen.style.fontFamily =
        "Arial, sans-serif";

    screen.style.textAlign =
        "center";


    screen.innerHTML = `

        <div style="
            font-size:48px;
            font-weight:bold;
            margin-bottom:12px;
        ">
            GAME OVER
        </div>

        <div style="
            font-size:20px;
            margin-bottom:20px;
        ">
            💥 Mobil bertabrakan!
        </div>

        <div style="
            font-size:18px;
            line-height:1.8;
            margin-bottom:24px;
        ">
            Jarak: ${Math.floor(distance)} m<br>
            Score: ${score}<br>
            Best Score: ${bestScore}<br>
            Level: ${level}
        </div>

        <button
            id="restartButton"
            style="
                border:none;
                padding:15px 30px;
                border-radius:12px;
                font-size:18px;
                font-weight:bold;
                cursor:pointer;
                background:#ffffff;
                color:#222;
            "
        >
            🔄 MAIN LAGI
        </button>
    `;


    document.body.appendChild(
        screen
    );


    const restartButton =
        document.getElementById(
            "restartButton"
        );


    if (restartButton) {

        restartButton.addEventListener(
            "click",
            restartGame
        );

        restartButton.addEventListener(
            "pointerdown",
            function () {
                restartGame();
            }
        );
    }
}

// =====================================================
// RESTART
// =====================================================

function restartGame() {

    // Remove Game Over
    const screen =
        document.getElementById(
            "gameOverScreen"
        );

    if (screen) {
        screen.remove();
    }


    // Remove particles
    collisionParticles.forEach(
        function (particle) {

            scene.remove(
                particle.mesh
            );
        }
    );

    collisionParticles.length = 0;


    // Reset state
    speed = 0;
    distance = 0;
    score = 0;
    level = 1;

    gameOverState = false;


    // Reset controls
    steerLeft = false;
    steerRight = false;
    gasPressed = false;
    brakePressed = false;


    steeringVelocity = 0;
    playerRoadOffset = 0;


    // Reset player
    car.position.set(
        0,
        0,
        5
    );

    car.rotation.set(
        0,
        0,
        0
    );


    updatePlayerPosition();


    // Reset enemies
    enemyCars.forEach(
        function (enemy, index) {

            resetEnemy(
                enemy,
                index
            );
        }
    );


    // Reset camera
    camera.position.set(
        0,
        5,
        9
    );

    cameraBasePosition.x = 0;
    cameraBasePosition.y = 5;
    cameraBasePosition.z = 9;

    cameraShakeTime = 0;


    // Reset HUD
    setText(
        "speed",
        "0 km/h"
    );

    setText(
        "distance",
        "0 m"
    );

    setText(
        "score",
        "0"
    );

    setText(
        "level",
        "1"
    );

    setText(
        "bestScore",
        bestScore
    );
}

// =====================================================
// CAMERA
// =====================================================

function updateCamera() {

    if (!camera || !car) {
        return;
    }


    if (
        cameraShakeTime <= 0
    ) {

        const targetX =
            car.position.x;


        camera.position.x +=
            (
                targetX -
                camera.position.x
            ) *
            0.08;


        camera.position.y +=
            (
                5 -
                camera.position.y
            ) *
            0.08;


        camera.position.z +=
            (
                9 -
                camera.position.z
            ) *
            0.08;


        cameraBasePosition.x =
            camera.position.x;

        cameraBasePosition.y =
            camera.position.y;

        cameraBasePosition.z =
            camera.position.z;
    }


    camera.lookAt(
        car.position.x,
        0.6,
        -12
    );
}

// =====================================================
// RESIZE
// =====================================================

function onWindowResize() {

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

// =====================================================
// ANIMATION LOOP
// =====================================================

function animate() {

    requestAnimationFrame(
        animate
    );


    updateGame();

    updateCollisionEffect();

    updateCamera();


    renderer.render(
        scene,
        camera
    );
}

// =====================================================
// START GAME
// =====================================================

init();