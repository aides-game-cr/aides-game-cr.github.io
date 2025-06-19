import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer, clock;

const greenSceneGroup = new THREE.Group();
const redSceneGroup = new THREE.Group();

let shark, sharkMixer, hellscape;
let disintegrationParticles = [];

let currentSharkRadius;

function init() {
    scene = new THREE.Scene();
    clock = new THREE.Clock();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 20;
    
    const isMobile = window.innerWidth < 768;
    currentSharkRadius = isMobile ? 12 : 32; // Màn hình nhỏ thì bán kính nhỏ, lớn thì bán kính lớn

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    document.getElementById('three-container').appendChild(renderer.domElement);

    initGreenScene();
    initRedScene();

    scene.add(greenSceneGroup);
    scene.add(redSceneGroup);

    redSceneGroup.visible = false;

    animate();
    startGlitchTransition();

    window.addEventListener('resize', onWindowResize);
}

function initGreenScene() {
    greenSceneGroup.add(createParticleField(200, 0x00ff7f));
    createFloatingGeometry(8).forEach(cube => greenSceneGroup.add(cube));
    const { gear, glowMesh } = createGear();
    greenSceneGroup.add(gear, glowMesh);
}

function createParticleField(count, color) {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 60;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ size: 0.2, color: color, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending });
    return new THREE.Points(geometry, material);
}

function createFloatingGeometry(count) {
    const cubes = [];
    for (let i = 0; i < count; i++) {
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff7f, wireframe: true, transparent: true, opacity: 0.2 });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 30);
        cube.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.01, (Math.random() - 0.5) * 0.01, (Math.random() - 0.5) * 0.01);
        cubes.push(cube);
    }
    return cubes;
}

function createGear() {
    const gearShape = new THREE.Shape();
    const teeth = 14; const outerRadius = 2.5; const innerRadius = 1.8; const toothHeight = 0.6;
    for (let i = 0; i < teeth; i++) {
        let angle = (i / teeth) * Math.PI * 2;
        gearShape.moveTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
        gearShape.lineTo(Math.cos(angle) * (outerRadius), Math.sin(angle) * (outerRadius));
        angle += (1 / teeth) * Math.PI * 2 * 0.25;
        gearShape.lineTo(Math.cos(angle) * (outerRadius), Math.sin(angle) * (outerRadius));
        gearShape.lineTo(Math.cos(angle) * (outerRadius + toothHeight), Math.sin(angle) * (outerRadius + toothHeight));
        angle += (1 / teeth) * Math.PI * 2 * 0.25;
        gearShape.lineTo(Math.cos(angle) * (outerRadius + toothHeight), Math.sin(angle) * (outerRadius + toothHeight));
        gearShape.lineTo(Math.cos(angle) * (outerRadius), Math.sin(angle) * (outerRadius));
        angle += (1 / teeth) * Math.PI * 2 * 0.25;
        gearShape.lineTo(Math.cos(angle) * (outerRadius), Math.sin(angle) * (outerRadius));
        gearShape.lineTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
    }
    const extrudeSettings = { depth: 0.8, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 2 };
    const gearGeometry = new THREE.ExtrudeGeometry(gearShape, extrudeSettings);
    const gearMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff7f, wireframe: true, transparent: true, opacity: 0.6 });
    const gear = new THREE.Mesh(gearGeometry, gearMaterial);
    const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xadffd8, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending });
    const glowMesh = new THREE.Mesh(gearGeometry, glowMaterial);
    gear.position.set(0, 0, 0); gear.scale.set(3, 3, 3);
    glowMesh.position.copy(gear.position); glowMesh.scale.copy(gear.scale);
    return { gear, glowMesh };
}

function initRedScene() {
    loadSharkModel();
    createHellscape();
}

function loadSharkModel() {
    const loader = new GLTFLoader();
    loader.load('./shark.glb', (gltf) => {
        shark = gltf.scene;
        shark.traverse(child => {
            if (child.isMesh) {
                const targetOpacity = 0.95;
                child.material = new THREE.MeshStandardMaterial({
                    color: 0x006666, wireframe: true, transparent: true, opacity: 0,
                    emissive: 0xff1111, emissiveIntensity: 3.0, blending: THREE.AdditiveBlending
                });
                child.material.userData.targetOpacity = targetOpacity;
            }
        });
        if (gltf.animations && gltf.animations.length) {
            sharkMixer = new THREE.AnimationMixer(shark);
            sharkMixer.clipAction(gltf.animations[0]).play();
        }
        shark.scale.set(0, 0, 0); 
        redSceneGroup.add(shark);
    }, undefined, (error) => console.error('Lỗi tải model cá mập:', error));
}

function createHellscape() {
    const geometry = new THREE.PlaneGeometry(500, 500, 200, 200);
    const targetOpacity = 0.2;
    const material = new THREE.MeshBasicMaterial({
        color: 0xff3333, wireframe: true, transparent: true, opacity: 0
    });
    material.userData.targetOpacity = targetOpacity;
    material.onBeforeCompile = (shader) => {
        shader.uniforms.u_time = { value: 0 };
        shader.vertexShader = 'uniform float u_time;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `
            vec3 transformed = vec3(position);
            float wave1 = sin(u_time * 0.6 + transformed.x * 0.15) * 1.5;
            float wave2 = sin(u_time * 0.4 + transformed.y * 0.1) * 1.5;
            transformed.z += wave1 + wave2;
            `
        );
        material.userData.shader = shader;
    };
    hellscape = new THREE.Mesh(geometry, material);
    hellscape.rotation.x = -Math.PI / 2;
    hellscape.position.y = -16;
    redSceneGroup.add(hellscape);
}

function createDisintegrationEffect(object) {
    const geometry = object.geometry.clone();
    const material = new THREE.PointsMaterial({
        color: 0xff8566,
        size: 0.08,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(geometry, material);
    particles.position.copy(object.position);
    particles.rotation.copy(object.rotation);
    particles.scale.copy(object.scale);
    
    const velocities = [];
    for (let i = 0; i < geometry.attributes.position.count; i++) {
        velocities.push(
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5
        );
    }
    particles.userData.velocities = velocities;
    disintegrationParticles.push(particles);
    scene.add(particles);
}

function startGlitchTransition() {
    setTimeout(() => {
        document.body.classList.add('error-state');
        greenSceneGroup.children.forEach(child => {
            if (child.isMesh) createDisintegrationEffect(child);
        });
        greenSceneGroup.visible = false; 
        redSceneGroup.visible = true;
        redSceneGroup.userData.isTransitioning = true; 
        if (shark) {
            const targetScale = new THREE.Vector3(16, 16, 16);
            shark.userData.isAppearing = true;
            shark.userData.targetScale = targetScale;
        }
    }, 1500);
}

function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    if (greenSceneGroup.visible) {
        greenSceneGroup.children.forEach(child => {
            if (child.userData.velocity) { 
                child.position.add(child.userData.velocity);
                if (Math.abs(child.position.x) > 30) child.userData.velocity.x *= -1;
                if (Math.abs(child.position.y) > 30) child.userData.velocity.y *= -1;
            }
            if (child.isMesh && child.geometry.type === 'ExtrudeGeometry') {
                child.rotation.z += 0.003;
                child.rotation.x += 0.001;
            }
        });
    }

    disintegrationParticles.forEach((p, index) => {
        const positions = p.geometry.attributes.position.array;
        const velocities = p.userData.velocities;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += velocities[i] * deltaTime * 20;
            positions[i+1] += velocities[i+1] * deltaTime * 20;
            positions[i+2] += velocities[i+2] * deltaTime * 20;
        }
        p.geometry.attributes.position.needsUpdate = true;
        p.material.opacity -= deltaTime * 0.5;
        if (p.material.opacity <= 0) {
            scene.remove(p);
            disintegrationParticles.splice(index, 1);
        }
    });

    if (redSceneGroup.visible) {
        if (redSceneGroup.userData.isTransitioning) {
            let allFadedIn = true;
            if (hellscape) {
                const target = hellscape.material.userData.targetOpacity;
                hellscape.material.opacity = THREE.MathUtils.lerp(hellscape.material.opacity, target, deltaTime * 2.0);
                if (Math.abs(hellscape.material.opacity - target) > 0.01) allFadedIn = false;
            }
            if (shark) {
                shark.traverse(child => {
                    if (child.isMesh) {
                        const target = child.material.userData.targetOpacity;
                        child.material.opacity = THREE.MathUtils.lerp(child.material.opacity, target, deltaTime * 2.0);
                        if (Math.abs(child.material.opacity - target) > 0.01) allFadedIn = false;
                    }
                });
            }
            if (allFadedIn) redSceneGroup.userData.isTransitioning = false;
        }

        if (sharkMixer) sharkMixer.update(deltaTime);

        if (shark) {
            const isMobile = window.innerWidth < 768;
            const targetRadius = isMobile ? 15 : 32; // Đặt bán kính mục tiêu
            currentSharkRadius = THREE.MathUtils.lerp(currentSharkRadius, targetRadius, 0.02);

            // --- Di chuyển cá mập ---
            const speed = 0.18;
            shark.position.x = Math.sin(elapsedTime * speed) * currentSharkRadius;
            shark.position.z = Math.cos(elapsedTime * speed) * currentSharkRadius - 30;
            shark.position.y = Math.sin(elapsedTime * 0.35) * 4 + 2;
            const nextPoint = new THREE.Vector3(
                Math.sin((elapsedTime + 0.1) * speed) * currentSharkRadius,
                Math.sin((elapsedTime + 0.1) * 0.35) * 4 + 2,
                Math.cos((elapsedTime + 0.1) * speed) * currentSharkRadius - 30
            );
            shark.lookAt(nextPoint);
            
            if(shark.userData.isAppearing) {
                shark.scale.lerp(shark.userData.targetScale, 0.05);
                if(shark.scale.distanceTo(shark.userData.targetScale) < 0.1) {
                    shark.userData.isAppearing = false;
                }
            }

            const cameraTargetX = shark.position.x * 0.1; // Chỉ theo 10% di chuyển X của cá
            const cameraTargetY = shark.position.y * 0.1; // Chỉ theo 10% di chuyển Y của cá

            camera.position.x = THREE.MathUtils.lerp(camera.position.x, cameraTargetX, 0.02);
            camera.position.y = THREE.MathUtils.lerp(camera.position.y, cameraTargetY, 0.02);

            camera.lookAt(0, 0, 0);
        }
        
        if (hellscape && hellscape.material.userData.shader) {
            hellscape.material.userData.shader.uniforms.u_time.value = elapsedTime;
        }
    }

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- KHỞI CHẠY ---
init();