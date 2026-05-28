/**
 * HABITA3D - EDITOR 2D (MODULO ES)
 * Maneja el lienzo 2D, el plano de planta, dibujo de paredes e interactividad
 */

import { FURNITURE_CATALOG } from './models.js';

export default class Editor2D {
    constructor(canvasId, containerId, app) {
        this.canvas = document.getElementById(canvasId);
        this.container = document.getElementById(containerId);
        this.ctx = this.canvas.getContext('2d');
        this.app = app; // Referencia al orquestador principal

        // Configuración de visualización
        this.zoom = 40; // Píxeles por metro (40px = 1m)
        this.panX = 0;  // Desplazamiento X en píxeles (desde el centro)
        this.panY = 0;  // Desplazamiento Y en píxeles (desde el centro)
        
        // Estados de interacción
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        this.panStartClientX = 0;
        this.panStartClientY = 0;
        this.hasMovedWhilePanning = false;
        
        this.draggedItem = null;
        this.draggedNode = null;
        this.dragOffset = { x: 0, y: 0 };
        
        // Paredes, caminos y cercas temporales
        this.wallChainStart = null;
        this.pathChainStart = null;
        this.fenceChainStart = null;
        
        // Estados para el indicador visual de snap
        this.isSnapActive = false;
        this.snapPosition = null;
        this.snapIndicatorType = null;
        
        // Elemento resaltado al pasar el ratón (hover)
        this.hoveredItem = null;
        
        this.initEvents();
        this.resize();
    }

    resize() {
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        
        // Centrar el origen la primera vez
        if (this.panX === 0 && this.panY === 0) {
            this.panX = this.canvas.width / 2;
            this.panY = this.canvas.height / 2;
        }
        
        this.draw();
    }

    initEvents() {
        // Redimensionamiento
        window.addEventListener('resize', () => this.resize());
        
        // Mouse Down
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 2 || e.button === 1 || (e.button === 0 && (e.shiftKey || this.app.currentTool === 'pan'))) {
                // Click derecho (2), central (1), Shift+Click o Herramienta Desplazar activa: Iniciar Pan
                this.isPanning = true;
                this.hasMovedWhilePanning = false;
                this.panStartX = e.clientX - this.panX;
                this.panStartY = e.clientY - this.panY;
                this.panStartClientX = e.clientX;
                this.panStartClientY = e.clientY;
                this.canvas.style.cursor = 'grabbing';
                return;
            }

            if (e.button === 0) { // Click izquierdo
                const mouseWorld = this.getMouseWorld(e);
                
                if (this.app.currentTool === 'wall') {
                    this.handleWallDrawingClick(mouseWorld);
                } else if (['path', 'river'].includes(this.app.currentTool)) {
                    this.handlePathDrawingClick(mouseWorld);
                } else if (this.app.currentTool === 'fence') {
                    this.handleFenceDrawingClick(mouseWorld);
                } else if (this.app.currentTool === 'select') {
                    this.handleSelectionClick(mouseWorld, e);
                } else if (this.app.currentTool === 'room') {
                    this.handleRoomMarkerPlacementClick(mouseWorld);
                } else if (['door', 'window'].includes(this.app.currentTool)) {
                    this.handleOpeningPlacementClick(mouseWorld);
                } else if (this.app.currentFurnitureTool) {
                    this.handleFurniturePlacementClick(mouseWorld);
                }
            }
        });

        // Mouse Leave Canvas
        this.canvas.addEventListener('mouseleave', () => {
            if (this.hoveredItem) {
                this.hoveredItem = null;
                this.draw();
            }
        });

        // Mouse Move
        this.canvas.addEventListener('mousemove', (e) => {
            const mouseWorld = this.getMouseWorld(e);
            
            if (this.isPanning) {
                if (!this.hasMovedWhilePanning) {
                    const dist = Math.hypot(e.clientX - this.panStartClientX, e.clientY - this.panStartClientY);
                    if (dist > 5) {
                        this.hasMovedWhilePanning = true;
                    }
                }
                this.panX = e.clientX - this.panStartX;
                this.panY = e.clientY - this.panStartY;
                this.draw();
                return;
            }

            if (this.draggedItem && this.app.currentTool === 'select') {
                this.handleDragging(mouseWorld);
                this.draw();
                return;
            }

            // Cambiar cursores y actualizar dibujos temporales
            if (this.app.currentTool === 'wall') {
                const { snappedPt, snapType } = this.getWallSnapPoint(mouseWorld, this.wallChainStart);
                if (snapType) {
                    this.isSnapActive = true;
                    this.snapPosition = { x: snappedPt.x, y: snappedPt.y };
                    this.snapIndicatorType = snapType;
                } else {
                    this.isSnapActive = false;
                    this.snapPosition = null;
                    this.snapIndicatorType = null;
                }
                this.draw();
            } else if (['path', 'river'].includes(this.app.currentTool) && this.pathChainStart) {
                this.draw(); // Previsualización del camino/río
            } else if (this.app.currentTool === 'fence' && this.fenceChainStart) {
                this.draw(); // Previsualización de cerca
            } else if (['door', 'window'].includes(this.app.currentTool) || this.app.currentFurnitureTool) {
                this.draw(); // Mostrar previsualización flotante
            } else if (this.app.currentTool === 'select') {
                // Resaltar elementos al pasar por encima
                const hovered = this.findElementAt(mouseWorld);
                if (hovered) {
                    this.canvas.style.cursor = 'pointer';
                } else {
                    this.canvas.style.cursor = 'default';
                }
                
                if (this.hoveredItem !== hovered) {
                    this.hoveredItem = hovered;
                    this.draw();
                }
                
                // Si hay un elemento resaltado (hover), solicitar animación continua para el pulso del brillo
                if (this.hoveredItem) {
                    requestAnimationFrame(() => this.draw());
                }
            } else if (this.app.currentTool === 'pan') {
                this.canvas.style.cursor = this.isPanning ? 'grabbing' : 'grab';
            }
        });

        // Mouse Up
        window.addEventListener('mouseup', () => {
            if (this.isPanning) {
                this.isPanning = false;
                this.canvas.style.cursor = this.app.currentTool === 'pan' ? 'grab' : 'default';
            }
            if (this.draggedItem) {
                this.draggedItem = null;
                this.draggedNode = null;
                this.isSnapActive = false;
                this.snapPosition = null;
                this.snapIndicatorType = null;
                this.app.saveState(); // Guardar estado al finalizar arrastre
            }
        });

        // Zoom (Rueda)
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const mouseX = e.clientX - this.canvas.getBoundingClientRect().left;
            const mouseY = e.clientY - this.canvas.getBoundingClientRect().top;
            
            // Guardar posición del ratón en el mundo antes del zoom
            const worldX = (mouseX - this.panX) / this.zoom;
            const worldY = (mouseY - this.panY) / this.zoom;
            
            // Calcular nuevo zoom
            const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
            this.zoom = Math.max(10, Math.min(150, this.zoom * zoomFactor));
            
            // Ajustar el pan para hacer zoom centrado en la posición del ratón
            this.panX = mouseX - worldX * this.zoom;
            this.panY = mouseY - worldY * this.zoom;
            
            this.draw();
        });

        // Cancelar dibujo / Deseleccionar con Click derecho o ESC
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.hasMovedWhilePanning) {
                // Si se desplazó la vista con el click derecho, evitar cancelar la acción activa
                this.hasMovedWhilePanning = false;
                return;
            }
            this.cancelCurrentAction();
        });
    }

    cancelCurrentAction() {
        this.isSnapActive = false;
        this.snapPosition = null;
        this.snapIndicatorType = null;
        this.hoveredItem = null;
        if (this.app.currentTool === 'wall' && this.wallChainStart) {
            this.wallChainStart = null;
            this.app.setHelpText("Dibujo de pared cancelado.");
        } else if (['path', 'river'].includes(this.app.currentTool) && this.pathChainStart) {
            const isRiver = this.app.currentTool === 'river';
            this.pathChainStart = null;
            this.app.setHelpText(isRiver ? "Dibujo de río cancelado." : "Dibujo de camino cancelado.");
        } else if (this.app.currentTool === 'fence' && this.fenceChainStart) {
            this.fenceChainStart = null;
            this.app.setHelpText("Dibujo de cerca/reja cancelado.");
        } else if (this.app.currentFurnitureTool) {
            this.app.currentFurnitureTool = null;
            this.app.deselectFurnitureCards();
            this.app.setTool('select');
        } else if (['door', 'window'].includes(this.app.currentTool)) {
            this.app.setTool('select');
        } else {
            this.app.setSelectedElement(null);
        }
        this.draw();
    }

    // --- CONVERSORES DE COORDENADAS ---

    getMouseWorld(e) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        
        return {
            x: (screenX - this.panX) / this.zoom,
            y: (screenY - this.panY) / this.zoom
        };
    }

    worldToScreen(x, y) {
        return {
            x: x * this.zoom + this.panX,
            y: y * this.zoom + this.panY
        };
    }

    snapToGrid(val, snapSize = 0.25) {
        if (!this.app.gridSnap) return val;
        return Math.round(val / snapSize) * snapSize;
    }

    snapPoint(pt) {
        return {
            x: this.snapToGrid(pt.x),
            y: this.snapToGrid(pt.y)
        };
    }

    // --- MANEJADORES DE CLICK E INTERACCION ---

    handlePathDrawingClick(pt) {
        const snapped = this.snapPoint(pt);
        const snappedToPathNode = this.getNearbyPathNode(pt, 0.25);
        const finalPt = snappedToPathNode || snapped;
        const isRiver = this.app.currentTool === 'river';

        if (this.pathChainStart === null) {
            this.pathChainStart = finalPt;
            this.app.setHelpText(isRiver ? "Haz clic en otro lugar para trazar el río. Click derecho/ESC para terminar." : "Haz clic en otro lugar para colocar el camino. Click derecho/ESC para terminar.");
        } else {
            const dx = finalPt.x - this.pathChainStart.x;
            const dy = finalPt.y - this.pathChainStart.y;
            const length = Math.hypot(dx, dy);

            if (length > 0.1) {
                const newPath = {
                    id: (isRiver ? 'river_' : 'path_') + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                    x1: this.pathChainStart.x,
                    y1: this.pathChainStart.y,
                    x2: finalPt.x,
                    y2: finalPt.y,
                    thickness: isRiver ? 1.5 : 1.0, // los ríos son más anchos por defecto
                    height: isRiver ? 0.01 : 0.015
                };
                this.app.paths.push(newPath);
                this.app.saveState();
                
                this.pathChainStart = { x: finalPt.x, y: finalPt.y };
            }
        }
        this.draw();
    }

    getNearbyPathNode(pt, radius) {
        if (!this.app.paths) return null;
        for (const path of this.app.paths) {
            if (Math.hypot(pt.x - path.x1, pt.y - path.y1) < radius) {
                return { x: path.x1, y: path.y1 };
            }
            if (Math.hypot(pt.x - path.x2, pt.y - path.y2) < radius) {
                return { x: path.x2, y: path.y2 };
            }
        }
        return null;
    }

    getNearbyFenceNode(pt, radius) {
        if (!this.app.fences) return null;
        for (const fence of this.app.fences) {
            if (Math.hypot(pt.x - fence.x1, pt.y - fence.y1) < radius) {
                return { x: fence.x1, y: fence.y1 };
            }
            if (Math.hypot(pt.x - fence.x2, pt.y - fence.y2) < radius) {
                return { x: fence.x2, y: fence.y2 };
            }
        }
        return null;
    }

    handleFenceDrawingClick(pt) {
        const snapped = this.snapPoint(pt);
        const snappedToFenceNode = this.getNearbyFenceNode(pt, 0.2);
        const finalPt = snappedToFenceNode || snapped;

        if (this.fenceChainStart === null) {
            this.fenceChainStart = finalPt;
            this.app.setHelpText("Haz clic en otro lugar para colocar la cerca. Click derecho/ESC para terminar.");
        } else {
            const dx = finalPt.x - this.fenceChainStart.x;
            const dy = finalPt.y - this.fenceChainStart.y;
            const length = Math.hypot(dx, dy);

            if (length > 0.1) {
                const newFence = {
                    id: 'fence_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                    x1: this.fenceChainStart.x,
                    y1: this.fenceChainStart.y,
                    x2: finalPt.x,
                    y2: finalPt.y,
                    thickness: 0.15,
                    height: 1.2,
                    material: 'wood'
                };
                this.app.fences.push(newFence);
                this.app.saveState();
                
                this.fenceChainStart = { x: finalPt.x, y: finalPt.y };
            }
        }
        this.draw();
    }

    handleWallDrawingClick(pt) {
        const { snappedPt, snapType } = this.getWallSnapPoint(pt, this.wallChainStart);
        const finalPt = snappedPt;

        if (this.wallChainStart === null) {
            // Primer punto de la pared
            this.wallChainStart = finalPt;
            this.app.setHelpText("Haz clic en otro lugar para colocar la pared. Click derecho/ESC para terminar.");
            
            // Si el primer punto encajó en algún sitio, activar el indicador de snap brevemente
            if (snapType) {
                this.isSnapActive = true;
                this.snapPosition = { x: finalPt.x, y: finalPt.y };
                this.snapIndicatorType = snapType;
                
                // Desvanecer el indicador de snap tras 800ms
                setTimeout(() => {
                    if (this.app.currentTool === 'wall' && this.wallChainStart && this.snapPosition && this.snapPosition.x === finalPt.x && this.snapPosition.y === finalPt.y) {
                        this.isSnapActive = false;
                        this.snapPosition = null;
                        this.snapIndicatorType = null;
                        this.draw();
                    }
                }, 800);
            }
        } else {
            // Verificar longitud mínima (evitar paredes de 0 metros)
            const dx = finalPt.x - this.wallChainStart.x;
            const dy = finalPt.y - this.wallChainStart.y;
            const length = Math.hypot(dx, dy);

            if (length > 0.1) {
                // Crear y agregar la pared
                const newWall = {
                    id: 'wall_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                    x1: this.wallChainStart.x,
                    y1: this.wallChainStart.y,
                    x2: finalPt.x,
                    y2: finalPt.y,
                    thickness: 0.15,
                    height: 2.5
                };
                this.app.walls.push(newWall);
                this.app.saveState();
                
                // Si el segundo punto también encaja, forzar animación de encaje
                if (snapType) {
                    this.isSnapActive = true;
                    this.snapPosition = { x: finalPt.x, y: finalPt.y };
                    this.snapIndicatorType = snapType;
                    setTimeout(() => {
                        this.isSnapActive = false;
                        this.snapPosition = null;
                        this.snapIndicatorType = null;
                        this.draw();
                    }, 800);
                } else {
                    this.isSnapActive = false;
                    this.snapPosition = null;
                    this.snapIndicatorType = null;
                }
                
                // Continuar dibujando desde este punto
                this.wallChainStart = { x: finalPt.x, y: finalPt.y };
            }
        }
        this.draw();
    }

    handleSelectionClick(pt, e) {
        // Primero, verificar si el usuario hizo clic cerca de un extremo (nodo) de cualquier pared
        let clickedWallNode = null;
        let nodeType = null; // 'p1' o 'p2'
        
        for (const wall of this.app.walls) {
            if (Math.hypot(pt.x - wall.x1, pt.y - wall.y1) < 0.25) {
                clickedWallNode = wall;
                nodeType = 'p1';
                break;
            }
            if (Math.hypot(pt.x - wall.x2, pt.y - wall.y2) < 0.25) {
                clickedWallNode = wall;
                nodeType = 'p2';
                break;
            }
        }
        
        if (clickedWallNode) {
            this.app.setSelectedElement(clickedWallNode);
            this.draggedItem = clickedWallNode;
            this.draggedNode = nodeType; // 'p1' o 'p2'
            this.draw();
            return;
        }
        
        // Si no se hizo clic en un nodo de pared, usar el comportamiento estándar
        this.draggedNode = null;
        const item = this.findElementAt(pt);
        this.app.setSelectedElement(item);
        
        if (item) {
            this.draggedItem = item;
            if (item.x1 !== undefined) {
                this.dragOffset = {
                    x1: item.x1 - pt.x,
                    y1: item.y1 - pt.y,
                    x2: item.x2 - pt.x,
                    y2: item.y2 - pt.y
                };
            } else if (item.x !== undefined) {
                this.dragOffset = {
                    x: item.x - pt.x,
                    y: item.y - pt.y
                };
            } else if (item.wallId !== undefined) {
                const wall = this.app.walls.find(w => w.id === item.wallId);
                if (wall) {
                    this.dragOffset = {
                        distance: item.distance - this.getDistanceAlongWall(pt, wall)
                    };
                }
            }
        }
        this.draw();
    }

    handleRoomMarkerPlacementClick(pt) {
        const newMarker = {
            id: 'marker_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            x: pt.x,
            y: pt.y,
            material: 'oak'
        };
        this.app.roomMarkers.push(newMarker);
        this.app.saveState();
        this.app.setSelectedElement(newMarker);
        
        this.app.setTool('select');
        this.app.setHelpText("Piso interior colocado. Usa el panel derecho para cambiar su material.");
        this.draw();
        
        if (this.app.currentViewMode === '3d') {
            this.app.sync3DScene();
        }
    }

    handleOpeningPlacementClick(pt) {
        const snap = this.getClosestWallProj(pt, 0.6);
        if (snap) {
            const width = this.app.currentTool === 'door' ? 0.9 : 1.2;
            const height = this.app.currentTool === 'door' ? 2.0 : 1.2;
            const yOffset = this.app.currentTool === 'door' ? 0 : 0.9;
            
            const newOpening = {
                id: 'opening_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                type: this.app.currentTool,
                wallId: snap.wall.id,
                distance: snap.distance,
                width: width,
                height: height,
                yOffset: yOffset
            };
            
            this.app.openings.push(newOpening);
            this.app.saveState();
            this.app.setTool('select');
        } else {
            this.app.setHelpText("¡Debes colocar las puertas y ventanas sobre una pared!");
        }
        this.draw();
    }

    handleFurniturePlacementClick(pt) {
        const snapped = this.snapPoint(pt);
        const catalogId = this.app.currentFurnitureTool;
        const catalogItem = FURNITURE_CATALOG[catalogId];
        
        if (catalogItem) {
            const newFurniture = {
                id: 'furniture_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                catalogId: catalogId,
                x: snapped.x,
                y: snapped.y,
                rotation: 0,
                color: catalogItem.defaultColor,
                width: catalogItem.defaultWidth,
                height: catalogItem.defaultHeight,
                length: catalogItem.defaultLength
            };
            this.app.furniture.push(newFurniture);
            this.app.saveState();
            
            this.app.currentFurnitureTool = null;
            this.app.deselectFurnitureCards();
            this.app.setTool('select');
            this.app.setSelectedElement(newFurniture);
        }
        this.draw();
    }

    getWallSnapPoint(pt, originPt, excludeWallId = null) {
        let snappedPt = null;
        let snapType = null; // 'node' | 'perp' | 'body' | 'ortho'
        
        // 1. Intentar snappear a un extremo (nodo) de otra pared
        for (const otherWall of this.app.walls) {
            if (excludeWallId && otherWall.id === excludeWallId) continue;
            if (Math.hypot(pt.x - otherWall.x1, pt.y - otherWall.y1) < 0.3) {
                snappedPt = { x: otherWall.x1, y: otherWall.y1 };
                snapType = 'node';
                break;
            }
            if (Math.hypot(pt.x - otherWall.x2, pt.y - otherWall.y2) < 0.3) {
                snappedPt = { x: otherWall.x2, y: otherWall.y2 };
                snapType = 'node';
                break;
            }
        }
        
        // 2. Si no hay extremo cerca, intentar snappear al cuerpo de otra pared
        if (!snappedPt) {
            const snap = this.getClosestWallProj(pt, 0.35); // Radio de 35cm para cuerpo de pared
            if (snap && (!excludeWallId || snap.wall.id !== excludeWallId)) {
                const otherWall = snap.wall;
                const wdx = otherWall.x2 - otherWall.x1;
                const wdy = otherWall.y2 - otherWall.y1;
                const wlen = Math.hypot(wdx, wdy);
                
                if (wlen > 0.001) {
                    const ux = wdx / wlen;
                    const uy = wdy / wlen;
                    
                    // Si tenemos un punto de origen, intentar snap perpendicular (90 grados)
                    if (originPt) {
                        const t = (originPt.x - otherWall.x1) * ux + (originPt.y - otherWall.y1) * uy;
                        if (t >= 0 && t <= wlen) {
                            const perpPt = {
                                x: otherWall.x1 + ux * t,
                                y: otherWall.y1 + uy * t
                            };
                            if (Math.hypot(pt.x - perpPt.x, pt.y - perpPt.y) < 0.5) {
                                snappedPt = perpPt;
                                snapType = 'perp';
                            }
                        }
                    }
                    
                    if (!snappedPt) {
                        snappedPt = {
                            x: otherWall.x1 + ux * snap.distance,
                            y: otherWall.y1 + uy * snap.distance
                        };
                        snapType = 'body';
                    }
                }
            }
        }
        
        // 3. Si no hay snap, aplicar alineación ortogonal a los ejes X/Y (90 grados relativos)
        if (!snappedPt && originPt) {
            const dx = pt.x - originPt.x;
            const dy = pt.y - originPt.y;
            let currentAngle = Math.atan2(dy, dx) * 180 / Math.PI;
            if (currentAngle < 0) currentAngle += 360;
            
            const anglesToSnap = [0, 90, 180, 270, 360];
            let closestAngle = 0;
            let minDiff = 180;
            
            anglesToSnap.forEach(a => {
                let diff = Math.abs(currentAngle - a);
                if (diff > 180) diff = 360 - diff;
                if (diff < minDiff) {
                    minDiff = diff;
                    closestAngle = a;
                }
            });
            
            if (minDiff < 7) { // 7 grados de tolerancia
                const length = Math.hypot(dx, dy);
                const rad = closestAngle * Math.PI / 180;
                snappedPt = {
                    x: originPt.x + length * Math.cos(rad),
                    y: originPt.y + length * Math.sin(rad)
                };
                snapType = 'ortho';
            }
        }
        
        // 4. Si aún no hay snap, usar el snap a rejilla por defecto
        if (!snappedPt) {
            snappedPt = this.snapPoint(pt);
            snapType = null;
        }
        
        return { snappedPt, snapType };
    }

    handleDragging(pt) {
        if (!this.draggedItem) return;

        const item = this.draggedItem;

        if (this.draggedNode === 'p1' || this.draggedNode === 'p2') {
            const isP1 = this.draggedNode === 'p1';
            const other = isP1 ? { x: item.x2, y: item.y2 } : { x: item.x1, y: item.y1 };
            
            const { snappedPt, snapType } = this.getWallSnapPoint(pt, other, item.id);
            
            if (snapType) {
                this.isSnapActive = true;
                this.snapPosition = { x: snappedPt.x, y: snappedPt.y };
                this.snapIndicatorType = snapType;
                // Solicitar continuamente redibujado para que la animación del halo pulse
                requestAnimationFrame(() => this.draw());
            } else {
                this.isSnapActive = false;
                this.snapPosition = null;
                this.snapIndicatorType = null;
            }
            
            if (isP1) {
                item.x1 = snappedPt.x;
                item.y1 = snappedPt.y;
            } else {
                item.x2 = snappedPt.x;
                item.y2 = snappedPt.y;
            }
        } else if (item.x1 !== undefined) {
            const newX1 = this.snapToGrid(pt.x + this.dragOffset.x1);
            const newY1 = this.snapToGrid(pt.y + this.dragOffset.y1);
            const newX2 = this.snapToGrid(pt.x + this.dragOffset.x2);
            const newY2 = this.snapToGrid(pt.y + this.dragOffset.y2);
            
            item.x1 = newX1;
            item.y1 = newY1;
            item.x2 = newX2;
            item.y2 = newY2;
        } else if (item.x !== undefined) {
            const newPos = this.snapPoint({
                x: pt.x + this.dragOffset.x,
                y: pt.y + this.dragOffset.y
            });
            item.x = newPos.x;
            item.y = newPos.y;
        } else if (item.wallId !== undefined) {
            const snap = this.getClosestWallProj(pt, 0.8);
            if (snap) {
                item.wallId = snap.wall.id;
                const wallLen = Math.hypot(snap.wall.x2 - snap.wall.x1, snap.wall.y2 - snap.wall.y1);
                item.distance = Math.max(item.width / 2, Math.min(wallLen - item.width / 2, snap.distance));
            }
        }
        
        this.app.updatePropertiesPanel();
    }

    // --- ALGORITMOS DE BUSQUEDA Y GEOMETRIA ---

    findElementAt(pt) {
        if (this.app.roomMarkers) {
            for (const marker of this.app.roomMarkers) {
                if (Math.hypot(pt.x - marker.x, pt.y - marker.y) < 0.4) {
                    return marker;
                }
            }
        }

        for (const op of this.app.openings) {
            const wall = this.app.walls.find(w => w.id === op.wallId);
            if (wall) {
                const dx = wall.x2 - wall.x1;
                const dy = wall.y2 - wall.y1;
                const len = Math.hypot(dx, dy);
                if (len < 0.001) continue;
                const ux = dx / len;
                const uy = dy / len;
                
                const opX = wall.x1 + ux * op.distance;
                const opY = wall.y1 + uy * op.distance;
                
                // Convertir punto a coordenadas locales de la apertura (lx: a lo largo, ly: perpendicular)
                const ptdx = pt.x - opX;
                const ptdy = pt.y - opY;
                const lx = ptdx * ux + ptdy * uy;
                const ly = -ptdx * uy + ptdy * ux;
                
                const tolerance = 0.25; // 25cm de margen de tolerancia para cliquear
                const halfW = op.width / 2;
                const thickness = wall.thickness || 0.15;
                
                if (op.type === 'door') {
                    // La puerta se dibuja abierta en 2D: su panel sobresale perpendicularmente op.width
                    // y tiene un arco de barrido de radio op.width.
                    // Cubrimos el barrido de la puerta cubriendo local Y en [-op.width - tolerance, op.width + tolerance]
                    const inX = (lx >= -halfW - tolerance) && (lx <= halfW + tolerance);
                    const inY = (ly >= -op.width - tolerance) && (ly <= op.width + tolerance);
                    if (inX && inY) {
                        return op;
                    }
                } else {
                    // Ventana u otra apertura estándar
                    const inX = (lx >= -halfW - tolerance) && (lx <= halfW + tolerance);
                    const inY = (ly >= -thickness / 2 - tolerance) && (ly <= thickness / 2 + tolerance);
                    if (inX && inY) {
                        return op;
                    }
                }
            }
        }

        for (const furn of this.app.furniture) {
            const rad = furn.rotation * Math.PI / 180;
            const w = furn.width;
            const l = furn.length;
            
            const dx = pt.x - furn.x;
            const dy = pt.y - furn.y;
            const localX = dx * Math.cos(-rad) - dy * Math.sin(-rad);
            const localY = dx * Math.sin(-rad) + dy * Math.cos(-rad);
            
            if (Math.abs(localX) <= w / 2 && Math.abs(localY) <= l / 2) {
                return furn;
            }
        }

        if (this.app.fences) {
            for (const fence of this.app.fences) {
                const dist = this.getDistanceToSegment(pt, {x: fence.x1, y: fence.y1}, {x: fence.x2, y: fence.y2});
                if (dist < (fence.thickness || 0.15) / 2 + 0.1) {
                    return fence;
                }
            }
        }

        if (this.app.paths) {
            for (const path of this.app.paths) {
                const dist = this.getDistanceToSegment(pt, {x: path.x1, y: path.y1}, {x: path.x2, y: path.y2});
                if (dist < path.thickness / 2 + 0.1) {
                    return path;
                }
            }
        }

        for (const wall of this.app.walls) {
            const dist = this.getDistanceToSegment(pt, {x: wall.x1, y: wall.y1}, {x: wall.x2, y: wall.y2});
            if (dist < 0.18) {
                return wall;
            }
        }

        return null;
    }

    isPointInPolygon(pt, poly) {
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const xi = poly[i].x, yi = poly[i].y;
            const xj = poly[j].x, yj = poly[j].y;
            const intersect = ((yi > pt.y) !== (yj > pt.y))
                && (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    getNearbyWallNode(pt, radius) {
        for (const wall of this.app.walls) {
            if (Math.hypot(pt.x - wall.x1, pt.y - wall.y1) < radius) {
                return { x: wall.x1, y: wall.y1 };
            }
            if (Math.hypot(pt.x - wall.x2, pt.y - wall.y2) < radius) {
                return { x: wall.x2, y: wall.y2 };
            }
        }
        return null;
    }

    getDistanceToSegment(c, a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lenSq = dx*dx + dy*dy;
        if (lenSq === 0) return Math.hypot(c.x - a.x, c.y - a.y);
        
        let t = ((c.x - a.x) * dx + (c.y - a.y) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        
        const projX = a.x + t * dx;
        const projY = a.y + t * dy;
        return Math.hypot(c.x - projX, c.y - projY);
    }

    getDistanceAlongWall(pt, wall) {
        const dx = wall.x2 - wall.x1;
        const dy = wall.y2 - wall.y1;
        const len = Math.hypot(dx, dy);
        if (len === 0) return 0;
        
        const ux = dx / len;
        const uy = dy / len;
        
        const proj = (pt.x - wall.x1) * ux + (pt.y - wall.y1) * uy;
        return Math.max(0, Math.min(len, proj));
    }

    getClosestWallProj(pt, maxDist = 0.8) {
        let closestWall = null;
        let minDist = maxDist;
        let bestDistanceVal = 0;

        for (const wall of this.app.walls) {
            const dist = this.getDistanceToSegment(pt, {x: wall.x1, y: wall.y1}, {x: wall.x2, y: wall.y2});
            if (dist < minDist) {
                minDist = dist;
                closestWall = wall;
                bestDistanceVal = this.getDistanceAlongWall(pt, wall);
            }
        }

        if (closestWall) {
            return {
                wall: closestWall,
                distance: bestDistanceVal
            };
        }
        return null;
    }

    // --- RENDERIZADO DEL CANVAS 2D ---

    draw() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        const isLight = this.app.theme === 'light';
        this.ctx.fillStyle = isLight ? '#f1f5f9' : '#080b11';
        this.ctx.fillRect(0, 0, w, h);
        
        this.drawGrid();
        this.drawRooms();
        this.drawPaths(); // Dibujar caminos debajo de las paredes
        this.drawWalls();
        this.drawFences(); // Dibujar cercas encima/alrededor de las paredes
        this.drawOpenings();
        this.drawFurniture();
        this.drawToolPreviews();
        this.drawDimensionSpecs();
        this.drawSnapIndicator();
    }

    drawSnapIndicator() {
        if (!this.isSnapActive || !this.snapPosition) return;
        
        const screenPt = this.worldToScreen(this.snapPosition.x, this.snapPosition.y);
        
        this.ctx.save();
        
        // Pulso sutil en base al tiempo
        const pulse = Math.sin(Date.now() / 120) * 3;
        const pulseRadius = 14 + pulse;
        
        // 1. Halo verde translúcido de encaje
        this.ctx.beginPath();
        this.ctx.arc(screenPt.x, screenPt.y, pulseRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(16, 185, 129, 0.2)'; // Esmeralda translúcido
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#10b981';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.arc(screenPt.x, screenPt.y, pulseRadius, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // 2. Punto central sólido
        this.ctx.beginPath();
        this.ctx.arc(screenPt.x, screenPt.y, 4, 0, Math.PI * 2);
        this.ctx.fillStyle = '#059669';
        this.ctx.fill();
        
        // 3. Dibujar símbolo específico
        if (this.snapIndicatorType === 'perp') {
            // Símbolo de perpendicularidad (∟) para indicar 90 grados exactos
            this.ctx.strokeStyle = '#059669';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(screenPt.x + 8, screenPt.y);
            this.ctx.lineTo(screenPt.x + 8, screenPt.y - 8);
            this.ctx.lineTo(screenPt.x, screenPt.y - 8);
            this.ctx.stroke();
        } else if (this.snapIndicatorType === 'node') {
            // Doble anillo para extremos
            this.ctx.strokeStyle = 'rgba(5, 150, 105, 0.5)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.arc(screenPt.x, screenPt.y, pulseRadius - 5, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }

    drawRooms() {
        if (!this.app.roomMarkers) return;

        const materialNames = {
            'oak': 'Roble',
            'floating': 'Flotante',
            'marble': 'Mármol',
            'tile': 'Baldosa',
            'carpet': 'Alfombra',
            'terracotta': 'Terracota',
            'concrete': 'Cemento',
            'grass': 'Césped',
            'ceramic': 'Cerámica',
            'parquet': 'Parquet'
        };

        this.app.roomMarkers.forEach(marker => {
            const isSelected = this.app.selectedElement === marker;
            
            // Buscar si el marcador está dentro de algún contorno de habitación
            let parentRoom = null;
            if (this.app.rooms) {
                parentRoom = this.app.rooms.find(room => this.isPointInPolygon(marker, room.vertices));
            }

            const p = this.worldToScreen(marker.x, marker.y);

            const isHovered = this.hoveredItem === marker;
            const isLight = this.app.theme === 'light';
            
            // Círculo indicador de selección o hover
            if (isSelected || isHovered) {
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, 22, 0, Math.PI * 2);
                
                if (isHovered && !isSelected) {
                    this.ctx.shadowColor = isLight ? '#db2777' : '#d946ef';
                    this.ctx.shadowBlur = 12 + Math.sin(Date.now() / 120) * 4;
                    this.ctx.strokeStyle = isLight ? '#db2777' : '#d946ef';
                    this.ctx.lineWidth = 2.0;
                } else {
                    this.ctx.strokeStyle = '#3b82f6';
                    this.ctx.lineWidth = 1.5;
                }
                
                this.ctx.setLineDash([4, 4]);
                this.ctx.stroke();
                this.ctx.restore();
                
                // Punto central destacado
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                this.ctx.fillStyle = isSelected ? '#60a5fa' : (isLight ? '#db2777' : '#d946ef');
                this.ctx.fill();
            } else {
                // Punto central sutil
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(34, 197, 94, 0.6)'; // verde sutil de marcador de piso
                this.ctx.fill();
            }

            // Nombre del material del piso
            this.ctx.font = 'bold 10px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'bottom';
            this.ctx.fillStyle = isSelected ? '#3b82f6' : (isHovered ? (isLight ? '#db2777' : '#d946ef') : '#22c55e');
            this.ctx.fillText(`Piso: ${materialNames[marker.material || 'oak'] || 'Roble'}`, p.x, p.y - 6);

            // Área de la habitación o estado abierto
            this.ctx.font = '9px sans-serif';
            this.ctx.textBaseline = 'top';
            this.ctx.fillStyle = isSelected ? '#3b82f6' : (isHovered ? (isLight ? '#db2777' : '#d946ef') : (isLight ? '#475569' : 'rgba(255, 255, 255, 0.6)'));
            
            if (parentRoom) {
                this.ctx.fillText(`${parentRoom.area.toFixed(1)} m²`, p.x, p.y + 6);
            } else {
                this.ctx.fillText(`(Abierto)`, p.x, p.y + 6);
            }
        });
    }

    drawPaths() {
        if (!this.app.paths) return;
        this.app.paths.forEach(path => {
            const p1 = this.worldToScreen(path.x1, path.y1);
            const p2 = this.worldToScreen(path.x2, path.y2);
            
            const isSelected = this.app.selectedElement === path;
            const isRiver = path.id && path.id.startsWith('river_');
            
            if (isRiver) {
                // Dibujo de río (color celeste)
                this.ctx.beginPath();
                this.ctx.moveTo(p1.x, p1.y);
                this.ctx.lineTo(p2.x, p2.y);
                this.ctx.strokeStyle = isSelected ? '#3b82f6' : '#0284c7';
                this.ctx.lineWidth = path.thickness * this.zoom;
                this.ctx.lineCap = 'round';
                this.ctx.stroke();

                this.ctx.beginPath();
                this.ctx.moveTo(p1.x, p1.y);
                this.ctx.lineTo(p2.x, p2.y);
                this.ctx.strokeStyle = isSelected ? '#60a5fa' : '#38bdf8';
                this.ctx.lineWidth = (path.thickness - 0.1) * this.zoom;
                this.ctx.lineCap = 'round';
                this.ctx.stroke();

                // Ondas internas blancas
                this.ctx.beginPath();
                this.ctx.moveTo(p1.x, p1.y);
                this.ctx.lineTo(p2.x, p2.y);
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([8, 12]);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            } else {
                const mat = path.material || 'concrete';
                let strokeColor = '#334155';
                let fillColor = '#475569';
                let centerLineColor = '#94a3b8';
                
                if (mat === 'wood') {
                    strokeColor = '#78350f';
                    fillColor = '#b45309';
                    centerLineColor = '#d97706';
                } else if (mat === 'brick') {
                    strokeColor = '#7c2d12';
                    fillColor = '#b91c1c';
                    centerLineColor = '#f87171';
                } else if (mat === 'cobblestone') {
                    strokeColor = '#1e293b';
                    fillColor = '#334155';
                    centerLineColor = '#64748b';
                } else if (mat === 'gravel') {
                    strokeColor = '#44403c';
                    fillColor = '#78716c';
                    centerLineColor = '#a8a29e';
                }
                
                if (isSelected) {
                    strokeColor = '#3b82f6';
                    fillColor = '#60a5fa';
                    centerLineColor = '#93c5fd';
                }

                // Contorno exterior (cuerpo del camino de cemento)
                this.ctx.beginPath();
                this.ctx.moveTo(p1.x, p1.y);
                this.ctx.lineTo(p2.x, p2.y);
                this.ctx.strokeStyle = strokeColor;
                this.ctx.lineWidth = path.thickness * this.zoom;
                this.ctx.lineCap = 'round';
                this.ctx.stroke();

                // Relleno interno
                this.ctx.beginPath();
                this.ctx.moveTo(p1.x, p1.y);
                this.ctx.lineTo(p2.x, p2.y);
                this.ctx.strokeStyle = fillColor;
                this.ctx.lineWidth = (path.thickness - 0.05) * this.zoom;
                this.ctx.lineCap = 'round';
                this.ctx.stroke();
                
                // Línea central discontinua
                this.ctx.beginPath();
                this.ctx.moveTo(p1.x, p1.y);
                this.ctx.lineTo(p2.x, p2.y);
                this.ctx.strokeStyle = centerLineColor;
                this.ctx.lineWidth = 1;
                this.ctx.setLineDash([6, 6]);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        });
    }

    drawGrid() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        const startX = -this.panX / this.zoom;
        const endX = (w - this.panX) / this.zoom;
        const startY = -this.panY / this.zoom;
        const endY = (h - this.panY) / this.zoom;
        
        const showSubgrid = this.zoom > 35;
        const gridInterval = showSubgrid ? 0.25 : 0.5;
        
        const isLight = this.app.theme === 'light';
        this.ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.04)' : 'rgba(255, 255, 255, 0.025)';
        this.ctx.lineWidth = 1;
        
        let xMin = Math.floor(startX / gridInterval) * gridInterval;
        for (let x = xMin; x <= endX; x += gridInterval) {
            if (Math.abs(x) < 0.001) continue;
            const pt = this.worldToScreen(x, 0);
            this.ctx.beginPath();
            this.ctx.moveTo(pt.x, 0);
            this.ctx.lineTo(pt.x, h);
            this.ctx.stroke();
        }

        let yMin = Math.floor(startY / gridInterval) * gridInterval;
        for (let y = yMin; y <= endY; y += gridInterval) {
            if (Math.abs(y) < 0.001) continue;
            const pt = this.worldToScreen(0, y);
            this.ctx.beginPath();
            this.ctx.moveTo(0, pt.y);
            this.ctx.lineTo(w, pt.y);
            this.ctx.stroke();
        }

        this.ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.07)';
        this.ctx.lineWidth = 1;

        xMin = Math.floor(startX);
        for (let x = xMin; x <= endX; x += 1.0) {
            if (Math.abs(x) < 0.001) continue;
            const pt = this.worldToScreen(x, 0);
            this.ctx.beginPath();
            this.ctx.moveTo(pt.x, 0);
            this.ctx.lineTo(pt.x, h);
            this.ctx.stroke();
        }

        yMin = Math.floor(startY);
        for (let y = yMin; y <= endY; y += 1.0) {
            if (Math.abs(y) < 0.001) continue;
            const pt = this.worldToScreen(0, y);
            this.ctx.beginPath();
            this.ctx.moveTo(0, pt.y);
            this.ctx.lineTo(w, pt.y);
            this.ctx.stroke();
        }

        this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)';
        this.ctx.lineWidth = 1.5;
        
        if (startX <= 0 && endX >= 0) {
            const pt = this.worldToScreen(0, 0);
            this.ctx.beginPath();
            this.ctx.moveTo(pt.x, 0);
            this.ctx.lineTo(pt.x, h);
            this.ctx.stroke();
        }

        if (startY <= 0 && endY >= 0) {
            const pt = this.worldToScreen(0, 0);
            this.ctx.beginPath();
            this.ctx.moveTo(0, pt.y);
            this.ctx.lineTo(w, pt.y);
            this.ctx.stroke();
        }
    }

    drawWalls() {
        this.app.walls.forEach(wall => {
            const p1 = this.worldToScreen(wall.x1, wall.y1);
            const p2 = this.worldToScreen(wall.x2, wall.y2);
            
            const isSelected = this.app.selectedElement === wall;
            const isLight = this.app.theme === 'light';
            const wallOutlineColor = isSelected ? (isLight ? '#4f46e5' : '#6366f1') : (isLight ? '#0f172a' : '#1e293b');
            let wallBodyColor = isSelected ? (isLight ? '#c7d2fe' : '#3b82f6') : (isLight ? '#475569' : '#64748b');
            if (!isSelected && wall.color) {
                wallBodyColor = wall.color;
            }

            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.strokeStyle = wallOutlineColor;
            this.ctx.lineWidth = wall.thickness * this.zoom;
            this.ctx.lineCap = 'square';
            this.ctx.stroke();
            
            if (!isSelected) {
                let colInt;
                let colExt;
                
                if (this.app.wallMaterial === 'paint') {
                    colInt = wall.color || this.app.wallColor;
                    colExt = wall.colorExterior || this.app.wallColorExterior || '#fed7aa';
                } else if (this.app.wallMaterial === 'brick') {
                    colInt = wall.color || this.app.wallColor;
                    colExt = '#b91c1c'; // Rojo ladrillo
                } else if (this.app.wallMaterial === 'brick_old') {
                    colInt = wall.color || this.app.wallColor;
                    colExt = '#7c2d12'; // Ladrillo viejo
                } else if (this.app.wallMaterial === 'wood') {
                    colInt = wall.color || '#f8fafc'; // Blanco hueso por defecto para interior en paredes de madera
                    colExt = this.app.wallColor || '#ebd1a9'; // Tono de madera seleccionado
                }
                
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const len = Math.hypot(dx, dy);
                
                if (len > 0.01) {
                    const nx = -dy / len;
                    const ny = dx / len;
                    const halfWidth = (wall.thickness - 0.04) * this.zoom / 2;
                    const offset = halfWidth / 2;
                    
                    // Lado Interior (+z local)
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x + nx * offset, p1.y + ny * offset);
                    this.ctx.lineTo(p2.x + nx * offset, p2.y + ny * offset);
                    this.ctx.strokeStyle = colInt;
                    this.ctx.lineWidth = halfWidth;
                    this.ctx.lineCap = 'square';
                    this.ctx.stroke();
                    
                    // Lado Exterior (-z local)
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x - nx * offset, p1.y - ny * offset);
                    this.ctx.lineTo(p2.x - nx * offset, p2.y - ny * offset);
                    this.ctx.strokeStyle = colExt;
                    this.ctx.lineWidth = halfWidth;
                    this.ctx.lineCap = 'square';
                    this.ctx.stroke();
                } else {
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.strokeStyle = colInt;
                    this.ctx.lineWidth = (wall.thickness - 0.04) * this.zoom;
                    this.ctx.lineCap = 'square';
                    this.ctx.stroke();
                }
            } else {
                this.ctx.beginPath();
                this.ctx.moveTo(p1.x, p1.y);
                this.ctx.lineTo(p2.x, p2.y);
                this.ctx.strokeStyle = wallBodyColor;
                this.ctx.lineWidth = (wall.thickness - 0.04) * this.zoom;
                this.ctx.lineCap = 'square';
                this.ctx.stroke();
            }
            
            if (isSelected) {
                this.ctx.fillStyle = '#60a5fa';
                this.ctx.beginPath();
                this.ctx.arc(p1.x, p1.y, 6, 0, Math.PI * 2);
                this.ctx.arc(p2.x, p2.y, 6, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
    }

    drawFences() {
        if (!this.app.fences) return;
        this.app.fences.forEach(fence => {
            const p1 = this.worldToScreen(fence.x1, fence.y1);
            const p2 = this.worldToScreen(fence.x2, fence.y2);
            const isSelected = this.app.selectedElement === fence;
            const isLight = this.app.theme === 'light';
            const type = fence.material || 'wood';
            
            const thickness = fence.thickness || 0.15;
            
            if (isSelected) {
                this.ctx.beginPath();
                this.ctx.moveTo(p1.x, p1.y);
                this.ctx.lineTo(p2.x, p2.y);
                this.ctx.strokeStyle = isLight ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.6)';
                this.ctx.lineWidth = (thickness + 0.08) * this.zoom;
                this.ctx.lineCap = 'round';
                this.ctx.stroke();
            }

            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);

            if (type === 'wood') {
                this.ctx.strokeStyle = '#854d0e';
                this.ctx.lineWidth = thickness * this.zoom;
                this.ctx.lineCap = 'round';
                this.ctx.setLineDash([8, 6]);
                this.ctx.stroke();
            } else if (type === 'metal') {
                this.ctx.strokeStyle = isLight ? '#334155' : '#94a3b8';
                this.ctx.lineWidth = 0.06 * this.zoom;
                this.ctx.lineCap = 'round';
                this.ctx.stroke();

                const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                const postSpacing = 1.0 * this.zoom;
                const numPosts = Math.max(2, Math.round(dist / postSpacing) + 1);
                
                this.ctx.fillStyle = isLight ? '#1e293b' : '#cbd5e1';
                for (let i = 0; i < numPosts; i++) {
                    const t = i / (numPosts - 1);
                    const px = p1.x + (p2.x - p1.x) * t;
                    const py = p1.y + (p2.y - p1.y) * t;
                    
                    this.ctx.beginPath();
                    this.ctx.arc(px, py, 4, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            } else if (type === 'glass') {
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const len = Math.hypot(dx, dy);
                const ux = dx / len;
                const uy = dy / len;
                const nx = -uy;
                const ny = ux;
                
                const offset = (thickness / 2) * this.zoom;
                
                this.ctx.strokeStyle = '#38bdf8';
                this.ctx.lineWidth = 2;
                
                this.ctx.beginPath();
                this.ctx.moveTo(p1.x + nx * offset, p1.y + ny * offset);
                this.ctx.lineTo(p2.x + nx * offset, p2.y + ny * offset);
                this.ctx.stroke();
                
                this.ctx.beginPath();
                this.ctx.moveTo(p1.x - nx * offset, p1.y - ny * offset);
                this.ctx.lineTo(p2.x - nx * offset, p2.y - ny * offset);
                this.ctx.stroke();
                
                this.ctx.beginPath();
                this.ctx.moveTo(p1.x - nx * offset, p1.y - ny * offset);
                this.ctx.lineTo(p1.x + nx * offset, p1.y + ny * offset);
                this.ctx.lineTo(p2.x + nx * offset, p2.y + ny * offset);
                this.ctx.lineTo(p2.x - nx * offset, p2.y - ny * offset);
                this.ctx.closePath();
                this.ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
                this.ctx.fill();

                this.ctx.fillStyle = isLight ? '#475569' : '#94a3b8';
                this.ctx.beginPath();
                this.ctx.arc(p1.x, p1.y, 3, 0, Math.PI * 2);
                this.ctx.arc(p2.x, p2.y, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
            this.ctx.restore();

            if (isSelected) {
                this.ctx.fillStyle = '#60a5fa';
                this.ctx.beginPath();
                this.ctx.arc(p1.x, p1.y, 6, 0, Math.PI * 2);
                this.ctx.arc(p2.x, p2.y, 6, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
    }

    drawOpenings() {
        this.app.openings.forEach(op => {
            const wall = this.app.walls.find(w => w.id === op.wallId);
            if (!wall) return;
            
            const dx = wall.x2 - wall.x1;
            const dy = wall.y2 - wall.y1;
            const wallLen = Math.hypot(dx, dy);
            const ux = dx / wallLen;
            const uy = dy / wallLen;
            
            const centerWorld = {
                x: wall.x1 + ux * op.distance,
                y: wall.y1 + uy * op.distance
            };
            const center = this.worldToScreen(centerWorld.x, centerWorld.y);
            const halfW = (op.width / 2) * this.zoom;
            
            const angle = Math.atan2(dy, dx);
            
            this.ctx.save();
            this.ctx.translate(center.x, center.y);
            this.ctx.rotate(angle);
            
            const isSelected = this.app.selectedElement === op;
            const isHovered = this.hoveredItem === op;
            
            const isLight = this.app.theme === 'light';
            const bgFillColor = isLight ? '#f1f5f9' : '#080b11';

            if (isHovered && !isSelected) {
                // Brillo / Glow para hover (magenta esmerilado que pulsa)
                this.ctx.shadowColor = isLight ? '#db2777' : '#d946ef';
                this.ctx.shadowBlur = 12 + Math.sin(Date.now() / 120) * 4;
            }
            
            if (op.type === 'door') {
                this.ctx.fillStyle = bgFillColor;
                this.ctx.fillRect(-halfW, -wall.thickness * this.zoom / 2 - 1, halfW * 2, wall.thickness * this.zoom + 2);
                
                this.ctx.strokeStyle = isSelected ? '#3b82f6' : (isHovered ? (isLight ? '#db2777' : '#d946ef') : (isLight ? '#0f172a' : '#cbd5e1'));
                this.ctx.lineWidth = (isSelected || isHovered) ? 3 : 2;
                this.ctx.beginPath();
                this.ctx.moveTo(-halfW, -wall.thickness * this.zoom / 2);
                this.ctx.lineTo(-halfW, wall.thickness * this.zoom / 2);
                this.ctx.moveTo(halfW, -wall.thickness * this.zoom / 2);
                this.ctx.lineTo(halfW, wall.thickness * this.zoom / 2);
                this.ctx.stroke();

                this.ctx.beginPath();
                this.ctx.moveTo(-halfW, 0);
                this.ctx.lineTo(-halfW, -halfW * 2);
                this.ctx.stroke();
                
                this.ctx.strokeStyle = isSelected ? 'rgba(59, 130, 246, 0.4)' : (isHovered ? (isLight ? 'rgba(219, 39, 119, 0.5)' : 'rgba(217, 70, 239, 0.5)') : (isLight ? 'rgba(15, 23, 42, 0.2)' : 'rgba(203, 213, 225, 0.3)'));
                this.ctx.lineWidth = 1;
                this.ctx.setLineDash([3, 3]);
                this.ctx.beginPath();
                this.ctx.arc(-halfW, 0, halfW * 2, 0, -Math.PI / 2, true);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            } else if (op.type === 'window') {
                this.ctx.fillStyle = bgFillColor;
                this.ctx.fillRect(-halfW, -wall.thickness * this.zoom / 2 - 1, halfW * 2, wall.thickness * this.zoom + 2);
                
                this.ctx.strokeStyle = isSelected ? '#3b82f6' : (isHovered ? (isLight ? '#db2777' : '#d946ef') : (isLight ? '#0f172a' : '#cbd5e1'));
                this.ctx.lineWidth = (isSelected || isHovered) ? 3 : 2;
                this.ctx.strokeRect(-halfW, -wall.thickness * this.zoom / 2, halfW * 2, wall.thickness * this.zoom);
                
                this.ctx.strokeStyle = isSelected ? '#60a5fa' : (isHovered ? (isLight ? '#f472b6' : '#d946ef') : (isLight ? '#334155' : '#94a3b8'));
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(-halfW, 0);
                this.ctx.lineTo(halfW, 0);
                this.ctx.stroke();
            }
            
            this.ctx.restore();
        });
    }

    drawFurniture() {
        this.app.furniture.forEach(furn => {
            const pos = this.worldToScreen(furn.x, furn.y);
            const w = furn.width * this.zoom;
            const l = furn.length * this.zoom;
            const rad = furn.rotation * Math.PI / 180;
            
            const isSelected = this.app.selectedElement === furn;
            const catalogItem = FURNITURE_CATALOG[furn.catalogId];
            
            this.ctx.save();
            this.ctx.translate(pos.x, pos.y);
            this.ctx.rotate(rad);
            
            const isLight = this.app.theme === 'light';
            const isHovered = this.hoveredItem === furn;
            
            if (isHovered && !isSelected) {
                // Brillo / Glow para hover (magenta esmerilado que pulsa)
                this.ctx.shadowColor = isLight ? '#db2777' : '#d946ef';
                this.ctx.shadowBlur = 12 + Math.sin(Date.now() / 120) * 4;
                this.ctx.fillStyle = isLight ? 'rgba(219, 39, 119, 0.08)' : 'rgba(217, 70, 239, 0.12)';
                this.ctx.fillRect(-w/2, -l/2, w, l);
                
                this.ctx.strokeStyle = isLight ? '#db2777' : '#d946ef';
                this.ctx.lineWidth = 2.5;
                this.ctx.strokeRect(-w/2, -l/2, w, l);
            } else {
                this.ctx.fillStyle = isSelected ? 'rgba(139, 92, 246, 0.15)' : (isLight ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255, 255, 255, 0.04)');
                this.ctx.fillRect(-w/2, -l/2, w, l);
                
                this.ctx.strokeStyle = isSelected ? '#8b5cf6' : (isLight ? '#0f172a' : '#64748b');
                this.ctx.lineWidth = isSelected ? 2 : 1.5;
                this.ctx.strokeRect(-w/2, -l/2, w, l);
            }
            
            this.ctx.fillStyle = isSelected ? '#a78bfa' : (isHovered ? (isLight ? '#db2777' : '#d946ef') : (isLight ? '#334155' : '#475569'));
            this.ctx.beginPath();
            this.ctx.moveTo(0, l/2 - 4);
            this.ctx.lineTo(-6, l/2 - 10);
            this.ctx.lineTo(6, l/2 - 10);
            this.ctx.closePath();
            this.ctx.fill();

            if (catalogItem && this.zoom > 18) {
                this.ctx.font = `${Math.min(18, this.zoom * 0.4)}px sans-serif`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(catalogItem.icon, 0, -2);
            }
            
            this.ctx.restore();
        });
    }

    drawToolPreviews() {
        const mousePos = this.canvas.style.cursor === 'none' ? null : this.app.lastMousePos2D;
        
        if (['path', 'river'].includes(this.app.currentTool) && this.pathChainStart && mousePos) {
            const isRiver = this.app.currentTool === 'river';
            const p1 = this.worldToScreen(this.pathChainStart.x, this.pathChainStart.y);
            const snappedMouse = this.snapPoint(mousePos);
            const snappedToNode = this.getNearbyPathNode(mousePos, 0.25);
            const finalMouse = snappedToNode || snappedMouse;
            const p2 = this.worldToScreen(finalMouse.x, finalMouse.y);
            
            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.strokeStyle = isRiver ? 'rgba(56, 189, 248, 0.5)' : 'rgba(71, 85, 105, 0.5)';
            this.ctx.lineWidth = (isRiver ? 1.5 : 1.0) * this.zoom;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();

            const len = Math.hypot(finalMouse.x - this.pathChainStart.x, finalMouse.y - this.pathChainStart.y);
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            
            this.ctx.fillStyle = isRiver ? '#38bdf8' : '#94a3b8';
            this.ctx.font = 'bold 12px var(--font-sans)';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${len.toFixed(2)} m`, midX, midY - 12);
        }

        if (this.app.currentTool === 'wall' && this.wallChainStart && mousePos) {
            const p1 = this.worldToScreen(this.wallChainStart.x, this.wallChainStart.y);
            
            const { snappedPt } = this.getWallSnapPoint(mousePos, this.wallChainStart);
            const p2 = this.worldToScreen(snappedPt.x, snappedPt.y);
            
            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
            this.ctx.lineWidth = 0.15 * this.zoom;
            this.ctx.lineCap = 'square';
            this.ctx.stroke();

            const len = Math.hypot(snappedPt.x - this.wallChainStart.x, snappedPt.y - this.wallChainStart.y);
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            
            this.ctx.fillStyle = '#93c5fd';
            this.ctx.font = 'bold 12px var(--font-sans)';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${len.toFixed(2)} m`, midX, midY - 12);
        }

        if (this.app.currentTool === 'fence' && this.fenceChainStart && mousePos) {
            const p1 = this.worldToScreen(this.fenceChainStart.x, this.fenceChainStart.y);
            const snappedMouse = this.snapPoint(mousePos);
            
            const snappedToNode = this.getNearbyFenceNode(mousePos, 0.2);
            const finalMouse = snappedToNode || snappedMouse;
            const p2 = this.worldToScreen(finalMouse.x, finalMouse.y);
            
            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.strokeStyle = 'rgba(133, 77, 14, 0.5)';
            this.ctx.lineWidth = 0.15 * this.zoom;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();

            const len = Math.hypot(finalMouse.x - this.fenceChainStart.x, finalMouse.y - this.fenceChainStart.y);
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            
            this.ctx.fillStyle = '#854d0e';
            this.ctx.font = 'bold 12px var(--font-sans)';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${len.toFixed(2)} m`, midX, midY - 12);
        }

        if (['door', 'window'].includes(this.app.currentTool) && mousePos) {
            const snap = this.getClosestWallProj(mousePos, 0.8);
            if (snap) {
                const wall = snap.wall;
                const dx = wall.x2 - wall.x1;
                const dy = wall.y2 - wall.y1;
                const len = Math.hypot(dx, dy);
                const ux = dx / len;
                const uy = dy / len;
                
                const pos = this.worldToScreen(wall.x1 + ux * snap.distance, wall.y1 + uy * snap.distance);
                const angle = Math.atan2(dy, dx);
                
                this.ctx.save();
                this.ctx.translate(pos.x, pos.y);
                this.ctx.rotate(angle);
                
                this.ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
                this.ctx.lineWidth = 2;
                const w = (this.app.currentTool === 'door' ? 0.9 : 1.2) * this.zoom;
                
                this.ctx.strokeRect(-w/2, -wall.thickness * this.zoom / 2, w, wall.thickness * this.zoom);
                this.ctx.restore();
            }
        }

        if (this.app.currentFurnitureTool && mousePos) {
            const snapped = this.snapPoint(mousePos);
            const catalogItem = FURNITURE_CATALOG[this.app.currentFurnitureTool];
            
            if (catalogItem) {
                const pos = this.worldToScreen(snapped.x, snapped.y);
                const w = catalogItem.defaultWidth * this.zoom;
                const l = catalogItem.defaultLength * this.zoom;
                
                this.ctx.save();
                this.ctx.translate(pos.x, pos.y);
                
                this.ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
                this.ctx.fillRect(-w/2, -l/2, w, l);
                this.ctx.strokeStyle = 'rgba(139, 92, 246, 0.8)';
                this.ctx.lineWidth = 1.5;
                this.ctx.strokeRect(-w/2, -l/2, w, l);
                
                this.ctx.font = `${Math.min(18, this.zoom * 0.4)}px sans-serif`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(catalogItem.icon, 0, -2);
                
                this.ctx.restore();
            }
        }
    }

    drawDimensionSpecs() {
        const isLight = this.app.theme === 'light';
        this.ctx.fillStyle = isLight ? 'rgba(15, 23, 42, 0.45)' : 'rgba(255, 255, 255, 0.25)';
        this.ctx.font = '10px var(--font-sans)';
        this.ctx.textAlign = 'center';
        
        this.app.walls.forEach(wall => {
            if (this.app.selectedElement === wall) return;
            
            const dx = wall.x2 - wall.x1;
            const dy = wall.y2 - wall.y1;
            const len = Math.hypot(dx, dy);
            
            const p1 = this.worldToScreen(wall.x1, wall.y1);
            const p2 = this.worldToScreen(wall.x2, wall.y2);
            
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            
            const angle = Math.atan2(dy, dx) + Math.PI / 2;
            const offset = 10;
            const tx = midX + Math.cos(angle) * offset;
            const ty = midY + Math.sin(angle) * offset;
            
            this.ctx.fillText(`${len.toFixed(2)}m`, tx, ty);
        });
    }
}
