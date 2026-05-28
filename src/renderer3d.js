/**
 * HABITA3D - RENDERIZADOR 3D (MODULO ES)
 * Configura la escena Three.js, luces, sombras, extrusión de paredes y manipulación en 3D
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createModel3D } from './models.js';

export default class Renderer3D {
    constructor(containerId, app) {
        this.container = document.getElementById(containerId);
        this.app = app;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // Elementos de luz y ambiente
        this.dirLight = null;
        this.ambientLight = null;
        this.gridHelper = null;
        
        // Interacción 3D
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Plano Y=0 para arrastre
        this.selectedObject3D = null;
        this.isDragging = false;
        
        // Almacenamiento de objetos interactivos
        this.furnitureMeshes = [];
        this.proceduralTextures = {}; // Cache de texturas generadas
        
        this.init();
    }

    init() {
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;

        // 1. Crear Escena
        const isLight = this.app.theme === 'light';
        const bgColor = isLight ? 0xf1f5f9 : 0x060913;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(bgColor);
        this.scene.fog = new THREE.FogExp2(bgColor, 0.015);

        // 2. Crear Cámara
        this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
        this.camera.position.set(10, 12, 14);

        // 3. Crear WebGLRenderer con sombras suaves
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        this.container.appendChild(this.renderer.domElement);

        // 4. Agregar OrbitControls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // No permitir pasar por debajo del suelo
        this.controls.minDistance = 2;
        this.controls.maxDistance = 40;
        
        // Centrar controles
        this.controls.target.set(0, 0, 0);

        // 5. Configurar Luces
        this.setupLights();

        // 6. Agregar Ayudas (Rejilla)
        this.gridHelper = new THREE.GridHelper(30, 60, 0x3b82f6, 0x1e293b);
        this.gridHelper.position.y = 0.005; // Ligeramente arriba para evitar z-fighting
        this.scene.add(this.gridHelper);

        // 7. Eventos
        window.addEventListener('resize', () => this.resize());
        this.renderer.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        this.renderer.domElement.addEventListener('pointermove', (e) => this.onPointerMove(e));
        this.renderer.domElement.addEventListener('pointerup', () => this.onPointerUp());

        // 8. Loop de Animación
        this.animate();
    }

    setupLights() {
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(this.ambientLight);

        this.dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        this.dirLight.position.set(12, 18, 8);
        this.dirLight.castShadow = true;
        
        this.dirLight.shadow.mapSize.width = 2048;
        this.dirLight.shadow.mapSize.height = 2048;
        this.dirLight.shadow.camera.near = 0.5;
        this.dirLight.shadow.camera.far = 40;
        
        const d = 15;
        this.dirLight.shadow.camera.left = -d;
        this.dirLight.shadow.camera.right = d;
        this.dirLight.shadow.camera.top = d;
        this.dirLight.shadow.camera.bottom = -d;
        this.dirLight.shadow.bias = -0.0005;
        
        this.scene.add(this.dirLight);
    }

    resize() {
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    // --- GENERACION DE TEXTURAS PROCEDIMENTALES EN CANVAS ---

    getProceduralTexture(name) {
        if (this.proceduralTextures[name]) {
            return this.proceduralTextures[name];
        }

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        if (name === 'oak') {
            ctx.fillStyle = '#d7a15c';
            ctx.fillRect(0, 0, 512, 512);
            
            ctx.strokeStyle = '#a67232';
            ctx.lineWidth = 3;
            for (let i = 0; i <= 512; i += 64) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, 512);
                ctx.stroke();
            }
            
            ctx.strokeStyle = '#c58e45';
            ctx.lineWidth = 1;
            for (let i = 0; i < 512; i += 64) {
                for (let j = 0; j < 512; j += 128) {
                    const offset = (i / 64) % 2 === 0 ? 0 : 64;
                    ctx.beginPath();
                    ctx.moveTo(i, j + offset);
                    ctx.lineTo(i + 64, j + offset);
                    ctx.stroke();
                }
            }
        } else if (name === 'marble') {
            ctx.fillStyle = '#f1f5f9';
            ctx.fillRect(0, 0, 512, 512);
            
            ctx.strokeStyle = 'rgba(100, 116, 139, 0.18)';
            ctx.lineWidth = 2.5;
            
            for (let k = 0; k < 6; k++) {
                ctx.beginPath();
                let x = Math.random() * 512;
                let y = 0;
                ctx.moveTo(x, y);
                while (y < 512) {
                    x += (Math.random() - 0.5) * 40;
                    y += 20 + Math.random() * 30;
                    ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
        } else if (name === 'tile') {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 0, 512, 512);
            
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 4;
            for (let i = 0; i <= 512; i += 128) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, 512);
                ctx.moveTo(0, i);
                ctx.lineTo(512, i);
                ctx.stroke();
            }
        } else if (name === 'carpet') {
            ctx.fillStyle = '#e4e4e7';
            ctx.fillRect(0, 0, 512, 512);
            
            ctx.fillStyle = '#d4d4d8';
            for (let i = 0; i < 25000; i++) {
                const rx = Math.random() * 512;
                const ry = Math.random() * 512;
                ctx.fillRect(rx, ry, 1.5, 1.5);
            }
        } else if (name === 'floating') {
            ctx.fillStyle = '#8c6239';
            ctx.fillRect(0, 0, 512, 512);
            
            ctx.strokeStyle = '#4a331c';
            ctx.lineWidth = 2.5;
            for (let i = 0; i <= 512; i += 42) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, 512);
                ctx.stroke();
            }
            
            ctx.strokeStyle = '#9e734a';
            ctx.lineWidth = 0.8;
            for (let i = 0; i < 512; i += 42) {
                for (let j = 0; j < 512; j += 96) {
                    const offset = (i / 42) % 3 === 0 ? 0 : (i / 42) % 3 === 1 ? 32 : 64;
                    ctx.beginPath();
                    ctx.moveTo(i, j + offset);
                    ctx.lineTo(i + 42, j + offset);
                    ctx.stroke();
                }
            }
        } else if (name === 'grass') {
            ctx.fillStyle = '#16a34a';
            ctx.fillRect(0, 0, 512, 512);
            
            ctx.fillStyle = '#15803d';
            for (let i = 0; i < 15000; i++) {
                const rx = Math.random() * 512;
                const ry = Math.random() * 512;
                ctx.fillRect(rx, ry, 2, 2);
            }
            ctx.fillStyle = '#22c55e';
            for (let i = 0; i < 10000; i++) {
                const rx = Math.random() * 512;
                const ry = Math.random() * 512;
                ctx.fillRect(rx, ry, 1.5, 3);
            }
        } else if (name === 'terracotta') {
            ctx.fillStyle = '#c2410c';
            ctx.fillRect(0, 0, 512, 512);
            
            ctx.strokeStyle = '#7c2d12';
            ctx.lineWidth = 3.5;
            for (let i = 0; i <= 512; i += 64) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, 512);
                ctx.moveTo(0, i);
                ctx.lineTo(512, i);
                ctx.stroke();
            }
        } else if (name === 'cobblestone') {
            ctx.fillStyle = '#334155'; // grout color
            ctx.fillRect(0, 0, 512, 512);
            
            const stoneColors = ['#475569', '#546376', '#3e4c5e', '#5c6d84'];
            const size = 32;
            for (let y = -size; y < 512 + size; y += size) {
                const isEven = (y / size) % 2 === 0;
                const offset = isEven ? size / 2 : 0;
                for (let x = -size; x < 512 + size; x += size) {
                    // Determinate color based on pseudo-random function using coordinates
                    const colorIdx = Math.floor(Math.abs(Math.sin(x * 12.3 + y * 7.9) * 1000)) % stoneColors.length;
                    ctx.fillStyle = stoneColors[colorIdx];
                    
                    const rx = x + offset + 2;
                    const ry = y + 2;
                    const rw = size - 4;
                    const rh = size - 4;
                    
                    ctx.beginPath();
                    if (ctx.roundRect) {
                        ctx.roundRect(rx, ry, rw, rh, 6);
                    } else {
                        ctx.rect(rx, ry, rw, rh);
                    }
                    ctx.fill();
                    
                    // Subtle highlight on the top part of the cobblestone
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
                    ctx.beginPath();
                    if (ctx.roundRect) {
                        ctx.roundRect(rx + 2, ry + 2, rw - 4, rh / 2, 4);
                    } else {
                        ctx.rect(rx + 2, ry + 2, rw - 4, rh / 2);
                    }
                    ctx.fill();
                }
            }
        } else if (name === 'gravel') {
            ctx.fillStyle = '#78716c'; // stones grey/brown base
            ctx.fillRect(0, 0, 512, 512);
            
            const gravelColors = ['#a8a29e', '#57534e', '#78716c', '#44403c', '#d6d3d1', '#87807c'];
            // Draw many small gravel stones (circles or tiny blobs)
            for (let i = 0; i < 6000; i++) {
                const rx = Math.random() * 512;
                const ry = Math.random() * 512;
                const size = 1.5 + Math.random() * 3.5;
                ctx.fillStyle = gravelColors[Math.floor(Math.random() * gravelColors.length)];
                ctx.beginPath();
                ctx.arc(rx, ry, size, 0, Math.PI * 2);
                ctx.fill();
                
                // Add highlight or shadow
                if (Math.random() > 0.5) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
                    ctx.beginPath();
                    ctx.arc(rx - size/3, ry - size/3, size/3, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
                    ctx.beginPath();
                    ctx.arc(rx + size/3, ry + size/3, size/3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else if (name === 'concrete') {
            ctx.fillStyle = '#64748b';
            ctx.fillRect(0, 0, 512, 512);
            
            ctx.fillStyle = '#475569';
            for (let i = 0; i < 8000; i++) {
                const rx = Math.random() * 512;
                const ry = Math.random() * 512;
                ctx.fillRect(rx, ry, 1.5, 1.5);
            }
            ctx.fillStyle = '#cbd5e1';
            for (let i = 0; i < 6000; i++) {
                const rx = Math.random() * 512;
                const ry = Math.random() * 512;
                ctx.fillRect(rx, ry, 1.0, 1.0);
            }
        } else if (name === 'brick') {
            // Ladrillo Rojo
            ctx.fillStyle = '#b91c1c';
            ctx.fillRect(0, 0, 512, 512);
            
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 4;
            const rows = 16;
            const rowH = 512 / rows;
            for (let i = 0; i <= rows; i++) {
                ctx.beginPath();
                ctx.moveTo(0, i * rowH);
                ctx.lineTo(512, i * rowH);
                ctx.stroke();
            }
            
            ctx.lineWidth = 3;
            const cols = 8;
            const colW = 512 / cols;
            for (let r = 0; r < rows; r++) {
                const offset = (r % 2) * (colW / 2);
                for (let c = 0; c <= cols + 1; c++) {
                    ctx.beginPath();
                    ctx.moveTo(c * colW - offset, r * rowH);
                    ctx.lineTo(c * colW - offset, (r + 1) * rowH);
                    ctx.stroke();
                }
            }
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            for (let i = 0; i < 2000; i++) {
                const rx = Math.random() * 512;
                const ry = Math.random() * 512;
                ctx.fillRect(rx, ry, 2, 2);
            }
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            for (let i = 0; i < 1000; i++) {
                const rx = Math.random() * 512;
                const ry = Math.random() * 512;
                ctx.fillRect(rx, ry, 2, 2);
            }
        } else if (name === 'brick_old') {
            // Ladrillo Viejo / Rústico
            ctx.fillStyle = '#7c2d12';
            ctx.fillRect(0, 0, 512, 512);
            
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 5;
            const rows = 12;
            const rowH = 512 / rows;
            for (let i = 0; i <= rows; i++) {
                ctx.beginPath();
                ctx.moveTo(0, i * rowH + (Math.random() - 0.5) * 2);
                ctx.lineTo(512, i * rowH + (Math.random() - 0.5) * 2);
                ctx.stroke();
            }
            
            ctx.lineWidth = 4;
            const cols = 6;
            const colW = 512 / cols;
            for (let r = 0; r < rows; r++) {
                const offset = (r % 2) * (colW / 2) + (Math.random() - 0.5) * 4;
                for (let c = 0; c <= cols + 1; c++) {
                    ctx.beginPath();
                    ctx.moveTo(c * colW - offset, r * rowH);
                    ctx.lineTo(c * colW - offset, (r + 1) * rowH);
                    ctx.stroke();
                }
            }
            
            for (let i = 0; i < 40; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0, 0, 0, 0.25)' : 'rgba(251, 146, 60, 0.15)';
                const w = 40 + Math.random() * 60;
                const h = rowH - 6;
                const x = Math.random() * 512;
                const rowIdx = Math.floor(Math.random() * rows);
                const y = rowIdx * rowH + 3;
                ctx.fillRect(x, y, w, h);
            }
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            for (let i = 0; i < 4000; i++) {
                const rx = Math.random() * 512;
                const ry = Math.random() * 512;
                ctx.fillRect(rx, ry, 1.5, 1.5);
            }
        } else if (name === 'wood' || name.startsWith('wood_')) {
            // Revestimiento de Madera con tono dinámico
            let baseHex = '#b45309';
            if (name.startsWith('wood_')) {
                baseHex = name.substring(5);
                if (!baseHex.startsWith('#')) {
                    baseHex = '#' + baseHex;
                }
            }
            
            const darken = (hex, percent) => {
                let num = parseInt(hex.replace("#",""), 16),
                amt = Math.round(2.55 * percent),
                R = (num >> 16) - amt,
                G = (num >> 8 & 0x00FF) - amt,
                B = (num & 0x0000FF) - amt;
                return "#" + (0x1000000 + (R<0?0:R>255?255:R)*0x10000 + (G<0?0:G>255?255:G)*0x100 + (B<0?0:B>255?255:B)).toString(16).slice(1);
            };

            ctx.fillStyle = baseHex;
            ctx.fillRect(0, 0, 512, 512);
            
            ctx.strokeStyle = darken(baseHex, 45);
            ctx.lineWidth = 3.5;
            for (let i = 0; i <= 512; i += 40) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, 512);
                ctx.stroke();
            }
            
            ctx.strokeStyle = darken(baseHex, 20);
            ctx.lineWidth = 1.2;
            for (let k = 0; k < 20; k++) {
                ctx.beginPath();
                let x = Math.random() * 512;
                let y = 0;
                ctx.moveTo(x, y);
                while (y < 512) {
                    x += (Math.random() - 0.5) * 6;
                    y += 15 + Math.random() * 25;
                    ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
            ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
            for (let i = 0; i < 6; i++) {
                ctx.beginPath();
                ctx.arc(Math.random() * 512, Math.random() * 512, 5 + Math.random() * 5, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (name === 'ceramic') {
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, 512, 512);
            
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 3.5;
            for (let i = 0; i <= 512; i += 64) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, 512);
                ctx.moveTo(0, i);
                ctx.lineTo(512, i);
                ctx.stroke();
            }
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            for (let i = 0; i < 512; i += 64) {
                for (let j = 0; j < 512; j += 64) {
                    ctx.fillRect(i + 2, j + 2, 60, 4);
                    ctx.fillRect(i + 2, j + 2, 4, 60);
                }
            }
        } else if (name === 'parquet') {
            ctx.fillStyle = '#b45309';
            ctx.fillRect(0, 0, 512, 512);
            
            const plankW = 128;
            const plankH = 32;
            const colors = ['#b45309', '#c2410c', '#d97706', '#92400e', '#7c2d12'];
            
            for (let y = 0; y < 512; y += plankH) {
                const isEven = (y / plankH) % 2 === 0;
                const offsetX = isEven ? plankW / 2 : 0;
                for (let x = -plankW; x < 512 + plankW; x += plankW) {
                    const colorIdx = Math.floor(Math.abs(Math.sin(x * 9.7 + y * 13.3) * 1000)) % colors.length;
                    ctx.fillStyle = colors[colorIdx];
                    ctx.fillRect(x + offsetX, y, plankW, plankH);
                    
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    let gx = x + offsetX + Math.random() * 10;
                    let gy = y + 2;
                    ctx.moveTo(gx, gy);
                    while (gy < y + plankH - 2) {
                        gx += (Math.random() - 0.5) * 4;
                        gy += 4;
                        ctx.lineTo(gx, gy);
                    }
                    ctx.stroke();
                }
            }
            
            ctx.strokeStyle = '#451a03';
            ctx.lineWidth = 1.5;
            for (let y = 0; y <= 512; y += plankH) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(512, y);
                ctx.stroke();
                
                const isEven = (y / plankH) % 2 === 0;
                const offsetX = isEven ? plankW / 2 : 0;
                for (let x = -plankW; x < 512 + plankW; x += plankW) {
                    ctx.beginPath();
                    ctx.moveTo(x + offsetX, y);
                    ctx.lineTo(x + offsetX, y + plankH);
                    ctx.stroke();
                }
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        if (name === 'tile' || name === 'terracotta' || name === 'cobblestone' || name === 'ceramic') {
            texture.repeat.set(10, 10);
        } else if (name === 'grass' || name === 'gravel') {
            texture.repeat.set(15, 15);
        } else if (name === 'parquet') {
            texture.repeat.set(6, 6);
        } else {
            texture.repeat.set(8, 8);
        }
        
        this.proceduralTextures[name] = texture;
        return texture;
    }

    // --- RECONSTRUCCION DE LA ESCENA

    rebuildScene(walls, openings, furniture, activeFloorMaterial, wallColor, wallMaterial, paths, activeTime, showGrid, showShadows, skyBlue = false, skyClouds = false, groundSize = 30, rooms = [], fences = []) {
        this.clearGeneratedMeshes();
        
        // Recrear GridHelper dinámicamente según el tamaño seleccionado
        if (this.gridHelper) {
            this.scene.remove(this.gridHelper);
            this.gridHelper.geometry.dispose();
            if (Array.isArray(this.gridHelper.material)) {
                this.gridHelper.material.forEach(m => m.dispose());
            } else {
                this.gridHelper.material.dispose();
            }
        }
        
        // Recrear con subdivisiones cada 0.5m (doble del tamaño)
        this.gridHelper = new THREE.GridHelper(groundSize, groundSize * 2, 0x3b82f6, 0x1e293b);
        this.gridHelper.position.y = 0.005;
        this.gridHelper.visible = showGrid;
        this.scene.add(this.gridHelper);
        
        this.renderer.shadowMap.enabled = showShadows;
        this.dirLight.castShadow = showShadows;

        this.updateEnvironmentLight(activeTime, skyBlue);

        const isNightMode = activeTime === 'night';

        this.buildFloor(activeFloorMaterial, groundSize);
        this.buildRooms(rooms); // Cargar pisos de interior para habitaciones detectadas
        
        this.buildPaths(paths); // Reconstruir caminos y ríos

        if (skyClouds) {
            this.buildProceduralClouds(isNightMode);
        }

        this.buildWalls(walls, openings, wallColor, wallMaterial);
        this.buildOpenings(walls, openings);
        this.buildFurniture(furniture, isNightMode);
        this.buildFences(fences); // Reconstruir cercas en 3D
        
        this.renderer.render(this.scene, this.camera);
    }

    clearGeneratedMeshes() {
        const toRemove = [];
        
        this.scene.traverse(node => {
            if (node.userData && (node.userData.isGenerated || node.userData.isFurniture || node.userData.isOpening)) {
                toRemove.push(node);
            }
        });

        toRemove.forEach(mesh => {
            this.scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(m => m.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
        });

        this.furnitureMeshes = [];
        this.selectedObject3D = null;
    }

    updateEnvironmentLight(timePreset, skyBlue = false) {
        const isLight = this.app.theme === 'light';
        switch(timePreset) {
            case 'morning':
                this.scene.background.setHex(skyBlue ? 0xbae6fd : (isLight ? 0xfef3c7 : 0x1c1917));
                this.scene.fog.color.setHex(skyBlue ? 0xbae6fd : (isLight ? 0xfef3c7 : 0x1c1917));
                this.ambientLight.color.setHex(0x93c5fd);
                this.ambientLight.intensity = isLight ? 0.75 : 0.55;
                this.dirLight.color.setHex(0xffd8a8);
                this.dirLight.intensity = 1.1;
                this.dirLight.position.set(-14, 8, 8);
                break;
            case 'noon':
                this.scene.background.setHex(skyBlue ? 0xbae6fd : (isLight ? 0xf1f5f9 : 0x0b0f19));
                this.scene.fog.color.setHex(skyBlue ? 0xbae6fd : (isLight ? 0xf1f5f9 : 0x060913));
                this.ambientLight.color.setHex(0xffffff);
                this.ambientLight.intensity = isLight ? 0.85 : 0.65;
                this.dirLight.color.setHex(0xffffff);
                this.dirLight.intensity = 1.3;
                this.dirLight.position.set(4, 18, 6);
                break;
            case 'sunset':
                this.scene.background.setHex(skyBlue ? 0xfecdd3 : (isLight ? 0xffedd5 : 0x1e1b4b));
                this.scene.fog.color.setHex(skyBlue ? 0xfecdd3 : (isLight ? 0xffedd5 : 0x1e1b4b));
                this.ambientLight.color.setHex(0xf59e0b);
                this.ambientLight.intensity = isLight ? 0.65 : 0.5;
                this.dirLight.color.setHex(0xfca5a5);
                this.dirLight.intensity = 0.85;
                this.dirLight.position.set(15, 6, -5);
                break;
            case 'night':
                this.scene.background.setHex(skyBlue ? 0x090d16 : 0x05070f);
                this.scene.fog.color.setHex(skyBlue ? 0x090d16 : 0x05070f);
                this.ambientLight.color.setHex(0x1e293b);
                this.ambientLight.intensity = 0.25;
                this.dirLight.color.setHex(0x3b82f6);
                this.dirLight.intensity = 0.25;
                this.dirLight.position.set(-10, 15, -10);
                break;
        }
    }

    buildProceduralClouds(isNight) {
        const cloudMat = new THREE.MeshStandardMaterial({
            color: isNight ? 0x27272a : 0xffffff,
            roughness: 0.95,
            metalness: 0.0,
            flatShading: true
        });

        const cloudPositions = [
            [-10, 8, -10], [10, 7, -12], [-5, 9, 8], [8, 8.5, 9],
            [12, 7.5, -2], [-12, 8.2, 3], [0, 9.5, -15], [-8, 7.8, -3],
            [3, 8.8, 12], [-14, 9, -12], [14, 8.5, 10]
        ];

        cloudPositions.forEach(pos => {
            const cloudGroup = new THREE.Group();
            cloudGroup.position.set(pos[0], pos[1], pos[2]);
            cloudGroup.userData = { isGenerated: true };

            const sphereGeo = new THREE.SphereGeometry(1.2, 7, 7);
            
            const m1 = new THREE.Mesh(sphereGeo, cloudMat);
            cloudGroup.add(m1);

            const m2 = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 6), cloudMat);
            m2.position.set(-1.0, -0.2, 0);
            cloudGroup.add(m2);

            const m3 = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 6), cloudMat);
            m3.position.set(1.0, -0.2, 0);
            cloudGroup.add(m3);

            const m4 = new THREE.Mesh(new THREE.SphereGeometry(0.7, 6, 6), cloudMat);
            m4.position.set(0, -0.3, 0.7);
            cloudGroup.add(m4);

            const scale = 0.8 + Math.random() * 0.5;
            cloudGroup.scale.set(scale * 1.5, scale, scale);

            this.scene.add(cloudGroup);
        });
    }

    buildFloor(floorMaterialName, groundSize = 30) {
        const texture = this.getProceduralTexture(floorMaterialName);
        
        // Ajustar el factor de repetición dinámicamente según el tamaño del terreno
        // para mantener constante la escala visual de los materiales
        if (floorMaterialName === 'tile' || floorMaterialName === 'terracotta' || floorMaterialName === 'ceramic') {
            texture.repeat.set(groundSize / 1.0, groundSize / 1.0); // 1 baldosa por metro
        } else if (floorMaterialName === 'grass') {
            texture.repeat.set(groundSize / 0.5, groundSize / 0.5); // 2 repeticiones por metro
        } else if (floorMaterialName === 'oak' || floorMaterialName === 'floating' || floorMaterialName === 'parquet') {
            texture.repeat.set(groundSize / 2.0, groundSize / 2.0); // Madera realista
        } else {
            texture.repeat.set(groundSize / 3.0, groundSize / 3.0); // Mármol / Alfombra suaves
        }

        const floorGeo = new THREE.PlaneGeometry(groundSize, groundSize);
        
        const floorMat = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: floorMaterialName === 'marble' ? 0.15 : (floorMaterialName === 'ceramic' ? 0.2 : 0.6),
            metalness: floorMaterialName === 'marble' ? 0.05 : (floorMaterialName === 'ceramic' ? 0.05 : 0.0)
        });

        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        floor.userData = { isGenerated: true };

        this.scene.add(floor);
    }

    buildRooms(rooms) {
        if (!rooms) return;
        
        rooms.forEach(room => {
            const shape = new THREE.Shape();
            const pts = room.vertices;
            if (pts.length < 3) return;
            
            shape.moveTo(pts[0].x, -pts[0].y);
            for (let i = 1; i < pts.length; i++) {
                shape.lineTo(pts[i].x, -pts[i].y);
            }
            shape.closePath();
            
            const roomFloorGeo = new THREE.ShapeGeometry(shape);
            
            roomFloorGeo.computeBoundingBox();
            const bbox = roomFloorGeo.boundingBox;
            const width = bbox.max.x - bbox.min.x;
            const height = bbox.max.y - bbox.min.y;
            
            const matName = room.material || 'oak';
            const baseTex = this.getProceduralTexture(matName);
            const texture = baseTex.clone();
            texture.needsUpdate = true;
            
            let rep = 2.0;
            if (matName === 'oak' || matName === 'floating' || matName === 'parquet') rep = 1.2;
            else if (matName === 'tile' || matName === 'terracotta' || matName === 'cobblestone' || matName === 'ceramic') rep = 0.8;
            else if (matName === 'concrete') rep = 1.0;
            else if (matName === 'grass') rep = 0.5;
            
            texture.repeat.set(width / rep, height / rep);
            
            const roomFloorMat = new THREE.MeshStandardMaterial({
                map: texture,
                roughness: matName === 'marble' ? 0.15 : (matName === 'ceramic' ? 0.2 : 0.65),
                metalness: matName === 'marble' ? 0.05 : (matName === 'ceramic' ? 0.05 : 0.0)
            });
            
            const roomFloorMesh = new THREE.Mesh(roomFloorGeo, roomFloorMat);
            roomFloorMesh.rotation.x = -Math.PI / 2;
            roomFloorMesh.position.y = 0.006;
            roomFloorMesh.receiveShadow = true;
            roomFloorMesh.userData = { isGenerated: true };
            
            this.scene.add(roomFloorMesh);
        });
    }

    buildPaths(paths) {
        if (!paths) return;
        
        const concreteTexture = this.getProceduralTexture('concrete');

        paths.forEach(path => {
            const dx = path.x2 - path.x1;
            const dy = path.y2 - path.y1;
            const pathLength = Math.hypot(dx, dy);
            if (pathLength < 0.05) return;
            
            const angle = Math.atan2(dy, dx);
            const ux = dx / pathLength;
            const uy = dy / pathLength;

            const thickness = path.thickness || 1.0;
            const height = path.height || 0.015; // 1.5 cm sobre el suelo

            const isRiver = path.id && path.id.startsWith('river_');
            let pathGeo;
            let pathMat;
            const freq = 1.0;  // Frecuencia de la curva del río
            const amp = 0.22;   // Amplitud de las curvas (m)

            if (isRiver) {
                const segments = Math.max(12, Math.round(pathLength * 6));
                pathGeo = new THREE.PlaneGeometry(pathLength, thickness, segments, 2);
                
                // Perturbar los vértices en Y para hacer el río ondulante
                const posAttr = pathGeo.attributes.position;
                const count = posAttr.count;
                const halfLen = pathLength / 2;
                
                for (let i = 0; i < count; i++) {
                    const px = posAttr.getX(i);
                    const py = posAttr.getY(i);
                    
                    // Atenuar la curva en los extremos para que conecten perfectamente con otros tramos
                    const fade = Math.sin((px + halfLen) / pathLength * Math.PI);
                    const offset = Math.sin(px * freq) * amp * fade;
                    
                    posAttr.setY(i, py + offset);
                }
                pathGeo.computeVertexNormals();
                
                // Rotar la geometría en X para acostarla antes de asignarla al Mesh
                pathGeo.rotateX(-Math.PI / 2);

                // Material de agua cristalina y brillante para el río
                pathMat = new THREE.MeshStandardMaterial({
                    color: 0x0284c7, // azul agua
                    roughness: 0.05,
                    metalness: 0.9,
                    transparent: true,
                    opacity: 0.8,
                    side: THREE.DoubleSide
                });
            } else {
                pathGeo = new THREE.BoxGeometry(pathLength, height, thickness);
                
                const matName = path.material || 'concrete';
                const baseTex = this.getProceduralTexture(matName);
                const texClone = baseTex.clone();
                texClone.needsUpdate = true;
                
                let repeatX = pathLength / 1.0;
                let repeatY = thickness / 1.0;
                if (matName === 'cobblestone') {
                    repeatX = pathLength / 0.5;
                    repeatY = thickness / 0.5;
                } else if (matName === 'gravel') {
                    repeatX = pathLength / 0.6;
                    repeatY = thickness / 0.6;
                } else if (matName === 'wood') {
                    repeatX = pathLength / 1.2;
                    repeatY = thickness / 1.2;
                } else if (matName === 'brick') {
                    repeatX = pathLength / 0.8;
                    repeatY = thickness / 0.8;
                }
                
                texClone.repeat.set(repeatX, repeatY);

                pathMat = new THREE.MeshStandardMaterial({
                    map: texClone,
                    roughness: matName === 'concrete' ? 0.85 : (matName === 'wood' ? 0.65 : 0.95),
                    metalness: matName === 'concrete' ? 0.1 : 0.0
                });
            }

            const pathMesh = new THREE.Mesh(pathGeo, pathMat);

            const wx = path.x1 + ux * (pathLength / 2);
            const wz = path.y1 + uy * (pathLength / 2);
            const wy = isRiver ? 0.01 : height / 2;

            pathMesh.position.set(wx, wy, wz);
            pathMesh.rotation.y = -angle;

            pathMesh.receiveShadow = true;
            if (!isRiver) {
                pathMesh.castShadow = true;
            }
            pathMesh.userData = { isGenerated: true };

            // Generar piedras procedurales a lo largo de las orillas onduladas del río
            if (isRiver) {
                const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
                const stoneGeo = new THREE.DodecahedronGeometry(0.12, 1);
                const halfLen = pathLength / 2;

                // Margen izquierdo del río
                for (let x = -halfLen; x <= halfLen; x += 0.45) {
                    const stone = new THREE.Mesh(stoneGeo, stoneMat);
                    const ox = (Math.random() - 0.5) * 0.15;
                    const oz = (Math.random() - 0.5) * 0.08;
                    
                    const fade = Math.sin((x + halfLen) / pathLength * Math.PI);
                    const offset = Math.sin(x * freq) * amp * fade;
                    
                    stone.position.set(x + ox, 0.04, -thickness / 2 + oz + offset);
                    stone.scale.set(1.0, 0.4 + Math.random() * 0.4, 0.8 + Math.random() * 0.4);
                    stone.castShadow = true;
                    stone.receiveShadow = true;
                    pathMesh.add(stone);
                }

                // Margen derecho del río
                for (let x = -halfLen; x <= halfLen; x += 0.45) {
                    const stone = new THREE.Mesh(stoneGeo, stoneMat);
                    const ox = (Math.random() - 0.5) * 0.15;
                    const oz = (Math.random() - 0.5) * 0.08;
                    
                    const fade = Math.sin((x + halfLen) / pathLength * Math.PI);
                    const offset = Math.sin(x * freq) * amp * fade;
                    
                    stone.position.set(x + ox, 0.04, thickness / 2 + oz + offset);
                    stone.scale.set(1.0, 0.4 + Math.random() * 0.4, 0.8 + Math.random() * 0.4);
                    stone.castShadow = true;
                    stone.receiveShadow = true;
                    pathMesh.add(stone);
                }
            }

            this.scene.add(pathMesh);
        });
    }

    buildWalls(walls, openings, wallColorHex, wallMaterialName = 'paint') {
        walls.forEach(wall => {
            const dx = wall.x2 - wall.x1;
            const dy = wall.y2 - wall.y1;
            const wallLength = Math.hypot(dx, dy);
            const angle = Math.atan2(dy, dx);
            const ux = dx / wallLength;
            const uy = dy / wallLength;
 
            const wallOpenings = openings
                .filter(op => op.wallId === wall.id)
                .sort((a, b) => a.distance - b.distance);
 
            let currentDist = 0;

            const activeColor = wall.color || wallColorHex;
            let baseTexture = null;
            let activeMatName = wallMaterialName;
            if (wallMaterialName === 'wood') {
                activeMatName = 'wood_' + activeColor;
            }
            if (wallMaterialName !== 'paint') {
                baseTexture = this.getProceduralTexture(activeMatName);
            }
 
            const createSegment = (startDist, endDist, bottomY = 0, topY = wall.height) => {
                const len = endDist - startDist;
                if (len <= 0.02) return;
 
                const height = topY - bottomY;
                const segGeo = new THREE.BoxGeometry(len, height, wall.thickness);
                
                let segMat;
                if (baseTexture) {
                    const texClone = baseTexture.clone();
                    texClone.needsUpdate = true;
                    // Evitar deformación de textura escalando según el tamaño del tramo
                    let repX = len;
                    let repY = height;
                    if (wallMaterialName === 'brick') {
                        repX = len / 1.0;
                        repY = height / 0.8;
                    } else if (wallMaterialName === 'brick_old') {
                        repX = len / 1.2;
                        repY = height / 1.0;
                    } else if (wallMaterialName === 'wood') {
                        repX = len / 1.0;
                        repY = height / 1.0;
                    }
                    texClone.repeat.set(repX, repY);
                    
                    segMat = new THREE.MeshStandardMaterial({
                        map: texClone,
                        roughness: 0.75,
                        metalness: 0.05
                    });
                } else {
                    segMat = new THREE.MeshStandardMaterial({
                        color: new THREE.Color(activeColor),
                        roughness: 0.85,
                        metalness: 0.0
                    });
                }

                const segMesh = new THREE.Mesh(segGeo, segMat);

                const midDist = startDist + len / 2;
                const wx = wall.x1 + ux * midDist;
                const wz = wall.y1 + uy * midDist;
                const wy = bottomY + (topY - bottomY) / 2;

                segMesh.position.set(wx, wy, wz);
                segMesh.rotation.y = -angle;

                segMesh.castShadow = true;
                segMesh.receiveShadow = true;
                segMesh.userData = { isGenerated: true };

                this.scene.add(segMesh);
            };

            wallOpenings.forEach(op => {
                const startOp = op.distance - op.width / 2;
                const endOp = op.distance + op.width / 2;

                if (startOp > currentDist) {
                    createSegment(currentDist, startOp, 0, wall.height);
                }

                if (op.type === 'window') {
                    createSegment(startOp, endOp, 0, op.yOffset);
                    createSegment(startOp, endOp, op.yOffset + op.height, wall.height);
                } else if (op.type === 'door') {
                    if (op.height < wall.height) {
                        createSegment(startOp, endOp, op.height, wall.height);
                    }
                }

                currentDist = endOp;
            });

            if (currentDist < wallLength) {
                createSegment(currentDist, wallLength, 0, wall.height);
            }
        });
    }

    buildOpenings(walls, openings) {
        openings.forEach(op => {
            const wall = walls.find(w => w.id === op.wallId);
            if (!wall) return;

            const dx = wall.x2 - wall.x1;
            const dy = wall.y2 - wall.y1;
            const wallLength = Math.hypot(dx, dy);
            const angle = Math.atan2(dy, dx);
            const ux = dx / wallLength;
            const uy = dy / wallLength;

            const ox = wall.x1 + ux * op.distance;
            const oz = wall.y1 + uy * op.distance;
            
            const group = new THREE.Group();
            group.position.set(ox, 0, oz);
            group.rotation.y = -angle;
            group.userData = { isOpening: true, openingId: op.id };

            const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
            const glassMat = new THREE.MeshStandardMaterial({
                color: 0x93c5fd,
                roughness: 0.1,
                metalness: 0.9,
                transparent: true,
                opacity: 0.35
            });

            if (op.type === 'door') {
                const frameThick = 0.04;
                const sideGeo = new THREE.BoxGeometry(frameThick, op.height, wall.thickness * 1.05);
                
                const frameL = new THREE.Mesh(sideGeo, frameMat);
                frameL.position.set(-op.width / 2 + frameThick/2, op.height / 2, 0);
                group.add(frameL);

                const frameR = new THREE.Mesh(sideGeo, frameMat);
                frameR.position.set(op.width / 2 - frameThick/2, op.height / 2, 0);
                group.add(frameR);

                const topGeo = new THREE.BoxGeometry(op.width, frameThick, wall.thickness * 1.05);
                const frameTop = new THREE.Mesh(topGeo, frameMat);
                frameTop.position.set(0, op.height - frameThick/2, 0);
                group.add(frameTop);

                const panelW = op.width - frameThick * 2;
                const panelH = op.height - frameThick;
                const panelThick = 0.035;
                const panelGeo = new THREE.BoxGeometry(panelW, panelH, panelThick);
                
                const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.6 });
                const panel = new THREE.Mesh(panelGeo, woodMat);
                
                panel.position.set(panelW / 2, panelH / 2, 0);
                
                const hingeGroup = new THREE.Group();
                hingeGroup.position.set(-op.width / 2 + frameThick, 0, 0);
                hingeGroup.rotation.y = Math.PI / 4;
                hingeGroup.add(panel);
                group.add(hingeGroup);

                const knobGeo = new THREE.SphereGeometry(0.02, 8, 8);
                const knobMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8 });
                const knob = new THREE.Mesh(knobGeo, knobMat);
                knob.position.set(panelW - 0.08, panelH / 2, 0.03);
                panel.add(knob);
            } else if (op.type === 'window') {
                const fThick = 0.04;
                const outerGeo = new THREE.BoxGeometry(op.width, op.height, wall.thickness * 1.05);
                
                const wFrame = new THREE.Mesh(outerGeo, frameMat);
                wFrame.position.y = op.yOffset + op.height / 2;
                group.add(wFrame);

                const glassGeo = new THREE.BoxGeometry(op.width - fThick*2, op.height - fThick*2, 0.01);
                const glass = new THREE.Mesh(glassGeo, glassMat);
                glass.position.y = op.yOffset + op.height / 2;
                group.add(glass);
            }

            this.scene.add(group);
        });
    }

    buildFurniture(furniture, isNightMode) {
        furniture.forEach(furn => {
            const mesh = createModel3D(
                furn.catalogId,
                furn.color,
                furn.width,
                furn.height,
                furn.length,
                isNightMode
            );

            mesh.position.set(furn.x, 0, furn.y);
            mesh.rotation.y = -furn.rotation * Math.PI / 180;
            
            mesh.userData = {
                isFurniture: true,
                furnitureId: furn.id
            };

            mesh.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.userData = { parentFurnitureId: furn.id };
                }
            });

            this.scene.add(mesh);
            this.furnitureMeshes.push(mesh);
        });
    }

    buildFences(fences) {
        if (!fences) return;
        
        fences.forEach(fence => {
            const dx = fence.x2 - fence.x1;
            const dy = fence.y2 - fence.y1;
            const length = Math.hypot(dx, dy);
            if (length < 0.05) return;
            
            const angle = Math.atan2(dy, dx);
            
            const height = fence.height || 1.2;
            const thickness = fence.thickness || 0.15;
            const type = fence.material || 'wood';
            
            const fenceGroup = new THREE.Group();
            fenceGroup.userData = { isGenerated: true };
            
            const mx = fence.x1 + dx / 2;
            const mz = fence.y1 + dy / 2;
            fenceGroup.position.set(mx, 0, mz);
            fenceGroup.rotation.y = -angle;
            
            const woodColor = new THREE.Color('#8b5a2b');
            const metalColor = new THREE.Color('#334155');
            const steelColor = new THREE.Color('#94a3b8');
            
            if (type === 'wood') {
                const postMat = new THREE.MeshStandardMaterial({ color: woodColor, roughness: 0.8 });
                
                const postSize = 0.08;
                const postGeo = new THREE.BoxGeometry(postSize, height, postSize);
                
                const numPosts = Math.max(2, Math.round(length / 1.5) + 1);
                for (let i = 0; i < numPosts; i++) {
                    const postMesh = new THREE.Mesh(postGeo, postMat);
                    postMesh.castShadow = true;
                    postMesh.receiveShadow = true;
                    const lx = -length / 2 + (i / (numPosts - 1)) * length;
                    postMesh.position.set(lx, height / 2, 0);
                    fenceGroup.add(postMesh);
                }
                
                const railSize = 0.04;
                const railGeo = new THREE.BoxGeometry(length, railSize, railSize);
                
                const rail1 = new THREE.Mesh(railGeo, postMat);
                rail1.castShadow = true;
                rail1.receiveShadow = true;
                rail1.position.set(0, height * 0.25, 0);
                fenceGroup.add(rail1);
                
                const rail2 = new THREE.Mesh(railGeo, postMat);
                rail2.castShadow = true;
                rail2.receiveShadow = true;
                rail2.position.set(0, height * 0.75, 0);
                fenceGroup.add(rail2);
                
                const picketW = 0.06;
                const picketH = height - 0.1;
                const picketT = 0.015;
                const picketGeo = new THREE.BoxGeometry(picketW, picketH, picketT);
                
                const picketSpacing = 0.16;
                const numPickets = Math.max(2, Math.round(length / picketSpacing));
                for (let i = 0; i <= numPickets; i++) {
                    const lx = -length / 2 + (i / numPickets) * length;
                    
                    let tooCloseToPost = false;
                    for (let j = 0; j < numPosts; j++) {
                        const px = -length / 2 + (j / (numPosts - 1)) * length;
                        if (Math.abs(lx - px) < 0.06) {
                            tooCloseToPost = true;
                            break;
                        }
                    }
                    if (tooCloseToPost) continue;
                    
                    const picketMesh = new THREE.Mesh(picketGeo, postMat);
                    picketMesh.castShadow = true;
                    picketMesh.receiveShadow = true;
                    picketMesh.position.set(lx, picketH / 2 + 0.05, railSize / 2 + picketT / 2);
                    fenceGroup.add(picketMesh);
                }
            } else if (type === 'metal') {
                const metalMat = new THREE.MeshStandardMaterial({ color: metalColor, roughness: 0.6, metalness: 0.8 });
                
                const postRadius = 0.02;
                const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, height, 8);
                const numPosts = Math.max(2, Math.round(length / 1.8) + 1);
                for (let i = 0; i < numPosts; i++) {
                    const postMesh = new THREE.Mesh(postGeo, metalMat);
                    postMesh.castShadow = true;
                    postMesh.receiveShadow = true;
                    const lx = -length / 2 + (i / (numPosts - 1)) * length;
                    postMesh.position.set(lx, height / 2, 0);
                    fenceGroup.add(postMesh);
                }
                
                const railRadius = 0.015;
                const railGeo = new THREE.CylinderGeometry(railRadius, railRadius, length, 8);
                
                const rail1 = new THREE.Mesh(railGeo, metalMat);
                rail1.castShadow = true;
                rail1.receiveShadow = true;
                rail1.rotation.z = Math.PI / 2;
                rail1.position.set(0, height - 0.05, 0);
                fenceGroup.add(rail1);
                
                const rail2 = new THREE.Mesh(railGeo, metalMat);
                rail2.castShadow = true;
                rail2.receiveShadow = true;
                rail2.rotation.z = Math.PI / 2;
                rail2.position.set(0, 0.08, 0);
                fenceGroup.add(rail2);
                
                const spindleRadius = 0.007;
                const spindleH = height - 0.15;
                const spindleGeo = new THREE.CylinderGeometry(spindleRadius, spindleRadius, spindleH, 6);
                const spindleSpacing = 0.12;
                const numSpindles = Math.max(3, Math.round(length / spindleSpacing));
                for (let i = 0; i <= numSpindles; i++) {
                    const lx = -length / 2 + (i / numSpindles) * length;
                    
                    let tooCloseToPost = false;
                    for (let j = 0; j < numPosts; j++) {
                        const px = -length / 2 + (j / (numPosts - 1)) * length;
                        if (Math.abs(lx - px) < 0.05) {
                            tooCloseToPost = true;
                            break;
                        }
                    }
                    if (tooCloseToPost) continue;
                    
                    const spindleMesh = new THREE.Mesh(spindleGeo, metalMat);
                    spindleMesh.castShadow = true;
                    spindleMesh.receiveShadow = true;
                    spindleMesh.position.set(lx, spindleH / 2 + 0.08, 0);
                    fenceGroup.add(spindleMesh);
                }
            } else if (type === 'glass') {
                const steelMat = new THREE.MeshStandardMaterial({ color: steelColor, roughness: 0.3, metalness: 0.9 });
                const glassMat = new THREE.MeshStandardMaterial({
                    color: 0xe2e8f0,
                    transparent: true,
                    opacity: 0.45,
                    roughness: 0.1,
                    metalness: 0.2
                });
                
                const postRadius = 0.02;
                const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, height, 8);
                const railRadius = 0.025;
                const railGeo = new THREE.CylinderGeometry(railRadius, railRadius, length, 8);
                
                const rail = new THREE.Mesh(railGeo, steelMat);
                rail.castShadow = true;
                rail.receiveShadow = true;
                rail.rotation.z = Math.PI / 2;
                rail.position.set(0, height, 0);
                fenceGroup.add(rail);
                
                const numPosts = Math.max(2, Math.round(length / 1.4) + 1);
                const postPositions = [];
                for (let i = 0; i < numPosts; i++) {
                    const postMesh = new THREE.Mesh(postGeo, steelMat);
                    postMesh.castShadow = true;
                    postMesh.receiveShadow = true;
                    const lx = -length / 2 + (i / (numPosts - 1)) * length;
                    postMesh.position.set(lx, height / 2, 0);
                    fenceGroup.add(postMesh);
                    postPositions.push(lx);
                }
                
                const glassH = height - 0.18;
                const glassThickness = 0.012;
                
                for (let i = 0; i < postPositions.length - 1; i++) {
                    const pStart = postPositions[i];
                    const pEnd = postPositions[i+1];
                    const glassW = (pEnd - pStart) - 0.1;
                    if (glassW <= 0.05) continue;
                    
                    const glassGeo = new THREE.BoxGeometry(glassW, glassH, glassThickness);
                    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
                    glassMesh.position.set(pStart + (pEnd - pStart) / 2, glassH / 2 + 0.08, 0);
                    fenceGroup.add(glassMesh);
                    
                    const clampGeo = new THREE.BoxGeometry(0.04, 0.04, 0.03);
                    const cxOffset = glassW / 2 - 0.02;
                    const cyOffset = glassH / 2 - 0.1;
                    
                    const cPositions = [
                        [pStart + (pEnd - pStart) / 2 - cxOffset, glassH / 2 + 0.08 - cyOffset],
                        [pStart + (pEnd - pStart) / 2 + cxOffset, glassH / 2 + 0.08 - cyOffset],
                        [pStart + (pEnd - pStart) / 2 - cxOffset, glassH / 2 + 0.08 + cyOffset],
                        [pStart + (pEnd - pStart) / 2 + cxOffset, glassH / 2 + 0.08 + cyOffset]
                    ];
                    
                    cPositions.forEach(cp => {
                        const clampMesh = new THREE.Mesh(clampGeo, steelMat);
                        clampMesh.position.set(cp[0], cp[1], 0);
                        fenceGroup.add(clampMesh);
                    });
                }
            }
            
            this.scene.add(fenceGroup);
        });
    }

    // --- RAYCASTING E INTERACCION DE SELECCION/ARRASRE EN 3D ---

    onPointerDown(e) {
        if (this.app.currentViewMode !== '3d') return;
        
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const intersects = this.raycaster.intersectObjects(this.furnitureMeshes, true);
        
        if (intersects.length > 0) {
            let parentNode = intersects[0].object;
            while (parentNode && !parentNode.userData.isFurniture) {
                parentNode = parentNode.parent;
            }
            
            if (parentNode && parentNode.userData.isFurniture) {
                const furnId = parentNode.userData.furnitureId;
                const furnItem = this.app.furniture.find(f => f.id === furnId);
                
                if (furnItem) {
                    this.app.setSelectedElement(furnItem);
                    this.selectedObject3D = parentNode;
                    this.isDragging = true;
                    this.controls.enabled = false;
                    
                    const intersection = new THREE.Vector3();
                    this.raycaster.ray.intersectPlane(this.dragPlane, intersection);
                    this.dragOffset = {
                        x: parentNode.position.x - intersection.x,
                        z: parentNode.position.z - intersection.z
                    };
                }
            }
        } else {
            this.app.setSelectedElement(null);
        }
        
        this.app.editor2D.draw();
    }

    onPointerMove(e) {
        if (this.app.currentViewMode !== '3d') return;
        
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        if (this.isDragging && this.selectedObject3D) {
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersection = new THREE.Vector3();
            
            if (this.raycaster.ray.intersectPlane(this.dragPlane, intersection)) {
                let nx = intersection.x + this.dragOffset.x;
                let nz = intersection.z + this.dragOffset.z;
                
                if (this.app.gridSnap) {
                    nx = Math.round(nx / 0.25) * 0.25;
                    nz = Math.round(nz / 0.25) * 0.25;
                }
                
                this.selectedObject3D.position.x = nx;
                this.selectedObject3D.position.z = nz;
                
                const furnId = this.selectedObject3D.userData.furnitureId;
                const furnItem = this.app.furniture.find(f => f.id === furnId);
                if (furnItem) {
                    furnItem.x = nx;
                    furnItem.y = nz;
                    this.app.updatePropertiesPanel();
                }
            }
        } else {
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.furnitureMeshes, true);
            if (intersects.length > 0) {
                this.renderer.domElement.style.cursor = 'pointer';
            } else {
                this.renderer.domElement.style.cursor = 'default';
            }
        }
    }

    onPointerUp() {
        if (this.app.currentViewMode !== '3d') return;
        
        if (this.isDragging) {
            this.isDragging = false;
            this.selectedObject3D = null;
            this.controls.enabled = true;
            this.app.saveState();
            this.app.editor2D.draw();
        }
    }

    // --- CAPTURAS DE PANTALLA ---

    takeScreenshot() {
        this.gridHelper.visible = false;
        this.renderer.render(this.scene, this.camera);
        
        const dataURL = this.renderer.domElement.toDataURL('image/png');
        
        const link = document.createElement('a');
        link.download = `Habita3D_Diseno_${Date.now()}.png`;
        link.href = dataURL;
        link.click();
        
        this.gridHelper.visible = this.app.showGrid3D;
        this.renderer.render(this.scene, this.camera);
    }
}
