const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('fireworksCanvas') });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
camera.position.z = 40;

scene.fog = new THREE.FogExp2(0x000000, 0.02);

const gui = new dat.GUI();
const fireworkParams = {
    particleCount: 200,
    particleSize: 0.4,
    explosionSpeed: 3.0,
    trailLength: 0.95,
    glowIntensity: 1.5,
    opacity: 0.85,
    lightIntensity: 2.5,
    shadowStrength: 0.9
};

gui.add(fireworkParams, 'particleCount', 100, 500).name('Particle Count').onChange(resetFireworks);
gui.add(fireworkParams, 'particleSize', 0.1, 0.7).name('Particle Size');
gui.add(fireworkParams, 'explosionSpeed', 1, 5).name('Explosion Speed');
gui.add(fireworkParams, 'trailLength', 0.9, 1.0).name('Trail Length');
gui.add(fireworkParams, 'glowIntensity', 0.5, 3.0).name('Glow Intensity');
gui.add(fireworkParams, 'opacity', 0.1, 1.0).name('Opacity');
gui.add(fireworkParams, 'lightIntensity', 0.5, 5.0).name('Light Intensity').onChange(updateLighting);
gui.add(fireworkParams, 'shadowStrength', 0.1, 1.0).name('Shadow Strength').onChange(updateShadows);

const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
scene.add(ambientLight);

const hemisphereLight = new THREE.HemisphereLight(0xFFFFFF, 0x444444, 0.8);
scene.add(hemisphereLight);

const pointLight = new THREE.PointLight(0xFFFFFF, fireworkParams.lightIntensity * 2, 100, 2);
pointLight.position.set(0, 20, 30);
pointLight.castShadow = true;
pointLight.shadow.mapSize.width = 2048;
pointLight.shadow.mapSize.height = 2048;
scene.add(pointLight);

const spotLight = new THREE.SpotLight(0xFFAA00, fireworkParams.lightIntensity * 1);
spotLight.position.set(0, 30, 60);
spotLight.angle = Math.PI / 4;
spotLight.castShadow = true;
spotLight.shadow.mapSize.width = 2048;
spotLight.shadow.mapSize.height = 2048;
scene.add(spotLight);
spotLight.target.position.set(0, 0, 0);
scene.add(spotLight.target);

const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 2);
directionalLight.position.set(-50, 30, 50);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

const rectAreaLight = new THREE.RectAreaLight(0x00FFAA, 2, 10, 10);
rectAreaLight.position.set(0, 5, 10);
scene.add(rectAreaLight);

const planeGeometry = new THREE.PlaneGeometry(100, 100);
const planeMaterial = new THREE.ShadowMaterial({ opacity: fireworkParams.shadowStrength });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
plane.position.y = -15;
plane.receiveShadow = true;
scene.add(plane);

function updateLighting() {
    pointLight.intensity = fireworkParams.lightIntensity * 2;
    spotLight.intensity = fireworkParams.lightIntensity * 1;
}

function updateShadows() {
    planeMaterial.opacity = fireworkParams.shadowStrength;
}

class Firework {
    constructor() {
        this.lifespan = 80;
        this.createParticles();
    }

    createParticles() {
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        const heartShapePoints = fireworkParams.particleCount;

        for (let i = 0; i < heartShapePoints; i++) {
            const t = (i / heartShapePoints) * Math.PI * 2;
            const x = 16 * Math.sin(t) ** 3;
            const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
            const z = (Math.random() - 0.5) * fireworkParams.explosionSpeed;

            positions.push(x, y, z);

            const color = new THREE.Color().setHSL(Math.random(), 1, 0.5);
            colors.push(color.r, color.g, color.b);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: fireworkParams.particleSize * fireworkParams.glowIntensity,
            vertexColors: true,
            transparent: true,
            opacity: fireworkParams.opacity,
            blending: THREE.AdditiveBlending,
            depthTest: false
        });

        this.points = new THREE.Points(geometry, material);
        scene.add(this.points);

        this.velocities = [];
        for (let i = 0; i < heartShapePoints; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = fireworkParams.explosionSpeed + Math.random();
            this.velocities.push(new THREE.Vector3(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                (Math.random() - 0.5) * speed
            ));
        }
    }

    updateParticles() {
        const positions = this.points.geometry.attributes.position.array;
        for (let i = 0; i < positions.length / 3; i++) {
            const velocity = this.velocities[i];
            positions[i * 3] += velocity.x * 0.05;
            positions[i * 3 + 1] += velocity.y * 0.05;
            positions[i * 3 + 2] += velocity.z * 0.05;
        }

        this.points.geometry.attributes.position.needsUpdate = true;
        this.points.material.size = fireworkParams.particleSize * fireworkParams.glowIntensity;
        this.points.material.opacity = fireworkParams.opacity;

        this.lifespan--;
    }

    isDead() {
        return this.lifespan <= 0;
    }

    removeParticles() {
        scene.remove(this.points);
        this.points.geometry.dispose();
        this.points.material.dispose();
    }
}

const fireworks = [];

function launchFireworks() {
    if (fireworks.length < 5) {
        fireworks.push(new Firework());
    }
}

function resetFireworks() {
    fireworks.forEach(firework => firework.removeParticles());
    fireworks.length = 0;
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);

    fireworks.forEach((firework, index) => {
        firework.updateParticles();
        if (firework.isDead()) {
            firework.removeParticles();
            fireworks.splice(index, 1);
        }
    });
}

animate();
setInterval(launchFireworks, 1000);

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});
