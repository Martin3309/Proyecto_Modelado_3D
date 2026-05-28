/**
 * HABITA3D - CORE CONTROLLER (VITE MAIN ENTRY POINT)
 * Orquesta los estados, la sincronización entre 2D y 3D, el historial, el guardado y la UI.
 */

import './style.css';
import { FURNITURE_CATALOG } from './models.js';
import Editor2D from './editor2d.js';
import Renderer3D from './renderer3d.js';

class HabitaApp {
    constructor() {
        // Datos principales del diseño
        this.walls = [];
        this.furniture = [];
        this.openings = [];
        this.paths = []; // Caminos exteriores
        this.fences = []; // Cercas y rejas
        this.rooms = [];
        this.roomMarkers = [];
        
        // Proyectos
        this.projectsMeta = [];
        this.activeProjectId = null;
        
        // Estado de configuración global
        this.theme = 'dark'; // 'dark' o 'light'
        this.gridSnap = true;
        this.activeFloorMaterial = 'oak';
        this.wallColor = '#f8fafc';
        this.wallColorExterior = '#fed7aa'; // Color exterior por defecto
        this.wallMaterial = 'paint'; // Textura de pared activa ('paint', 'brick', 'brick_old', 'wood')
        this.activeTime = 'noon';
        this.showGrid3D = true;
        this.showShadows = true;
        this.skyBlue = false; // Cielo celeste de fondo
        this.skyClouds = false; // Nubes en el cielo
        this.groundSize = 30;

        // Historial para deshacer/rehacer (almacena strings JSON del diseño)
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = 30;

        // Estados del cursor e interactividad
        this.currentTool = 'select'; // 'select', 'wall', 'door', 'window'
        this.currentFurnitureTool = null; // ID de catálogo del mueble a colocar
        this.selectedElement = null; // Elemento seleccionado (pared, mueble, apertura)
        this.currentViewMode = '2d'; // '2d' o '3d'
        
        this.lastMousePos2D = { x: 0, y: 0 };
        this.clipboardItem = null; // Portapapeles para copiar, cortar y pegar

        // Referencias a los motores
        this.editor2D = null;
        this.renderer3D = null;
    }

    init() {
        // 1. Inicializar motores 2D y 3D
        this.editor2D = new Editor2D('editor-2d-canvas', 'canvas-2d-container', this);
        this.renderer3D = new Renderer3D('canvas-3d-container', this);

        // 2. Cargar y configurar el sistema de proyectos
        this.initProjectSystem();

        // 3. Vincular eventos de la Interfaz (UI)
        this.bindUIEvents();

        // 3b. Inicializar los redimensionadores de paneles laterales con mouse
        this.initSidebarResizers();

        // 3c. Inicializar el tema claro/oscuro
        this.initTheme();

        // 4. Renderizar catálogo de muebles por primera vez
        this.renderFurnitureCatalog('living');

        // 5. Configurar manejador de teclado global (Hotkeys)
        this.bindKeyboardEvents();

        // 6. Actualizar contadores
        this.updateStatsCounters();

        // 7. Forzar redibujado inicial de la vista 2D con los datos cargados
        this.editor2D.resize();

        this.setHelpText("Bienvenido a Habita3D. Comienza dibujando una pared o colocando muebles.");
    }

    // --- MANEJO DE HISTORIAL (UNDO/REDO) ---

    saveState() {
        this.rooms = detectRooms(this.walls);

        const state = JSON.stringify({
            walls: this.walls,
            furniture: this.furniture,
            openings: this.openings,
            paths: this.paths,
            fences: this.fences,
            activeFloorMaterial: this.activeFloorMaterial,
            wallColor: this.wallColor,
            wallColorExterior: this.wallColorExterior,
            wallMaterial: this.wallMaterial,
            skyBlue: this.skyBlue,
            skyClouds: this.skyClouds,
            groundSize: this.groundSize,
            roomMarkers: this.roomMarkers
        });

        // Evitar duplicar el último estado en el historial
        if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === state) {
            return;
        }

        this.undoStack.push(state);
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }

        this.redoStack = [];
        
        this.saveToLocalStorage();
        this.updateStatsCounters();
    }

    undo() {
        if (this.undoStack.length <= 1) {
            this.setHelpText("Nada que deshacer.");
            return;
        }

        const currentState = this.undoStack.pop();
        this.redoStack.push(currentState);

        const prevState = this.undoStack[this.undoStack.length - 1];
        this.restoreState(JSON.parse(prevState));
        this.setHelpText("Acción deshecha.");
    }

    redo() {
        if (this.redoStack.length === 0) {
            this.setHelpText("Nada que rehacer.");
            return;
        }

        const nextState = this.redoStack.pop();
        this.undoStack.push(nextState);
        
        this.restoreState(JSON.parse(nextState));
        this.setHelpText("Acción rehecha.");
    }

    restoreState(data) {
        this.walls = data.walls || [];
        this.furniture = data.furniture || [];
        this.openings = data.openings || [];
        this.paths = data.paths || [];
        this.fences = data.fences || [];
        this.activeFloorMaterial = data.activeFloorMaterial || 'oak';
        this.wallColor = data.wallColor || '#f8fafc';
        this.wallColorExterior = data.wallColorExterior || '#fed7aa';
        this.wallMaterial = data.wallMaterial || 'paint';
        this.skyBlue = data.skyBlue || false;
        this.skyClouds = data.skyClouds || false;
        this.groundSize = data.groundSize || 30;
        this.roomMarkers = data.roomMarkers || [];
        
        // Retrocompatibilidad: Convertir formato antiguo de roomMaterials (centroides) a marcadores físicos
        if (this.roomMarkers.length === 0 && data.roomMaterials) {
            Object.keys(data.roomMaterials).forEach(key => {
                const parts = key.split('_');
                if (parts.length === 3) {
                    const cx = parseFloat(parts[1]);
                    const cy = parseFloat(parts[2]);
                    this.roomMarkers.push({
                        id: 'marker_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                        x: cx,
                        y: cy,
                        material: data.roomMaterials[key]
                    });
                }
            });
        }

        this.rooms = detectRooms(this.walls);
        this.syncMaterialUI();

        if (this.selectedElement) {
            const found = [...this.walls, ...this.furniture, ...this.openings, ...this.paths, ...this.roomMarkers, ...this.fences].find(el => el.id === this.selectedElement.id);
            if (!found) this.setSelectedElement(null);
            else this.selectedElement = found;
        }

        this.saveToLocalStorage();
        this.updateStatsCounters();
        this.editor2D.draw();
        
        if (this.currentViewMode === '3d') {
            this.sync3DScene();
        }
    }

    syncMaterialUI() {
        document.querySelectorAll('#floor-material-grid .material-card').forEach(card => {
            if (card.dataset.material === this.activeFloorMaterial) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });

        document.querySelectorAll('#wall-color-grid .color-swatch').forEach(swatch => {
            if (swatch.dataset.color.toLowerCase() === this.wallColor.toLowerCase()) {
                swatch.classList.add('active');
            } else {
                swatch.classList.remove('active');
            }
        });

        document.querySelectorAll('#wall-material-grid .material-card').forEach(card => {
            if (card.dataset.wallMat === this.wallMaterial) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });

        this.updateWallColorGridVisibility();

        const chkSkyBlue = document.getElementById('chk-sky-blue');
        if (chkSkyBlue) chkSkyBlue.checked = this.skyBlue;

        const chkSkyClouds = document.getElementById('chk-sky-clouds');
        if (chkSkyClouds) chkSkyClouds.checked = this.skyClouds;

        const rangeGround = document.getElementById('prop-ground-size');
        const rangeGroundVal = document.getElementById('prop-ground-size-val');
        if (rangeGround && rangeGroundVal) {
            rangeGround.value = this.groundSize;
            rangeGroundVal.textContent = `${this.groundSize}m`;
        }
    }

    updateWallColorGridVisibility() {
        const wallColorTitle = document.getElementById('wall-color-title');
        const wallColorExteriorTitle = document.getElementById('wall-color-exterior-title');
        const wallColorGrid = document.getElementById('wall-color-grid');
        const wallColorExteriorGrid = document.getElementById('wall-color-exterior-grid');
        const wallWoodColorGrid = document.getElementById('wall-wood-color-grid');
        
        if (!wallColorGrid || !wallWoodColorGrid) return;
        
        if (this.wallMaterial === 'wood') {
            wallColorGrid.style.display = 'none';
            if (wallColorExteriorGrid) wallColorExteriorGrid.style.display = 'none';
            wallWoodColorGrid.style.display = 'grid';
            if (wallColorTitle) wallColorTitle.textContent = 'Paredes (Tono de Madera)';
            if (wallColorExteriorTitle) wallColorExteriorTitle.style.display = 'none';
            
            document.querySelectorAll('#wall-wood-color-grid .color-swatch').forEach(swatch => {
                if (swatch.dataset.color.toLowerCase() === this.wallColor.toLowerCase()) {
                    swatch.classList.add('active');
                } else {
                    swatch.classList.remove('active');
                }
            });
        } else if (this.wallMaterial === 'paint') {
            wallColorGrid.style.display = 'grid';
            if (wallColorExteriorGrid) wallColorExteriorGrid.style.display = 'grid';
            wallWoodColorGrid.style.display = 'none';
            if (wallColorTitle) wallColorTitle.textContent = 'Color Interior (Paredes)';
            if (wallColorExteriorTitle) {
                wallColorExteriorTitle.style.display = 'block';
                wallColorExteriorTitle.textContent = 'Color Exterior (Paredes)';
            }
            
            document.querySelectorAll('#wall-color-grid .color-swatch').forEach(swatch => {
                if (swatch.dataset.color.toLowerCase() === this.wallColor.toLowerCase()) {
                    swatch.classList.add('active');
                } else {
                    swatch.classList.remove('active');
                }
            });
            if (wallColorExteriorGrid) {
                document.querySelectorAll('#wall-color-exterior-grid .color-swatch').forEach(swatch => {
                    if (swatch.dataset.color.toLowerCase() === this.wallColorExterior.toLowerCase()) {
                        swatch.classList.add('active');
                    } else {
                        swatch.classList.remove('active');
                    }
                });
            }
        } else {
            // Ladrillo Rojo o Ladrillo Viejo: mostramos color interior para pintar las paredes por dentro
            wallColorGrid.style.display = 'grid';
            if (wallColorExteriorGrid) wallColorExteriorGrid.style.display = 'none';
            wallWoodColorGrid.style.display = 'none';
            if (wallColorTitle) wallColorTitle.textContent = 'Color Interior (Paredes)';
            if (wallColorExteriorTitle) wallColorExteriorTitle.style.display = 'none';
            
            document.querySelectorAll('#wall-color-grid .color-swatch').forEach(swatch => {
                if (swatch.dataset.color.toLowerCase() === this.wallColor.toLowerCase()) {
                    swatch.classList.add('active');
                } else {
                    swatch.classList.remove('active');
                }
            });
        }
    }

    // --- INTEGRACIÓN Y ENLACE DE EVENTOS UI ---

    bindUIEvents() {
        const btn2D = document.getElementById('btn-mode-2d');
        const btn3D = document.getElementById('btn-mode-3d');
        const container2D = document.getElementById('canvas-2d-container');
        const container3D = document.getElementById('canvas-3d-container');

        btn2D.addEventListener('click', () => {
            if (this.currentViewMode === '2d') return;
            this.currentViewMode = '2d';
            
            btn2D.classList.add('active');
            btn3D.classList.remove('active');
            container2D.classList.add('active');
            container3D.classList.remove('active');
            
            document.body.classList.remove('mode-3d');
            document.body.classList.add('mode-2d');
            
            this.setSelectedElement(null);
            this.editor2D.resize();
        });

        btn3D.addEventListener('click', () => {
            if (this.currentViewMode === '3d') return;
            this.currentViewMode = '3d';
            
            btn3D.classList.add('active');
            btn2D.classList.remove('active');
            container3D.classList.add('active');
            container2D.classList.remove('active');
            
            document.body.classList.remove('mode-2d');
            document.body.classList.add('mode-3d');
            
            this.setSelectedElement(null);
            
            this.sync3DScene();
            this.renderer3D.resize();
        });

        document.querySelectorAll('[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                const toolName = btn.dataset.tool;
                this.setTool(toolName);
            });
        });

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                btn.classList.add('active');
                document.getElementById(btn.dataset.tab).classList.add('active');
            });
        });

        document.getElementById('furniture-category-select').addEventListener('change', (e) => {
            this.renderFurnitureCatalog(e.target.value);
        });

        document.querySelectorAll('#floor-material-grid .material-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('#floor-material-grid .material-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                
                this.activeFloorMaterial = card.dataset.material;
                this.saveState();
                this.editor2D.draw();
                if (this.currentViewMode === '3d') this.sync3DScene();
            });
        });

        document.querySelectorAll('#wall-color-grid .color-swatch').forEach(swatch => {
            swatch.addEventListener('click', () => {
                document.querySelectorAll('#wall-color-grid .color-swatch').forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                
                this.wallColor = swatch.dataset.color;
                this.saveState();
                this.editor2D.draw();
                if (this.currentViewMode === '3d') this.sync3DScene();
            });
        });

        document.querySelectorAll('#wall-color-exterior-grid .color-swatch').forEach(swatch => {
            swatch.addEventListener('click', () => {
                document.querySelectorAll('#wall-color-exterior-grid .color-swatch').forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                
                this.wallColorExterior = swatch.dataset.color;
                this.saveState();
                this.editor2D.draw();
                if (this.currentViewMode === '3d') this.sync3DScene();
            });
        });

        document.querySelectorAll('#wall-wood-color-grid .color-swatch').forEach(swatch => {
            swatch.addEventListener('click', () => {
                document.querySelectorAll('#wall-wood-color-grid .color-swatch').forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                
                this.wallColor = swatch.dataset.color;
                this.saveState();
                this.editor2D.draw();
                if (this.currentViewMode === '3d') this.sync3DScene();
            });
        });

        document.querySelectorAll('#wall-material-grid .material-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('#wall-material-grid .material-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                
                this.wallMaterial = card.dataset.wallMat;
                this.updateWallColorGridVisibility();
                
                if (this.wallMaterial === 'wood') {
                    const woodColors = ['#ebd1a9', '#d4a373', '#b45309', '#5c4033', '#2b1d0c', '#8c857b'];
                    if (!woodColors.includes(this.wallColor.toLowerCase())) {
                        this.wallColor = '#b45309';
                    }
                }
                
                this.saveState();
                this.editor2D.draw();
                if (this.currentViewMode === '3d') this.sync3DScene();
            });
        });

        document.getElementById('btn-zoom-in').addEventListener('click', () => {
            this.editor2D.zoom = Math.min(150, this.editor2D.zoom * 1.2);
            this.editor2D.draw();
        });

        document.getElementById('btn-zoom-out').addEventListener('click', () => {
            this.editor2D.zoom = Math.max(10, this.editor2D.zoom / 1.2);
            this.editor2D.draw();
        });

        document.getElementById('btn-reset-view').addEventListener('click', () => {
            this.editor2D.zoom = 40;
            this.editor2D.panX = this.editor2D.canvas.width / 2;
            this.editor2D.panY = this.editor2D.canvas.height / 2;
            this.editor2D.draw();
        });

        const chkGridSnap = document.getElementById('chk-grid-snap');
        chkGridSnap.addEventListener('change', (e) => {
            this.gridSnap = e.target.checked;
        });

        document.getElementById('btn-undo').addEventListener('click', () => this.undo());
        document.getElementById('btn-redo').addEventListener('click', () => this.redo());
        
        // Configuración del modal de confirmación de limpieza
        const clearBtn = document.getElementById('btn-clear');
        const confirmModal = document.getElementById('confirm-modal');
        const confirmCancel = document.getElementById('btn-confirm-cancel');
        const confirmAccept = document.getElementById('btn-confirm-accept');
        
        if (clearBtn && confirmModal && confirmCancel && confirmAccept) {
            clearBtn.addEventListener('click', () => {
                confirmModal.classList.add('active');
            });
            
            confirmCancel.addEventListener('click', () => {
                confirmModal.classList.remove('active');
            });
            
            confirmAccept.addEventListener('click', () => {
                confirmModal.classList.remove('active');
                
                this.walls = [];
                this.furniture = [];
                this.openings = [];
                this.paths = [];
                this.roomMarkers = [];
                
                this.setSelectedElement(null);
                this.saveState();
                
                this.editor2D.draw();
                if (this.currentViewMode === '3d') this.sync3DScene();
                this.setHelpText("Diseño reiniciado.");
            });
            
            confirmModal.addEventListener('click', (e) => {
                if (e.target === confirmModal) {
                    confirmModal.classList.remove('active');
                }
            });
        }

        // Configuración del botón Nuevo Proyecto
        const newProjBtn = document.getElementById('btn-new-project');
        if (newProjBtn) {
            newProjBtn.addEventListener('click', () => {
                this.createNewProject();
            });
        }

        document.getElementById('btn-export').addEventListener('click', () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
                walls: this.walls,
                furniture: this.furniture,
                openings: this.openings,
                paths: this.paths,
                activeFloorMaterial: this.activeFloorMaterial,
                wallColor: this.wallColor,
                wallMaterial: this.wallMaterial,
                skyBlue: this.skyBlue,
                skyClouds: this.skyClouds,
                groundSize: this.groundSize,
                roomMarkers: this.roomMarkers
            }, null, 2));
            
            const dlAnchorElem = document.createElement('a');
            dlAnchorElem.setAttribute("href",     dataStr     );
            dlAnchorElem.setAttribute("download", `Habita3D_Proyecto_${Date.now()}.json`);
            dlAnchorElem.click();
            this.setHelpText("Proyecto exportado correctamente como archivo .json.");
        });

        const importBtn = document.getElementById('btn-import');
        const fileInput = document.getElementById('import-file-input');
        
        importBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const parsed = JSON.parse(event.target.result);
                    if (Array.isArray(parsed.walls)) {
                        this.restoreState(parsed);
                        this.saveState();
                        this.setHelpText("Diseño importado con éxito.");
                    } else {
                        alert("El archivo JSON no contiene un formato de diseño Habita3D válido.");
                    }
                } catch (err) {
                    alert("Error al leer el archivo JSON.");
                }
            };
            reader.readAsText(file);
            fileInput.value = '';
        });

        document.getElementById('btn-screenshot').addEventListener('click', () => {
            if (this.currentViewMode === '3d') {
                this.renderer3D.takeScreenshot();
                this.setHelpText("Captura de pantalla descargada.");
            }
        });
        
        const propRot = document.getElementById('prop-rotation');
        const propRotVal = document.getElementById('prop-rotation-val');
        propRot.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            propRotVal.textContent = `${val}°`;
            
            if (this.selectedElement && this.selectedElement.catalogId !== undefined) {
                this.selectedElement.rotation = val;
                this.editor2D.draw();
                if (this.currentViewMode === '3d') {
                    const mesh = this.renderer3D.furnitureMeshes.find(m => m.userData.furnitureId === this.selectedElement.id);
                    if (mesh) mesh.rotation.y = -val * Math.PI / 180;
                }
            }
        });
        propRot.addEventListener('change', () => this.saveState());

        const propColor = document.getElementById('prop-color');
        propColor.addEventListener('input', (e) => {
            const val = e.target.value;
            if (this.selectedElement) {
                if (this.selectedElement.catalogId !== undefined || (this.selectedElement.id && this.selectedElement.id.startsWith('wall_'))) {
                    this.selectedElement.color = val;
                    this.editor2D.draw();
                    
                    if (this.currentViewMode === '3d') {
                        this.sync3DScene();
                    }
                }
            }
        });
        propColor.addEventListener('change', () => this.saveState());

        const propColorExterior = document.getElementById('prop-color-exterior');
        if (propColorExterior) {
            propColorExterior.addEventListener('input', (e) => {
                const val = e.target.value;
                if (this.selectedElement && this.selectedElement.id && this.selectedElement.id.startsWith('wall_')) {
                    this.selectedElement.colorExterior = val;
                    this.editor2D.draw();
                    if (this.currentViewMode === '3d') {
                        this.sync3DScene();
                    }
                }
            });
            propColorExterior.addEventListener('change', () => this.saveState());
        }

        const btnSwapWallColors = document.getElementById('btn-prop-swap-wall-colors');
        if (btnSwapWallColors) {
            btnSwapWallColors.addEventListener('click', () => {
                if (this.selectedElement && this.selectedElement.id && this.selectedElement.id.startsWith('wall_')) {
                    const wall = this.selectedElement;
                    
                    // Calcular longitud de la pared
                    const dx = wall.x2 - wall.x1;
                    const dy = wall.y2 - wall.y1;
                    const len = Math.hypot(dx, dy);
                    
                    // Intercambiar puntos inicial y final para dar vuelta a la pared
                    const tempX = wall.x1;
                    const tempY = wall.y1;
                    wall.x1 = wall.x2;
                    wall.y1 = wall.y2;
                    wall.x2 = tempX;
                    wall.y2 = tempY;
                    
                    // Ajustar las distancias de las aberturas en esta pared para mantener su posición física original
                    this.openings.forEach(op => {
                        if (op.wallId === wall.id) {
                            op.distance = len - op.distance;
                        }
                    });
                    
                    this.editor2D.draw();
                    if (this.currentViewMode === '3d') {
                        this.sync3DScene();
                    }
                    this.saveState();
                }
            });
        }

        document.querySelectorAll('#prop-suggested-wood-colors .color-swatch.mini').forEach(swatch => {
            swatch.addEventListener('click', () => {
                const color = swatch.dataset.color;
                const propColor = document.getElementById('prop-color');
                if (propColor) propColor.value = color;
                
                if (this.selectedElement) {
                    this.selectedElement.color = color;
                    this.editor2D.draw();
                    if (this.currentViewMode === '3d') {
                        this.sync3DScene();
                    }
                    this.saveState();
                }
            });
        });

        const propFenceMaterial = document.getElementById('prop-fence-material');
        if (propFenceMaterial) {
            propFenceMaterial.addEventListener('change', (e) => {
                if (this.selectedElement && this.selectedElement.id && this.selectedElement.id.startsWith('fence_')) {
                    this.selectedElement.material = e.target.value;
                    const materialNames = {
                        'wood': 'Cerca de Madera',
                        'metal': 'Reja de Metal',
                        'glass': 'Baranda de Vidrio'
                    };
                    const title = document.getElementById('prop-title');
                    if (title) {
                        title.textContent = materialNames[e.target.value] || 'Cerca';
                    }
                    this.editor2D.draw();
                    if (this.currentViewMode === '3d') this.sync3DScene();
                    this.saveState();
                }
            });
        }

        const propPathMaterial = document.getElementById('prop-path-material');
        if (propPathMaterial) {
            propPathMaterial.addEventListener('change', (e) => {
                if (this.selectedElement && this.selectedElement.id && this.selectedElement.id.startsWith('path_')) {
                    this.selectedElement.material = e.target.value;
                    const materialNames = {
                        'concrete': 'Camino de Cemento',
                        'wood': 'Camino de Madera',
                        'brick': 'Camino de Ladrillo',
                        'cobblestone': 'Camino de Adoquines',
                        'gravel': 'Camino de Grava'
                    };
                    const title = document.getElementById('prop-title');
                    if (title) {
                        title.textContent = materialNames[e.target.value] || 'Camino';
                    }
                    this.editor2D.draw();
                    if (this.currentViewMode === '3d') this.sync3DScene();
                    this.saveState();
                }
            });
        }

        const propRoomMaterial = document.getElementById('prop-room-material');
        if (propRoomMaterial) {
            propRoomMaterial.addEventListener('change', (e) => {
                if (this.selectedElement && this.selectedElement.id && this.selectedElement.id.startsWith('marker_')) {
                    this.selectedElement.material = e.target.value;
                    this.editor2D.draw();
                    if (this.currentViewMode === '3d') this.sync3DScene();
                    this.saveState();
                }
            });
        }

        const propW = document.getElementById('prop-width');
        const propL = document.getElementById('prop-length');
        const propH = document.getElementById('prop-height');

        const handleDimChange = () => {
            if (!this.selectedElement) return;
            
            const wVal = parseFloat(propW.value);
            const lVal = parseFloat(propL.value);
            const hVal = parseFloat(propH.value);

            if (this.selectedElement.catalogId !== undefined) {
                if (!isNaN(wVal) && wVal > 0.05) this.selectedElement.width = wVal;
                if (!isNaN(lVal) && lVal > 0.05) this.selectedElement.length = lVal;
                if (!isNaN(hVal) && hVal > 0.05) this.selectedElement.height = hVal;
            } else if (this.selectedElement.wallId !== undefined) {
                if (!isNaN(wVal) && wVal > 0.05) this.selectedElement.width = wVal;
                if (!isNaN(hVal) && hVal > 0.05) this.selectedElement.height = hVal;
                const yVal = parseFloat(document.getElementById('prop-length').value);
                if (this.selectedElement.type === 'window' && !isNaN(yVal)) {
                    this.selectedElement.yOffset = yVal;
                }
            } else if (this.selectedElement.thickness !== undefined) {
                if (!isNaN(wVal) && wVal > 0.02) this.selectedElement.thickness = wVal;
                if (!isNaN(hVal) && hVal > 0.05) this.selectedElement.height = hVal;
            }

            this.editor2D.draw();
            if (this.currentViewMode === '3d') this.sync3DScene();
        };

        [propW, propL, propH].forEach(input => {
            input.addEventListener('change', () => {
                handleDimChange();
                this.saveState();
            });
        });

        document.getElementById('btn-prop-duplicate').addEventListener('click', () => {
            if (!this.selectedElement) return;
            
            if (this.selectedElement.catalogId !== undefined) {
                const clone = {
                    ...this.selectedElement,
                    id: 'furniture_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                    x: this.selectedElement.x + 0.5,
                    y: this.selectedElement.y + 0.5
                };
                this.furniture.push(clone);
                this.saveState();
                this.setSelectedElement(clone);
                this.editor2D.draw();
                if (this.currentViewMode === '3d') this.sync3DScene();
                this.setHelpText("Mueble duplicado.");
            } else if (this.selectedElement.wallId !== undefined) {
                const clone = {
                    ...this.selectedElement,
                    id: 'opening_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                    distance: Math.min(this.selectedElement.distance + 0.8)
                };
                this.openings.push(clone);
                this.saveState();
                this.setSelectedElement(clone);
                this.editor2D.draw();
                if (this.currentViewMode === '3d') this.sync3DScene();
                this.setHelpText("Elemento duplicado en la pared.");
            } else if (this.selectedElement.id && (this.selectedElement.id.startsWith('path_') || this.selectedElement.id.startsWith('river_'))) {
                const prefix = this.selectedElement.id.startsWith('river_') ? 'river_' : 'path_';
                const clone = {
                    ...this.selectedElement,
                    id: prefix + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                    x1: this.selectedElement.x1 + 0.5,
                    y1: this.selectedElement.y1 + 0.5,
                    x2: this.selectedElement.x2 + 0.5,
                    y2: this.selectedElement.y2 + 0.5
                };
                this.paths.push(clone);
                this.saveState();
                this.setSelectedElement(clone);
                this.editor2D.draw();
                if (this.currentViewMode === '3d') this.sync3DScene();
                this.setHelpText(prefix === 'river_' ? "Río duplicado." : "Camino duplicado.");
            } else if (this.selectedElement.id && this.selectedElement.id.startsWith('fence_')) {
                const clone = {
                    ...this.selectedElement,
                    id: 'fence_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                    x1: this.selectedElement.x1 + 0.5,
                    y1: this.selectedElement.y1 + 0.5,
                    x2: this.selectedElement.x2 + 0.5,
                    y2: this.selectedElement.y2 + 0.5
                };
                this.fences.push(clone);
                this.saveState();
                this.setSelectedElement(clone);
                this.editor2D.draw();
                if (this.currentViewMode === '3d') this.sync3DScene();
                this.setHelpText("Cerca/Reja duplicada.");
            }
        });

        document.getElementById('btn-prop-delete').addEventListener('click', () => {
            this.deleteSelectedElement();
        });

        document.querySelectorAll('.time-presets .time-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.time-presets .time-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                this.activeTime = btn.dataset.time;
                this.editor2D.draw();
                
                if (this.currentViewMode === '3d') {
                    this.renderer3D.updateEnvironmentLight(this.activeTime);
                    this.sync3DScene();
                }
                this.setHelpText(`Atmósfera cambiada a modo ${btn.querySelector('span:last-child').textContent.toLowerCase()}.`);
            });
        });

        const chkShadows = document.getElementById('chk-shadows');
        chkShadows.addEventListener('change', (e) => {
            this.showShadows = e.target.checked;
            if (this.currentViewMode === '3d') this.sync3DScene();
        });

        const chkGrid3D = document.getElementById('chk-grid-3d');
        chkGrid3D.addEventListener('change', (e) => {
            this.showGrid3D = e.target.checked;
            if (this.currentViewMode === '3d') {
                this.renderer3D.gridHelper.visible = this.showGrid3D;
            }
        });

        const chkSkyBlue = document.getElementById('chk-sky-blue');
        if (chkSkyBlue) {
            chkSkyBlue.addEventListener('change', (e) => {
                this.skyBlue = e.target.checked;
                this.saveState();
                if (this.currentViewMode === '3d') this.sync3DScene();
            });
        }

        const chkSkyClouds = document.getElementById('chk-sky-clouds');
        if (chkSkyClouds) {
            chkSkyClouds.addEventListener('change', (e) => {
                this.skyClouds = e.target.checked;
                this.saveState();
                if (this.currentViewMode === '3d') this.sync3DScene();
            });
        }

        const rangeGround = document.getElementById('prop-ground-size');
        const rangeGroundVal = document.getElementById('prop-ground-size-val');
        if (rangeGround && rangeGroundVal) {
            rangeGround.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                this.groundSize = val;
                rangeGroundVal.textContent = `${val}m`;
                if (this.currentViewMode === '3d') this.sync3DScene();
            });
            rangeGround.addEventListener('change', () => this.saveState());
        }
        
        this.editor2D.canvas.addEventListener('mousemove', (e) => {
            this.lastMousePos2D = this.editor2D.getMouseWorld(e);
        });
    }

    initSidebarResizers() {
        const leftPanel = document.querySelector('.left-panel');
        const rightPanel = document.querySelector('.right-panel');
        const resizerLeft = document.getElementById('resizer-left');
        const resizerRight = document.getElementById('resizer-right');

        // Cargar anchos guardados en localStorage si existen
        const savedLeftWidth = localStorage.getItem('habita3d_left_panel_width');
        const savedRightWidth = localStorage.getItem('habita3d_right_panel_width');
        
        if (savedLeftWidth) {
            leftPanel.style.width = `${savedLeftWidth}px`;
        }
        if (savedRightWidth) {
            rightPanel.style.width = `${savedRightWidth}px`;
        }

        // Límites de tamaño basados en los elementos internos
        const minWidth = 280;
        const maxWidth = 480;

        // Resizer izquierdo
        if (resizerLeft && leftPanel) {
            resizerLeft.addEventListener('mousedown', (e) => {
                e.preventDefault();
                resizerLeft.classList.add('active');
                
                const startWidth = leftPanel.offsetWidth;
                const startX = e.clientX;

                const onMouseMove = (moveEvent) => {
                    const deltaX = moveEvent.clientX - startX;
                    let newWidth = startWidth + deltaX;
                    if (newWidth < minWidth) newWidth = minWidth;
                    if (newWidth > maxWidth) newWidth = maxWidth;
                    
                    leftPanel.style.width = `${newWidth}px`;
                    localStorage.setItem('habita3d_left_panel_width', newWidth);
                    
                    // Notificar cambios de tamaño a los editores 2D y 3D
                    this.editor2D.resize();
                    if (this.renderer3D) this.renderer3D.resize();
                };

                const onMouseUp = () => {
                    resizerLeft.classList.remove('active');
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    
                    // Forzar redibujado final
                    this.editor2D.resize();
                    if (this.renderer3D) this.renderer3D.resize();
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        }

        // Resizer derecho
        if (resizerRight && rightPanel) {
            resizerRight.addEventListener('mousedown', (e) => {
                e.preventDefault();
                resizerRight.classList.add('active');
                
                const startWidth = rightPanel.offsetWidth;
                const startX = e.clientX;

                const onMouseMove = (moveEvent) => {
                    const deltaX = startX - moveEvent.clientX; // invertido para el lado derecho
                    let newWidth = startWidth + deltaX;
                    if (newWidth < minWidth) newWidth = minWidth;
                    if (newWidth > maxWidth) newWidth = maxWidth;
                    
                    rightPanel.style.width = `${newWidth}px`;
                    localStorage.setItem('habita3d_right_panel_width', newWidth);
                    
                    // Notificar cambios de tamaño a los editores 2D y 3D
                    this.editor2D.resize();
                    if (this.renderer3D) this.renderer3D.resize();
                };

                const onMouseUp = () => {
                    resizerRight.classList.remove('active');
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    
                    // Forzar redibujado final
                    this.editor2D.resize();
                    if (this.renderer3D) this.renderer3D.resize();
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        }
    }

    initTheme() {
        const savedTheme = localStorage.getItem('habita3d_theme') || 'dark';
        this.theme = savedTheme;
        this.applyTheme(savedTheme);

        const toggleBtn = document.getElementById('btn-theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const nextTheme = this.theme === 'dark' ? 'light' : 'dark';
                this.theme = nextTheme;
                localStorage.setItem('habita3d_theme', nextTheme);
                this.applyTheme(nextTheme);
            });
        }
    }

    applyTheme(theme) {
        const darkIcon = document.getElementById('theme-icon-dark');
        const lightIcon = document.getElementById('theme-icon-light');

        if (theme === 'light') {
            document.body.classList.remove('theme-dark');
            document.body.classList.add('theme-light');
            if (darkIcon) darkIcon.style.display = 'none';
            if (lightIcon) lightIcon.style.display = 'block';
        } else {
            document.body.classList.remove('theme-light');
            document.body.classList.add('theme-dark');
            if (darkIcon) darkIcon.style.display = 'block';
            if (lightIcon) lightIcon.style.display = 'none';
        }

        // Actualizar colores 3D si la escena ya existe
        if (this.renderer3D && this.renderer3D.scene && this.renderer3D.renderer) {
            const isLight = theme === 'light';
            const bgColorHex = isLight ? 0xf1f5f9 : 0x060913;
            
            // Si el cielo celeste está desactivado, actualizar el color de fondo/niebla según el tema.
            if (!this.skyBlue) {
                this.renderer3D.scene.background.setHex(bgColorHex);
                if (this.renderer3D.scene.fog) {
                    this.renderer3D.scene.fog.color.setHex(bgColorHex);
                }
            }
            
            this.renderer3D.renderer.render(this.renderer3D.scene, this.renderer3D.camera);
        }

        // Forzar redibujado de la cuadrícula y componentes 2D
        if (this.editor2D) {
            this.editor2D.draw();
        }
    }

    // --- ACCIONES DE ESTADO Y LOGICA DE MUEBLES ---

    setTool(toolName) {
        this.currentTool = toolName;
        this.currentFurnitureTool = null;
        
        if (this.editor2D) {
            this.editor2D.isSnapActive = false;
            this.editor2D.snapPosition = null;
            this.editor2D.snapIndicatorType = null;
            this.editor2D.hoveredItem = null;
        }
        
        document.querySelectorAll('[data-tool]').forEach(btn => {
            if (btn.dataset.tool === toolName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        this.deselectFurnitureCards();

        if (this.editor2D && this.editor2D.canvas) {
            if (toolName === 'pan') {
                this.editor2D.canvas.style.cursor = 'grab';
            } else if (toolName === 'select') {
                this.editor2D.canvas.style.cursor = 'default';
            } else {
                this.editor2D.canvas.style.cursor = 'crosshair';
            }
        }

        switch (toolName) {
            case 'select':
                this.setHelpText("Modo selección activo. Haz clic sobre cualquier objeto para editar sus dimensiones, rotación u opciones.");
                break;
            case 'pan':
                this.setHelpText("Modo desplazar activo. Haz clic izquierdo y arrastra en el plano para mover la vista. También puedes usar la rueda del ratón para hacer zoom.");
                break;
            case 'wall':
                this.editor2D.wallChainStart = null;
                this.setHelpText("Modo dibujo de pared activo. Haz clic sobre la cuadrícula para situar los extremos de las paredes. Clic derecho/ESC para terminar.");
                break;
            case 'door':
                this.setHelpText("Colocar Puerta. Mueve el cursor sobre una pared colocada y haz click para fijarla allí.");
                break;
            case 'window':
                this.setHelpText("Colocar Ventana. Mueve el cursor sobre una pared colocada y haz click para fijarla allí.");
                break;
            case 'path':
                this.editor2D.pathChainStart = null;
                this.setHelpText("Modo dibujo de camino activo. Haz clic sobre la cuadrícula para situar los extremos del camino. Clic derecho/ESC para terminar.");
                break;
            case 'river':
                this.editor2D.pathChainStart = null;
                this.setHelpText("Modo dibujo de río activo. Haz clic sobre la cuadrícula para situar los extremos del río. Clic derecho/ESC para terminar.");
                break;
            case 'room':
                this.setHelpText("Modo colocar piso interior activo. Haz clic sobre la cuadrícula 2D (dentro de una habitación cerrada) para colocar el marcador de piso.");
                break;
            case 'fence':
                this.editor2D.pathChainStart = null;
                this.setHelpText("Modo dibujo de cerca/reja activo. Haz clic sobre la cuadrícula para situar los extremos de la cerca. Clic derecho/ESC para terminar.");
                break;
        }
        
        this.editor2D.draw();
    }

    renderFurnitureCatalog(category) {
        const container = document.getElementById('furniture-items-container');
        container.innerHTML = '';

        for (const key in FURNITURE_CATALOG) {
            const item = FURNITURE_CATALOG[key];
            if (item.category !== category) continue;

            const card = document.createElement('div');
            card.className = 'furniture-card';
            card.dataset.id = item.id;
            
            card.innerHTML = `
                <div class="furniture-icon-wrapper">${item.icon}</div>
                <span>${item.name}</span>
            `;

            card.addEventListener('click', () => {
                this.selectFurnitureTool(item.id);
            });

            container.appendChild(card);
        }
    }

    selectFurnitureTool(catalogId) {
        this.currentFurnitureTool = catalogId;
        this.currentTool = 'place-furniture';
        
        document.querySelectorAll('[data-tool]').forEach(btn => btn.classList.remove('active'));
        
        document.querySelectorAll('.furniture-card').forEach(card => {
            if (card.dataset.id === catalogId) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });

        const name = FURNITURE_CATALOG[catalogId].name;
        this.setHelpText(`Colocación de ${name}. Haz clic sobre la cuadrícula 2D para situar el mueble. Clic derecho/ESC para cancelar.`);
        this.editor2D.draw();
    }

    deselectFurnitureCards() {
        document.querySelectorAll('.furniture-card').forEach(card => card.classList.remove('active'));
    }

    // --- MANEJO DE PROPIEDADES EN EL PANEL DERECHO ---

    setSelectedElement(element) {
        this.selectedElement = element;

        const emptyState = document.getElementById('properties-empty-state');
        const formState = document.getElementById('properties-editor');

        const propSuggestedWoodColors = document.getElementById('prop-suggested-wood-colors');
        if (propSuggestedWoodColors) propSuggestedWoodColors.style.display = 'none';
        
        const propColorExteriorGroup = document.getElementById('prop-color-exterior-group');
        if (propColorExteriorGroup) propColorExteriorGroup.style.display = 'none';
        
        const propWallSwapColorsGroup = document.getElementById('prop-wall-swap-colors-group');
        if (propWallSwapColorsGroup) propWallSwapColorsGroup.style.display = 'none';
        
        const propColorLabel = document.getElementById('prop-color-label');
        if (propColorLabel) propColorLabel.textContent = "Color Personalizado";

        if (!element) {
            emptyState.style.display = 'block';
            formState.style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';
        formState.style.display = 'flex';

        const title = document.getElementById('prop-title');
        const rotSlider = document.getElementById('prop-rotation');
        const rotVal = document.getElementById('prop-rotation-val');
        const colorInput = document.getElementById('prop-color');
        const colorGroup = document.getElementById('prop-color-group');
        
        const propW = document.getElementById('prop-width');
        const propL = document.getElementById('prop-length');
        const propH = document.getElementById('prop-height');
        
        const hContainer = document.getElementById('prop-height-container');
        const wLabel = propW.parentElement.querySelector('label');
        const lLabel = propL.parentElement.querySelector('label');
        const hLabel = propH.parentElement.querySelector('label');

        // Hide both material dropdowns by default
        const propPathMatGroup = document.getElementById('prop-path-material-group');
        const propRoomMatGroup = document.getElementById('prop-room-material-group');
        const propFenceMatGroup = document.getElementById('prop-fence-material-group');
        if (propPathMatGroup) propPathMatGroup.style.display = 'none';
        if (propRoomMatGroup) propRoomMatGroup.style.display = 'none';
        if (propFenceMatGroup) propFenceMatGroup.style.display = 'none';

        if (element.catalogId !== undefined) {
            const catalogItem = FURNITURE_CATALOG[element.catalogId];
            title.textContent = catalogItem.name;
            
            rotSlider.parentElement.parentElement.style.display = 'flex';
            rotSlider.value = element.rotation;
            rotVal.textContent = `${element.rotation}°`;
            
            colorGroup.style.display = 'flex';
            colorInput.value = element.color || catalogItem.defaultColor;

            propW.parentElement.style.display = 'block';
            propL.parentElement.style.display = 'block';
            hContainer.style.display = 'block';
            
            wLabel.textContent = "Ancho (m)";
            lLabel.textContent = "Largo (m)";
            hLabel.textContent = "Alto (m)";

            propW.value = element.width;
            propL.value = element.length;
            propH.value = element.height;
            
            document.getElementById('btn-prop-duplicate').style.display = 'flex';

        } else if (element.wallId !== undefined) {
            title.textContent = element.type === 'door' ? "Puerta" : "Ventana";
            
            rotSlider.parentElement.parentElement.style.display = 'none';
            colorGroup.style.display = 'none';

            propW.parentElement.style.display = 'block';
            propL.parentElement.style.display = 'none';
            hContainer.style.display = 'block';
            
            wLabel.textContent = "Ancho (m)";
            hLabel.textContent = "Alto (m)";
            
            propW.value = element.width;
            propH.value = element.height;
            
            if (element.type === 'window') {
                propL.parentElement.style.display = 'block';
                lLabel.textContent = "Elevación (m)";
                propL.value = element.yOffset;
            } else {
                propL.parentElement.style.display = 'none';
            }

            document.getElementById('btn-prop-duplicate').style.display = 'flex';

        } else if (element.id && element.id.startsWith('wall_')) {
            title.textContent = "Pared de Estructura";
            rotSlider.parentElement.parentElement.style.display = 'none';
            
            const propColorLabel = document.getElementById('prop-color-label');
            const propColorExteriorGroup = document.getElementById('prop-color-exterior-group');
            const propWallSwapColorsGroup = document.getElementById('prop-wall-swap-colors-group');
            
            // Siempre mostramos el selector de color interior para que puedan pintar el interior de las habitaciones
            colorGroup.style.display = 'flex';
            if (propColorLabel) propColorLabel.textContent = "Color Interior";
            
            // Siempre mostramos el botón de dar vuelta a la pared para cualquier tipo de pared
            if (propWallSwapColorsGroup) propWallSwapColorsGroup.style.display = 'block';
            
            if (this.wallMaterial === 'paint') {
                colorInput.value = element.color || this.wallColor;
                if (propColorExteriorGroup) {
                    propColorExteriorGroup.style.display = 'block';
                    const propColorExterior = document.getElementById('prop-color-exterior');
                    if (propColorExterior) {
                        propColorExterior.value = element.colorExterior || this.wallColorExterior || '#fed7aa';
                    }
                }
            } else {
                if (this.wallMaterial === 'wood') {
                    colorInput.value = element.color || '#f8fafc'; // Interior blanco por defecto en madera
                } else {
                    colorInput.value = element.color || this.wallColor; // Interior color global en ladrillo
                }
                if (propColorExteriorGroup) propColorExteriorGroup.style.display = 'none';
            }

            if (propSuggestedWoodColors) {
                propSuggestedWoodColors.style.display = 'none';
            }

            propW.parentElement.style.display = 'block';
            propL.parentElement.style.display = 'none';
            hContainer.style.display = 'block';

            wLabel.textContent = "Espesor (m)";
            hLabel.textContent = "Altura (m)";

            propW.value = element.thickness;
            propH.value = element.height;

            document.getElementById('btn-prop-duplicate').style.display = 'none';

        } else if (element.id && element.id.startsWith('fence_')) {
            const materialNames = {
                'wood': 'Cerca de Madera',
                'metal': 'Reja de Metal',
                'glass': 'Baranda de Vidrio'
            };
            title.textContent = materialNames[element.material || 'wood'] || 'Cerca';
            
            rotSlider.parentElement.parentElement.style.display = 'none';
            colorGroup.style.display = 'none';

            propW.parentElement.style.display = 'block';
            propL.parentElement.style.display = 'none';
            hContainer.style.display = 'block';

            wLabel.textContent = "Espesor (m)";
            hLabel.textContent = "Altura (m)";

            propW.value = element.thickness;
            propH.value = element.height;

            if (propFenceMatGroup) {
                propFenceMatGroup.style.display = 'block';
                document.getElementById('prop-fence-material').value = element.material || 'wood';
            }

            document.getElementById('btn-prop-duplicate').style.display = 'flex';

        } else if (element.thickness !== undefined) {
            const isPath = element.id && element.id.startsWith('path_');
            const isRiver = element.id && element.id.startsWith('river_');
            const isPathOrRiver = isPath || isRiver;
            
            if (isPath) {
                const materialNames = {
                    'concrete': 'Camino de Cemento',
                    'wood': 'Camino de Madera',
                    'brick': 'Camino de Ladrillo',
                    'cobblestone': 'Camino de Adoquines',
                    'gravel': 'Camino de Grava'
                };
                title.textContent = materialNames[element.material || 'concrete'] || 'Camino';
                if (propPathMatGroup) {
                    propPathMatGroup.style.display = 'block';
                    document.getElementById('prop-path-material').value = element.material || 'concrete';
                }
            } else {
                title.textContent = isRiver ? "Río de Agua" : "Pared de Estructura";
            }
            
            rotSlider.parentElement.parentElement.style.display = 'none';
            colorGroup.style.display = 'none';

            propW.parentElement.style.display = 'block';
            propL.parentElement.style.display = 'none';
            hContainer.style.display = 'block';
            
            wLabel.textContent = isRiver ? "Ancho del Río (m)" : (isPath ? "Ancho (m)" : "Espesor (m)");
            hLabel.textContent = isPathOrRiver ? "Elevación (m)" : "Altura (m)";
            
            propW.value = element.thickness;
            propH.value = element.height;
            
            document.getElementById('btn-prop-duplicate').style.display = isPathOrRiver ? 'flex' : 'none';
        } else if (element.id && element.id.startsWith('marker_')) {
            const parentRoom = this.rooms.find(room => {
                let inside = false;
                const poly = room.vertices;
                for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
                    const xi = poly[i].x, yi = poly[i].y;
                    const xj = poly[j].x, yj = poly[j].y;
                    const intersect = ((yi > element.y) !== (yj > element.y))
                        && (element.x < (xj - xi) * (element.y - yi) / (yj - yi) + xi);
                    if (intersect) inside = !inside;
                }
                return inside;
            });

            if (parentRoom) {
                title.textContent = `Piso Int. (${parentRoom.area.toFixed(1)} m²)`;
            } else {
                title.textContent = `Piso Int. (Exterior/Abierto)`;
            }
            
            rotSlider.parentElement.parentElement.style.display = 'none';
            colorGroup.style.display = 'none';

            propW.parentElement.style.display = 'none';
            propL.parentElement.style.display = 'none';
            hContainer.style.display = 'none';
            
            if (propRoomMatGroup) {
                propRoomMatGroup.style.display = 'block';
                document.getElementById('prop-room-material').value = element.material || 'oak';
            }
            
            document.getElementById('btn-prop-duplicate').style.display = 'none';
        }
    }

    updatePropertiesPanel() {
        if (this.selectedElement) {
            this.setSelectedElement(this.selectedElement);
        }
    }

    deleteSelectedElement() {
        if (!this.selectedElement) return;

        const id = this.selectedElement.id;

        if (this.selectedElement.catalogId !== undefined) {
            this.furniture = this.furniture.filter(f => f.id !== id);
            this.setHelpText("Mueble eliminado.");
        } else if (this.selectedElement.wallId !== undefined) {
            this.openings = this.openings.filter(o => o.id !== id);
            this.setHelpText("Apertura eliminada.");
        } else if (this.selectedElement.id && (this.selectedElement.id.startsWith('path_') || this.selectedElement.id.startsWith('river_'))) {
            this.paths = this.paths.filter(p => p.id !== id);
            this.setHelpText(this.selectedElement.id.startsWith('river_') ? "Río eliminado." : "Camino eliminado.");
        } else if (this.selectedElement.id && this.selectedElement.id.startsWith('marker_')) {
            this.roomMarkers = this.roomMarkers.filter(m => m.id !== id);
            this.setHelpText("Marcador de piso eliminado.");
        } else if (this.selectedElement.id && this.selectedElement.id.startsWith('fence_')) {
            this.fences = this.fences.filter(f => f.id !== id);
            this.setHelpText("Cerca/Reja eliminada.");
        } else if (this.selectedElement.thickness !== undefined) {
            this.walls = this.walls.filter(w => w.id !== id);
            this.openings = this.openings.filter(o => o.wallId !== id);
            this.setHelpText("Pared y sus aberturas eliminadas.");
        }

        this.setSelectedElement(null);
        this.saveState();
        this.editor2D.draw();
        if (this.currentViewMode === '3d') this.sync3DScene();
    }

    // --- ACCIONES AUXILIARES ---

    sync3DScene() {
        // 1. Detectar habitaciones cerradas
        const detected = detectRooms(this.walls);
        this.rooms = detected; // Mantener la lista actualizada para etiquetas 2D

        // 2. Asociar las habitaciones detectadas con los marcadores que caigan dentro
        const activeRooms = [];
        detected.forEach(room => {
            const marker = this.roomMarkers.find(m => {
                let inside = false;
                const poly = room.vertices;
                for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
                    const xi = poly[i].x, yi = poly[i].y;
                    const xj = poly[j].x, yj = poly[j].y;
                    const intersect = ((yi > m.y) !== (yj > m.y))
                        && (m.x < (xj - xi) * (m.y - yi) / (yj - yi) + xi);
                    if (intersect) inside = !inside;
                }
                return inside;
            });
            
            if (marker) {
                activeRooms.push({
                    vertices: room.vertices,
                    material: marker.material || 'oak'
                });
            }
        });

        this.renderer3D.rebuildScene(
            this.walls,
            this.openings,
            this.furniture,
            this.activeFloorMaterial,
            this.wallColor,
            this.wallMaterial || 'paint',
            this.paths || [],
            this.activeTime,
            this.showGrid3D,
            this.showShadows,
            this.skyBlue,
            this.skyClouds,
            this.groundSize,
            activeRooms,
            this.fences || [],
            this.wallColorExterior || '#fed7aa'
        );
    }

    setHelpText(text) {
        document.getElementById('help-text').textContent = text;
    }

    updateStatsCounters() {
        document.getElementById('stat-walls-count').textContent = this.walls.length;
        document.getElementById('stat-furniture-count').textContent = this.furniture.length;
    }

    // --- ENLACES DE TECLADO ---

    bindKeyboardEvents() {
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                this.deleteSelectedElement();
            }

            if (e.ctrlKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                this.undo();
            }

            if (e.ctrlKey && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                this.redo();
            }

            if (e.key === 'Escape') {
                this.editor2D.cancelCurrentAction();
            }

            if (e.key.toLowerCase() === 'r' && this.selectedElement && this.selectedElement.catalogId !== undefined) {
                e.preventDefault();
                let currentRot = this.selectedElement.rotation || 0;
                currentRot = (currentRot + 45) % 360;
                this.selectedElement.rotation = currentRot;
                this.saveState();
                
                this.updatePropertiesPanel();
                this.editor2D.draw();
                if (this.currentViewMode === '3d') this.sync3DScene();
            }

            const isModifier = e.ctrlKey || e.metaKey;

            // Copiar (Ctrl+C / Cmd+C)
            if (isModifier && e.key.toLowerCase() === 'c') {
                if (this.selectedElement) {
                    e.preventDefault();
                    this.clipboardItem = JSON.parse(JSON.stringify(this.selectedElement));
                    this.setHelpText("Elemento copiado al portapapeles.");
                }
            }

            // Cortar (Ctrl+X / Cmd+X)
            if (isModifier && e.key.toLowerCase() === 'x') {
                if (this.selectedElement) {
                    e.preventDefault();
                    this.clipboardItem = JSON.parse(JSON.stringify(this.selectedElement));
                    this.deleteSelectedElement();
                    this.setHelpText("Elemento cortado al portapapeles.");
                }
            }

            // Pegar (Ctrl+V / Cmd+V)
            if (isModifier && e.key.toLowerCase() === 'v') {
                if (this.clipboardItem) {
                    e.preventDefault();
                    const element = this.clipboardItem;
                    let pastedElement = null;

                    if (element.catalogId !== undefined) {
                        // Es un mueble
                        const snapped = this.editor2D.snapPoint(this.lastMousePos2D);
                        pastedElement = {
                            id: 'furniture_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                            catalogId: element.catalogId,
                            x: snapped.x,
                            y: snapped.y,
                            rotation: element.rotation || 0,
                            color: element.color,
                            width: element.width,
                            height: element.height,
                            length: element.length
                        };
                        this.furniture.push(pastedElement);
                    } else if (element.wallId !== undefined) {
                        // Es una abertura (puerta/ventana)
                        const snap = this.editor2D.getClosestWallProj(this.lastMousePos2D, 0.8);
                        if (snap) {
                            pastedElement = {
                                id: 'opening_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                                type: element.type,
                                wallId: snap.wall.id,
                                distance: snap.distance,
                                width: element.width,
                                height: element.height,
                                yOffset: element.yOffset
                            };
                            this.openings.push(pastedElement);
                        } else {
                            this.setHelpText("¡Debes situar el cursor cerca de una pared para pegar puertas o ventanas!");
                        }
                    } else if (element.id && element.id.startsWith('wall_')) {
                        // Es una pared
                        const dx = element.x2 - element.x1;
                        const dy = element.y2 - element.y1;
                        const newX1 = this.lastMousePos2D.x - dx / 2;
                        const newY1 = this.lastMousePos2D.y - dy / 2;
                        const newX2 = this.lastMousePos2D.x + dx / 2;
                        const newY2 = this.lastMousePos2D.y + dy / 2;

                        const finalX1 = this.editor2D.snapToGrid(newX1);
                        const finalY1 = this.editor2D.snapToGrid(newY1);
                        const finalX2 = this.editor2D.snapToGrid(newX2);
                        const finalY2 = this.editor2D.snapToGrid(newY2);

                        // Snapping a nodos cercanos al pegar
                        const node1 = this.editor2D.getNearbyWallNode({x: finalX1, y: finalY1}, 0.25);
                        const node2 = this.editor2D.getNearbyWallNode({x: finalX2, y: finalY2}, 0.25);

                        const snappedX1 = node1 ? node1.x : finalX1;
                        const snappedY1 = node1 ? node1.y : finalY1;
                        const snappedX2 = node2 ? node2.x : finalX2;
                        const snappedY2 = node2 ? node2.y : finalY2;

                        pastedElement = {
                            id: 'wall_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                            x1: snappedX1,
                            y1: snappedY1,
                            x2: snappedX2,
                            y2: snappedY2,
                            thickness: element.thickness,
                            height: element.height,
                            color: element.color,
                            colorExterior: element.colorExterior
                        };
                        this.walls.push(pastedElement);
                    } else if (element.id && (element.id.startsWith('path_') || element.id.startsWith('river_'))) {
                        // Es un camino o río
                        const dx = element.x2 - element.x1;
                        const dy = element.y2 - element.y1;
                        const snapped = this.editor2D.snapPoint(this.lastMousePos2D);
                        pastedElement = {
                            id: (element.id.startsWith('river_') ? 'river_' : 'path_') + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                            x1: snapped.x - dx / 2,
                            y1: snapped.y - dy / 2,
                            x2: snapped.x + dx / 2,
                            y2: snapped.y + dy / 2,
                            thickness: element.thickness,
                            material: element.material
                        };
                        this.paths.push(pastedElement);
                    } else if (element.id && element.id.startsWith('fence_')) {
                        // Es una cerca
                        const dx = element.x2 - element.x1;
                        const dy = element.y2 - element.y1;
                        const snapped = this.editor2D.snapPoint(this.lastMousePos2D);
                        pastedElement = {
                            id: 'fence_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                            x1: snapped.x - dx / 2,
                            y1: snapped.y - dy / 2,
                            x2: snapped.x + dx / 2,
                            y2: snapped.y + dy / 2,
                            thickness: element.thickness,
                            height: element.height,
                            material: element.material
                        };
                        this.fences.push(pastedElement);
                    } else if (element.id && element.id.startsWith('marker_')) {
                        // Es un marcador de habitación
                        const snapped = this.editor2D.snapPoint(this.lastMousePos2D);
                        pastedElement = {
                            id: 'marker_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                            x: snapped.x,
                            y: snapped.y,
                            material: element.material
                        };
                        this.roomMarkers.push(pastedElement);
                    }

                    if (pastedElement) {
                        this.setSelectedElement(pastedElement);
                        this.saveState();
                        this.editor2D.draw();
                        if (this.currentViewMode === '3d') {
                            this.sync3DScene();
                        }
                        this.setHelpText("Elemento pegado.");
                    }
                }
            }
        });
    }

    // --- LOCAL STORAGE ---

    saveToLocalStorage() {
        if (!this.activeProjectId) return;
        try {
            const data = {
                walls: this.walls,
                furniture: this.furniture,
                openings: this.openings,
                paths: this.paths,
                fences: this.fences,
                activeFloorMaterial: this.activeFloorMaterial,
                wallColor: this.wallColor,
                wallColorExterior: this.wallColorExterior,
                wallMaterial: this.wallMaterial,
                skyBlue: this.skyBlue,
                skyClouds: this.skyClouds,
                groundSize: this.groundSize,
                roomMarkers: this.roomMarkers
            };
            
            // Guardar el estado del proyecto específico
            localStorage.setItem(`habita3d_project_${this.activeProjectId}`, JSON.stringify(data));
            
            // Actualizar metadatos
            const proj = this.projectsMeta.find(p => p.id === this.activeProjectId);
            if (proj) {
                proj.lastModified = Date.now();
                localStorage.setItem('habita3d_projects_meta', JSON.stringify(this.projectsMeta));
            }
            
            localStorage.setItem('habita3d_active_project_id', this.activeProjectId);
        } catch (e) {
            console.error("Error al guardar en localStorage", e);
        }
    }

    loadFromLocalStorage() {
        if (!this.activeProjectId) return;
        try {
            const saved = localStorage.getItem(`habita3d_project_${this.activeProjectId}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                this.walls = parsed.walls || [];
                this.furniture = parsed.furniture || [];
                this.openings = parsed.openings || [];
                this.paths = parsed.paths || [];
                this.fences = parsed.fences || [];
                this.activeFloorMaterial = parsed.activeFloorMaterial || 'oak';
                this.wallColor = parsed.wallColor || '#f8fafc';
                this.wallColorExterior = parsed.wallColorExterior || '#fed7aa';
                this.wallMaterial = parsed.wallMaterial || 'paint';
                this.skyBlue = parsed.skyBlue || false;
                this.skyClouds = parsed.skyClouds || false;
                this.groundSize = parsed.groundSize || 30;
                this.roomMarkers = parsed.roomMarkers || [];
                
                this.syncMaterialUI();
            } else {
                // Si no hay datos, inicializar en vacío
                this.walls = [];
                this.furniture = [];
                this.openings = [];
                this.paths = [];
                this.activeFloorMaterial = 'oak';
                this.wallColor = '#f8fafc';
                this.wallColorExterior = '#fed7aa';
                this.wallMaterial = 'paint';
                this.skyBlue = false;
                this.skyClouds = false;
                this.groundSize = 30;
                this.roomMarkers = [];
                
                this.syncMaterialUI();
            }
            
            this.saveState();
        } catch (e) {
            console.error("Error al cargar de localStorage", e);
            this.saveState();
        }
    }

    // --- SISTEMA DE PROYECTOS MULTIPLES ---

    initProjectSystem() {
        try {
            const metaSaved = localStorage.getItem('habita3d_projects_meta');
            const activeIdSaved = localStorage.getItem('habita3d_active_project_id');
            
            if (metaSaved && activeIdSaved) {
                this.projectsMeta = JSON.parse(metaSaved);
                this.activeProjectId = activeIdSaved;
                
                // Verificar si existe el proyecto activo en metadatos
                const activeExists = this.projectsMeta.some(p => p.id === this.activeProjectId);
                if (!activeExists && this.projectsMeta.length > 0) {
                    this.activeProjectId = this.projectsMeta[0].id;
                }
            }
            
            // Si no hay metadatos, intentar migrar el estado clásico de localStorage
            if (this.projectsMeta.length === 0) {
                const classicSaved = localStorage.getItem('habita3d_save_v1');
                if (classicSaved) {
                    const newId = 'proj_' + Date.now();
                    this.projectsMeta = [{
                        id: newId,
                        name: 'Proyecto Migrado',
                        lastModified: Date.now()
                    }];
                    this.activeProjectId = newId;
                    
                    // Guardar los datos clásicos en el nuevo formato del proyecto
                    localStorage.setItem(`habita3d_project_${newId}`, classicSaved);
                    localStorage.setItem('habita3d_projects_meta', JSON.stringify(this.projectsMeta));
                    localStorage.setItem('habita3d_active_project_id', newId);
                } else {
                    // Si no hay nada, crear un proyecto nuevo vacío
                    const newId = 'proj_' + Date.now();
                    this.projectsMeta = [{
                        id: newId,
                        name: 'Proyecto Principal',
                        lastModified: Date.now()
                    }];
                    this.activeProjectId = newId;
                    
                    localStorage.setItem('habita3d_projects_meta', JSON.stringify(this.projectsMeta));
                    localStorage.setItem('habita3d_active_project_id', newId);
                }
            }
            
            // Cargar los datos del proyecto activo
            this.loadFromLocalStorage();
            
            // Renderizar la barra lateral
            this.renderProjectsSidebar();
        } catch (e) {
            console.error("Error al inicializar el sistema de proyectos", e);
            // Fallback seguro
            this.activeProjectId = 'proj_fallback';
            this.projectsMeta = [{ id: this.activeProjectId, name: 'Proyecto Principal', lastModified: Date.now() }];
            this.loadFromLocalStorage();
            this.renderProjectsSidebar();
        }
    }

    createNewProject() {
        try {
            // Guardar el proyecto activo actual antes de crear uno nuevo
            this.saveToLocalStorage();
            
            const newId = 'proj_' + Date.now();
            const projectCount = this.projectsMeta.length + 1;
            const newProject = {
                id: newId,
                name: `Proyecto ${projectCount}`,
                lastModified: Date.now()
            };
            
            this.projectsMeta.push(newProject);
            this.activeProjectId = newId;
            
            // Inicializar datos en blanco
            this.walls = [];
            this.furniture = [];
            this.openings = [];
            this.paths = [];
            this.fences = [];
            this.activeFloorMaterial = 'oak';
            this.wallColor = '#f8fafc';
            this.wallMaterial = 'paint';
            this.skyBlue = false;
            this.skyClouds = false;
            this.groundSize = 30;
            this.roomMarkers = [];
            
            // Forzar guardado en localStorage y metadatos
            localStorage.setItem('habita3d_projects_meta', JSON.stringify(this.projectsMeta));
            localStorage.setItem('habita3d_active_project_id', this.activeProjectId);
            this.saveToLocalStorage();
            
            // Sincronizar UI
            this.setSelectedElement(null);
            this.undoStack = [];
            this.redoStack = [];
            this.saveState();
            
            this.syncMaterialUI();
            this.editor2D.draw();
            if (this.currentViewMode === '3d') this.sync3DScene();
            
            this.renderProjectsSidebar();
            this.setHelpText("Nuevo proyecto creado.");
        } catch (e) {
            console.error("Error al crear un nuevo proyecto", e);
        }
    }

    switchProject(projectId, saveCurrent = true) {
        try {
            // Guardar estado actual
            if (saveCurrent) {
                this.saveToLocalStorage();
            }
            
            // Cambiar ID activo
            this.activeProjectId = projectId;
            localStorage.setItem('habita3d_active_project_id', this.activeProjectId);
            
            // Cargar datos del nuevo proyecto
            this.setSelectedElement(null);
            this.undoStack = [];
            this.redoStack = [];
            
            this.loadFromLocalStorage();
            
            if (this.currentViewMode === '3d') {
                this.sync3DScene();
            } else {
                this.editor2D.draw();
            }
            
            this.renderProjectsSidebar();
            
            const projName = this.projectsMeta.find(p => p.id === projectId)?.name || 'Proyecto';
            this.setHelpText(`Proyecto "${projName}" cargado.`);
        } catch (e) {
            console.error("Error al cambiar de proyecto", e);
        }
    }

    renameProject(projectId, newName) {
        try {
            const proj = this.projectsMeta.find(p => p.id === projectId);
            if (proj) {
                proj.name = newName;
                proj.lastModified = Date.now();
                localStorage.setItem('habita3d_projects_meta', JSON.stringify(this.projectsMeta));
                this.renderProjectsSidebar();
                this.setHelpText(`Proyecto renombrado a "${newName}".`);
            }
        } catch (e) {
            console.error("Error al renombrar proyecto", e);
        }
    }

    deleteProject(projectId) {
        try {
            // Remover metadatos y datos de localStorage
            this.projectsMeta = this.projectsMeta.filter(p => p.id !== projectId);
            localStorage.setItem('habita3d_projects_meta', JSON.stringify(this.projectsMeta));
            localStorage.removeItem(`habita3d_project_${projectId}`);
            
            // Si el proyecto eliminado era el activo
            if (this.activeProjectId === projectId) {
                if (this.projectsMeta.length > 0) {
                    this.switchProject(this.projectsMeta[0].id, false);
                } else {
                    // Si no queda ninguno, crear uno en blanco
                    this.createNewProject();
                }
            } else {
                this.renderProjectsSidebar();
            }
            
            this.setHelpText("Proyecto eliminado.");
        } catch (e) {
            console.error("Error al eliminar proyecto", e);
        }
    }

    renderProjectsSidebar() {
        const container = document.getElementById('project-list-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Ordenar proyectos por fecha de modificación descendente (el más reciente arriba)
        const sortedProjects = [...this.projectsMeta].sort((a, b) => b.lastModified - a.lastModified);
        
        sortedProjects.forEach(proj => {
            const isActive = proj.id === this.activeProjectId;
            
            const itemDiv = document.createElement('div');
            itemDiv.className = `project-item ${isActive ? 'active' : ''}`;
            itemDiv.dataset.id = proj.id;
            
            itemDiv.innerHTML = `
                <div class="project-info">
                    <span class="project-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                    </span>
                    <div class="project-name-wrapper">
                        <span class="project-name" id="label-${proj.id}">${this.escapeHtml(proj.name)}</span>
                    </div>
                </div>
                <div class="project-actions">
                    <button class="project-action-btn edit-btn" title="Renombrar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
                    </button>
                    <button class="project-action-btn delete delete-btn" title="Eliminar proyecto">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            `;
            
            // Evento para cambiar de proyecto
            itemDiv.addEventListener('click', (e) => {
                // Evitar cambiar si se hizo clic en un botón de acción o en el input de renombrar
                if (e.target.closest('.project-actions') || e.target.closest('.project-name-input')) return;
                
                if (proj.id !== this.activeProjectId) {
                    this.switchProject(proj.id);
                }
            });
            
            // Evento para renombrar
            const editBtn = itemDiv.querySelector('.edit-btn');
            const nameSpan = itemDiv.querySelector('.project-name');
            const wrapper = itemDiv.querySelector('.project-name-wrapper');
            
            const startRename = () => {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'project-name-input';
                input.value = proj.name;
                
                wrapper.innerHTML = '';
                wrapper.appendChild(input);
                input.focus();
                input.select();
                
                const saveRename = () => {
                    const val = input.value.trim();
                    if (val && val !== proj.name) {
                        this.renameProject(proj.id, val);
                    } else {
                        // Restaurar el label original
                        wrapper.innerHTML = '';
                        wrapper.appendChild(nameSpan);
                    }
                };
                
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        saveRename();
                    } else if (e.key === 'Escape') {
                        wrapper.innerHTML = '';
                        wrapper.appendChild(nameSpan);
                    }
                });
                
                input.addEventListener('blur', saveRename);
            };
            
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                startRename();
            });
            
            nameSpan.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                startRename();
            });
            
            // Evento para eliminar
            const deleteBtn = itemDiv.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`¿Estás seguro de que deseas eliminar el proyecto "${proj.name}"? Se perderán todos sus datos.`)) {
                    this.deleteProject(proj.id);
                }
            });
            
            container.appendChild(itemDiv);
        });
    }

    escapeHtml(unsafe) {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

}

// Algoritmo matemático para identificar lazos cerrados de paredes (habitaciones)
function detectRooms(walls) {
    if (!walls || walls.length < 3) return [];
    
    // 1. Extraer vértices fusionando los extremos muy cercanos (snap)
    const vertices = [];
    const getVertexId = (x, y) => {
        const snapTolerance = 0.35;
        for (let i = 0; i < vertices.length; i++) {
            const v = vertices[i];
            if (Math.hypot(v.x - x, v.y - y) < snapTolerance) {
                return i;
            }
        }
        vertices.push({ x, y, adj: [] });
        return vertices.length - 1;
    };
    
    // 2. Construir aristas del grafo (sin duplicados)
    const edgeSet = new Set();
    walls.forEach(w => {
        const v1 = getVertexId(w.x1, w.y1);
        const v2 = getVertexId(w.x2, w.y2);
        if (v1 === v2) return;
        
        const edgeKey = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
        if (edgeSet.has(edgeKey)) return;
        edgeSet.add(edgeKey);
        
        vertices[v1].adj.push(v2);
        vertices[v2].adj.push(v1);
    });
    
    // 3. Ordenar las aristas salientes de cada vértice por ángulo
    vertices.forEach((v, idx) => {
        v.adj.sort((a, b) => {
            const angleA = Math.atan2(vertices[a].y - v.y, vertices[a].x - v.x);
            const angleB = Math.atan2(vertices[b].y - v.y, vertices[b].x - v.x);
            return angleA - angleB;
        });
    });
    
    // 4. Crear semi-aristas dirigidas y rastrearlas
    const visited = new Set();
    const rooms = [];
    
    vertices.forEach((v, fromIdx) => {
        v.adj.forEach(toIdx => {
            const heKey = `${fromIdx}->${toIdx}`;
            if (visited.has(heKey)) return;
            
            // Trazar un ciclo siguiendo la regla "girar a la derecha" (next CW edge)
            const cycle = [];
            let currFrom = fromIdx;
            let currTo = toIdx;
            let safe = 0;
            const maxIter = vertices.length + 2;
            
            while (safe < maxIter) {
                const key = `${currFrom}->${currTo}`;
                if (visited.has(key)) break;
                visited.add(key);
                cycle.push(currFrom);
                
                // Desde currTo, buscar la siguiente arista:
                // El ángulo de llegada (desde currFrom hacia currTo)
                const arrivalAngle = Math.atan2(
                    vertices[currFrom].y - vertices[currTo].y,
                    vertices[currFrom].x - vertices[currTo].x
                );
                
                // Buscar en las adyacencias de currTo la arista que es la siguiente
                // en sentido horario después del ángulo de llegada.
                // Esto equivale a buscar la última arista cuyo ángulo sea < arrivalAngle,
                // o si no hay ninguna, la última de todas (wrap-around).
                const destAdj = vertices[currTo].adj;
                if (destAdj.length === 0) break;
                
                // Calcular ángulos de todas las aristas salientes de currTo
                const adjAngles = destAdj.map(neighbor => ({
                    neighbor,
                    angle: Math.atan2(vertices[neighbor].y - vertices[currTo].y, vertices[neighbor].x - vertices[currTo].x)
                }));
                // Están ya ordenados por ángulo (del paso 3)
                
                // Buscar la arista cuyo ángulo es el máximo que sea estrictamente menor que arrivalAngle
                // Si no se encuentra, tomar la última (la de mayor ángulo) por wrap-around
                let nextNeighbor = -1;
                for (let i = adjAngles.length - 1; i >= 0; i--) {
                    if (adjAngles[i].angle < arrivalAngle - 1e-9) {
                        nextNeighbor = adjAngles[i].neighbor;
                        break;
                    }
                }
                if (nextNeighbor === -1) {
                    // Wrap-around: tomar la de mayor ángulo
                    nextNeighbor = adjAngles[adjAngles.length - 1].neighbor;
                }
                
                currFrom = currTo;
                currTo = nextNeighbor;
                safe++;
            }
            
            // Validar si el ciclo tiene al menos 3 vértices y se cerró correctamente
            if (cycle.length >= 3) {
                const pts = cycle.map(idx => ({ x: vertices[idx].x, y: vertices[idx].y }));
                
                // Cálculo del área con fórmula Shoelace
                let area = 0;
                for (let i = 0; i < pts.length; i++) {
                    const p1 = pts[i];
                    const p2 = pts[(i + 1) % pts.length];
                    area += p1.x * p2.y - p2.x * p1.y;
                }
                area = area / 2;
                
                // Solo aceptar caras con área positiva (sentido antihorario = cara interior)
                // y con área razonable (no la cara exterior infinita)
                if (area > 0.1 && area < 10000) {
                    let cx = 0, cy = 0;
                    pts.forEach(p => { cx += p.x; cy += p.y; });
                    cx /= pts.length;
                    cy /= pts.length;
                    
                    rooms.push({
                        vertices: pts,
                        centroid: { x: cx, y: cy },
                        area: area,
                        id: `room_${cx.toFixed(2)}_${cy.toFixed(2)}`
                    });
                }
            }
        });
    });
    
    return rooms;
}

// Inicializar la aplicación cuando cargue la ventana
window.addEventListener('DOMContentLoaded', () => {
    const app = new HabitaApp();
    window.app = app;
    app.init();
});
export default HabitaApp;
