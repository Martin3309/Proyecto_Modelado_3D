/**
 * HABITA3D - CATALOGO Y MODELOS PROCEDURALES (MODULO ES)
 * Define los metadatos de los muebles y las funciones para construirlos en 3D
 */

import * as THREE from 'three';

// Catálogo de muebles con dimensiones por defecto (en metros)
const FURNITURE_CATALOG = {
    // SALA
    'sofa': {
        id: 'sofa',
        name: 'Sofá Premium',
        category: 'living',
        icon: '🛋️',
        defaultWidth: 1.8,
        defaultHeight: 0.75,
        defaultLength: 0.85,
        defaultColor: '#5c50e6',
        description: 'Sofá tapizado confortable con patas metálicas.'
    },
    'armchair': {
        id: 'armchair',
        name: 'Sillón Individual',
        category: 'living',
        icon: '🪑',
        defaultWidth: 0.85,
        defaultHeight: 0.75,
        defaultLength: 0.8,
        defaultColor: '#bf50e6',
        description: 'Sillón individual a juego.'
    },
    'coffee_table': {
        id: 'coffee_table',
        name: 'Mesa de Centro',
        category: 'living',
        icon: '🪵',
        defaultWidth: 1.0,
        defaultHeight: 0.4,
        defaultLength: 0.6,
        defaultColor: '#c29d66',
        description: 'Mesa baja de madera.'
    },
    'tv_unit': {
        id: 'tv_unit',
        name: 'Mueble de TV y Pantalla',
        category: 'living',
        icon: '📺',
        defaultWidth: 1.6,
        defaultHeight: 1.2,
        defaultLength: 0.45,
        defaultColor: '#1e293b',
        description: 'Mueble bajo con pantalla de TV LED integrada.'
    },

    // DORMITORIO
    'bed': {
        id: 'bed',
        name: 'Cama Doble',
        category: 'bedroom',
        icon: '🛏️',
        defaultWidth: 1.7,
        defaultHeight: 0.8,
        defaultLength: 2.1,
        defaultColor: '#f1f5f9',
        description: 'Cama matrimonial con cabecero y sábanas de color.'
    },
    'nightstand': {
        id: 'nightstand',
        name: 'Mesita de Noche',
        category: 'bedroom',
        icon: '🗄️',
        defaultWidth: 0.5,
        defaultHeight: 0.5,
        defaultLength: 0.4,
        defaultColor: '#334155',
        description: 'Pequeña mesita con cajones.'
    },
    'wardrobe': {
        id: 'wardrobe',
        name: 'Armario',
        category: 'bedroom',
        icon: '🚪',
        defaultWidth: 1.5,
        defaultHeight: 2.0,
        defaultLength: 0.6,
        defaultColor: '#475569',
        description: 'Ropero alto de dos puertas.'
    },

    // COCINA / COMEDOR
    'dining_table': {
        id: 'dining_table',
        name: 'Mesa de Comedor',
        category: 'kitchen',
        icon: '🍽️',
        defaultWidth: 1.6,
        defaultHeight: 0.75,
        defaultLength: 0.9,
        defaultColor: '#e2e8f0',
        description: 'Mesa con patas metálicas y tablero moderno.'
    },
    'dining_chair': {
        id: 'dining_chair',
        name: 'Silla de Comedor',
        category: 'kitchen',
        icon: '🪑',
        defaultWidth: 0.45,
        defaultHeight: 0.85,
        defaultLength: 0.45,
        defaultColor: '#475569',
        description: 'Silla ergonómica a juego con el comedor.'
    },
    'kitchen_counter': {
        id: 'kitchen_counter',
        name: 'Encimera de Cocina',
        category: 'kitchen',
        icon: '🍳',
        defaultWidth: 2.0,
        defaultHeight: 0.9,
        defaultLength: 0.65,
        defaultColor: '#0f172a',
        description: 'Encimera con fregadero y quemadores de vitrocerámica.'
    },
    'fridge': {
        id: 'fridge',
        name: 'Refrigerador',
        category: 'kitchen',
        icon: '🧊',
        defaultWidth: 0.75,
        defaultHeight: 1.85,
        defaultLength: 0.75,
        defaultColor: '#cbd5e1',
        description: 'Refrigerador de doble puerta metálico.'
    },

    // BAÑO
    'bathtub': {
        id: 'bathtub',
        name: 'Bañera',
        category: 'bathroom',
        icon: '🛁',
        defaultWidth: 1.6,
        defaultHeight: 0.55,
        defaultLength: 0.75,
        defaultColor: '#ffffff',
        description: 'Bañera exenta con acabados cerámicos.'
    },
    'toilet': {
        id: 'toilet',
        name: 'Inodoro',
        category: 'bathroom',
        icon: '🚽',
        defaultWidth: 0.45,
        defaultHeight: 0.75,
        defaultLength: 0.7,
        defaultColor: '#ffffff',
        description: 'Inodoro clásico de porcelana blanca.'
    },
    'bathroom_sink': {
        id: 'bathroom_sink',
        name: 'Lavabo con Espejo',
        category: 'bathroom',
        icon: '🧼',
        defaultWidth: 0.8,
        defaultHeight: 1.8, // incluye espejo
        defaultLength: 0.5,
        defaultColor: '#64748b',
        description: 'Mueble de baño con lavamanos y espejo flotante.'
    },

    // DECORACION Y LUCES
    'plant': {
        id: 'plant',
        name: 'Planta de Interior',
        category: 'decor',
        icon: '🪴',
        defaultWidth: 0.6,
        defaultHeight: 1.1,
        defaultLength: 0.6,
        defaultColor: '#22c55e',
        description: 'Maceta con planta ornamental estilizada.'
    },
    'floor_lamp': {
        id: 'floor_lamp',
        name: 'Lámpara de Pie',
        category: 'decor',
        icon: '💡',
        defaultWidth: 0.4,
        defaultHeight: 1.6,
        defaultLength: 0.4,
        defaultColor: '#f59e0b',
        description: 'Lámpara de pie que emite luz real en la noche.'
    },
    'tree': {
        id: 'tree',
        name: 'Árbol de Jardín',
        category: 'outdoor',
        icon: '🌳',
        defaultWidth: 2.0,
        defaultHeight: 3.5,
        defaultLength: 2.0,
        defaultColor: '#15803d',
        description: 'Árbol de jardín con tronco y copa de hojas frondosas.'
    },
    'lake_circular': {
        id: 'lake_circular',
        name: 'Lago Circular',
        category: 'outdoor',
        icon: '🔵',
        defaultWidth: 4.0,
        defaultHeight: 0.01,
        defaultLength: 4.0,
        defaultColor: '#0284c7',
        description: 'Lago circular de agua cristalina con borde de piedras.'
    },
    'lake_rectangular': {
        id: 'lake_rectangular',
        name: 'Lago Rectangular',
        category: 'outdoor',
        icon: '🟦',
        defaultWidth: 5.0,
        defaultHeight: 0.01,
        defaultLength: 3.0,
        defaultColor: '#0284c7',
        description: 'Estanque o lago rectangular con borde rústico de rocas.'
    }
};

/**
 * Crea una instancia de modelo 3D (THREE.Group) basada en un ID de catálogo
 * y parámetros de personalización
 */
function createModel3D(catalogId, customColor = null, width = null, height = null, length = null, isNightMode = false) {
    const item = FURNITURE_CATALOG[catalogId];
    if (!item) return new THREE.Group();

    const w = width || item.defaultWidth;
    const h = height || item.defaultHeight;
    const l = length || item.defaultLength;
    const color = customColor || item.defaultColor;

    const group = new THREE.Group();
    group.name = catalogId;

    // Crear materiales estándar compartidos
    const mainMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 0.7,
        metalness: 0.1
    });

    const woodMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b5a2b,
        roughness: 0.5,
        metalness: 0.05
    });

    const metalMaterial = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        roughness: 0.2,
        metalness: 0.8
    });

    const glassMaterial = new THREE.MeshStandardMaterial({
        color: 0x93c5fd,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.4
    });

    const blackMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.4,
        metalness: 0.2
    });

    const whiteMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.9,
        metalness: 0.0
    });

    const goldMaterial = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        roughness: 0.3,
        metalness: 0.8
    });

    // Función auxiliar para habilitar sombras
    function enableShadows(mesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
    }

    switch(catalogId) {
        case 'sofa': {
            // Asiento base
            const seatGeo = new THREE.BoxGeometry(w * 0.8, h * 0.3, l * 0.85);
            const seat = new THREE.Mesh(seatGeo, mainMaterial);
            seat.position.y = h * 0.25;
            enableShadows(seat);
            group.add(seat);

            // Respaldo
            const backGeo = new THREE.BoxGeometry(w * 0.8, h * 0.6, l * 0.15);
            const back = new THREE.Mesh(backGeo, mainMaterial);
            back.position.set(0, h * 0.5, -l * 0.35 + l * 0.075);
            enableShadows(back);
            group.add(back);

            // Reposabrazos Izquierdo
            const armLGeo = new THREE.BoxGeometry(w * 0.1, h * 0.5, l);
            const armL = new THREE.Mesh(armLGeo, mainMaterial);
            armL.position.set(-w * 0.45, h * 0.35, 0);
            enableShadows(armL);
            group.add(armL);

            // Reposabrazos Derecho
            const armRGeo = new THREE.BoxGeometry(w * 0.1, h * 0.5, l);
            const armR = new THREE.Mesh(armRGeo, mainMaterial);
            armR.position.set(w * 0.45, h * 0.35, 0);
            enableShadows(armR);
            group.add(armR);

            // Cojines de asiento
            const cushionGeo = new THREE.BoxGeometry(w * 0.38, h * 0.08, l * 0.7);
            const c1 = new THREE.Mesh(cushionGeo, mainMaterial);
            c1.position.set(-w * 0.19, h * 0.4, l * 0.05);
            enableShadows(c1);
            group.add(c1);

            const c2 = new THREE.Mesh(cushionGeo, mainMaterial);
            c2.position.set(w * 0.19, h * 0.4, l * 0.05);
            enableShadows(c2);
            group.add(c2);

            // Patas
            const legGeo = new THREE.CylinderGeometry(0.02, 0.015, h * 0.2, 8);
            const legPositions = [
                [-w * 0.42, -l * 0.42],
                [w * 0.42, -l * 0.42],
                [-w * 0.42, l * 0.42],
                [w * 0.42, l * 0.42]
            ];
            legPositions.forEach(pos => {
                const leg = new THREE.Mesh(legGeo, metalMaterial);
                leg.position.set(pos[0], h * 0.1, pos[1]);
                enableShadows(leg);
                group.add(leg);
            });
            break;
        }

        case 'armchair': {
            // Asiento base
            const seatGeo = new THREE.BoxGeometry(w * 0.75, h * 0.3, l * 0.75);
            const seat = new THREE.Mesh(seatGeo, mainMaterial);
            seat.position.y = h * 0.25;
            enableShadows(seat);
            group.add(seat);

            // Respaldo
            const backGeo = new THREE.BoxGeometry(w * 0.75, h * 0.6, l * 0.15);
            const back = new THREE.Mesh(backGeo, mainMaterial);
            back.position.set(0, h * 0.5, -l * 0.3);
            enableShadows(back);
            group.add(back);

            // Brazos
            const armLGeo = new THREE.BoxGeometry(w * 0.125, h * 0.5, l);
            const armL = new THREE.Mesh(armLGeo, mainMaterial);
            armL.position.set(-w * 0.4375, h * 0.35, 0);
            enableShadows(armL);
            group.add(armL);

            const armRGeo = new THREE.BoxGeometry(w * 0.125, h * 0.5, l);
            const armR = new THREE.Mesh(armRGeo, mainMaterial);
            armR.position.set(w * 0.4375, h * 0.35, 0);
            enableShadows(armR);
            group.add(armR);

            // Patas
            const legGeo = new THREE.CylinderGeometry(0.02, 0.015, h * 0.2, 8);
            const legPositions = [
                [-w * 0.4, -l * 0.4],
                [w * 0.4, -l * 0.4],
                [-w * 0.4, l * 0.4],
                [w * 0.4, l * 0.4]
            ];
            legPositions.forEach(pos => {
                const leg = new THREE.Mesh(legGeo, woodMaterial);
                leg.position.set(pos[0], h * 0.1, pos[1]);
                enableShadows(leg);
                group.add(leg);
            });
            break;
        }

        case 'coffee_table': {
            // Tablero
            const topGeo = new THREE.BoxGeometry(w, 0.04, l);
            const top = new THREE.Mesh(topGeo, mainMaterial); // usa color elegido
            top.position.y = h - 0.02;
            enableShadows(top);
            group.add(top);

            // Patas
            const legGeo = new THREE.CylinderGeometry(0.025, 0.025, h - 0.04, 8);
            const legPositions = [
                [-w * 0.42, -l * 0.42],
                [w * 0.42, -l * 0.42],
                [-w * 0.42, l * 0.42],
                [w * 0.42, l * 0.42]
            ];
            legPositions.forEach(pos => {
                const leg = new THREE.Mesh(legGeo, woodMaterial);
                leg.position.set(pos[0], (h - 0.04) / 2, pos[1]);
                enableShadows(leg);
                group.add(leg);
            });
            break;
        }

        case 'tv_unit': {
            // Mueble Base
            const baseGeo = new THREE.BoxGeometry(w, h * 0.35, l);
            const base = new THREE.Mesh(baseGeo, mainMaterial);
            base.position.y = h * 0.175;
            enableShadows(base);
            group.add(base);

            // Estantes/Huecos
            const shelfGeo = new THREE.BoxGeometry(w * 0.45, h * 0.2, l * 0.95);
            const s1 = new THREE.Mesh(shelfGeo, blackMaterial);
            s1.position.set(-w * 0.22, h * 0.175, l * 0.03);
            enableShadows(s1);
            group.add(s1);

            const s2 = new THREE.Mesh(shelfGeo, blackMaterial);
            s2.position.set(w * 0.22, h * 0.175, l * 0.03);
            enableShadows(s2);
            group.add(s2);

            // Soporte TV
            const standGeo = new THREE.BoxGeometry(0.2, 0.02, 0.2);
            const stand = new THREE.Mesh(standGeo, metalMaterial);
            stand.position.set(0, h * 0.36, 0);
            enableShadows(stand);
            group.add(stand);

            const poleGeo = new THREE.CylinderGeometry(0.02, 0.02, h * 0.2, 8);
            const pole = new THREE.Mesh(poleGeo, metalMaterial);
            pole.position.set(0, h * 0.45, 0);
            enableShadows(pole);
            group.add(pole);

            // Pantalla TV
            const tvGeo = new THREE.BoxGeometry(w * 0.8, h * 0.6, 0.04);
            const tv = new THREE.Mesh(tvGeo, blackMaterial);
            tv.position.set(0, h * 0.8, 0);
            enableShadows(tv);
            group.add(tv);

            // Pantalla de cristal brillante
            const screenGeo = new THREE.BoxGeometry(w * 0.77, h * 0.55, 0.005);
            const screenMat = new THREE.MeshStandardMaterial({
                color: 0x050505,
                roughness: 0.1,
                metalness: 0.9
            });
            const screen = new THREE.Mesh(screenGeo, screenMat);
            screen.position.set(0, h * 0.8, 0.021);
            group.add(screen);
            break;
        }

        case 'bed': {
            // Estructura base de la cama
            const frameGeo = new THREE.BoxGeometry(w, h * 0.35, l);
            const frame = new THREE.Mesh(frameGeo, woodMaterial);
            frame.position.y = h * 0.175;
            enableShadows(frame);
            group.add(frame);

            // Cabecero
            const headGeo = new THREE.BoxGeometry(w, h * 0.9, l * 0.08);
            const head = new THREE.Mesh(headGeo, woodMaterial);
            head.position.set(0, h * 0.45, -l * 0.5 + l * 0.04);
            enableShadows(head);
            group.add(head);

            // Colchón (blanco)
            const mattressGeo = new THREE.BoxGeometry(w * 0.95, h * 0.25, l * 0.88);
            const mattress = new THREE.Mesh(mattressGeo, whiteMaterial);
            mattress.position.set(0, h * 0.4, l * 0.045);
            enableShadows(mattress);
            group.add(mattress);

            // Almohadas
            const pillowGeo = new THREE.BoxGeometry(w * 0.38, 0.08, 0.28);
            const p1 = new THREE.Mesh(pillowGeo, whiteMaterial);
            p1.position.set(-w * 0.22, h * 0.54, -l * 0.3);
            p1.rotation.x = 0.15; // Inclinación
            enableShadows(p1);
            group.add(p1);

            const p2 = new THREE.Mesh(pillowGeo, whiteMaterial);
            p2.position.set(w * 0.22, h * 0.54, -l * 0.3);
            p2.rotation.x = 0.15;
            enableShadows(p2);
            group.add(p2);

            // Manta / Edredón (personalizado con el color de la cama)
            const coverGeo = new THREE.BoxGeometry(w * 0.97, h * 0.26, l * 0.65);
            const cover = new THREE.Mesh(coverGeo, mainMaterial);
            cover.position.set(0, h * 0.405, l * 0.16);
            enableShadows(cover);
            group.add(cover);
            break;
        }

        case 'nightstand': {
            // Cuerpo de la mesita
            const bodyGeo = new THREE.BoxGeometry(w, h * 0.9, l);
            const body = new THREE.Mesh(bodyGeo, mainMaterial);
            body.position.y = h * 0.45;
            enableShadows(body);
            group.add(body);

            // Cajón Superior
            const drawerGeo = new THREE.BoxGeometry(w * 0.9, h * 0.32, l * 0.03);
            const d1 = new THREE.Mesh(drawerGeo, woodMaterial);
            d1.position.set(0, h * 0.65, l * 0.49);
            enableShadows(d1);
            group.add(d1);

            // Pomo metálico
            const knobGeo = new THREE.SphereGeometry(0.015, 8, 8);
            const k1 = new THREE.Mesh(knobGeo, metalMaterial);
            k1.position.set(0, h * 0.65, l * 0.51);
            group.add(k1);

            // Cajón Inferior
            const d2 = new THREE.Mesh(drawerGeo, woodMaterial);
            d2.position.set(0, h * 0.25, l * 0.49);
            enableShadows(d2);
            group.add(d2);

            const k2 = new THREE.Mesh(knobGeo, metalMaterial);
            k2.position.set(0, h * 0.25, l * 0.51);
            group.add(k2);

            // Patas
            const legGeo = new THREE.BoxGeometry(w * 0.1, h * 0.1, l * 0.1);
            const legPositions = [
                [-w * 0.4, -l * 0.4],
                [w * 0.4, -l * 0.4],
                [-w * 0.4, l * 0.4],
                [w * 0.4, l * 0.4]
            ];
            legPositions.forEach(pos => {
                const leg = new THREE.Mesh(legGeo, woodMaterial);
                leg.position.set(pos[0], h * 0.05, pos[1]);
                enableShadows(leg);
                group.add(leg);
            });
            break;
        }

        case 'wardrobe': {
            // Cuerpo del armario
            const bodyGeo = new THREE.BoxGeometry(w, h, l);
            const body = new THREE.Mesh(bodyGeo, mainMaterial);
            body.position.y = h * 0.5;
            enableShadows(body);
            group.add(body);

            // Puertas (detalles visuales)
            const doorGeo = new THREE.BoxGeometry(w * 0.45, h * 0.94, 0.02);
            const doorL = new THREE.Mesh(doorGeo, woodMaterial);
            doorL.position.set(-w * 0.23, h * 0.5, l * 0.495);
            enableShadows(doorL);
            group.add(doorL);

            const doorR = new THREE.Mesh(doorGeo, woodMaterial);
            doorR.position.set(w * 0.23, h * 0.5, l * 0.495);
            enableShadows(doorR);
            group.add(doorR);

            // Tiradores de metal
            const handleGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.2, 8);
            const hL = new THREE.Mesh(handleGeo, metalMaterial);
            hL.position.set(-0.03, h * 0.5, l * 0.51);
            group.add(hL);

            const hR = new THREE.Mesh(handleGeo, metalMaterial);
            hR.position.set(0.03, h * 0.5, l * 0.51);
            group.add(hR);
            break;
        }

        case 'dining_table': {
            // Tablero principal
            const topGeo = new THREE.BoxGeometry(w, 0.05, l);
            const top = new THREE.Mesh(topGeo, mainMaterial); // usa color
            top.position.y = h - 0.025;
            enableShadows(top);
            group.add(top);

            // Patas metálicas de diseño
            const legGeo = new THREE.CylinderGeometry(0.03, 0.015, h - 0.05, 8);
            const legPositions = [
                [-w * 0.42, -l * 0.42],
                [w * 0.42, -l * 0.42],
                [-w * 0.42, l * 0.42],
                [w * 0.42, l * 0.42]
            ];
            legPositions.forEach(pos => {
                const leg = new THREE.Mesh(legGeo, metalMaterial);
                leg.position.set(pos[0], (h - 0.05) / 2, pos[1]);
                enableShadows(leg);
                group.add(leg);
            });
            break;
        }

        case 'dining_chair': {
            // Patas
            const legGeo = new THREE.CylinderGeometry(0.015, 0.01, h * 0.45, 8);
            const legPositions = [
                [-w * 0.4, -l * 0.4],
                [w * 0.4, -l * 0.4],
                [-w * 0.4, l * 0.4],
                [w * 0.4, l * 0.4]
            ];
            legPositions.forEach(pos => {
                const leg = new THREE.Mesh(legGeo, woodMaterial);
                leg.position.set(pos[0], h * 0.225, pos[1]);
                enableShadows(leg);
                group.add(leg);
            });

            // Asiento
            const seatGeo = new THREE.BoxGeometry(w, 0.04, l);
            const seat = new THREE.Mesh(seatGeo, mainMaterial);
            seat.position.y = h * 0.46;
            enableShadows(seat);
            group.add(seat);

            // Respaldo
            const backGeo = new THREE.BoxGeometry(w, h * 0.45, l * 0.06);
            const back = new THREE.Mesh(backGeo, mainMaterial);
            back.position.set(0, h * 0.68, -l * 0.45);
            enableShadows(back);
            group.add(back);
            break;
        }

        case 'kitchen_counter': {
            // Mueble Base
            const baseGeo = new THREE.BoxGeometry(w, h * 0.94, l);
            const base = new THREE.Mesh(baseGeo, mainMaterial);
            base.position.y = (h * 0.94) / 2;
            enableShadows(base);
            group.add(base);

            // Encimera (Mármol/Negra)
            const topGeo = new THREE.BoxGeometry(w * 1.02, h * 0.06, l * 1.04);
            const topMat = new THREE.MeshStandardMaterial({
                color: 0x111827,
                roughness: 0.15,
                metalness: 0.1
            });
            const top = new THREE.Mesh(topGeo, topMat);
            top.position.y = h - h * 0.03;
            enableShadows(top);
            group.add(top);

            // Zócalo inferior
            const kickGeo = new THREE.BoxGeometry(w * 0.98, h * 0.08, l * 0.9);
            const kick = new THREE.Mesh(kickGeo, blackMaterial);
            kick.position.set(0, h * 0.04, l * 0.05);
            enableShadows(kick);
            group.add(kick);

            // Fregadero metálico
            const sinkGeo = new THREE.BoxGeometry(w * 0.25, 0.005, l * 0.55);
            const sink = new THREE.Mesh(sinkGeo, metalMaterial);
            sink.position.set(-w * 0.25, h + 0.001, 0);
            group.add(sink);

            // Grifo
            const tapGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.12, 8);
            const tap = new THREE.Mesh(tapGeo, metalMaterial);
            tap.position.set(-w * 0.25, h + 0.06, -l * 0.22);
            group.add(tap);

            // Fuego de vitrocerámica
            const stoveGeo = new THREE.BoxGeometry(w * 0.3, 0.002, l * 0.6);
            const stove = new THREE.Mesh(stoveGeo, blackMaterial);
            stove.position.set(w * 0.22, h + 0.001, 0);
            group.add(stove);

            const burnerGeo = new THREE.CylinderGeometry(w * 0.06, w * 0.06, 0.004, 16);
            const burnerMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
            const b1 = new THREE.Mesh(burnerGeo, burnerMat);
            b1.position.set(w * 0.15, h + 0.002, -l * 0.12);
            group.add(b1);

            const b2 = new THREE.Mesh(burnerGeo, burnerMat);
            b2.position.set(w * 0.28, h + 0.002, l * 0.12);
            group.add(b2);
            break;
        }

        case 'fridge': {
            // Cuerpo nevera
            const bodyGeo = new THREE.BoxGeometry(w, h, l);
            const body = new THREE.Mesh(bodyGeo, mainMaterial);
            body.position.y = h * 0.5;
            enableShadows(body);
            group.add(body);

            // Divisor de puerta (línea oscura)
            const divGeo = new THREE.BoxGeometry(w * 1.004, 0.008, l * 1.004);
            const div = new THREE.Mesh(divGeo, blackMaterial);
            div.position.y = h * 0.65;
            group.add(div);

            // Tirador congelador (arriba)
            const handle1Geo = new THREE.BoxGeometry(w * 0.04, h * 0.12, l * 0.03);
            const h1 = new THREE.Mesh(handle1Geo, metalMaterial);
            h1.position.set(w * 0.38, h * 0.53, l * 0.51);
            group.add(h1);

            // Tirador refrigerador (abajo)
            const handle2Geo = new THREE.BoxGeometry(w * 0.04, h * 0.24, l * 0.03);
            const h2 = new THREE.Mesh(handle2Geo, metalMaterial);
            h2.position.set(w * 0.38, h * 0.77, l * 0.51);
            group.add(h2);
            break;
        }

        case 'bathtub': {
            // Base principal
            const tubGeo = new THREE.BoxGeometry(w, h, l);
            const tub = new THREE.Mesh(tubGeo, mainMaterial); // blanco cerámica
            tub.position.y = h * 0.5;
            enableShadows(tub);
            group.add(tub);

            // Interior "hueco" (una capa de material oscuro para dar profundidad)
            const cavityGeo = new THREE.BoxGeometry(w * 0.9, 0.002, l * 0.85);
            const cavMat = new THREE.MeshStandardMaterial({
                color: 0xe2e8f0,
                roughness: 0.1
            });
            const cav = new THREE.Mesh(cavityGeo, cavMat);
            cav.position.set(0, h * 0.95, 0);
            group.add(cav);

            // Grifería
            const spoutGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.1, 8);
            const spout = new THREE.Mesh(spoutGeo, metalMaterial);
            spout.position.set(-w * 0.44, h * 1.05, 0);
            spout.rotation.z = -Math.PI / 3;
            group.add(spout);
            break;
        }

        case 'toilet': {
            // Taza base
            const bowlGeo = new THREE.BoxGeometry(w, h * 0.55, l * 0.65);
            const bowl = new THREE.Mesh(bowlGeo, mainMaterial);
            bowl.position.set(0, h * 0.275, l * 0.17);
            enableShadows(bowl);
            group.add(bowl);

            // Tanque de agua
            const tankGeo = new THREE.BoxGeometry(w * 0.95, h * 0.5, l * 0.3);
            const tank = new THREE.Mesh(tankGeo, mainMaterial);
            tank.position.set(0, h * 0.5, -l * 0.35 + l * 0.15);
            enableShadows(tank);
            group.add(tank);

            // Tapa del inodoro
            const lidGeo = new THREE.BoxGeometry(w * 0.9, 0.04, l * 0.62);
            const lid = new THREE.Mesh(lidGeo, whiteMaterial);
            lid.position.set(0, h * 0.57, l * 0.185);
            enableShadows(lid);
            group.add(lid);

            // Pulsador descarga
            const buttonGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.01, 8);
            const btn = new THREE.Mesh(buttonGeo, metalMaterial);
            btn.position.set(w * 0.25, h * 0.75 + 0.005, -l * 0.2);
            group.add(btn);
            break;
        }

        case 'bathroom_sink': {
            // Armario inferior
            const cabinetGeo = new THREE.BoxGeometry(w, h * 0.45, l);
            const cabinet = new THREE.Mesh(cabinetGeo, mainMaterial); // color elegido
            cabinet.position.y = (h * 0.45) / 2;
            enableShadows(cabinet);
            group.add(cabinet);

            // Lavamanos de cerámica (blanco)
            const bowlGeo = new THREE.BoxGeometry(w * 0.9, h * 0.08, l * 0.9);
            const bowlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });
            const bowl = new THREE.Mesh(bowlGeo, bowlMat);
            bowl.position.y = h * 0.49;
            enableShadows(bowl);
            group.add(bowl);

            // Fregadero / Grifo
            const faucetGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.12, 8);
            const faucet = new THREE.Mesh(faucetGeo, metalMaterial);
            faucet.position.set(0, h * 0.6, -l * 0.35);
            faucet.rotation.x = Math.PI / 12;
            group.add(faucet);

            // Espejo
            const frameGeo = new THREE.BoxGeometry(w * 0.8, h * 0.45, 0.03);
            const frame = new THREE.Mesh(frameGeo, woodMaterial);
            frame.position.set(0, h * 0.75, -l * 0.45);
            enableShadows(frame);
            group.add(frame);

            const glassGeo = new THREE.BoxGeometry(w * 0.72, h * 0.38, 0.005);
            const glass = new THREE.Mesh(glassGeo, glassMaterial);
            glass.position.set(0, h * 0.75, -l * 0.45 + 0.016);
            group.add(glass);
            break;
        }

        case 'plant': {
            // Maceta
            const potGeo = new THREE.CylinderGeometry(w * 0.25, w * 0.18, h * 0.3, 12);
            const potMat = new THREE.MeshStandardMaterial({
                color: 0xaa7050, // terracota
                roughness: 0.8
            });
            const pot = new THREE.Mesh(potGeo, potMat);
            pot.position.y = h * 0.15;
            enableShadows(pot);
            group.add(pot);

            // Tierra
            const soilGeo = new THREE.CylinderGeometry(w * 0.23, w * 0.23, 0.01, 12);
            const soilMat = new THREE.MeshStandardMaterial({ color: 0x422f25, roughness: 0.9 });
            const soil = new THREE.Mesh(soilGeo, soilMat);
            soil.position.y = h * 0.29;
            group.add(soil);

            // Tallo central
            const trunkGeo = new THREE.CylinderGeometry(0.015, 0.02, h * 0.6, 8);
            const trunk = new THREE.Mesh(trunkGeo, woodMaterial);
            trunk.position.y = h * 0.55;
            enableShadows(trunk);
            group.add(trunk);

            // Hojas (esferas de color verde translúcidas/mates)
            const leafPositions = [
                [0, h * 0.85, 0, w * 0.3],
                [-w * 0.15, h * 0.75, w * 0.1, w * 0.22],
                [w * 0.15, h * 0.7, -w * 0.1, w * 0.22],
                [-w * 0.08, h * 0.6, -w * 0.15, w * 0.18],
                [w * 0.08, h * 0.8, w * 0.15, w * 0.2],
            ];
            leafPositions.forEach(pos => {
                const leafGeo = new THREE.SphereGeometry(pos[3], 8, 8);
                const leaf = new THREE.Mesh(leafGeo, mainMaterial); // usa color verde
                leaf.position.set(pos[0], pos[1], pos[2]);
                leaf.scale.set(1.0, 1.3, 1.0); // estirar verticalmente
                enableShadows(leaf);
                group.add(leaf);
            });
            break;
        }

        case 'floor_lamp': {
            // Base metálica
            const baseGeo = new THREE.CylinderGeometry(w * 0.4, w * 0.4, 0.02, 16);
            const base = new THREE.Mesh(baseGeo, metalMaterial);
            base.position.y = 0.01;
            enableShadows(base);
            group.add(base);

            // Poste central
            const poleGeo = new THREE.CylinderGeometry(0.015, 0.015, h - 0.3, 8);
            const pole = new THREE.Mesh(poleGeo, metalMaterial);
            pole.position.y = (h - 0.3) / 2;
            enableShadows(pole);
            group.add(pole);

            // Pantalla
            const shadeGeo = new THREE.CylinderGeometry(w * 0.3, w * 0.5, 0.28, 16, 1, true);
            const shadeMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(color),
                roughness: 0.9,
                side: THREE.DoubleSide
            });
            const shade = new THREE.Mesh(shadeGeo, shadeMat);
            shade.position.y = h - 0.14;
            enableShadows(shade);
            group.add(shade);

            // Foco luminoso interno (para modo noche)
            const bulbGeo = new THREE.SphereGeometry(0.04, 8, 8);
            let bulbMat;
            if (isNightMode) {
                bulbMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
                
                // Luz real en Three.js
                const light = new THREE.PointLight(0xffedd5, 1.2, 8);
                light.position.set(0, h - 0.15, 0);
                light.castShadow = true;
                light.shadow.bias = -0.002;
                light.shadow.mapSize.width = 512;
                light.shadow.mapSize.height = 512;
                group.add(light);
            } else {
                bulbMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.2 });
            }
            const bulb = new THREE.Mesh(bulbGeo, bulbMat);
            bulb.position.y = h - 0.15;
            group.add(bulb);
            break;
        }
        
        case 'tree': {
            // Tronco (Trunk)
            const trunkHeight = h * 0.35;
            const trunkRadius = w * 0.1;
            const trunkGeo = new THREE.CylinderGeometry(trunkRadius * 0.8, trunkRadius, trunkHeight, 8);
            const trunk = new THREE.Mesh(trunkGeo, woodMaterial);
            trunk.position.y = trunkHeight / 2;
            enableShadows(trunk);
            group.add(trunk);

            // Copa de hojas en 3 niveles (Foliage layers)
            // Capa 1: Base de la copa
            const r1 = w * 0.45;
            const c1Geo = new THREE.SphereGeometry(r1, 8, 8);
            const c1Mat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(color),
                roughness: 0.85,
                metalness: 0.0
            });
            const c1 = new THREE.Mesh(c1Geo, c1Mat);
            c1.position.set(0, trunkHeight + r1 * 0.6, 0);
            c1.scale.set(1.1, 0.9, 1.1);
            enableShadows(c1);
            group.add(c1);

            // Capa 2: Parte media (verde más oscuro para sombra interna)
            const r2 = w * 0.38;
            const c2Geo = new THREE.SphereGeometry(r2, 8, 8);
            const c2Mat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(color).clone().multiplyScalar(0.85),
                roughness: 0.85,
                metalness: 0.0
            });
            const c2 = new THREE.Mesh(c2Geo, c2Mat);
            c2.position.set(0, trunkHeight + r1 * 1.0 + r2 * 0.5, 0);
            c2.scale.set(1.0, 0.95, 1.0);
            enableShadows(c2);
            group.add(c2);

            // Capa 3: Ápice (verde más claro para reflejar la luz del sol)
            const r3 = w * 0.28;
            const c3Geo = new THREE.SphereGeometry(r3, 8, 8);
            const c3Mat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(color).clone().multiplyScalar(1.15),
                roughness: 0.85,
                metalness: 0.0
            });
            const c3 = new THREE.Mesh(c3Geo, c3Mat);
            c3.position.set(0, trunkHeight + r1 * 1.0 + r2 * 0.9 + r3 * 0.5, 0);
            enableShadows(c3);
            group.add(c3);
            break;
        }

        case 'lake_circular': {
            const rad = w / 2;
            const hVal = h || 0.01;
            const lakeGeo = new THREE.CylinderGeometry(rad, rad, hVal, 32);
            const waterMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(color),
                roughness: 0.05,
                metalness: 0.9,
                transparent: true,
                opacity: 0.8
            });
            const lakeMesh = new THREE.Mesh(lakeGeo, waterMat);
            lakeMesh.position.y = hVal / 2;
            lakeMesh.receiveShadow = true;
            group.add(lakeMesh);
            
            // Borde de piedras
            const borderGroup = new THREE.Group();
            const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
            const numStones = Math.max(12, Math.floor(rad * 15)); // Ajustado al tamaño del lago
            const stoneRad = 0.15;
            for (let i = 0; i < numStones; i++) {
                const angle = (i / numStones) * Math.PI * 2;
                const sx = Math.cos(angle) * (rad + 0.04);
                const sz = Math.sin(angle) * (rad + 0.04);
                const sy = 0.03;
                const stoneGeo = new THREE.DodecahedronGeometry(stoneRad, 1);
                const stone = new THREE.Mesh(stoneGeo, stoneMat);
                stone.position.set(sx, sy, sz);
                stone.scale.set(1.0, 0.4 + Math.random() * 0.4, 0.8 + Math.random() * 0.4);
                enableShadows(stone);
                borderGroup.add(stone);
            }
            group.add(borderGroup);
            break;
        }

        case 'lake_rectangular': {
            const hVal = h || 0.01;
            const lakeGeo = new THREE.BoxGeometry(w, hVal, l);
            const waterMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(color),
                roughness: 0.05,
                metalness: 0.9,
                transparent: true,
                opacity: 0.8
            });
            const lakeMesh = new THREE.Mesh(lakeGeo, waterMat);
            lakeMesh.position.y = hVal / 2;
            lakeMesh.receiveShadow = true;
            group.add(lakeMesh);

            // Borde perimetral de piedras
            const borderGroup = new THREE.Group();
            const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
            const stoneGeo = new THREE.DodecahedronGeometry(0.12, 1);
            
            const halfW = w / 2;
            const halfL = l / 2;
            
            const addStone = (x, z) => {
                const stone = new THREE.Mesh(stoneGeo, stoneMat);
                stone.position.set(x, 0.03, z);
                stone.scale.set(1.0, 0.4 + Math.random() * 0.4, 0.8 + Math.random() * 0.4);
                enableShadows(stone);
                borderGroup.add(stone);
            };

            // Bordes horizontales
            for (let x = -halfW; x <= halfW; x += 0.35) {
                addStone(x, -halfL - 0.04);
                addStone(x, halfL + 0.04);
            }
            // Bordes verticales
            for (let z = -halfL + 0.35; z < halfL; z += 0.35) {
                addStone(-halfW - 0.04, z);
                addStone(halfW + 0.04, z);
            }
            group.add(borderGroup);
            break;
        }
    }

    return group;
}

export { FURNITURE_CATALOG, createModel3D };
