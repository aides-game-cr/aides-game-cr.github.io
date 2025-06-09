import * as THREE from 'three';
import { Pathfinder } from './pathfinding.js';

export class Game {
    constructor(container) {
        this.gameContainer = container;
        Object.assign(this, {
            scene: null, camera: null, renderer: null, clock: new THREE.Clock(), keys: {},
            score: 0, isGameOver: false, isGameActive: false, frameCount: 0,
            player: null, playerVelocity: new THREE.Vector3(), playerSpeed: 8,
            ground: null, groundSize: 50, obstacles: [], collectibles: [],
            monster: null, visionCone: null, monsterStateText: null, monsterTargetPosition: new THREE.Vector3(), monsterState: 'PATROLLING',
            monsterScanTimer: 0, detectionRange: 12, chaseSpeed: 10, patrolSpeed: 4,
            personalSpaceRadius: 3, hearingRange: 10, aggressionLevel: 0.2, playerLastKnownPosition: new THREE.Vector3(),
            investigationTarget: new THREE.Vector3(), timeSinceLostSight: 0, isIgnoringSounds: false,
            soundIgnoreTimer: 0, soundIgnoreDuration: 5.0, suspicionTimer: 0, suspicionThreshold: 0.5,
            scanSubState: 'IDLE', scanTargetQuaternion: new THREE.Quaternion(), scanPauseTimer: 0, scanLookPoints: [],
            pathfinder: null, monsterPath: [], currentPathIndex: 0, lastPathTargetPosition: new THREE.Vector3(),
            particles: [], pathLines: [], pathArrows: [], nextMoveArrow: null, pathVisualizationGroup: null,
            lastVisionCheck: 0, cachedVisionResult: false,
            joystickDirection: new THREE.Vector3(), trainingData: [],      // Mảng để lưu dữ liệu huấn luyện
            logInterval: 0.1,      // Ghi dữ liệu mỗi 100ms
            logTimer: 0,
        });

        this.animate = this.animate.bind(this);
        this.resetGame = this.resetGame.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
    }
    
    initGame() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);
        this.scene.fog = new THREE.Fog(0x1a1a1a, 50, 100);
        const aspect = this.gameContainer.clientWidth / this.gameContainer.clientHeight;
        const d = 10;
        this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
        this.camera.position.set(25, 25, 25);
        this.camera.lookAt(0, 0, 0);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.gameContainer.clientWidth, this.gameContainer.clientHeight);
        this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; this.renderer.setClearColor(0x000000, 0);
        this.gameContainer.appendChild(this.renderer.domElement);
        const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x444444, 0.8);
        this.scene.add(hemisphereLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(15, 25, 15); directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048; directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        this.createGround(); this.createPlayer(); this.createObstacles(25); this.createCollectibles(10);
        this.createMonster(); this.createPathVisualization();
        
        this.pathfinder = new Pathfinder(this.obstacles, this.groundSize, 1);
        
        this.setupEventListeners();
        this.animate(); // Chỉ bắt đầu vòng lặp render, game chưa hoạt động
    }

    animate() {
        requestAnimationFrame(this.animate);
        const deltaTime = Math.min(this.clock.getDelta(), 0.1);
        this.frameCount++;

        if (this.isGameActive && !this.isGameOver) {
            this.updatePlayerMovement(deltaTime);
            this.updateMonster(deltaTime);
            this.updateCollectibles(deltaTime);
            this.checkCollisions();
            this.score += deltaTime * 5;

            const scoreElement = document.getElementById('score');
            if (this.frameCount % 10 === 0 && scoreElement) {
                scoreElement.textContent = `Score: ${Math.floor(this.score)}`;
            }
            this.logTimer += deltaTime;
            if (this.logTimer >= this.logInterval) {
                this.logTrainingData();
                this.logTimer = 0; // Reset timer
            }
        }
        
        this.updateParticles(deltaTime);
        this.updateCamera();
        this.updatePathVisualization(deltaTime);

        if (this.frameCount % 30 === 0) {
            this.updateDebugConsole();
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        window.addEventListener('resize', this.onWindowResize);
    }

    handleKeyDown(e) { if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); this.keys[e.code] = true; }
    handleKeyUp(e) { this.keys[e.code] = false; }
    onWindowResize() { const aspect = this.gameContainer.clientWidth / this.gameContainer.clientHeight; this.camera.left = -25 * aspect; this.camera.right = 25 * aspect; this.camera.top = 25; this.camera.bottom = -25; this.camera.updateProjectionMatrix(); this.renderer.setSize(this.gameContainer.clientWidth, this.gameContainer.clientHeight); }

    resetGame() {
        this.isGameActive = true; 
        this.isGameOver = false;
        this.clearPathVisualization();
        this.score = 0;
        this.trainingData = [];
        const downloadBtn = document.getElementById('download-log-btn');
        if (downloadBtn) downloadBtn.style.display = 'none';
        const scoreElement = document.getElementById('score');
        if (scoreElement) scoreElement.textContent = `Score: 0`;

        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen) gameOverScreen.style.display = 'none';

        this.player.position.set(0, 1, 0);
        this.playerVelocity.set(0, 0, 0);

        this.obstacles.forEach(o => {
            let p;
            do {
                const b = new THREE.Box3().setFromObject(o);
                const h = b.max.y - b.min.y;
                p = new THREE.Vector3((Math.random() - 0.5) * (this.groundSize - 8), h / 2, (Math.random() - 0.5) * (this.groundSize - 8));
            } while (p.distanceTo(this.player.position) < 10);
            o.position.copy(p);
        });
        
        if (this.pathfinder) this.pathfinder.initializeGrid();
        
        if (this.monster) {
            const safeSpawnPoint = this.findSafeSpawnPoint();
            this.monster.position.copy(safeSpawnPoint);
            this.monsterState = 'PATROLLING';
            this.updateMonsterStateText(this.monsterState);
            this.setNewPatrolPath();
        }

        this.collectibles.forEach(i => this.respawnCollectible(i));
        this.particles.forEach(p => this.scene.remove(p));
        this.particles = [];

        this.aggressionLevel = 0.2;
        this.timeSinceLostSight = 0;
        this.isIgnoringSounds = false;
        this.soundIgnoreTimer = 0;
        this.suspicionTimer = 0;
    }

    handleGameOver() {
        this.isGameOver = true;
        this.isGameActive = false;
        const downloadBtn = document.getElementById('download-log-btn');
        if (downloadBtn) downloadBtn.style.display = 'flex';
        const finalScoreElement = document.getElementById('final-score');
        if (finalScoreElement) finalScoreElement.textContent = `Final Score: ${Math.floor(this.score)}`;
        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen) gameOverScreen.style.display = 'flex';
    }

    findSafeSpawnPoint() {
        let spawnPoint = new THREE.Vector3();
        let isSafe = false;
        let attempts = 0;
        while (!isSafe && attempts < 100) {
            spawnPoint.set(
                (Math.random() - 0.5) * (this.groundSize - 8),
                1.5,
                (Math.random() - 0.5) * (this.groundSize - 8)
            );
            const isFarFromPlayer = this.player ? spawnPoint.distanceTo(this.player.position) > 15 : true;
            if (this.canMoveToPosition(spawnPoint, 1.5) && isFarFromPlayer) {
                isSafe = true;
            }
            attempts++;
        }
        if (!isSafe) {
            console.error("Không thể tìm thấy điểm xuất hiện an toàn, đặt ở vị trí mặc định.");
            spawnPoint.set(15, 1.5, 15);
        }
        return spawnPoint;
    }

    setNewPatrolPath() {
        let validPathFound = false;
        let attempts = 0;
        while (!validPathFound && attempts < 50) {
            this.setNewMonsterTarget();
            const path = this.pathfinder.findPath(this.monster.position, this.monsterTargetPosition);
            
            if (path.length > 0) {
                this.monsterPath = path;
                this.currentPathIndex = 0;
                validPathFound = true;
            }
            attempts++;
        }

        if (!validPathFound) {
            console.error("Không thể tìm thấy đường đi tuần tra hợp lệ. Đặt mục tiêu mặc định.");
            this.monsterTargetPosition.set(0, 1.5, 0);
            this.monsterPath = this.pathfinder.findPath(this.monster.position, this.monsterTargetPosition);
            this.currentPathIndex = 0;
        }
        
        this.visualizeMonsterPath();
    }
    
    createGround() { const g = new THREE.PlaneGeometry(this.groundSize, this.groundSize); const m = new THREE.MeshLambertMaterial({ color: 0x333333 }); this.ground = new THREE.Mesh(g, m); this.ground.rotation.x = -Math.PI / 2; this.ground.receiveShadow = true; this.scene.add(this.ground); }
    createPlayer() {
        const pg = new THREE.Group();
        const bg = new THREE.CylinderGeometry(0.5, 0.5, 2, 16);
        const bm = new THREE.MeshPhongMaterial({ color: 0x00cc66, emissive: 0x002211 });
        const b = new THREE.Mesh(bg, bm);
        b.castShadow = true;
        b.name = "player_part";
        pg.add(b);
        
        const hg = new THREE.SphereGeometry(0.3, 16, 16);
        const hm = new THREE.MeshPhongMaterial({ color: 0x00ff66 });
        const h = new THREE.Mesh(hg, hm);
        h.position.y = 1.3;
        h.castShadow = true;
        h.name = "player_part";
        pg.add(h);
        
        this.player = pg;
        this.scene.add(this.player);
    }
    createObstacles(c) { const t = [{ g: () => new THREE.BoxGeometry(1 + Math.random() * 2, 1 + Math.random() * 3, 1 + Math.random() * 2) }, { g: () => new THREE.CylinderGeometry(0.5 + Math.random(), 0.5 + Math.random(), 2 + Math.random() * 2, 8) }]; for (let i = 0; i < c; i++) { const type = t[Math.floor(Math.random() * t.length)]; const g = type.g(); const m = new THREE.MeshPhongMaterial({ color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5) }); const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; this.obstacles.push(o); this.scene.add(o); } }
    createCollectibles(c) { for (let i = 0; i < c; i++) { const cg = new THREE.Group(); const g = new THREE.SphereGeometry(0.4, 16, 16); const m = new THREE.MeshPhongMaterial({ color: 0xffff00, emissive: 0x444400 }); const s = new THREE.Mesh(g, m); cg.add(s); const rg = new THREE.RingGeometry(0.6, 0.8, 16); const rm = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide }); const r = new THREE.Mesh(rg, rm); r.rotation.x = Math.PI / 2; cg.add(r); this.collectibles.push(cg); this.scene.add(cg); } }
    createMonster() { this.monster = new THREE.Group(); this.monster.userData = { flankCooldown: 0, isFlanking: false }; const bodyGeometry = new THREE.SphereGeometry(1.2, 32, 32); const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xff2222, emissive: 0x441111 }); const body = new THREE.Mesh(bodyGeometry, bodyMaterial); body.castShadow = true; this.monster.add(body); const visionGeometry = new THREE.ConeGeometry(this.detectionRange, this.detectionRange * 1.2, 16, 1, true); const visionMaterial = new THREE.ShaderMaterial({ uniforms: { time: { value: 0 }, opacity: { value: 0.2 }, color: { value: new THREE.Color(0x00ff00) }, innerGlow: { value: 0.2 }, outerGlow: { value: 0.9 } }, vertexShader: `varying vec2 vUv; varying vec3 vPosition; void main() { vUv = uv; vPosition = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`, fragmentShader: `uniform float time, opacity, innerGlow, outerGlow; uniform vec3 color; varying vec2 vUv; varying vec3 vPosition; void main() { vec2 center = vec2(0.5, 0.0); float dist = distance(vUv, center); float pulse = sin(time * 4.0) * 0.2 + 0.8; float edgeGlow = 1.0 - smoothstep(innerGlow, outerGlow, dist); float scanLines = sin(vUv.y * 15.0 + time * 8.0) * 0.15 + 0.85; float radialFade = 1.0 - smoothstep(0.0, 0.8, dist); float alpha = opacity * edgeGlow * pulse * scanLines * radialFade; gl_FragColor = vec4(color, alpha); }`, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }); this.visionCone = new THREE.Mesh(visionGeometry, visionMaterial); this.visionCone.position.set(0, 0, -this.detectionRange * 0.6); this.visionCone.rotation.x = -Math.PI / 2; this.monster.add(this.visionCone); this.createMonsterStateText(); this.scene.add(this.monster); }
    createMonsterStateText() { const canvas = document.createElement('canvas'); const context = canvas.getContext('2d'); canvas.width = 256; canvas.height = 64; context.font = 'Bold 24px Arial'; context.textAlign = 'center'; context.fillStyle = '#00ff00'; context.fillText('PATROLLING', canvas.width / 2, canvas.height / 2 + 8); const texture = new THREE.CanvasTexture(canvas); const textMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.1 }); const textGeometry = new THREE.PlaneGeometry(4, 1); this.monsterStateText = new THREE.Mesh(textGeometry, textMaterial); this.monsterStateText.position.set(0, 3, 0); this.monster.add(this.monsterStateText); }
    
    updatePlayerMovement(deltaTime) {
        if (!this.isGameActive || this.isGameOver) return;
        if (this.isGameOver) {
            this.playerVelocity.set(0, 0, 0);
            return;
        }

        const direction = new THREE.Vector3();
        if (this.keys['KeyW'] || this.keys['ArrowUp']) direction.z = -1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) direction.z = 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) direction.x = -1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) direction.x = 1;

        if (this.joystickDirection.lengthSq() > 0.1) {
            direction.copy(this.joystickDirection);
        }

        if (direction.lengthSq() > 0) {
            direction.normalize();
            this.playerVelocity.copy(direction);
            
            const moveStep = direction.multiplyScalar(this.playerSpeed * deltaTime);
            const newPosition = this.player.position.clone().add(moveStep);
            
            if (this.canMoveToPosition(newPosition, 0.5)) {
                this.player.position.copy(newPosition);
            } else {
                const slideX = this.player.position.clone().add(new THREE.Vector3(moveStep.x, 0, 0));
                if (this.canMoveToPosition(slideX, 0.5)) this.player.position.copy(slideX);
                const slideZ = this.player.position.clone().add(new THREE.Vector3(0, 0, moveStep.z));
                if (this.canMoveToPosition(slideZ, 0.5)) this.player.position.copy(slideZ);
            }
            this.player.rotation.y = Math.atan2(direction.x, direction.z);
        } else {
            this.playerVelocity.set(0, 0, 0);
        }

        const halfSize = this.groundSize / 2 - 1;
        this.player.position.x = Math.max(-halfSize, Math.min(halfSize, this.player.position.x));
        this.player.position.z = Math.max(-halfSize, Math.min(halfSize, this.player.position.z));
        this.player.position.y = 1;
    }
    updateCamera() { const t = this.player.position.clone().add(new THREE.Vector3(20, 20, 20)); this.camera.position.lerp(t, 0.04); const l = new THREE.Vector3(); this.camera.getWorldDirection(l); l.add(this.camera.position); l.lerp(this.player.position, 0.06); this.camera.lookAt(l); }
    updateCollectibles(deltaTime) { const t = this.clock.getElapsedTime(); this.collectibles.forEach((item, index) => { if (item.visible) { item.position.y = 1 + Math.sin(t * 2 + index) * 0.2; item.rotation.y += deltaTime; if (item.children[1]) { item.children[1].rotation.z += deltaTime * 2; } } }); }
    updateParticles(deltaTime) { for (let i = this.particles.length - 1; i >= 0; i--) { const p = this.particles[i]; p.position.add(p.velocity.clone().multiplyScalar(deltaTime)); p.velocity.y -= 10 * deltaTime; p.life -= deltaTime; if (p.life <= 0) { this.scene.remove(p); this.particles.splice(i, 1); } } }
    updateMonsterStateText(state) { if (!this.monsterStateText) return; const canvas = this.monsterStateText.material.map.image; const context = canvas.getContext('2d'); context.clearRect(0, 0, canvas.width, canvas.height); context.fillStyle = 'rgba(0, 0, 0, 0.7)'; context.fillRect(0, 0, canvas.width, canvas.height); context.font = 'Bold 32px Arial'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.lineWidth = 4; context.strokeStyle = '#000000'; context.strokeText(state, canvas.width / 2, canvas.height / 2); const colors = { PATROLLING: '#00ff00', CHASING: '#ff0000', SCANNING: '#ffff00', INVESTIGATING: '#ffa500' }; context.fillStyle = colors[state] || '#ffffff'; context.fillText(state, canvas.width / 2, canvas.height / 2); this.monsterStateText.material.map.needsUpdate = true; }
    updateDebugConsole() {
        const c = document.getElementById('console-content');
        if (!c || !this.monster) return;

        const d = {
            'State': this.monsterState,
            'Distance': this.monster.position.distanceTo(this.player.position).toFixed(1) + 'm',
            'Aggression': this.aggressionLevel.toFixed(2),
            'Suspicion': this.suspicionTimer.toFixed(2) + 's',
            'Tactics': this.monster.userData.isFlanking ? `Flanking` : 'Direct Chase',
            'Flank Cooldown': this.monster.userData.flankCooldown.toFixed(1) + 's',
            'Path Length': this.monsterPath.length,
            'Path Index': this.currentPathIndex,
            'Target Pos': `(${this.monsterTargetPosition.x.toFixed(0)}, ${this.monsterTargetPosition.z.toFixed(0)})`,
            'LKP': `(${this.playerLastKnownPosition.x.toFixed(0)}, ${this.playerLastKnownPosition.z.toFixed(0)})`,
            'Scan State': this.monsterState === 'SCANNING' ? this.scanSubState : 'N/A',
            'Lost Sight': this.timeSinceLostSight.toFixed(2) + 's',
            'Ignoring Sounds': this.isIgnoringSounds ? `Yes (${this.soundIgnoreTimer.toFixed(1)}s)` : 'No',
        };
        
        let content = '';
        for (const k in d) {
            content += `${k.padEnd(16, '.')}: ${d[k]}\n`;
        }
        c.textContent = content;
    }
    updateVisionCone(color, opacity) { if (this.visionCone?.material?.uniforms) { this.visionCone.material.uniforms.color.value.setHex(color); this.visionCone.material.uniforms.opacity.value = opacity; this.visionCone.material.uniforms.time.value = this.clock.getElapsedTime(); this.visionCone.material.needsUpdate = true; } }
    
    checkCollisions() { if (this.isGameOver) return; const playerBox = new THREE.Box3().setFromObject(this.player); this.collectibles.forEach(item => { if (item.visible) { const itemBox = new THREE.Box3().setFromObject(item); if (playerBox.intersectsBox(itemBox)) { item.visible = false; this.score += 100; this.createCollectParticles(item.position); setTimeout(() => { if (!this.isGameOver) this.respawnCollectible(item); }, 5000); } } }); if (this.monster) { const monsterBox = new THREE.Box3().setFromObject(this.monster.children[0]); if (playerBox.intersectsBox(monsterBox)) { this.handleGameOver(); } } }
    canMoveToPosition(position, radius) { const checkBox = new THREE.Box3().setFromCenterAndSize(position, new THREE.Vector3(radius * 2, 2, radius * 2)); return !this.obstacles.some(o => checkBox.intersectsBox(new THREE.Box3().setFromObject(o))); }
    isNearObstacle(p) { return this.obstacles.some(o => o.position.distanceTo(p) < 3); }
    respawnCollectible(item) { let p; do { p = new THREE.Vector3((Math.random() - 0.5) * (this.groundSize - 10), 1, (Math.random() - 0.5) * (this.groundSize - 10)); } while (this.isNearObstacle(p)); item.position.copy(p); item.visible = true; }
    createCollectParticles(position) { const pCount = 20; const pMat = new THREE.MeshBasicMaterial({ color: 0xffff00 }); for (let i = 0; i < pCount; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), pMat); p.position.copy(position); p.velocity = new THREE.Vector3((Math.random() - 0.5) * 5, Math.random() * 5 + 2, (Math.random() - 0.5) * 5); p.life = 1; this.particles.push(p); this.scene.add(p); } }
    
    setNewMonsterTarget() { this.monsterTargetPosition.set((Math.random() - 0.5) * (this.groundSize - 8), 1.5, (Math.random() - 0.5) * (this.groundSize - 8)); this.monsterPath = []; this.currentPathIndex = 0; }
    followPath(deltaTime, speed) { if (this.currentPathIndex < this.monsterPath.length) { const t = this.monsterPath[this.currentPathIndex]; const d = new THREE.Vector3().subVectors(t, this.monster.position); const distXZ = Math.sqrt(d.x * d.x + d.z * d.z); if (distXZ < 0.5) { this.currentPathIndex++; } else { d.normalize(); this.monster.position.add(d.multiplyScalar(speed * deltaTime)); } } }
    isPlayerInVision() {
        const distanceToPlayer = this.monster.position.distanceTo(this.player.position);
        if (distanceToPlayer > this.detectionRange) {
            return false;
        }

        const now = this.clock.getElapsedTime();
        if (this.lastVisionCheck && now - this.lastVisionCheck < 0.1) { // 100ms
            return this.cachedVisionResult;
        }
        this.lastVisionCheck = now;

        // Kiểm tra góc nhìn của quái vật
        const monsterForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.monster.quaternion);
        const toPlayer = new THREE.Vector3().subVectors(this.player.position, this.monster.position).normalize();
        const angle = monsterForward.angleTo(toPlayer);

        if (angle > Math.PI / 3) {
            this.cachedVisionResult = false;
            return false;
        }

        const monsterEyes = this.monster.position.clone();
        monsterEyes.y += 0.8; // Đặt mắt quái vật ở độ cao hợp l

        const objectsToCheck = [...this.obstacles, ...this.player.children];

        const direction = new THREE.Vector3().subVectors(this.player.position, monsterEyes).normalize();
        const raycaster = new THREE.Raycaster(monsterEyes, direction);

        const intersects = raycaster.intersectObjects(objectsToCheck, false); // false vì chúng ta đã cung cấp các mesh con

        if (intersects.length > 0 && intersects[0].object.name === 'player_part') {
            this.cachedVisionResult = true;
            return true;
        }

        this.cachedVisionResult = false;
        return false;
    }
    startLookAroundScan() { this.scanLookPoints = []; const currentAngle = this.monster.rotation.y; const lookAngles = [currentAngle + Math.PI / 2, currentAngle - Math.PI / 2, currentAngle + Math.PI]; lookAngles.forEach(angle => { this.scanLookPoints.push(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, angle, 0))); }); this.scanSubState = 'TURNING'; this.scanPauseTimer = 0; }

    predictPlayerPosition(seconds) {
        if (this.playerVelocity.lengthSq() > 0) {
            const prediction = this.player.position.clone().add(this.playerVelocity.clone().multiplyScalar(seconds));
            return prediction;
        }
        return this.player.position.clone();
    }

    findFlankPosition(targetPos) {
        const monsterToTarget = new THREE.Vector3().subVectors(targetPos, this.monster.position);
        const flankDirection = new THREE.Vector3(-monsterToTarget.z, 0, monsterToTarget.x).normalize();
        if (Math.random() < 0.5) {
            flankDirection.negate();
        }
        const flankDistance = 10;
        const flankPosition = targetPos.clone().add(flankDirection.multiplyScalar(flankDistance));
        const halfSize = this.groundSize / 2;
        flankPosition.x = Math.max(-halfSize, Math.min(halfSize, flankPosition.x));
        flankPosition.z = Math.max(-halfSize, Math.min(halfSize, flankPosition.z));
        return flankPosition;
    }

    updateMonster(deltaTime) {
        if (!this.monster || this.isGameOver) return;
        const distanceToPlayer = this.monster.position.distanceTo(this.player.position);
        const previousState = this.monsterState;

        this.monster.userData.flankCooldown = Math.max(0, this.monster.userData.flankCooldown - deltaTime);

        if (distanceToPlayer < this.personalSpaceRadius && this.monsterState !== 'CHASING') {
            this.monsterState = 'CHASING'; this.aggressionLevel = Math.min(1, this.aggressionLevel + 0.3);
            this.monster.userData.isFlanking = false;
            this.monsterPath = this.pathfinder.findPath(this.monster.position, this.player.position);
            this.currentPathIndex = 0; this.lastPathTargetPosition.copy(this.player.position); this.visualizeMonsterPath();
        }

        switch (this.monsterState) {
            case 'PATROLLING':
                this.aggressionLevel = Math.max(0.1, this.aggressionLevel - deltaTime * 0.05);
                if (this.isIgnoringSounds) { this.soundIgnoreTimer -= deltaTime; if (this.soundIgnoreTimer <= 0) this.isIgnoringSounds = false; }
                
                if (this.monsterPath.length === 0 || this.currentPathIndex >= this.monsterPath.length) {
                    this.setNewPatrolPath();
                }

                const isInHearingRange = !this.isIgnoringSounds && distanceToPlayer < (this.hearingRange + this.aggressionLevel * 5);
                if (isInHearingRange) { this.suspicionTimer += deltaTime; } else { this.suspicionTimer = 0; }
                if (distanceToPlayer < this.detectionRange && this.isPlayerInVision()) {
                    this.monsterState = 'CHASING'; this.suspicionTimer = 0; this.aggressionLevel = Math.min(1, this.aggressionLevel + 0.1);
                } else if (isInHearingRange && this.suspicionTimer > this.suspicionThreshold) {
                    this.monsterState = 'INVESTIGATING'; this.suspicionTimer = 0; this.investigationTarget.copy(this.player.position);
                    this.monsterPath = this.pathfinder.findPath(this.monster.position, this.investigationTarget);
                    this.currentPathIndex = 0; this.visualizeMonsterPath();
                }
                break;

            case 'CHASING':
                this.aggressionLevel = Math.min(1, this.aggressionLevel + 1 * deltaTime);
                if (this.isPlayerInVision()) {
                    this.timeSinceLostSight = 0;
                    this.playerLastKnownPosition.copy(this.player.position);
                    const shouldFlank = distanceToPlayer > 15 && this.playerVelocity.lengthSq() > 0.1 && this.monster.userData.flankCooldown === 0;
                    if (this.monster.userData.isFlanking) {
                        if (this.monster.position.distanceTo(this.lastPathTargetPosition) < 3) {
                            this.monster.userData.isFlanking = false;
                        }
                    } else if (shouldFlank) {
                        this.monster.userData.isFlanking = true;
                        this.monster.userData.flankCooldown = 10;
                        const predictedPos = this.predictPlayerPosition(1.5);
                        const flankPos = this.findFlankPosition(predictedPos);
                        this.monsterPath = this.pathfinder.findPath(this.monster.position, flankPos);
                        this.currentPathIndex = 0;
                        this.lastPathTargetPosition.copy(flankPos);
                        this.visualizeMonsterPath();
                    } else {
                        this.monsterPath = this.pathfinder.findPath(this.monster.position, this.player.position);
                        this.currentPathIndex = 0;
                        this.lastPathTargetPosition.copy(this.player.position);
                        this.visualizeMonsterPath();
                    }
                } else {
                    this.timeSinceLostSight += deltaTime;
                    if (this.timeSinceLostSight > 3.0) {
                        this.monsterState = 'SCANNING';
                        this.scanSubState = 'IDLE';
                        this.monster.userData.isFlanking = false;
                        this.monsterPath = this.pathfinder.findPath(this.monster.position, this.playerLastKnownPosition);
                        this.currentPathIndex = 0;
                        this.visualizeMonsterPath();
                    }
                }
                break;

            case 'SCANNING':
                if (distanceToPlayer < this.detectionRange && this.isPlayerInVision()) {
                    this.monsterState = 'CHASING';
                    this.monsterPath = this.pathfinder.findPath(this.monster.position, this.player.position);
                    this.currentPathIndex = 0;
                    this.lastPathTargetPosition.copy(this.player.position);
                    this.visualizeMonsterPath();
                    break;
                }

                const hasReachedDestination = this.currentPathIndex >= this.monsterPath.length || this.monsterPath.length === 0;

                if (!hasReachedDestination) {
                    this.followPath(deltaTime, this.patrolSpeed * 1.2);
                } else {
                    if (this.scanSubState === 'IDLE') {
                        this.startLookAroundScan();
                        if (this.scanLookPoints.length > 0) {
                            this.scanTargetQuaternion.copy(this.scanLookPoints.shift());
                        } else {
                            this.monsterState = 'PATROLLING';
                            break;
                        }
                    }

                    if (this.scanSubState === 'PAUSING') {
                        this.scanPauseTimer -= deltaTime;
                        if (this.scanPauseTimer <= 0) {
                            this.scanSubState = 'TURNING';
                        }
                    } else if (this.scanSubState === 'TURNING') {
                        this.monster.quaternion.rotateTowards(this.scanTargetQuaternion, deltaTime * 3);
                        if (this.monster.quaternion.angleTo(this.scanTargetQuaternion) < 0.1) {
                            if (this.scanLookPoints.length > 0) {
                                this.scanTargetQuaternion.copy(this.scanLookPoints.shift());
                                this.scanSubState = 'PAUSING';
                                this.scanPauseTimer = 1.5 - this.aggressionLevel; // Dừng lại một chút
                            } else {
                                this.monsterState = 'PATROLLING';
                            }
                        }
                    }
                }
                break;

            case 'INVESTIGATING':
                if (distanceToPlayer < this.detectionRange && this.isPlayerInVision()) {
                    this.monsterState = 'CHASING'; this.monsterPath = this.pathfinder.findPath(this.monster.position, this.player.position);
                    this.currentPathIndex = 0; this.lastPathTargetPosition.copy(this.player.position); this.visualizeMonsterPath();
                } else if (this.monster.position.distanceTo(this.investigationTarget) < 2) {
                    this.monsterState = 'SCANNING'; this.playerLastKnownPosition.copy(this.investigationTarget);
                    this.scanSubState = 'IDLE'; this.monsterPath = []; this.visualizeMonsterPath();
                } else if (this.monsterPath.length === 0) {
                    this.monsterState = 'PATROLLING'; this.isIgnoringSounds = true; this.soundIgnoreTimer = this.soundIgnoreDuration;
                }
                break;
        }

        if (previousState !== this.monsterState) {
            this.updateMonsterStateText(this.monsterState);
            if (this.monsterState === 'PATROLLING' && previousState !== 'PATROLLING') {
                this.setNewPatrolPath();
            }
        }

        const currentChaseSpeed = this.chaseSpeed + this.aggressionLevel * 2;
        const currentPatrolSpeed = this.patrolSpeed + this.aggressionLevel * 0.5;

        if (this.monsterState === 'CHASING') {
            if (this.monsterPath.length > 0 && this.currentPathIndex < this.monsterPath.length) {
                this.followPath(deltaTime, currentChaseSpeed);
            } else if (this.isPlayerInVision() && distanceToPlayer > 0.5) {
                const direction = new THREE.Vector3().subVectors(this.player.position, this.monster.position).normalize();
                this.monster.position.add(direction.multiplyScalar(currentChaseSpeed * deltaTime));
            }
        } else if (['PATROLLING', 'INVESTIGATING'].includes(this.monsterState)) {
            const speed = this.monsterState === 'INVESTIGATING' ? currentPatrolSpeed * 1.5 : currentPatrolSpeed;
            if (this.monsterPath.length > 0) {
                this.followPath(deltaTime, speed);
            }
        }

        const colors = { CHASING: 0xff0000, PATROLLING: 0x00ff00, SCANNING: 0xffff00, INVESTIGATING: 0xffa500 };
        const opacities = { CHASING: 0.4, PATROLLING: 0.2, SCANNING: 0.3, INVESTIGATING: 0.25 };
        this.updateVisionCone(colors[this.monsterState], opacities[this.monsterState]);
        this.monster.position.y = 1.5;

        if (this.monsterState !== 'SCANNING' && this.monsterPath.length > 0 && this.currentPathIndex < this.monsterPath.length) {
            const t = this.monsterPath[this.currentPathIndex];
            const l = new THREE.Vector3(t.x, this.monster.position.y, t.z);
            const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(this.monster.position, l, this.monster.up));
            this.monster.quaternion.slerp(q, deltaTime * 5.0);
        }
    }
    logTrainingData() {
        if (!this.player || !this.monster) return;

        const dataPoint = {
            state: {
                monster_relative_pos: {
                    x: this.monster.position.x - this.player.position.x,
                    z: this.monster.position.z - this.player.position.z,
                },
                monster_forward_vector: {
                    x: new THREE.Vector3(0, 0, -1).applyQuaternion(this.monster.quaternion).x,
                    z: new THREE.Vector3(0, 0, -1).applyQuaternion(this.monster.quaternion).z,
                },
                player_velocity: {
                    x: this.playerVelocity.x,
                    z: this.playerVelocity.z,
                },
                monster_behavior: this.monsterState, 
            },
            action: {
                forward: (this.keys['KeyW'] || this.keys['ArrowUp']) ? 1 : 0,
                backward: (this.keys['KeyS'] || this.keys['ArrowDown']) ? 1 : 0,
                left: (this.keys['KeyA'] || this.keys['ArrowLeft']) ? 1 : 0,
                right: (this.keys['KeyD'] || this.keys['ArrowRight']) ? 1 : 0,
            }
        };

        this.trainingData.push(dataPoint);
    }


    downloadTrainingData() {
        if (this.trainingData.length === 0) {
            alert("Chưa có dữ liệu nào được ghi lại!");
            return;
        }

        const dataStr = JSON.stringify(this.trainingData, null, 2); 
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement("a");
        link.setAttribute("href", url);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.setAttribute("download", `training_data_${timestamp}.json`);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    createPathVisualization() { this.pathVisualizationGroup = new THREE.Group(); this.scene.add(this.pathVisualizationGroup); }
    clearPathVisualization() { if (this.pathVisualizationGroup) { while(this.pathVisualizationGroup.children.length > 0) { this.pathVisualizationGroup.remove(this.pathVisualizationGroup.children[0]); } } this.pathLines = []; this.pathArrows = []; this.nextMoveArrow = null; }
    visualizeMonsterPath() { this.clearPathVisualization(); if (!this.monster || !this.pathVisualizationGroup || this.monsterPath.length === 0) return; let pathColor, arrowColor; const stateColors = { CHASING: { p: 0xff0000, a: 0xff4444 }, PATROLLING: { p: 0x00ff00, a: 0x44ff44 }, SCANNING: { p: 0xffff00, a: 0xffff44 }, INVESTIGATING: { p: 0xffa500, a: 0xffc500 } }; const colors = stateColors[this.monsterState] || { p: 0xffffff, a: 0xffffff }; pathColor = colors.p; arrowColor = colors.a; if (this.currentPathIndex < this.monsterPath.length) { const startLine = this.createPathLine(this.monster.position.clone(), this.monsterPath[this.currentPathIndex], pathColor, 0.8); this.pathVisualizationGroup.add(startLine); this.pathLines.push(startLine); } for (let i = this.currentPathIndex; i < this.monsterPath.length - 1; i++) { const line = this.createPathLine(this.monsterPath[i], this.monsterPath[i + 1], pathColor, 0.6 - (i - this.currentPathIndex) * 0.1); this.pathVisualizationGroup.add(line); this.pathLines.push(line); if ((i - this.currentPathIndex) % 3 === 0) { const direction = new THREE.Vector3().subVectors(this.monsterPath[i + 1], this.monsterPath[i]).normalize(); const arrow = this.createArrow(this.monsterPath[i], direction, arrowColor, 0.4); this.pathVisualizationGroup.add(arrow); this.pathArrows.push(arrow); } } if (this.currentPathIndex < this.monsterPath.length) { const nextTarget = this.monsterPath[this.currentPathIndex]; const direction = new THREE.Vector3().subVectors(nextTarget, this.monster.position).normalize(); this.nextMoveArrow = this.createArrow(this.monster.position.clone().add(new THREE.Vector3(0, 1, 0)), direction, pathColor, 0.8); this.nextMoveArrow.userData = { originalScale: this.nextMoveArrow.scale.clone() }; this.pathVisualizationGroup.add(this.nextMoveArrow); } if (this.monsterPath.length > 0) { const targetGeometry = new THREE.SphereGeometry(0.3, 16, 16); const targetMaterial = new THREE.MeshBasicMaterial({ color: pathColor, transparent: true, opacity: 0.8 }); const targetSphere = new THREE.Mesh(targetGeometry, targetMaterial); targetSphere.position.copy(this.monsterPath[this.monsterPath.length - 1]); targetSphere.position.y += 0.3; this.pathVisualizationGroup.add(targetSphere); } }
    updatePathVisualization(deltaTime) { if (!this.pathVisualizationGroup) return; const time = this.clock.getElapsedTime(); if (this.nextMoveArrow?.userData) { const scale = 1 + Math.sin(time * 6) * 0.2; this.nextMoveArrow.scale.copy(this.nextMoveArrow.userData.originalScale.clone().multiplyScalar(scale)); } this.pathLines.forEach((line, index) => { if (line.material) { line.material.opacity = Math.max(0.3, 0.6 + Math.sin(time * 4 + index * 0.5) * 0.2); } }); }
    createArrow(position, direction, color, size) { const ag = new THREE.Group(); const sg = new THREE.CylinderGeometry(0.05, 0.05, size, 8); const sm = new THREE.MeshBasicMaterial({ color: color }); const s = new THREE.Mesh(sg, sm); s.position.y = size / 2; ag.add(s); const hg = new THREE.ConeGeometry(0.15, 0.3, 8); const hm = new THREE.MeshBasicMaterial({ color: color }); const h = new THREE.Mesh(hg, hm); h.position.y = size + 0.15; ag.add(h); ag.position.copy(position); ag.position.y += 0.1; if (direction.length() > 0) { ag.lookAt(ag.position.clone().add(direction.normalize())); ag.rotateX(-Math.PI / 2); } return ag; }
    createPathLine(startPos, endPos, color, opacity) { const p = [startPos, endPos]; const g = new THREE.BufferGeometry().setFromPoints(p); const m = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: opacity, linewidth: 3 }); return new THREE.Line(g, m); }
}
