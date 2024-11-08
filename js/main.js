class GeometryWars3D {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.player = this.createPlayer();
        this.enemies = [];
        this.bullets = [];
        this.powerUps = [];
        this.wormholes = [];
        this.blackHoles = [];

        this.score = 0;
        this.combo = 1;
        this.level = 1;
        this.timeWarpActive = false;
        this.hyperJumpReady = true;
        this.hyperJumpCooldown = 30; // seconds

        this.init();
        this.setupEventListeners();
        this.animate();
    }

    init() {
        this.setupLighting();
        this.setupGrid();
        this.createWormholes();
        this.spawnEnemies();
        this.spawnPowerUps();

        this.camera.position.set(0, 40, 0);
        this.camera.lookAt(0, 0, 0);
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 50, 0);
        this.scene.add(directionalLight);
    }

    setupGrid() {
        const gridHelper = new THREE.GridHelper(100, 20, 0x888888, 0x444444);
        this.scene.add(gridHelper);
    }

    createPlayer() {
        const geometry = new THREE.ConeGeometry(0.5, 2, 32);
        const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
        const player = new THREE.Mesh(geometry, material);
        player.rotation.x = Math.PI / 2;
        player.position.y = 0.5;
        player.speed = 0.2;
        this.scene.add(player);
        return player;
    }

    createEnemy() {
        const geometry = new THREE.SphereGeometry(0.5, 32, 32);
        const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        const enemy = new THREE.Mesh(geometry, material);
        enemy.position.set(
            (Math.random() - 0.5) * 80,
            0.5,
            (Math.random() - 0.5) * 80
        );
        enemy.speed = 0.05 + Math.random() * 0.05;
        this.scene.add(enemy);
        return enemy;
    }

    createBullet() {
        const geometry = new THREE.SphereGeometry(0.2, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const bullet = new THREE.Mesh(geometry, material);
        bullet.position.copy(this.player.position);
        bullet.speed = 0.5;
        bullet.direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.player.quaternion);
        this.scene.add(bullet);
        return bullet;
    }

    createWormhole() {
        const geometry = new THREE.TorusGeometry(2, 0.5, 16, 100);
        const material = new THREE.MeshPhongMaterial({ color: 0x8A2BE2, emissive: 0x4B0082 });
        const wormhole = new THREE.Mesh(geometry, material);
        wormhole.position.set(
            (Math.random() - 0.5) * 80,
            0.5,
            (Math.random() - 0.5) * 80
        );
        wormhole.rotation.x = Math.PI / 2;
        this.scene.add(wormhole);
        return wormhole;
    }

    createPowerUp() {
        const powerUpTypes = [
            { name: 'SpeedBoost', color: 0x00ffff, effect: () => { this.player.speed *= 1.5; } },
            { name: 'ScoreMultiplier', color: 0xffff00, effect: () => { this.combo *= 2; } },
            { name: 'BlackHole', color: 0x000000, effect: () => { this.createBlackHole(this.player.position); } }
        ];
        
        const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        const geometry = new THREE.OctahedronGeometry(0.5);
        const material = new THREE.MeshPhongMaterial({ color: type.color, emissive: type.color, emissiveIntensity: 0.5 });
        const powerUp = new THREE.Mesh(geometry, material);
        powerUp.position.set(
            (Math.random() - 0.5) * 80,
            0.5,
            (Math.random() - 0.5) * 80
        );
        powerUp.type = type;
        this.scene.add(powerUp);
        return powerUp;
    }

    createBlackHole(position) {
        const geometry = new THREE.SphereGeometry(3, 32, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const blackHole = new THREE.Mesh(geometry, material);
        blackHole.position.copy(position);
        blackHole.position.y = 0.5;
        blackHole.lifespan = 10; // seconds
        this.scene.add(blackHole);
        this.blackHoles.push(blackHole);
    }

    spawnEnemies() {
        for (let i = 0; i < this.level * 5; i++) {
            this.enemies.push(this.createEnemy());
        }
    }

    spawnPowerUps() {
        for (let i = 0; i < this.level; i++) {
            this.powerUps.push(this.createPowerUp());
        }
    }

    createWormholes() {
        for (let i = 0; i < this.level; i++) {
            this.wormholes.push(this.createWormhole());
        }
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize(), false);
        window.addEventListener('mousemove', (event) => this.onMouseMove(event), false);
        window.addEventListener('click', () => this.shoot(), false);
        window.addEventListener('keydown', (event) => this.onKeyDown(event), false);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    }

    onKeyDown(event) {
        switch(event.code) {
            case 'KeyT':
                this.activateTimeWarp();
                break;
            case 'KeyH':
                this.activateHyperJump();
                break;
        }
    }

    shoot() {
        this.bullets.push(this.createBullet());
    }

    activateTimeWarp() {
        if (this.timeWarpActive) return;
        this.timeWarpActive = true;
        this.player.speed *= 2;
        for (let enemy of this.enemies) {
            enemy.speed *= 0.5;
        }
        setTimeout(() => {
            this.timeWarpActive = false;
            this.player.speed /= 2;
            for (let enemy of this.enemies) {
                enemy.speed *= 2;
            }
        }, 5000); // Time warp lasts for 5 seconds

        this.createTimeWarpEffect();
    }

    createTimeWarpEffect() {
        const geometry = new THREE.SphereGeometry(50, 32, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide
        });
        const timeWarpEffect = new THREE.Mesh(geometry, material);
        this.scene.add(timeWarpEffect);
        setTimeout(() => this.scene.remove(timeWarpEffect), 5000);
    }

    activateHyperJump() {
        if (!this.hyperJumpReady) return;
        this.hyperJumpReady = false;

        const hyperJumpEffect = this.createHyperJumpEffect();
        this.scene.add(hyperJumpEffect);

        let distance = 0;
        const animate = () => {
            distance += 2;
            this.player.position.z -= 2;
            hyperJumpEffect.position.copy(this.player.position);

            if (distance < 100) {
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(hyperJumpEffect);
                this.levelUp();
            }
        };
        animate();

        setTimeout(() => {
            this.hyperJumpReady = true;
        }, this.hyperJumpCooldown * 1000);
    }

    createHyperJumpEffect() {
        const geometry = new THREE.CylinderGeometry(0.5, 0.5, 100, 32, 1, true);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const hyperJumpEffect = new THREE.Mesh(geometry, material);
        hyperJumpEffect.rotation.x = Math.PI / 2;
        return hyperJumpEffect;
    }

    levelUp() {
        this.level++;
        this.createWormholes();
        this.spawnEnemies();
        this.spawnPowerUps();
    }

    updatePlayer() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.scene.getObjectByName('gridHelper'));
        
        if (intersects.length > 0) {
            const target = intersects[0].point;
            target.y = this.player.position.y;
            this.player.lookAt(target);
            
            const direction = new THREE.Vector3().subVectors(target, this.player.position).normalize();
            this.player.position.add(direction.multiplyScalar(this.player.speed));
        }

        // Check for wormhole teleportation
        for (let wormhole of this.wormholes) {
            if (this.player.position.distanceTo(wormhole.position) < 1) {
                const destinationWormhole = this.wormholes[Math.floor(Math.random() * this.wormholes.length)];
                this.player.position.copy(destinationWormhole.position);
                this.player.position.y = 0.5; // Adjust height after teleportation
                break;
            }
        }
    }

    updateEnemies() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // Move towards player
            const direction = new THREE.Vector3().subVectors(this.player.position, enemy.position).normalize();
            enemy.position.add(direction.multiplyScalar(enemy.speed));

            // Black hole effect
            for (let blackHole of this.blackHoles) {
                const distanceToBlackHole = enemy.position.distanceTo(blackHole.position);
                if (distanceToBlackHole < 10) {
                    const pullStrength = 0.1 / (distanceToBlackHole * distanceToBlackHole);
                    const pullDirection = new THREE.Vector3().subVectors(blackHole.position, enemy.position).normalize();
                    enemy.position.add(pullDirection.multiplyScalar(pullStrength));
                    
                    if (distanceToBlackHole < 1) {
                        this.scene.remove(enemy);
                        this.enemies.splice(i, 1);
                        this.score += 50 * this.combo;
                        this.createExplosion(enemy.position);
                        break;
                    }
                }
            }

            // Wormhole teleportation
            for (let wormhole of this.wormholes) {
                if (enemy.position.distanceTo(wormhole.position) < 1) {
                    const destinationWormhole = this.wormholes[Math.floor(Math.random() * this.wormholes.length)];
                    enemy.position.copy(destinationWormhole.position);
                    enemy.position.y = 0.5; // Adjust height after teleportation
                    break;
                }
            }

            // Check collision with player
            if (enemy.position.distanceTo(this.player.position) < 1) {
                this.gameOver();
                return;
            }
        }
    }

    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.position.add(bullet.direction.multiplyScalar(bullet.speed));

            // Remove bullet if it's out of bounds
            if (bullet.position.length() > 50) {
                this.scene.remove(bullet);
                this.bullets.splice(i, 1);
                continue;
            }

            // Check collision with enemies
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                if (bullet.position.distanceTo(enemy.position) < 1) {
                    this.scene.remove(enemy);
                    this.enemies.splice(j, 1);
                    this.scene.remove(bullet);
                    this.bullets.splice(i, 1);
                    this.score += 10 * this.combo;
                    this.createExplosion(enemy.position);
                    break;
                }
            }
        }
    }

    updatePowerUps() {
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            powerUp.rotation.x += 0.01;
            powerUp.rotation.y += 0.01;

            if (powerUp.position.distanceTo(this.player.position) < 1) {
                powerUp.type.effect();
                this.scene.remove(powerUp);
                this.powerUps.splice(i, 1);
                this.createPowerUpEffect(powerUp.position);
            }
        }

        // Spawn new power-ups if needed
        if (this.powerUps.length < this.level) {
            this.powerUps.push(this.createPowerUp());
        }
    }

    updateBlackHoles() {
        for (let i = this.blackHoles.length - 1; i >= 0; i--) {
            const blackHole = this.blackHoles[i];
            blackHole.rotation.y += 0.02;
            blackHole.lifespan -= this.clock.getDelta();

            if (blackHole.lifespan <= 0) {
                this.scene.remove(blackHole);
                this.blackHoles.splice(i, 1);
            }
        }
    }

    createExplosion(position) {
        const particleCount = 20;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            const x = (Math.random() - 0.5) * 2;
            const y = (Math.random() - 0.5) * 2;
            const z = (Math.random() - 0.5) * 2;

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            colors[i * 3] = 1;
            colors[i * 3 + 1] = 0.5;
            colors[i * 3 + 2] = 0;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true
        });

        const particles = new THREE.Points(geometry, material);
        particles.position.copy(position);
        this.scene.add(particles);

        const tween = new TWEEN.Tween(particles.scale)
            .to({ x: 2, y: 2, z: 2 }, 1000)
            .easing(TWEEN.Easing.Cubic.Out)
            .start();

        setTimeout(() => {
            this.scene.remove(particles);
        }, 1000);
    }

    createPowerUpEffect(position) {
        const geometry = new THREE.SphereGeometry(0.5, 32, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });
        const effect = new THREE.Mesh(geometry, material);
        effect.position.copy(position);
        this.scene.add(effect);

        const tween = new TWEEN.Tween(effect.scale)
            .to({ x: 3, y: 3, z: 3 }, 500)
            .easing(TWEEN.Easing.Cubic.Out);

        const opacityTween = new TWEEN.Tween(effect.material)
            .to({ opacity: 0 }, 500)
            .easing(TWEEN.Easing.Cubic.Out);

        tween.start();
        opacityTween.start();

        setTimeout(() => {
            this.scene.remove(effect);
        }, 500);
    }

    gameOver() {
        console.log("Game Over! Final Score:", this.score);
        // Implement game over screen and restart functionality
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.updatePlayer();
        this.updateEnemies();
        this.updateBullets();
        this.updatePowerUps();
        this.updateBlackHoles();

        TWEEN.update();

        this.renderer.render(this.scene, this.camera);
    }

    // Backwards-compatible createParticleSystem method

    createParticleSystem() {
    const particleCount = 1000;
    const particles = new THREE.Geometry();
    const pMaterial = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        size: 0.1,
        blending: THREE.AdditiveBlending,
        transparent: true
    });

    for (let p = 0; p < particleCount; p++) {
        const pX = (Math.random() - 0.5) * 100;
        const pY = (Math.random() - 0.5) * 100;
        const pZ = (Math.random() - 0.5) * 100;
        const particle = new THREE.Vector3(pX, pY, pZ);
        particles.vertices.push(particle);
        particles.colors.push(new THREE.Color(Math.random(), Math.random(), Math.random()));
    }

    pMaterial.vertexColors = true;
    this.particleSystem = new THREE.Points(particles, pMaterial);
    this.scene.add(this.particleSystem);
}

    updateParticleSystem() {
    const particles = this.particleSystem.geometry.vertices;
    const colors = this.particleSystem.geometry.colors;

    for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        particle.x += (Math.random() - 0.5) * 0.1;
        particle.y += (Math.random() - 0.5) * 0.1;
        particle.z += (Math.random() - 0.5) * 0.1;

        colors[i].r += (Math.random() - 0.5) * 0.01;
        colors[i].g += (Math.random() - 0.5) * 0.01;
        colors[i].b += (Math.random() - 0.5) * 0.01;

        colors[i].r = Math.max(0, Math.min(1, colors[i].r));
        colors[i].g = Math.max(0, Math.min(1, colors[i].g));
        colors[i].b = Math.max(0, Math.min(1, colors[i].b));
    }

    this.particleSystem.geometry.verticesNeedUpdate = true;
    this.particleSystem.geometry.colorsNeedUpdate = true;
}


    createShockwave(position) {
        const geometry = new THREE.RingGeometry(0.1, 0.5, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        const shockwave = new THREE.Mesh(geometry, material);
        shockwave.position.copy(position);
        shockwave.rotation.x = Math.PI / 2;
        this.scene.add(shockwave);

        const tween = new TWEEN.Tween(shockwave.scale)
            .to({ x: 20, y: 20, z: 20 }, 1000)
            .easing(TWEEN.Easing.Cubic.Out);

        const opacityTween = new TWEEN.Tween(shockwave.material)
            .to({ opacity: 0 }, 1000)
            .easing(TWEEN.Easing.Cubic.Out);

        tween.start();
        opacityTween.start();

        setTimeout(() => {
            this.scene.remove(shockwave);
        }, 1000);
    }

    createBoss() {
        const geometry = new THREE.DodecahedronGeometry(3);
        const material = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            emissive: 0x880000,
            specular: 0xffffff,
            shininess: 100
        });
        this.boss = new THREE.Mesh(geometry, material);
        this.boss.position.set(0, 5, -30);
        this.boss.hp = 100;
        this.scene.add(this.boss);
    }

    updateBoss() {
        if (!this.boss) return;

        this.boss.rotation.x += 0.01;
        this.boss.rotation.y += 0.01;

        // Boss movement
        this.boss.position.x = Math.sin(this.clock.getElapsedTime() * 0.5) * 20;
        this.boss.position.z = Math.cos(this.clock.getElapsedTime() * 0.3) * 20 - 20;

        // Boss attacks
        if (Math.random() < 0.02) {
            this.bossFire();
        }

        // Check for bullet collisions
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            if (this.bullets[i].position.distanceTo(this.boss.position) < 3) {
                this.boss.hp -= 1;
                this.scene.remove(this.bullets[i]);
                this.bullets.splice(i, 1);
                this.createExplosion(this.boss.position);

                if (this.boss.hp <= 0) {
                    this.defeatBoss();
                }
            }
        }
    }

    bossFire() {
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const bossBullet = new THREE.Mesh(geometry, material);
        bossBullet.position.copy(this.boss.position);
        
        const direction = new THREE.Vector3().subVectors(this.player.position, this.boss.position).normalize();
        bossBullet.velocity = direction.multiplyScalar(0.3);
        
        this.scene.add(bossBullet);
        this.bossBullets.push(bossBullet);
    }

    updateBossBullets() {
        for (let i = this.bossBullets.length - 1; i >= 0; i--) {
            const bullet = this.bossBullets[i];
            bullet.position.add(bullet.velocity);

            if (bullet.position.distanceTo(this.player.position) < 1) {
                this.gameOver();
                return;
            }

            if (bullet.position.length() > 50) {
                this.scene.remove(bullet);
                this.bossBullets.splice(i, 1);
            }
        }
    }

    defeatBoss() {
        this.createShockwave(this.boss.position);
        this.scene.remove(this.boss);
        this.boss = null;
        this.score += 1000 * this.combo;
        this.levelUp();
    }

    // Update the animate method to include new features
    animate() {
        requestAnimationFrame(() => this.animate());

        this.updatePlayer();
        this.updateEnemies();
        this.updateBullets();
        this.updatePowerUps();
        this.updateBlackHoles();
        this.updateParticleSystem();
        
        if (this.boss) {
            this.updateBoss();
            this.updateBossBullets();
        }

        TWEEN.update();

        this.renderer.render(this.scene, this.camera);
    }

    // Initialize new features
    init() {
        this.setupLighting();
        this.setupGrid();
        this.createWormholes();
        this.spawnEnemies();
        this.spawnPowerUps();
        this.createParticleSystem();

        this.camera.position.set(0, 40, 0);
        this.camera.lookAt(0, 0, 0);

        this.bossBullets = [];
        
        // Spawn boss every 5 levels
        if (this.level % 5 === 0) {
            this.createBoss();
        }
    }
}

// Main game initialization
const game = new GeometryWars3D();

// Add resize event listener
window.addEventListener('resize', () => game.onWindowResize(), false);

//copyright nyx4d@proton.me
