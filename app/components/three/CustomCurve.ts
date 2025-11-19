import * as THREE from 'three';

export class CustomCurve extends THREE.Curve<THREE.Vector3> {
    private length: number;
    private radius: number;
    private pi2: number;

    constructor(length: number, radius: number, pi2: number) {
        super();
        this.length = length;
        this.radius = radius;
        this.pi2 = pi2;
    }

    getPoint(percent: number): THREE.Vector3 {
        const x = this.length * Math.sin(this.pi2 * percent);
        const y = this.radius * Math.cos(this.pi2 * 3 * percent);
        let t;

        t = (percent % 0.25) / 0.25;
        t = (percent % 0.25) - (2 * (1 - t) * t * -0.0185 + t * t * 0.25);
        if (Math.floor(percent / 0.25) === 0 || Math.floor(percent / 0.25) === 2) {
            t *= -1;
        }
        const z = this.radius * Math.sin(this.pi2 * 2 * (percent - t));

        return new THREE.Vector3(x, y, z);
    }
}
