import * as THREE from './three.module.js';

// ==========================================
// LEXA SPEED RACE 3D
// MULTIPLE ENEMY CARS
// SCORE + LEVEL + BEST SCORE
// + COLLISION EFFECT
// ==========================================

let scene;
let camera;
let renderer;

let car;

// ==========================================
// MULTIPLE ENEMY CARS
// ==========================================

let enemyCars = [];

const jumlahEnemy = 4;

const enemyColors = [
    0x1565c0,
    0xff9800,
    0x7b1fa2,
    0x212121
];

let speed = 0;
let distance = 0;
let score = 0;
let level = 1;
// ==========================================
// LEVEL SYSTEM
// ==========================================

const LEVEL_DISTANCE = 500;

const TOTAL_LEVELS = 5;

let currentLevel = 1;

const levelNames = [
    "HUTAN",
    "PERUMAHAN",
    "HUTAN LEBAT",
    "PEGUNUNGAN",
    "JALAN LAUT"
];

const levelColors = [
    0x87ceeb, // Level 1 - Hutan
    0x9ed8ff, // Level 2 - Perumahan
    0x6fa8dc, // Level 3 - Hutan Lebat
    0xb8c6d1, // Level 4 - Gunung
    0xffb36b  // Level 5 - Laut / sunset
];

let bestScore =
    Number(
        localStorage.getItem("lexaBestScore")
    ) || 0;

// ==========================================
// KONTROL
// ==========================================

let steerLeft = false;
let steerRight = false;
let gasPressed = false;
let brakePressed = false;

let roadObjects = [];

let gameOverState = false;

// ==========================================
// EFEK TABRAKAN
// ==========================================

let collisionParticles = [];

let cameraShakeTime = 0;

let cameraShakeDuration = 0.5;

let cameraBasePosition = {
    x: 0,
    y: 5,
    z: 9
};

// ==========================================
// MULAI GAME
// ==========================================

function init() {

    // ==========================================
// LEVEL MANAGER
// ==========================================

function updateLevelSystem() {

    const calculatedLevel =
        Math.min(
            TOTAL_LEVELS,
            Math.floor(
                distance / LEVEL_DISTANCE
            ) + 1
        );

    if (
        calculatedLevel !== currentLevel
    ) {

        currentLevel =
            calculatedLevel;

        level =
            currentLevel;

        onLevelChanged(
            currentLevel
        );
    }
}


// ==========================================
// LEVEL CHANGED
// ==========================================

function onLevelChanged(
    newLevel
) {

    console.log(
        "LEVEL BERUBAH:",
        newLevel,
        levelNames[newLevel - 1]
    );


    // ======================================
    // UBAH WARNA LANGIT
    // ======================================

    if (
        scene &&
        levelColors[newLevel - 1]
    ) {

        scene.background =
            new THREE.Color(
                levelColors[newLevel - 1]
            );
    }


    // ======================================
    // NOTIFIKASI LEVEL
    // ======================================

    showLevelNotification(
        newLevel
    );
}


// ==========================================
// LEVEL NOTIFICATION
// ==========================================

function showLevelNotification(
    newLevel
) {

    let notification =
        document.getElementById(
            "levelNotification"
        );


    if (!notification) {

        notification =
            document.createElement(
                "div"
            );

        notification.id =
            "levelNotification";


        notification.style.position =
            "fixed";

        notification.style.top =
            "25%";

        notification.style.left =
            "50%";

        notification.style.transform =
            "translate(-50%, -50%)";

        notification.style.zIndex =
            "9999";

        notification.style.textAlign =
            "center";

        notification.style.fontFamily =
            "Arial, sans-serif";

        notification.style.color =
            "#ffffff";

        notification.style.textShadow =
            "0 3px 8px #000000";

        notification.style.pointerEvents =
            "none";


        document.body.appendChild(
            notification
        );
    }


    notification.innerHTML =
        `
        <div style="
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 8px;
        ">
            LEVEL ${newLevel}
        </div>

        <div style="
            font-size: 36px;
            font-weight: 900;
        ">
            ${levelNames[newLevel - 1]}
        </div>
        `;


    notification.style.opacity =
        "1";


    notification.style.transition =
        "opacity 1s ease";


    setTimeout(
        function () {

            notification.style.opacity =
                "0";

        },
        2500
    );
}
    console.log(
        "Lexa Speed Race 3D dimulai"
    );

    scene =
        new THREE.Scene();

    // LANGIT

    scene.background =
        new THREE.Color(
            0x87ceeb
        );

    // ======================================
    // KAMERA
    // ======================================

    camera =
        new THREE.PerspectiveCamera(
            70,
            window.innerWidth /
            window.innerHeight,
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

    // ======================================
    // RENDERER
    // ======================================

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

    document
        .getElementById("game")
        .appendChild(
            renderer.domElement
        );

    // ======================================
    // CAHAYA
    // ======================================

    const ambientLight =
        new THREE.AmbientLight(
            0xffffff,
            1.5
        );

    scene.add(
        ambientLight
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

    scene.add(
        sun
    );

    // ======================================
    // TANAH
    // ======================================

    createGround();

    // ======================================
    // JALAN
    // ======================================

    createRoad();

    // ======================================
    // MOBIL PEMAIN
    // ======================================

    createPlayerCar();

    // ======================================
    // MULTIPLE MOBIL LAWAN
    // ======================================

    createEnemyCars();

    // ======================================
    // LINGKUNGAN
    // ======================================

    createEnvironment();

    // ======================================
    // KONTROL
    // ======================================

    setupControls();

    // ======================================
    // RESIZE
    // ======================================

    window.addEventListener(
        "resize",
        resizeGame
    );

    // ======================================
    // BEST SCORE
    // ======================================

    document.getElementById(
        "bestScore"
    ).textContent =
        bestScore;

    // ======================================
    // HILANGKAN LOADING
    // ======================================

    document.getElementById(
        "loading"
    ).style.display =
        "none";

    // ======================================
    // MULAI
    // ======================================

    animate();
}

// ==========================================
// TANAH
// ==========================================

function createGround() {

    const geometry =
        new THREE.PlaneGeometry(
            200,
            1000
        );

    const material =
        new THREE.MeshLambertMaterial({
            color: 0x3f963f
        });

    const ground =
        new THREE.Mesh(
            geometry,
            material
        );

    ground.rotation.x =
        -Math.PI / 2;

    ground.position.y =
        -0.5;

    scene.add(
        ground
    );

    // BAHU JALAN

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

    scene.add(
        shoulder
    );
}

// ==========================================
// JALAN
// ==========================================

function createRoad() {

    const geometry =
        new THREE.PlaneGeometry(
            12,
            1000
        );

    const material =
        new THREE.MeshLambertMaterial({
            color: 0x292929
        });

    const road =
        new THREE.Mesh(
            geometry,
            material
        );

    road.rotation.x =
        -Math.PI / 2;

    road.position.y =
        -0.45;

    scene.add(
        road
    );

    // GARIS TENGAH

    for (
        let z = -20;
        z > -500;
        z -= 12
    ) {

        const lineGeometry =
            new THREE.BoxGeometry(
                0.28,
                0.04,
                6
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
            0,
            -0.40,
            z
        );

        scene.add(
            line
        );

        roadObjects.push(
            line
        );
    }

    // GARIS TEPI KIRI

    for (
        let z = -20;
        z > -500;
        z -= 8
    ) {

        const edgeGeometry =
            new THREE.BoxGeometry(
                0.16,
                0.05,
                4
            );

        const edgeMaterial =
            new THREE.MeshBasicMaterial({
                color: 0xffd600
            });

        const edge =
            new THREE.Mesh(
                edgeGeometry,
                edgeMaterial
            );

        edge.position.set(
            -5.7,
            -0.39,
            z
        );

        scene.add(
            edge
        );

        roadObjects.push(
            edge
        );
    }

    // GARIS TEPI KANAN

    for (
        let z = -20;
        z > -500;
        z -= 8
    ) {

        const edgeGeometry =
            new THREE.BoxGeometry(
                0.16,
                0.05,
                4
            );

        const edgeMaterial =
            new THREE.MeshBasicMaterial({
                color: 0xffd600
            });

        const edge =
            new THREE.Mesh(
                edgeGeometry,
                edgeMaterial
            );

        edge.position.set(
            5.7,
            -0.39,
            z
        );

        scene.add(
            edge
        );

        roadObjects.push(
            edge
        );
    }

    // PEMBATAS JALAN

    for (
        let z = -20;
        z > -500;
        z -= 18
    ) {

        createRoadBarrier(
            -6.8,
            z
        );

        createRoadBarrier(
            6.8,
            z
        );
    }
}

// ==========================================
// PEMBATAS JALAN
// ==========================================

function createRoadBarrier(
    x,
    z
) {

    const postGeometry =
        new THREE.BoxGeometry(
            0.18,
            0.8,
            0.18
        );

    const postMaterial =
        new THREE.MeshLambertMaterial({
            color: 0xffffff
        });

    const post =
        new THREE.Mesh(
            postGeometry,
            postMaterial
        );

    post.position.set(
        x,
        0,
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
            0.22,
            0.16,
            0.08
        );

    const reflectorMaterial =
        new THREE.MeshBasicMaterial({
            color: 0xff0000
        });

    const reflector =
        new THREE.Mesh(
            reflectorGeometry,
            reflectorMaterial
        );

    reflector.position.set(
        x,
        0.35,
        z
    );

    scene.add(
        reflector
    );

    roadObjects.push(
        reflector
    );
}

// ==========================================
// MOBIL PEMAIN
// ==========================================

function createPlayerCar() {

    car =
        new THREE.Group();

    // BODY

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

    car.add(
        body
    );

    // NOSE

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

    car.add(
        nose
    );

    // KABIN

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
        1.0,
        -0.25
    );

    car.add(
        cabin
    );

    // KACA DEPAN

    const windshieldGeometry =
        new THREE.BoxGeometry(
            1.3,
            0.28,
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
        1.12,
        -1.1
    );

    windshield.rotation.x =
        -0.15;

    car.add(
        windshield
    );

    // KACA BELAKANG

    const rearWindow =
        new THREE.Mesh(
            windshieldGeometry,
            new THREE.MeshLambertMaterial({
                color: 0x263238
            })
        );

    rearWindow.position.set(
        0,
        1.12,
        0.62
    );

    rearWindow.rotation.x =
        0.15;

    car.add(
        rearWindow
    );

    // STRIPE

    const stripeGeometry =
        new THREE.BoxGeometry(
            0.25,
            0.08,
            3.75
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
        0.86,
        0
    );

    car.add(
        stripe
    );

    // SIDE SKIRT

    const sideGeometry =
        new THREE.BoxGeometry(
            0.18,
            0.25,
            3.3
        );

    const sideMaterial =
        new THREE.MeshLambertMaterial({
            color: 0x111111
        });

    const sideLeft =
        new THREE.Mesh(
            sideGeometry,
            sideMaterial
        );

    sideLeft.position.set(
        -1.08,
        0.3,
        0
    );

    car.add(
        sideLeft
    );

    const sideRight =
        new THREE.Mesh(
            sideGeometry,
            sideMaterial
        );

    sideRight.position.set(
        1.08,
        0.3,
        0
    );

    car.add(
        sideRight
    );

    // SPOILER

    const spoilerBarGeometry =
        new THREE.BoxGeometry(
            2.35,
            0.18,
            0.35
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
        1.05,
        1.75
    );

    car.add(
        spoilerBar
    );

    const spoilerPostGeometry =
        new THREE.BoxGeometry(
            0.12,
            0.55,
            0.12
        );

    const spoilerPostLeft =
        new THREE.Mesh(
            spoilerPostGeometry,
            spoilerMaterial
        );

    spoilerPostLeft.position.set(
        -0.75,
        0.85,
        1.55
    );

    car.add(
        spoilerPostLeft
    );

    const spoilerPostRight =
        new THREE.Mesh(
            spoilerPostGeometry,
            spoilerMaterial
        );

    spoilerPostRight.position.set(
        0.75,
        0.85,
        1.55
    );

    car.add(
        spoilerPostRight
    );

    // LAMPU DEPAN

    const lightGeometry =
        new THREE.BoxGeometry(
            0.45,
            0.18,
            0.12
        );

    const headLightMaterial =
        new THREE.MeshBasicMaterial({
            color: 0xffffcc
        });

    const lightLeft =
        new THREE.Mesh(
            lightGeometry,
            headLightMaterial
        );

    lightLeft.position.set(
        -0.65,
        0.68,
        -2.0
    );

    car.add(
        lightLeft
    );

    const lightRight =
        new THREE.Mesh(
            lightGeometry,
            headLightMaterial
        );

    lightRight.position.set(
        0.65,
        0.68,
        -2.0
    );

    car.add(
        lightRight
    );

    // LAMPU BELAKANG

    const rearLightMaterial =
        new THREE.MeshBasicMaterial({
            color: 0xff0000
        });

    const rearLightLeft =
        new THREE.Mesh(
            lightGeometry,
            rearLightMaterial
        );

    rearLightLeft.position.set(
        -0.65,
        0.65,
        1.94
    );

    car.add(
        rearLightLeft
    );

    const rearLightRight =
        new THREE.Mesh(
            lightGeometry,
            rearLightMaterial
        );

    rearLightRight.position.set(
        0.65,
        0.65,
        1.94
    );

    car.add(
        rearLightRight
    );

    // RODA

    createWheel(-1.15, 0.3, 1.25);
    createWheel(1.15, 0.3, 1.25);
    createWheel(-1.15, 0.3, -1.25);
    createWheel(1.15, 0.3, -1.25);

    car.position.set(
        0,
        0,
        5
    );

    scene.add(
        car
    );
}

// ==========================================
// RODA PEMAIN
// ==========================================

function createWheel(
    x,
    y,
    z
) {

    const tireGeometry =
        new THREE.CylinderGeometry(
            0.42,
            0.42,
            0.34,
            20
        );

    const tireMaterial =
        new THREE.MeshLambertMaterial({
            color: 0x111111
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
        y,
        z
    );

    car.add(
        tire
    );

    const rimGeometry =
        new THREE.CylinderGeometry(
            0.2,
            0.2,
            0.36,
            12
        );

    const rimMaterial =
        new THREE.MeshLambertMaterial({
            color: 0xbdbdbd
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

    car.add(
        rim
    );
}

// ==========================================
// MULTIPLE MOBIL LAWAN
// ==========================================

function createEnemyCars() {

    enemyCars = [];

    for (
        let i = 0;
        i < jumlahEnemy;
        i++
    ) {

        const enemy =
            createEnemyCar(
                enemyColors[i]
            );

        enemy.position.x =
            getEnemyLane();

        enemy.position.z =
            -70 -
            (i * 65);

        scene.add(
            enemy
        );

        enemyCars.push(
            enemy
        );
    }
}

// ==========================================
// BUAT SATU MOBIL LAWAN
// ==========================================

function createEnemyCar(
    color
) {

    const enemy =
        new THREE.Group();

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

    enemy.add(
        body
    );

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

    enemy.add(
        cabin
    );

    createEnemyWheel(
        enemy,
        -1.15,
        0.3,
        1.25
    );

    createEnemyWheel(
        enemy,
        1.15,
        0.3,
        1.25
    );

    createEnemyWheel(
        enemy,
        -1.15,
        0.3,
        -1.25
    );

    createEnemyWheel(
        enemy,
        1.15,
        0.3,
        -1.25
    );

    return enemy;
}

// ==========================================
// RODA MOBIL LAWAN
// ==========================================

function createEnemyWheel(
    enemy,
    x,
    y,
    z
) {

    const geometry =
        new THREE.CylinderGeometry(
            0.4,
            0.4,
            0.3,
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

    enemy.add(
        wheel
    );
}

// ==========================================
// POSISI JALUR MOBIL LAWAN
// ==========================================

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

// ==========================================
// RESET MOBIL LAWAN
// ==========================================

function resetEnemy(
    enemy,
    index
) {

    enemy.position.x =
        getEnemyLane();

    enemy.position.z =
        -80 -
        (
            Math.random() *
            180
        ) -
        (
            index * 30
        );
}

// ==========================================
// LINGKUNGAN
// ==========================================

function createEnvironment() {

    // POHON

    for (
        let i = 0;
        i < 50;
        i++
    ) {

        const tree =
            createTree();

        const side =
            Math.random() > 0.5
                ? 1
                : -1;

        tree.position.x =
            side *
            (
                9 +
                Math.random() * 9
            );

        tree.position.z =
            -Math.random() * 500;

        tree.position.y =
            0;

        const scale =
            0.7 +
            Math.random() * 1.4;

        tree.scale.set(
            scale,
            scale,
            scale
        );

        scene.add(
            tree
        );

        roadObjects.push(
            tree
        );
    }

    // SEMAK

    for (
        let i = 70;
        i > 0;
        i--
    ) {

        const bush =
            createBush();

        const side =
            Math.random() > 0.5
                ? 1
                : -1;

        bush.position.x =
            side *
            (
                7.5 +
                Math.random() * 9
            );

        bush.position.z =
            -Math.random() * 500;

        const scale =
            0.4 +
            Math.random() * 0.8;

        bush.scale.set(
            scale,
            scale,
            scale
        );

        scene.add(
            bush
        );

        roadObjects.push(
            bush
        );
    }

    // LAMPU JALAN

    for (
        let z = -25;
        z > -500;
        z -= 35
    ) {

        const lampLeft =
            createStreetLight();

        lampLeft.position.set(
            -8,
            0,
            z
        );

        scene.add(
            lampLeft
        );

        roadObjects.push(
            lampLeft
        );

        const lampRight =
            createStreetLight();

        lampRight.position.set(
            8,
            0,
            z
        );

        lampRight.scale.x =
            -1;

        scene.add(
            lampRight
        );

        roadObjects.push(
            lampRight
        );
    }
}

// ==========================================
// POHON
// ==========================================

function createTree() {

    const tree =
        new THREE.Group();

    const trunkGeometry =
        new THREE.CylinderGeometry(
            0.3,
            0.45,
            2.2,
            8
        );

    const trunkMaterial =
        new THREE.MeshLambertMaterial({
            color: 0x7b451f
        });

    const trunk =
        new THREE.Mesh(
            trunkGeometry,
            trunkMaterial
        );

    trunk.position.y =
        1.1;

    tree.add(
        trunk
    );

    const leavesGeometry =
        new THREE.SphereGeometry(
            1.5,
            10,
            10
        );

    const leavesMaterial =
        new THREE.MeshLambertMaterial({
            color: 0x218c3a
        });

    const leaves =
        new THREE.Mesh(
            leavesGeometry,
            leavesMaterial
        );

    leaves.position.y =
        2.6;

    tree.add(
        leaves
    );

    const topGeometry =
        new THREE.SphereGeometry(
            1.05,
            10,
            10
        );

    const topMaterial =
        new THREE.MeshLambertMaterial({
            color: 0x2eaa4f
        });

    const top =
        new THREE.Mesh(
            topGeometry,
            topMaterial
        );

    top.position.y =
        3.6;

    tree.add(
        top
    );

    return tree;
}

// ==========================================
// SEMAK
// ==========================================

function createBush() {

    const bush =
        new THREE.Group();

    const geometry =
        new THREE.SphereGeometry(
            0.7,
            8,
            8
        );

    const material =
        new THREE.MeshLambertMaterial({
            color: 0x176b2c
        });

    const ball1 =
        new THREE.Mesh(
            geometry,
            material
        );

    ball1.position.set(
        0,
        0.55,
        0
    );

    bush.add(
        ball1
    );

    const ball2 =
        new THREE.Mesh(
            geometry,
            material
        );

    ball2.scale.set(
        0.8,
        0.8,
        0.8
    );

    ball2.position.set(
        0.55,
        0.4,
        0
    );

    bush.add(
        ball2
    );

    const ball3 =
        new THREE.Mesh(
            geometry,
            material
        );

    ball3.scale.set(
        0.75,
        0.75,
        0.75
    );

    ball3.position.set(
        -0.5,
        0.4,
        0
    );

    bush.add(
        ball3
    );

    return bush;
}

// ==========================================
// LAMPU JALAN
// ==========================================

function createStreetLight() {

    const lamp =
        new THREE.Group();

    const poleGeometry =
        new THREE.CylinderGeometry(
            0.12,
            0.16,
            4.5,
            8
        );

    const poleMaterial =
        new THREE.MeshLambertMaterial({
            color: 0x333333
        });

    const pole =
        new THREE.Mesh(
            poleGeometry,
            poleMaterial
        );

    pole.position.y =
        2.25;

    lamp.add(
        pole
    );

    const armGeometry =
        new THREE.BoxGeometry(
            1.4,
            0.12,
            0.12
        );

    const arm =
        new THREE.Mesh(
            armGeometry,
            poleMaterial
        );

    arm.position.set(
        0.6,
        4.35,
        0
    );

    lamp.add(
        arm
    );

    const bulbGeometry =
        new THREE.SphereGeometry(
            0.22,
            10,
            10
        );

    const bulbMaterial =
        new THREE.MeshBasicMaterial({
            color: 0xffff99
        });

    const bulb =
        new THREE.Mesh(
            bulbGeometry,
            bulbMaterial
        );

    bulb.position.set(
        1.25,
        4.25,
        0
    );

    lamp.add(
        bulb
    );

    return lamp;
}

// ==========================================
// KONTROL
// ==========================================

function setupControls() {

    const left =
        document.getElementById(
            "left"
        );

    const right =
        document.getElementById(
            "right"
        );

    const gas =
        document.getElementById(
            "gas"
        );

    const brake =
        document.getElementById(
            "brake"
        );

    // KIRI

    left.addEventListener(
        "pointerdown",
        function () {
            steerLeft = true;
        }
    );

    left.addEventListener(
        "pointerup",
        function () {
            steerLeft = false;
        }
    );

    left.addEventListener(
        "pointerleave",
        function () {
            steerLeft = false;
        }
    );

    // KANAN

    right.addEventListener(
        "pointerdown",
        function () {
            steerRight = true;
        }
    );

    right.addEventListener(
        "pointerup",
        function () {
            steerRight = false;
        }
    );

    right.addEventListener(
        "pointerleave",
        function () {
            steerRight = false;
        }
    );

    // GAS

    gas.addEventListener(
        "pointerdown",
        function () {
            gasPressed = true;
        }
    );

    gas.addEventListener(
        "pointerup",
        function () {
            gasPressed = false;
        }
    );

    gas.addEventListener(
        "pointerleave",
        function () {
            gasPressed = false;
        }
    );

    // REM

    brake.addEventListener(
        "pointerdown",
        function () {
            brakePressed = true;
        }
    );

    brake.addEventListener(
        "pointerup",
        function () {
            brakePressed = false;
        }
    );

    brake.addEventListener(
        "pointerleave",
        function () {
            brakePressed = false;
        }
    );

    // KEYBOARD

    window.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key ===
                "ArrowLeft"
            ) {
                steerLeft = true;
            }

            if (
                event.key ===
                "ArrowRight"
            ) {
                steerRight = true;
            }

            if (
                event.key === "ArrowUp" ||
                event.key === " "
            ) {
                gasPressed = true;
            }

            if (
                event.key === "ArrowDown" ||
                event.key.toLowerCase() === "s"
            ) {
                brakePressed = true;
            }
        }
    );

    window.addEventListener(
        "keyup",
        function (event) {

            if (
                event.key ===
                "ArrowLeft"
            ) {
                steerLeft = false;
            }

            if (
                event.key ===
                "ArrowRight"
            ) {
                steerRight = false;
            }

            if (
                event.key === "ArrowUp" ||
                event.key === " "
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
}

// ==========================================
// EFEK TABRAKAN
// ==========================================

function createCollisionEffect() {

    // HAPUS PARTIKEL LAMA

    collisionParticles.forEach(
        function (particle) {

            scene.remove(
                particle.mesh
            );
        }
    );

    collisionParticles = [];

    // BUAT 25 PARTIKEL

    for (
        let i = 0;
        i < 25;
        i++
    ) {

        const size =
            0.08 +
            Math.random() * 0.16;

        const geometry =
            new THREE.BoxGeometry(
                size,
                size,
                size
            );

        const colors = [
            0xff0000,
            0xff9800,
            0xffff00,
            0xffffff
        ];

        const material =
            new THREE.MeshBasicMaterial({
                color:
                    colors[
                        Math.floor(
                            Math.random() *
                            colors.length
                        )
                    ]
            });

        const particle =
            new THREE.Mesh(
                geometry,
                material
            );

        particle.position.set(
            car.position.x +
                (Math.random() - 0.5) * 1.5,

            car.position.y +
                0.7 +
                Math.random() * 0.8,

            car.position.z +
                (Math.random() - 0.5) * 2
        );

        scene.add(
            particle
        );

        collisionParticles.push({
            mesh: particle,

            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.35,
                0.15 +
                    Math.random() * 0.3,
                (Math.random() - 0.5) * 0.35
            ),

            life:
                0.7 +
                Math.random() * 0.5
        });
    }

    // SIMPAN POSISI KAMERA

    cameraBasePosition.x =
        camera.position.x;

    cameraBasePosition.y =
        camera.position.y;

    cameraBasePosition.z =
        camera.position.z;

    cameraShakeTime =
        cameraShakeDuration;
}

// ==========================================
// UPDATE EFEK TABRAKAN
// ==========================================

function updateCollisionEffect() {

    // GERAKKAN PARTIKEL

    for (
        let i =
            collisionParticles.length - 1;
        i >= 0;
        i--
    ) {

        const particle =
            collisionParticles[i];

        particle.velocity.y -=
            0.018;

        particle.mesh.position.x +=
            particle.velocity.x;

        particle.mesh.position.y +=
            particle.velocity.y;

        particle.mesh.position.z +=
            particle.velocity.z;

        particle.mesh.rotation.x +=
            0.15;

        particle.mesh.rotation.y +=
            0.15;

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

    // ======================================
    // GETARAN KAMERA
    // ======================================

    if (
        cameraShakeTime > 0
    ) {

        cameraShakeTime -=
            0.016;

        const kekuatan =
            cameraShakeTime /
            cameraShakeDuration *
            0.35;

        camera.position.x =
            cameraBasePosition.x +
            (
                Math.random() -
                0.5
            ) *
            kekuatan;

        camera.position.y =
            cameraBasePosition.y +
            (
                Math.random() -
                0.5
            ) *
            kekuatan;

        camera.position.z =
            cameraBasePosition.z +
            (
                Math.random() -
                0.5
            ) *
            kekuatan;

    } else {

        camera.position.x =
            cameraBasePosition.x;

        camera.position.y =
            cameraBasePosition.y;

        camera.position.z =
            cameraBasePosition.z;
    }
}

// ==========================================
// LEVEL SYSTEM
// ==========================================

function updateLevelSystem() {

    // Jarak yang dibutuhkan untuk naik level
    const LEVEL_DISTANCE = 500;

    // Hitung level berdasarkan jarak
    const newLevel =
        Math.min(
            5,
            Math.floor(distance / LEVEL_DISTANCE) + 1
        );

    // Jika level berubah
    if (newLevel !== level) {

        level = newLevel;

        console.log(
            "LEVEL SEKARANG:",
            level
        );

        // Ganti lingkungan sesuai level
        changeEnvironmentByLevel(level);

        // Update tulisan level jika tersedia
        const levelElement =
            document.getElementById("level");

        if (levelElement) {

            levelElement.textContent =
                "LEVEL " + level;
        }
    }
}


// ==========================================
// CHANGE ENVIRONMENT BY LEVEL
// ==========================================

function changeEnvironmentByLevel(currentLevel) {

    console.log(
        "Mengubah lingkungan ke level:",
        currentLevel
    );

    // ======================================
    // LEVEL 1 - HUTAN
    // ======================================

    if (currentLevel === 1) {

        scene.background =
            new THREE.Color(
                0x87ceeb
            );

        console.log(
            "Lingkungan: HUTAN"
        );
    }


    // ======================================
    // LEVEL 2 - PERUMAHAN
    // ======================================

    else if (currentLevel === 2) {

        scene.background =
            new THREE.Color(
                0x9bd7ff
            );

        console.log(
            "Lingkungan: PERUMAHAN"
        );
    }


    // ======================================
    // LEVEL 3 - HUTAN
    // ======================================

    else if (currentLevel === 3) {

        scene.background =
            new THREE.Color(
                0x78c850
            );

        console.log(
            "Lingkungan: HUTAN LEVEL 3"
        );
    }


    // ======================================
    // LEVEL 4 - GUNUNG
    // ======================================

    else if (currentLevel === 4) {

        scene.background =
            new THREE.Color(
                0x9ec5e8
            );

        console.log(
            "Lingkungan: PEGUNUNGAN"
        );
    }


    // ======================================
    // LEVEL 5 - LAUT
    // ======================================

    else if (currentLevel === 5) {

        scene.background =
            new THREE.Color(
                0x4fc3f7
            );

        console.log(
            "Lingkungan: LAUT"
        );
    }
}



// ==========================================
// CHANGE TO LEVEL 2
// ==========================================


// ==========================================
// LEVEL MESSAGE
// ==========================================

function showLevelMessage(
    title,
    subtitle
) {

    let message =
        document.getElementById(
            "levelMessage"
        );


    // Jika belum ada, buat otomatis
    if (!message) {

        message =
            document.createElement(
                "div"
            );

        message.id =
            "levelMessage";

        message.style.position =
            "fixed";

        message.style.left =
            "50%";

        message.style.top =
            "35%";

        message.style.transform =
            "translate(-50%, -50%)";

        message.style.textAlign =
            "center";

        message.style.color =
            "#ffffff";

        message.style.fontFamily =
            "Arial, sans-serif";

        message.style.fontWeight =
            "bold";

        message.style.textShadow =
            "0 3px 8px rgba(0,0,0,0.8)";

        message.style.zIndex =
            "9999";

        message.style.pointerEvents =
            "none";

        document.body.appendChild(
            message
        );
    }


    message.innerHTML =

        `<div style="
            font-size:42px;
            color:#ffd600;
        ">
            ${title}
        </div>

        <div style="
            font-size:24px;
            margin-top:8px;
        ">
            ${subtitle}
        </div>`;


    message.style.opacity =
        "1";


    message.style.transition =
        "opacity 1s";


    clearTimeout(
        levelTransitionTimer
    );


    levelTransitionTimer =
        setTimeout(function() {

            message.style.opacity =
                "0";

        }, 2500);
}

// ==========================================
// LEVEL 2 - RESIDENTIAL ENVIRONMENT
// ==========================================

function createResidentialEnvironment() {

    // Jangan membuat ulang rumah
    // jika sudah pernah dibuat
    if (
        scene.getObjectByName(
            "ResidentialEnvironment"
        )
    ) {

        return;
    }


    const residentialGroup =
        new THREE.Group();


    residentialGroup.name =
        "ResidentialEnvironment";


    // ======================================
    // RUMAH KIRI
    // ======================================

    for (
        let z = -30;
        z > -500;
        z -= 45
    ) {

        createHouse(
            -13,
            z,
            residentialGroup
        );
    }


    // ======================================
    // RUMAH KANAN
    // ======================================

    for (
        let z = -52;
        z > -500;
        z -= 45
    ) {

        createHouse(
            13,
            z,
            residentialGroup
        );
    }


    scene.add(
        residentialGroup
    );
}

// ==========================================
// CREATE HOUSE
// ==========================================

function createHouse(
    x,
    z,
    parent
) {

    const house =
        new THREE.Group();


    // ======================================
    // BADAN RUMAH
    // ======================================

    const bodyGeometry =
        new THREE.BoxGeometry(
            5,
            3,
            5
        );


    const bodyMaterial =
        new THREE.MeshLambertMaterial({
            color:
                Math.random() > 0.5
                    ? 0xf4e1c1
                    : 0xe8d5b5
        });


    const body =
        new THREE.Mesh(
            bodyGeometry,
            bodyMaterial
        );


    body.position.y =
        1.5;


    house.add(
        body
    );


    // ======================================
    // ATAP
    // ======================================

    const roofGeometry =
        new THREE.ConeGeometry(
            3.8,
            2,
            4
        );


    const roofMaterial =
        new THREE.MeshLambertMaterial({
            color: 0xb23a32
        });


    const roof =
        new THREE.Mesh(
            roofGeometry,
            roofMaterial
        );


    roof.position.y =
        4;


    roof.rotation.y =
        Math.PI / 4;


    house.add(
        roof
    );


    // ======================================
    // PINTU
    // ======================================

    const doorGeometry =
        new THREE.BoxGeometry(
            0.9,
            1.6,
            0.12
        );


    const doorMaterial =
        new THREE.MeshLambertMaterial({
            color: 0x5d4037
        });


    const door =
        new THREE.Mesh(
            doorGeometry,
            doorMaterial
        );


    door.position.set(
        0,
        0.8,
        -2.56
    );


    house.add(
        door
    );


    // ======================================
    // JENDELA KIRI
    // ======================================

    createWindow(
        -1.5,
        1.7,
        -2.58,
        house
    );


    // ======================================
    // JENDELA KANAN
    // ======================================

    createWindow(
        1.5,
        1.7,
        -2.58,
        house
    );


    house.position.set(
        x,
        0,
        z
    );


    parent.add(
        house
    );
}

// ==========================================
// HOUSE WINDOW
// ==========================================

function createWindow(
    x,
    y,
    z,
    parent
) {

    const geometry =
        new THREE.BoxGeometry(
            0.9,
            0.9,
            0.1
        );


    const material =
        new THREE.MeshLambertMaterial({
            color: 0x81d4fa
        });


    const windowMesh =
        new THREE.Mesh(
            geometry,
            material
        );


    windowMesh.position.set(
        x,
        y,
        z
    );


    parent.add(
        windowMesh
    );
}

// ==========================================
// UPDATE GAME
// ==========================================

function updateGame() {

    if (gameOverState) {
        return;
    }

    // GAS

    if (gasPressed) {

        speed += 0.15;

        if (speed > 12) {
            speed = 12;
        }

    } else {

        speed -= 0.08;

        if (speed < 0) {
            speed = 0;
        }
    }

    // REM

    if (brakePressed) {

        speed -= 0.35;

        if (speed < 0) {
            speed = 0;
        }
    }

    // BELOK KIRI

    if (steerLeft) {

        car.position.x -=
            0.12 +
            speed * 0.015;
    }

    // BELOK KANAN

    if (steerRight) {

        car.position.x +=
            0.12 +
            speed * 0.015;
    }

    // BATAS JALAN

    if (
        car.position.x < -4.5
    ) {
        car.position.x = -4.5;
    }

    if (
        car.position.x > 4.5
    ) {
        car.position.x = 4.5;
    }

    // ======================================
    // GERAK JALAN
    // ======================================

    const movement =
        speed * 0.45;

    distance +=
        movement;

        updateLevelSystem();

    // SCORE

    score =
        Math.floor(
            distance
        );

    // BEST SCORE

    if (
        score > bestScore
    ) {

        bestScore =
            score;

        localStorage.setItem(
            "lexaBestScore",
            bestScore
        );
    }

    // LEVEL

    level =
        Math.floor(
            distance / 100
        ) + 1;

    if (level > 10) {
        level = 10;
    }

    // ======================================
    // SEMUA MOBIL LAWAN
    // ======================================

    enemyCars.forEach(
        function (
            enemy,
            index
        ) {

            const enemyMovement =
                0.18 +
                speed * 0.35 +
                level * 0.025;

            enemy.position.z +=
                enemyMovement;

            // MOBIL SUDAH LEWAT

            if (
                enemy.position.z > 15
            ) {

                resetEnemy(
                    enemy,
                    index
                );
            }

            // ==================================
            // CEK TABRAKAN
            // ==================================

            const jarakZ =
                Math.abs(
                    enemy.position.z -
                    car.position.z
                );

            const jarakX =
                Math.abs(
                    enemy.position.x -
                    car.position.x
                );

            if (
                jarakZ < 3.5 &&
                jarakX < 2.0
            ) {

                gameOver();
            }
        }
    );

    // ======================================
    // GERAK LINGKUNGAN
    // ======================================

    roadObjects.forEach(
        function (object) {

            object.position.z +=
                movement;

            if (
                object.position.z > 20
            ) {

                object.position.z -=
                    500;
            }
        }
    );

    // ======================================
    // KAMERA
    // ======================================

    camera.position.x +=
        (
            car.position.x -
            camera.position.x
        ) * 0.08;

    camera.lookAt(
        car.position.x,
        0.5,
        -15
    );

    // SIMPAN POSISI DASAR KAMERA

    cameraBasePosition.x =
        camera.position.x;

    cameraBasePosition.y =
        camera.position.y;

    cameraBasePosition.z =
        camera.position.z;

    // ======================================
    // HUD
    // ======================================

    document.getElementById(
        "speed"
    ).textContent =
        Math.floor(
            speed * 10
        );

    document.getElementById(
        "distance"
    ).textContent =
        Math.floor(
            distance
        );

    document.getElementById(
        "score"
    ).textContent =
        score;

    document.getElementById(
        "level"
    ).textContent =
        level;

    document.getElementById(
        "bestScore"
    ).textContent =
        bestScore;
}

// ==========================================
// GAME OVER
// ==========================================

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

    // ======================================
    // EFEK TABRAKAN
    // ======================================

    createCollisionEffect();

    // MOBIL TERLIHAT TERHENTAK

    car.rotation.z =
        (
            Math.random() - 0.5
        ) * 0.25;

    car.rotation.x =
        -0.08;

    // ======================================
    // GAME OVER SCREEN
    // ======================================

    const overlay =
        document.createElement(
            "div"
        );

    overlay.id =
        "gameOverScreen";

    overlay.innerHTML = `

        <div class="game-over-box">

            <div class="game-over-title">
                GAME OVER
            </div>

            <div class="game-over-text">
                Mobil kamu menabrak!
            </div>

            <div class="game-over-distance">
                📏 Jarak:
                ${Math.floor(distance)} M
            </div>

            <div class="game-over-score">
                ⭐ SCORE:
                ${score}
            </div>

            <div class="game-over-best">
                🥇 BEST SCORE:
                ${bestScore}
            </div>

            <div class="game-over-level">
                🏆 LEVEL:
                ${level}
            </div>

            <button id="restartButton">
                🔄 MAIN LAGI
            </button>

        </div>

    `;

    document
        .getElementById("game")
        .appendChild(
            overlay
        );

    document
        .getElementById(
            "restartButton"
        )
        .addEventListener(
            "click",
            restartGame
        );
}

// ==========================================
// MAIN LAGI
// ==========================================

function restartGame() {

    const overlay =
        document.getElementById(
            "gameOverScreen"
        );

    if (overlay) {
        overlay.remove();
    }

    // ======================================
    // HAPUS EFEK TABRAKAN
    // ======================================

    collisionParticles.forEach(
        function (particle) {

            scene.remove(
                particle.mesh
            );
        }
    );

    collisionParticles = [];

    cameraShakeTime = 0;

    // ======================================
    // RESET GAME
    // ======================================

    speed = 0;

    distance = 0;

    score = 0;


    level = 1;

currentLevel = 1;

    gameOverState = false;

    // RESET KONTROL

    steerLeft = false;

    steerRight = false;

    gasPressed = false;

    brakePressed = false;

    // RESET PEMAIN

    car.position.x =
        0;

    car.position.y =
        0;

    car.position.z =
        5;

    car.rotation.x =
        0;

    car.rotation.y =
        0;

    car.rotation.z =
        0;

    // RESET SEMUA LAWAN

    enemyCars.forEach(
        function (
            enemy,
            index
        ) {

            enemy.position.x =
                getEnemyLane();

            enemy.position.z =
                -80 -
                (
                    index * 65
                );
        }
    );

    // RESET KAMERA

    camera.position.x =
        0;

    camera.position.y =
        5;

    camera.position.z =
        9;

    cameraBasePosition.x =
        0;

    cameraBasePosition.y =
        5;

    cameraBasePosition.z =
        9;

    camera.lookAt(
        0,
        0.5,
        -15
    );

    // RESET HUD

    document.getElementById(
        "speed"
    ).textContent =
        "0";

    document.getElementById(
        "distance"
    ).textContent =
        "0";

    document.getElementById(
        "score"
    ).textContent =
        "0";

    document.getElementById(
        "level"
    ).textContent =
        "1";

    document.getElementById(
        "bestScore"
    ).textContent =
        bestScore;
}

// ==========================================
// GAME LOOP
// ==========================================

function animate() {

    requestAnimationFrame(
        animate
    );

    updateGame();

    // UPDATE EFEK TABRAKAN
    updateCollisionEffect();

    renderer.render(
        scene,
        camera
    );
}

// ==========================================
// RESIZE
// ==========================================

function resizeGame() {

    camera.aspect =
        window.innerWidth /
        window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );
}

// ==========================================
// START
// ==========================================

init();