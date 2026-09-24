import * as THREE from 'three';

const COLORS = [0xffcc00, 0xff4d4d, 0x4dff88, 0x4d8bff, 0xff4dd2, 0xffffff];
const GRAVITY = -2.2;

export class ConfettiBurst {
  constructor(count = 60) {
    this.count = count;
    this.group = new THREE.Group();
    this.particles = [];
    const geo = new THREE.PlaneGeometry(0.03, 0.05);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: COLORS[i % COLORS.length],
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3(),
        spin: new THREE.Vector3(),
        active: false,
      });
    }
    this.frozen = false;
  }

  burst(origin) {
    this.frozen = false;
    for (const p of this.particles) {
      p.mesh.position.copy(origin);
      p.mesh.visible = true;
      p.active = true;
      const speed = 0.8 + Math.random() * 1.4;
      const angle = Math.random() * Math.PI * 2;
      const upBias = 1.2 + Math.random() * 0.8;
      p.vel.set(Math.cos(angle) * speed, upBias, Math.sin(angle) * speed);
      p.spin.set(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12
      );
    }
  }

  /** The "record scratch" beat: zero every particle's velocity instantly. */
  freeze() {
    this.frozen = true;
    for (const p of this.particles) {
      p.vel.set(0, 0, 0);
      p.spin.set(0, 0, 0);
    }
  }

  clear() {
    for (const p of this.particles) {
      p.active = false;
      p.mesh.visible = false;
    }
  }

  update(dt) {
    if (this.frozen) return;
    for (const p of this.particles) {
      if (!p.active) continue;
      p.vel.y += GRAVITY * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += p.spin.x * dt;
      p.mesh.rotation.y += p.spin.y * dt;
      p.mesh.rotation.z += p.spin.z * dt;
      if (p.mesh.position.y < -3) {
        p.active = false;
        p.mesh.visible = false;
      }
    }
  }
}
