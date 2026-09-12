```javascript
import * as THREE from './three.module.js';

// ==========================================
// LEXA SPEED RACE 3D
// STEP 1 - IMPROVED CAR PHYSICS + MOBILE
// ==========================================

let scene;
let camera;
let renderer;

let car;

// ==========================================
// ENEMY CARS
// ==========================================

let enemyCars = [];

const jumlahEnemy = 4;

const enemyColors = [
    0x1565c0,
    0xff9800,
    0x7b1fa2,
    0x212121
];


// ==========================================
// GAME STATE
// ==========================================

let speed = 0;

let distance = 0;

let score = 0;

let level = 1;

let bestScore =
    Number(
        localStorage.getItem("lexaBestScore")
    ) || 0;


// ==========================================
// SPEED SETTINGS
// ==========================================

const MAX_SPEED = 12;

const ACCELERATION = 0.12;

const NATURAL_DECELERATION = 0.055;

const BRAKE_POWER = 0.28;


// ==========================================
// STEERING SETTINGS
// ==========================================

const STEER_ACCELERATION = 0.035;

const STEER_MAX_SPEED = 0.24;

const STEER_DECELERATION = 0.055;

let steeringVelocity = 0;


// ==========================================
// CONTROL STATE
// ==========================================

let steerLeft = false;

let steerRight = false;

let gasPressed = false;

let brakePressed = false;


// ==========================================
// WORLD OBJECTS
// ==========================================

let roadObjects = [];


// ==========================================
// GAME OVER
// ==========================================

let gameOverState = false;


// ==========================================
// COLLISION EFFECT
// ==========================================

let collisionParticles = [];

let cameraShakeTime = 0;

const cameraShakeDuration = 0.5;

let cameraBasePosition = {
    x: 0,
    y: 5,
    z: 9
};


// ==========================================
// START GAME
// ==========================================

function init() {

    console.log(
        "Lexa Speed Race 3D dimulai"
    );


    // ======================================
    // SCENE
    // ======================================

    scene =
        new THREE.Scene();


    scene.background =
        new THREE.Color(
            0x87ceeb
        );


    // ======================================
    // CAMERA
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
    // LIGHT
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
    // WORLD
    // ======================================

    createGround();

    createRoad();

    createPlayerCar();

    createEnemyCars();


// ==========================================
// LINGKUNGAN JALAN - VERSI LEBIH HIDUP
// ==========================================

function createEnvironment() {

    // ======================================
    // POHON
    // ======================================

    for (
        let i = 0;
        i < 70;
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
                Math.random() * 12
            );

        tree.position.z =
            -20 -
            Math.random() * 500;

        tree.position.y = 0;

        const scale =
            0.65 +
            Math.random() * 1.5;

        tree.scale.set(
            scale,
            scale,
            scale
        );

        // variasi rotasi
        tree.rotation.y =
            Math.random() *
            Math.PI * 2;

        scene.add(tree);

        roadObjects.push(tree);
    }


    // ======================================
    // SEMAK
    // ======================================

    for (
        let i = 0;
        i < 100;
        i++
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
                Math.random() * 12
            );

        bush.position.z =
            -20 -
            Math.random() * 500;

        const scale =
            0.35 +
            Math.random() * 0.9;

        bush.scale.set(
            scale,
            scale,
            scale
        );

        bush.rotation.y =
            Math.random() *
            Math.PI * 2;

        scene.add(bush);

        roadObjects.push(bush);
    }


    // ======================================
    // BATU
    // ======================================

    for (
        let i = 0;
        i < 45;
        i++
    ) {

        const rock =
            createRock();

        const side =
            Math.random() > 0.5
                ? 1
                : -1;

        rock.position.x =
            side *
            (
                7.5 +
                Math.random() * 8
            );

        rock.position.z =
            -20 -
            Math.random() * 500;

        rock.position.y =
            0.15;

        const scale =
            0.4 +
            Math.random() * 0.8;

        rock.scale.set(
            scale,
            scale,
            scale
        );

        scene.add(rock);

        roadObjects.push(rock);
    }


    // ======================================
    // RUMPUT
    // ======================================

    for (
        let i = 0;
        i < 120;
        i++
    ) {

        const grass =
            createGrass();

        const side =
            Math.random() > 0.5
                ? 1
                : -1;

        grass.position.x =
            side *
            (
                6.5 +
                Math.random() * 13
            );

        grass.position.z =
            -20 -
            Math.random() * 500;

        grass.position.y =
            0;

        const scale =
            0.5 +
            Math.random() * 0.8;

        grass.scale.set(
            scale,
            scale,
            scale
        );

        scene.add(grass);

        roadObjects.push(grass);
    }


    // ======================================
    // LAMPU JALAN
    // ======================================

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


    // ======================================
    // PAPAN PETUNJUK
    // ======================================

    for (
        let z = -100;
        z > -500;
        z -= 150
    ) {

        const sign =
            createRoadSign();

        const side =
            Math.random() > 0.5
                ? 1
                : -1;

        sign.position.set(
            side * 7.5,
            0,
            z
        );

        scene.add(sign);

        roadObjects.push(sign);
    }


    // ======================================
    // GUNUNG / BUKIT JAUH
    // ======================================

    createMountains();
}


// ==========================================
// BATU
// ==========================================

function createRock() {

    const rock =
        new THREE.Group();

    const geometry =
        new THREE.DodecahedronGeometry(
            0.45,
            0
        );

    const material =
        new THREE.MeshLambertMaterial({
            color: 0x777777
        });

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.scale.y =
        0.65;

    rock.add(mesh);

    return rock;
}


// ==========================================
// RUMPUT
// ==========================================

function createGrass() {

    const grass =
        new THREE.Group();

    const material =
        new THREE.MeshLambertMaterial({
            color: 0x2e7d32
        });

    for (
        let i = 0;
        i < 3;
        i++
    ) {

        const geometry =
            new THREE.BoxGeometry(
                0.06,
                0.5 +
                Math.random() * 0.35,
                0.06
            );

        const blade =
            new THREE.Mesh(
                geometry,
                material
            );

        blade.position.x =
            (Math.random() - 0.5) *
            0.5;

        blade.position.y =
            0.25;

        blade.rotation.z =
            (Math.random() - 0.5) *
            0.5;

        grass.add(blade);
    }

    return grass;
}


// ==========================================
// PAPAN PETUNJUK JALAN
// ==========================================

function createRoadSign() {

    const sign =
        new THREE.Group();


    // TIANG

    const poleGeometry =
        new THREE.CylinderGeometry(
            0.08,
            0.08,
            2.2,
            8
        );

    const poleMaterial =
        new THREE.MeshLambertMaterial({
            color: 0x555555
        });

    const pole =
        new THREE.Mesh(
            poleGeometry,
            poleMaterial
        );

    pole.position.y =
        1.1;

    sign.add(pole);


    // PAPAN

    const boardGeometry =
        new THREE.BoxGeometry(
            1.5,
            0.75,
            0.08
        );

    const boardMaterial =
        new THREE.MeshLambertMaterial({
            color: 0x1976d2
        });

    const board =
        new THREE.Mesh(
            boardGeometry,
            boardMaterial
        );

    board.position.y =
        2.0;

    sign.add(board);


    // GARIS PUTIH

    const stripeGeometry =
        new THREE.BoxGeometry(
            1.15,
            0.08,
            0.1
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
        2.0,
        -0.06
    );

    sign.add(stripe);


    return sign;
}


// ==========================================
// GUNUNG / BUKIT JAUH
// ==========================================

function createMountains() {

    for (
        let i = 0;
        i < 8;
        i++
    ) {

        const mountainGeometry =
            new THREE.ConeGeometry(
                12 +
                Math.random() * 8,
                18 +
                Math.random() * 12,
                6
            );

        const mountainMaterial =
            new THREE.MeshLambertMaterial({
                color:
                    0x5f8060
            });

        const mountain =
            new THREE.Mesh(
                mountainGeometry,
                mountainMaterial
            );

        mountain.position.x =
            -45 +
            i * 13;

        mountain.position.y =
            7;

        mountain.position.z =
            -180 -
            Math.random() * 100;

        mountain.scale.x =
            1.5;

        scene.add(
            mountain
        );

        roadObjects.push(
            mountain
        );
    }
}
```


    // ======================================
    // CONTROLS
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
    // HIDE LOADING
    // ======================================

    document.getElementById(
        "loading"
    ).style.display =
        "none";


    // ======================================
    // START
    // ======================================

    animate();



// ==========================================
// GROUND
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


    // ======================================
    // ROAD SHOULDER
    // ======================================

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
// ROAD
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


    // ======================================
    // CENTER LINES
    // ======================================

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


    // ======================================
    // LEFT EDGE
    // ======================================

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


    // ======================================
    // RIGHT EDGE
    // ======================================

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


    // ======================================
    // ROAD BARRIERS
    // ======================================

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
// ROAD BARRIER
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
// PLAYER CAR
// ==========================================

function createPlayerCar() {

    car =
        new THREE.Group();


    // ======================================
    // BODY
    // ======================================

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


    // ======================================
    // NOSE
    // ======================================

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


    // ======================================
    // CABIN
    // ======================================

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


    // ======================================
    // WINDSHIELD
    // ========
}
