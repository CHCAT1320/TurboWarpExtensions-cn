(function(Scratch) {
    'use strict';

    class FractalPerlinNoiseExtension {
        constructor() {
            this.gradients = new Map();
            this.gradCache = new Map();
            this.gradients2D = Object.freeze([
                [1,1], [1,-1], [-1,1], [-1,-1],
                [1,0], [-1,0], [0,1], [0,-1],
                [1,1], [-1,1], [1,-1], [-1,-1]
            ]);
            this.gradients2DLength = this.gradients2D.length;
        }

        getInfo() {
            return {
                id: 'fractalperlin',
                name: '分形柏林噪声',
                blocks: [
                    {
                        opcode: 'fractalNoise2D',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '二维噪声 X[inputX] Y[inputY] 种子[inputSeed] 八度[inputOctaves] 持续度[inputPersistence]',
                        arguments: {
                            inputX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            inputY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            inputSeed: { type: Scratch.ArgumentType.NUMBER, defaultValue: 12345 },
                            inputOctaves: { type: Scratch.ArgumentType.NUMBER, defaultValue: 4 },
                            inputPersistence: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0.5 }
                        }
                    },
                    {
                        opcode: 'fractalNoise1D',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '一维噪声 X[inputX] 种子[inputSeed] 八度[inputOctaves] 持续度[inputPersistence]',
                        arguments: {
                            inputX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            inputSeed: { type: Scratch.ArgumentType.NUMBER, defaultValue: 12345 },
                            inputOctaves: { type: Scratch.ArgumentType.NUMBER, defaultValue: 4 },
                            inputPersistence: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0.5 }
                        }
                    }
                ]
            };
        }

        fractalNoise2D(args) {
            const x = +args.inputX;
            const y = +args.inputY;
            const seed = +args.inputSeed | 0;
            const octaves = Math.max(1, Math.min(+args.inputOctaves, 6)) | 0;
            const persistence = Math.max(0.1, Math.min(+args.inputPersistence, 1.0));
            return this._generate2DNoise(x, y, seed, octaves, persistence);
        }

        fractalNoise1D(args) {
            const x = +args.inputX;
            const seed = +args.inputSeed | 0;
            const octaves = Math.max(1, Math.min(+args.inputOctaves, 6)) | 0;
            const persistence = Math.max(0.1, Math.min(+args.inputPersistence, 1.0));
            return this._generate1DNoise(x, seed, octaves, persistence);
        }

        _generate1DNoise(x, seed, octaves, persistence) {
            let total = 0, maxValue = 0;
            let freq = 1, amp = 1;
            
            for(let i = 0; i < octaves; i++) {
                total += this._perlin1D(x * freq, seed + i) * amp;
                maxValue += amp;
                amp *= persistence;
                freq *= 2;
            }
            return total / maxValue;
        }

        _perlin1D(x, seed) {
            const X0 = Math.floor(x);
            const dx = x - X0;
            const perm = this._getPermutation(seed);
            
            const hash0 = perm[X0 & 255];
            const hash1 = perm[(X0 + 1) & 255];
            
            const g0 = (hash0 & 1) ? 1 : -1;
            const g1 = (hash1 & 1) ? 1 : -1;
            
            const n0 = g0 * dx;
            const n1 = g1 * (dx - 1);

            // 修复：使用标准fade曲线
            const t = this._fade(dx);
            return n0 * (1 - t) + n1 * t;
        }

        _generate2DNoise(x, y, seed, octaves, persistence) {
            let total = 0, maxValue = 0;
            let freq = 1, amp = 1;
            
            for(let i = 0; i < octaves; i++) {
                total += this._perlin2D(x * freq, y * freq, seed + i) * amp;
                maxValue += amp;
                amp *= persistence;
                freq *= 2;
            }
            return total / maxValue;
        }

        _perlin2D(x, y, seed) {
            const X0 = Math.floor(x), Y0 = Math.floor(y);
            const dx = x - X0, dy = y - Y0;
            const perm = this._getPermutation(seed);
            
            const pX0 = perm[X0 & 255];
            const pX1 = perm[(X0 + 1) & 255];
            const hash00 = perm[pX0 + (Y0 & 255)];
            const hash01 = perm[pX0 + ((Y0 + 1) & 255)];
            const hash10 = perm[pX1 + (Y0 & 255)];
            const hash11 = perm[pX1 + ((Y0 + 1) & 255)];
            
            const g00 = this.gradients2D[Math.abs(hash00) % this.gradients2DLength];
            const g01 = this.gradients2D[Math.abs(hash01) % this.gradients2DLength];
            const g10 = this.gradients2D[Math.abs(hash10) % this.gradients2DLength];
            const g11 = this.gradients2D[Math.abs(hash11) % this.gradients2DLength];
            
            const n00 = g00[0] * dx + g00[1] * dy;
            const n01 = g01[0] * dx + g01[1] * (dy - 1);
            const n10 = g10[0] * (dx - 1) + g10[1] * dy;
            const n11 = g11[0] * (dx - 1) + g11[1] * (dy - 1);
            
            const u = this._fade(dx);
            const v = this._fade(dy);
            
            return this._lerp(
                this._lerp(n00, n10, u),
                this._lerp(n01, n11, u),
                v
            );
        }

        // 新增：标准fade函数
        _fade(t) {
            return t * t * t * (t * (t * 6 - 15) + 10);
        }

        // 新增：线性插值
        _lerp(a, b, t) {
            return a + t * (b - a);
        }

        _getPermutation(seed) {
            let perm = this.gradients.get(seed);
            if (!perm) {
                perm = new Uint8Array(512);
                const rng = this._createRNG(seed);
                
                for (let i = 0; i < 256; i++) perm[i] = i;
                for (let i = 255; i > 0; i--) {
                    const j = (rng() * (i + 1)) | 0;
                    [perm[i], perm[j]] = [perm[j], perm[i]];
                }
                perm.set(perm.subarray(0, 256), 256);
                this.gradients.set(seed, perm);
            }
            return perm;
        }

        _createRNG(seed) {
            let state = seed | 0;
            return () => {
                state = (state + 0x6D2B79F5) | 0;
                let t = Math.imul(state ^ state >>> 15, 1 | state);
                t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
                return ((t ^ t >>> 14) >>> 0) / 4294967296;
            };
        }
    }

    Scratch.extensions.register(new FractalPerlinNoiseExtension());
})(Scratch);