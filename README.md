# 🌌 Habita3D - Diseñador de Interiores y Modelado 3D

![Versión](https://img.shields.io/badge/Versi%C3%B3n-1.0.0-blue?style=for-the-badge)
![Tecnología](https://img.shields.io/badge/Three.js-%5E0.184.0-darkgreen?style=for-the-badge)
![Herramienta](https://img.shields.io/badge/Vite-JS-purple?style=for-the-badge&logo=vite)

**Habita3D** es una aplicación interactiva premium diseñada para planificar, dibujar y decorar espacios arquitectónicos de forma sencilla y fluida. Integra un potente plano de dibujo **2D** de alta precisión con un renderizador interactivo **3D** en tiempo real, impulsado por **Three.js** e iluminación dinámica.

La aplicación destaca por su estética moderna (*dark glassmorphism*) y su optimización técnica, incluyendo la generación de texturas procedurales para un alto rendimiento y un algoritmo matemático que detecta habitaciones de forma inteligente.

---

## ✨ Características Principales

*   📐 **Planificador 2D Avanzado**: Dibuja paredes conectadas automáticamente, coloca puertas/ventanas que recortan la pared, traza caminos exteriores, ríos sinuosos y coloca muebles arrastrándolos con un preciso snapping (alineación) de `0.25m`.
*   🔮 **Visualizador 3D en Tiempo Real**: Visualización interactiva instantánea con control orbital, proyección de sombras suaves en tiempo real y soporte para pantalla completa.
*   🧱 **Texturas Procedurales Inteligentes**: Las texturas (madera, mármol blanco, baldosas, césped, ladrillos rústicos, etc.) se generan en tiempo de ejecución en canvas virtuales. Esto ahorra ancho de banda, reduce los tiempos de carga a cero y permite una repetición perfecta sin costuras.
*   🏠 **Detección Automática de Habitaciones**: Implementa un algoritmo de grafos con la fórmula matemática *Shoelace* para detectar ciclos cerrados de paredes. Así calcula los metros cuadrados (`m²`) automáticamente y permite aplicar texturas de piso interiores personalizadas a cada estancia.
*   🌅 **Atmósferas y Ciclo del Día**: Configura la escena en presets horarios: *Mañana*, *Mediodía*, *Atardecer* y *Noche* (donde las lámparas de pie se encienden con fuentes de luz reales de forma dinámica).
*   📂 **Gestión de Proyectos & Exportación**:
    *   **Proyectos Múltiples**: Guarda tus avances automáticamente en el almacenamiento local de tu navegador (`localStorage`). Puedes crear nuevos planos, renombrarlos y eliminarlos desde el panel lateral.
    *   **Importar/Exportar**: Guarda tus planos en archivos `.json` de forma local en tu ordenador para compartirlos o editarlos más tarde.
    *   **Foto 3D**: Captura instantáneas limpias (ocultando rejillas y guías) de tu diseño 3D en formato `.png`.

---

## 🛠️ Atajor Rápidos de Teclado

*   `Delete` o `Backspace` (Retroceso): Elimina el elemento seleccionado en el plano (pared, mueble, apertura o camino).
*   `R`: Rota el mueble seleccionado `45°` en sentido horario.
*   `Ctrl + Z`: Deshacer la última acción realizada.
*   `Ctrl + Y`: Rehacer la última acción deshecha.
*   `Escape` (Esc): Cancela el dibujo de paredes en curso o deselecciona el elemento activo.
*   `Rueda del Ratón`: Controla el Zoom del lienzo 2D y la distancia de la cámara en 3D.
*   `Click Central` o `Shift + Click Izquierdo`: Permite desplazar (hacer *pan*) de forma rápida en el plano 2D.

---

## 🚀 Guía de Instalación y Ejecución

Para ejecutar Habita3D en tu PC localmente, utilizaremos **Node.js** y **Vite**. Sigue las instrucciones paso a paso dependiendo de tu sistema operativo.

### 📋 Prerrequisitos Básicos

Antes de comenzar, necesitas tener instalado **Node.js** en tu ordenador. Node.js incluye el gestor de paquetes `npm` con el que instalaremos las dependencias.

#### En Windows 🪟
1. Visita el sitio web oficial de Node.js: [nodejs.org](https://nodejs.org/).
2. Descarga la versión **LTS** recomendada para la mayoría de los usuarios (instalador `.msi` de Windows).
3. Abre el instalador descargado y sigue el asistente de instalación clásico (haz clic en *Siguiente/Next* hasta finalizar).
4. Para comprobar que se instaló correctamente, abre una ventana de **PowerShell** o **Símbolo del Sistema (cmd)** y escribe:
   ```bash
   node -v
   npm -v
   ```
   *Deberías ver los números de versión instalados en pantalla.*

#### En macOS 🍎
Existen dos formas sencillas de instalarlo en Mac:

**Opción A: Instalador oficial (Más fácil)**
1. Visita [nodejs.org](https://nodejs.org/) y descarga el instalador de la versión **LTS** (archivo `.pkg` para Mac).
2. Ejecuta el archivo de instalación descargado y sigue las instrucciones del sistema.

**Opción B: Usando Homebrew (Recomendado para desarrolladores)**
1. Abre tu **Terminal** y escribe el comando para instalar Node.js:
   ```bash
   brew install node
   ```

2. Verifica la instalación en tu **Terminal**:
   ```bash
   node -v
   npm -v
   ```

---

### 💻 Paso a Paso para Correr el Proyecto

Una vez que tengas **Node.js** instalado, sigue estos pasos en tu sistema operativo para arrancar Habita3D:

#### 1. Obtener el Código del Proyecto
*   **Si lo descargaste en un archivo ZIP**: Descomprime el archivo en la carpeta de tu preferencia (por ejemplo, en el Escritorio).
*   **Si usas Git**: Abre tu terminal/consola y clona el repositorio con:
    ```bash
    git clone <url-del-repositorio>
    ```

#### 2. Abrir la Terminal en la Carpeta del Proyecto

*   **En Windows**:
    1. Abre la carpeta del proyecto en el Explorador de Archivos de Windows.
    2. Haz clic derecho en una zona vacía mientras mantienes presionada la tecla `Shift` y selecciona **"Abrir la ventana de PowerShell aquí"** (o "Abrir en Terminal").
    3. *Alternativamente*, abre la consola (`cmd` o `PowerShell`), escribe `cd ` (con un espacio al final), arrastra la carpeta del proyecto dentro de la consola y pulsa `Enter`.

*   **En macOS**:
    1. Abre la aplicación **Terminal** (búscala en Spotlight con `Cmd + Espacio`).
    2. Escribe `cd ` (deja un espacio al final).
    3. Arrastra la carpeta del proyecto desde el Finder directamente dentro de la ventana de la Terminal (esto escribirá la ruta del proyecto automáticamente).
    4. Presiona `Enter` para situarte en el directorio.

#### 3. Instalar las Dependencias
Ejecuta el siguiente comando para descargar Three.js y el servidor Vite en la carpeta local de tu proyecto:
```bash
npm install
```
*Este comando creará una carpeta llamada `node_modules` donde se guardarán todas las librerías necesarias.*

#### 4. Iniciar el Servidor de Desarrollo
Para levantar la aplicación localmente, ejecuta el comando:
```bash
npm run dev
```

En la terminal aparecerá un mensaje indicando que el servidor de desarrollo está activo y te proporcionará una dirección local similar a esta:
```text
  VITE v8.0.12  ready in 250 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

#### 5. Abrir la Aplicación
Abre tu navegador de preferencia (Chrome, Edge, Safari, Firefox) y entra a la dirección web que se muestra en tu consola:
👉 **[http://localhost:5173/](http://localhost:5173/)**

¡Listo! Ya puedes empezar a modelar y diseñar en 2D y 3D.

---

### 📦 Construcción para Producción

Si deseas compilar la aplicación para subirla a un servidor web o hosting estático (como GitHub Pages, Vercel, Netlify o Firebase Hosting):

1. Compila los archivos del proyecto ejecutando:
   ```bash
   npm run build
   ```
   *Esto generará una carpeta llamada `dist/` en la raíz del proyecto con el código HTML, CSS y Javascript optimizado y minificado.*

2. Si quieres probar localmente cómo funciona esta compilación de producción antes de subirla a internet, puedes previsualizarla ejecutando:
   ```bash
   npm run preview
   ```
   *Te dará un nuevo puerto local para probar la versión de producción en tu navegador.*

---

## 🛠️ Tecnologías Utilizadas

*   **Core**: HTML5, Vanilla JavaScript (ES Modules).
*   **Diseño y UI**: CSS Moderno con variables CSS (Temas nativos), animaciones y rejillas adaptables.
*   **Motor 3D**: [Three.js](https://threejs.org/) para el renderizado, texturizado, cámaras y luces.
*   **Gestión de Órbita 3D**: `OrbitControls` de Three.js.
*   **Herramienta de Empaquetado**: [Vite](https://vite.dev/) para compilar y servir el entorno de desarrollo.
