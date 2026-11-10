import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// =========================
// 1. 基本設定
// =========================

const container = document.getElementById("canvas-container");

// =========================
// 画面全体に広がる魔法の光
// =========================
const flashStyle = document.createElement("style");

flashStyle.textContent = `
    #magic-flash {
        position: fixed;
        width: 200vmax;
        height: 200vmax;
        left: 50%;
        top: 50%;
        z-index: 9999;
        pointer-events: none;
        opacity: 0;
        border-radius: 50%;
        transform: translate(-50%, -50%) scale(0.05);

        background: radial-gradient(
        circle,
        rgba(255, 255, 255, 1) 0%,
        rgba(255, 255, 255, 1) 30%,
        rgba(255, 255, 255, 0.98) 50%,
        rgba(255, 255, 255, 0.8) 65%,
        rgba(255, 255, 255, 0.3) 80%,
        rgba(255, 255, 255, 0) 100%
        );
    }

    #magic-flash.active {
        animation: magic-flash-expand 3.5s linear forwards;
    }

    @keyframes magic-flash-expand {
        0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.05);
        }

        25% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.2);
        }

        65% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.2);
        }

        100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.2);
        }
    }
}
`;

document.head.appendChild(flashStyle);

const magicFlash = document.createElement("div");
magicFlash.id = "magic-flash";
document.body.appendChild(magicFlash);

// 光を画面全体に広げる
function playMagicFlash() {
    magicFlash.classList.remove("active");

    // アニメーションを最初から再生する
    void magicFlash.offsetWidth;

    magicFlash.classList.add("active");
}

// シーン
const scene = new THREE.Scene();
scene.background = null;

// カメラ
const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

camera.position.set(0, 15, 25);

// レンダラー


const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
});

renderer.setClearColor(0x000000, 0);
renderer.setClearAlpha(0);

renderer.setSize(window.innerWidth, window.innerHeight);

renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 1.5)
);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

container.appendChild(renderer.domElement);

// =========================
// 環境反射の設定
// =========================

const pmremGenerator = new THREE.PMREMGenerator(renderer);

const environment = new RoomEnvironment();

const envMap = pmremGenerator.fromScene(environment).texture;

// シーンに環境反射を設定
scene.environment = envMap;

// PMREMGeneratorを解放
pmremGenerator.dispose();


// =========================
// 2. ライトの設定
// =========================

// 環境光
const ambientLight = new THREE.AmbientLight(
    0xffffff,
    1.0
);

scene.add(ambientLight);

// 平行光源
const dirLight = new THREE.DirectionalLight(
    0xffffff,
    1.5
);

dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;

// 影の設定
dirLight.shadow.mapSize.set(2048, 2048);

dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 50;

const d = 15;

dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;

dirLight.shadow.bias = -0.0001;
dirLight.shadow.normalBias = 0.02;

scene.add(dirLight);


// =========================
// 3. カメラ操作の設定
// =========================

const controls = new OrbitControls(
    camera,
    renderer.domElement
);

controls.enableDamping = true;
controls.dampingFactor = 0.05;

// カメラが地面より下に潜らないようにする
controls.maxPolarAngle = Math.PI / 2 - 0.05;


// =========================
// 4. GLBモデルの読み込み
// =========================

const dracoLoader = new DRACOLoader();

dracoLoader.setDecoderPath(
    "https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/"
);

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

const loadingEl = document.getElementById("loading");
const loadingProgressEl = document.getElementById("loading-progress");

// ゲージを更新する関数
function updateLoadingProgress(percent) {
    loadingProgressEl.style.width = `${percent}%`;
}

// ファイル名
const chestUrl = "./box.glb";
const modelUrl = "./last_compressed.glb";

// アニメーション用の変数
let treasure = null;
let treasureMixer = null;
let treasureAction = null;

let mainModel = null;
let mainModelSize = null;

let chestLoaded = false;
let modelLoaded = false;
let animationStarted = false;
let finished = false;
// =========================
// 宝箱の光の演出
// =========================

// "burst" = 光がブワッと広がる
// "sparkles" = キラキラした粒子
// "both" = 両方
const magicMode = "sparkles";

// 光の演出用
let magicGroup = null;
let magicGlow = null;
let magicLight = null;
let magicParticles = [];
let magicElapsed = 0;
let magicStarted = false;

// 光の演出を作る
function createMagicEffect() {
    magicGroup = new THREE.Group();

    // 宝箱の中から光る球体
    const glowGeometry = new THREE.SphereGeometry(0.5, 32, 24);

    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffdf78,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
    });

    magicGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    magicGlow.scale.set(1.2, 1.2, 1.2);
    magicGlow.position.set(0, 0.5, 0);

    magicGroup.add(magicGlow);

    // 宝箱の中を照らす光
    magicLight = new THREE.PointLight(
        0xffd76a,
        0,
        12
    );

    magicLight.position.set(0, 1.5, 0);

    magicGroup.add(magicLight);

    // キラキラした粒子
    const particleMaterial = new THREE.MeshBasicMaterial({
        color: 0xffe8a3,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending
    });

    const particleGeometry = new THREE.SphereGeometry(
        0.045,
        8,
        6
    );

    for (let i = 0; i < 24; i++) {
        const particle = new THREE.Mesh(
            particleGeometry,
            particleMaterial.clone()
        );

        particle.position.set(
            (Math.random() - 0.5) * 1.5,
            0.5 + Math.random() * 1.5,
            (Math.random() - 0.5) * 1.5
        );

        particle.userData.startY = particle.position.y;
        particle.userData.speed = 0.4 + Math.random() * 0.8;
        particle.userData.phase = Math.random() * Math.PI * 2;

        magicGroup.add(particle);
        magicParticles.push(particle);
    }

    // 最初は光を表示しない
    magicGlow.visible = true;

    scene.add(magicGroup);
}

// 光の演出を開始
function startMagicEffect() {
    if (!magicGroup) return;

    magicStarted = true;
    magicElapsed = 0;

    playMagicFlash();

    // 円形の光は表示しない
    if (magicGlow) {
        magicGlow.visible = false;
    }

    // 宝箱の中から黄色い光を広げる
    if (magicLight) {
        magicLight.visible = true;
        magicLight.color.set(0xffd76a);
        magicLight.intensity = 8;
        magicLight.distance = 8;
        magicLight.decay = 2;
    }

    // キラキラした粒を表示
    magicParticles.forEach((particle) => {
        particle.visible = true;
        particle.material.opacity = 1;
    });

    console.log("宝箱の光の演出を開始しました");
}

// 光のアニメーションを更新
function updateMagicEffect(delta) {
    if (!magicStarted || !magicGroup) return;

    magicElapsed += delta;

    // 1秒かけて演出を消す
    const duration = 1;
    const progress = Math.min(magicElapsed / duration, 1);
    const fade = 1 - progress;

    // 円形の光は使わず、光源だけを徐々に弱める
    if (magicGlow) {
        magicGlow.visible = false;
    }

    if (magicLight) {
        magicLight.intensity = 8 * fade;
    }

    // 粒子がふわふわ上に舞い上がる
    magicParticles.forEach((particle) => {
        particle.position.y += particle.userData.speed * delta;

        particle.position.x +=
            Math.sin(magicElapsed * 2 + particle.userData.phase)
            * delta * 0.2;

        particle.position.z +=
            Math.cos(magicElapsed * 1.5 + particle.userData.phase)
            * delta * 0.15;

        particle.material.opacity = fade;

        // 上まで行った粒子は下に戻す
        if (particle.position.y > 3) {
            particle.position.y = particle.userData.startY;
            particle.position.x = (Math.random() - 0.5) * 1.5;
            particle.position.z = (Math.random() - 0.5) * 1.5;
        }
    });

    // 演出が終わったら光源を消す
    if (progress >= 1) {
        magicLight.visible = false;
        magicParticles.forEach((particle) => {
            particle.visible = false;
        });
        magicStarted = false;
    }
}
// カメラの初期位置を保存
const initialCameraPosition = camera.position.clone();

// 宝箱の表示位置を調整する関数
function prepareModel(model) {
    const box = new THREE.Box3().setFromObject(model);

    const center = box.getCenter(new THREE.Vector3());

    // モデルを中央に配置し、地面をY=0に合わせる
    model.position.x -= center.x;
    model.position.y -= box.min.y;
    model.position.z -= center.z;

    // メッシュの影を設定
    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            if (child.material) {
                child.material.depthWrite = true;
            }

            if (
                child.name.includes("Circle") ||
                child.name.includes("BézierCurve")
            ) {
                child.receiveShadow = false;
            }
        }
    });

    return box.getSize(new THREE.Vector3());
}

// カメラをモデルに合わせる関数
function fitCamera(size) {
    const maxDim = Math.max(size.x, size.y, size.z);

    const distance =
        (maxDim / (2 * Math.tan(
            THREE.MathUtils.degToRad(camera.fov / 2)
        ))) * 1.5;

    camera.position.set(
        0,
        size.y * 0.7 + distance * 0.1,
        distance
    );

    controls.target.set(0, size.y / 2, 0);
    controls.update();
}

// 宝箱のアニメーションが終わったら、メインモデルを表示
function showMainModel() {
    if (finished || !mainModel) return;

    finished = true;

    // 光が画面いっぱいに広がるまで待つ
    const waitTime = magicStarted ? 800 : 0;

    setTimeout(() => {

        // 宝箱を削除
        if (treasure) {
            scene.remove(treasure);
        }

        // 光の粒をすべて消す
        magicParticles.forEach((particle) => {
            particle.visible = false;
            particle.material.opacity = 0;
        });

        // 光源も消す
        if (magicLight) {
            magicLight.visible = false;
            magicLight.intensity = 0;
        }

        // ミニチュアハウスを表示
        scene.add(mainModel);

        // カメラを初期位置に戻す
        camera.position.copy(initialCameraPosition);

        controls.target.set(
            0,
            mainModelSize.y / 2,
            0
        );

        controls.update();

        // Loadingの文字を削除
        loadingEl.remove();

        // 光のアニメーションが終わってから演出を片付ける
        setTimeout(() => {
            if (magicGroup) {
                scene.remove(magicGroup);

                magicGroup.traverse((child) => {
                    if (child.isMesh) {
                        child.geometry.dispose();

                        if (Array.isArray(child.material)) {
                            child.material.forEach((material) => {
                                material.dispose();
                            });
                        } else {
                            child.material.dispose();
                        }
                    }
                });

                magicGroup = null;
                magicParticles = [];
            }
        }, 500);

    }, waitTime);
}
// 両方のモデルが読み込まれたらアニメーション開始
function startTreasureAnimation() {
    if (!chestLoaded || !modelLoaded || animationStarted) {
        return;
    }

    animationStarted = true;

    // フタが開き始めたらLoadingを消す
    loadingEl.classList.add("hidden");

    // アニメーションがない場合はそのまま切り替える
    if (!treasureAction) {
        showMainModel();
        return;
    }

    // 蓋を1回だけ開く
    treasureAction.reset();
    treasureAction.setLoop(THREE.LoopOnce, 1);
    treasureAction.clampWhenFinished = true;
    treasureAction.play();

    // フタが少し開いてから光を出す
    console.log("光のタイマーを設定します");

    setTimeout(() => {
        console.log("450ミリ秒経過しました");
        startMagicEffect();
    }, 450);
}

// -------------------------
// 宝箱の読み込み
// -------------------------

loader.load(
    chestUrl,
    (gltf) => {
        treasure = gltf.scene;

        // 宝箱の光沢を調整
        treasure.traverse((child) => {
            if (child.isMesh) {

                const materials = Array.isArray(child.material)
                    ? child.material
                    : [child.material];

                materials.forEach((material) => {
                    if (material.isMeshStandardMaterial) {
                        material.envMapIntensity = 0.3;
                    }
                });
            }
        });

        // 宝箱を小さくする
        treasure.scale.setScalar(2);

        // 位置を中央に調整
        prepareModel(treasure);

        scene.add(treasure);

        // カメラを宝箱に合わせる
        // カメラを宝箱に合わせて調整
        const chestBox = new THREE.Box3().setFromObject(treasure);
        const chestSize = chestBox.getSize(new THREE.Vector3());

        // 宝箱の中に光の演出を準備
        createMagicEffect();

        // 宝箱の中心付近に光を配置
        magicGroup.position.set(0, chestSize.y * 0.4, 0);

        // 光を少し大きくする
        magicGroup.scale.setScalar(1.5);

        // 斜め上から宝箱を見下ろす
        camera.position.set(4, 8, 10);

        // 宝箱の中心を見る
        controls.target.set(0, chestSize.y / 2, 0);

        camera.lookAt(controls.target);
        controls.update();

        // アニメーションを準備
        treasureMixer = new THREE.AnimationMixer(treasure);

        if (gltf.animations.length > 0) {
            treasureAction = treasureMixer.clipAction(
                gltf.animations[0]
            );

            treasureAction.setLoop(THREE.LoopOnce, 1);
            treasureAction.clampWhenFinished = true;

            // 最初は閉じた状態で待機
            treasureAction.play();
            treasureAction.paused = true;
        }

        // アニメーション終了を検知
        treasureMixer.addEventListener("finished", () => {
            showMainModel();
        });

        chestLoaded = true;
    },

    undefined,

    (error) => {
        console.error("宝箱の読み込みに失敗しました:", error);

        loadingEl.innerText =
            "宝箱を読み込めませんでした。";

        loadingEl.style.color = "#ff6b6b";
    }
);

// -------------------------
// ミニチュアハウスの読み込み
// -------------------------

loader.load(
    modelUrl,

    (gltf) => {
        mainModel = gltf.scene;

        // モデルを中央に配置
        mainModelSize = prepareModel(mainModel);

        // まだシーンには追加しない
        // 宝箱のアニメーション終了後に表示する

        modelLoaded = true;
        updateLoadingProgress(100);

        startTreasureAnimation();
    },

    (xhr) => {
        if (xhr.total > 0) {
            const percent = Math.round(
                (xhr.loaded / xhr.total) * 100
            );

            updateLoadingProgress(percent);
        }
    },

    (error) => {
        console.error(
            "モデルの読み込みに失敗しました:",
            error
        );

        loadingEl.innerText =
            "モデルの読み込みエラーが発生しました。";

        loadingEl.style.color = "#ff6b6b";
    }
);

// =========================
// 5. 画面サイズの変更に対応
// =========================

window.addEventListener("resize", onWindowResize);

function onWindowResize() {
    camera.aspect =
        window.innerWidth / window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );
}


// =========================
// 6. アニメーション
// =========================

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    // 宝箱のアニメーションを更新
    if (treasureMixer) {
        treasureMixer.update(delta);
    }

    // カメラ操作を更新
    controls.update();

    // 描画
    renderer.render(scene, camera);
}

// アニメーション開始
animate();