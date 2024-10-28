const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('fireworksCanvas') });
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.z = 30;

const gui = new dat.GUI();
const fireworkParams = {
    particleCount: 200,
    particleSize: 0.3,
    explosionSpeed: 2.5,
    trailLength: 0.95,
    glowIntensity: 1.0,
    opacity: 0.9
};

gui.add(fireworkParams, 'particleCount', 100, 500).name('Particle Count').onChange(resetFireworks);
gui.add(fireworkParams, 'particleSize', 0.1, 0.5).name('Particle Size');
gui.add(fireworkParams, 'explosionSpeed', 1, 4).name('Explosion Speed');
gui.add(fireworkParams, 'trailLength', 0.9, 1.0).name('Trail Length');
gui.add(fireworkParams, 'glowIntensity', 0.5, 3.0).name('Glow Intensity');
gui.add(fireworkParams, 'opacity', 0.1, 1.0).name('Opacity');

class Firework {
    constructor() {
        this.lifespan = 80;
        this.createParticles();
    }

    createParticles() {
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];

        const heartShapePoints = 200;
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
            positions[i * 3] += velocity.x;
            positions[i * 3 + 1] += velocity.y;
            positions[i * 3 + 2] += velocity.z;
            velocity.multiplyScalar(fireworkParams.trailLength);
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
