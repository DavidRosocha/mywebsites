import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';


// Loading tracker
let modelsToLoad = 7; // Total number of models
let modelsLoaded = 0;

function onModelLoaded() {
  modelsLoaded++;
  if (window.updateLoadingProgress) {
    window.updateLoadingProgress();
  }
  
  if (modelsLoaded === modelsToLoad) {
    if (window.threeJsLoaded) {
      window.threeJsLoaded();
    }
  }
}

// Path configuration
const baseUrl = './';
const PIXEL_FACTOR = 4;

// Scene setup
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.05);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(1.4, 1.1, 1.8);
camera.lookAt(0, 0.6, 0);

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#bg'),
  powerPreference: "high-performance",
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth / PIXEL_FACTOR, window.innerHeight / PIXEL_FACTOR, false);
renderer.domElement.style.imageRendering = 'pixelated';

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.8, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.update();

// Loaders
const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
loader.setDRACOLoader(dracoLoader);
const textureLoader = new THREE.TextureLoader();

// Raycaster setup
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let computerModel;

// Helper to load models
function loadModel(fileName, position, scale, rotation = [0, 0, 0]) {
  const modelPath = `${baseUrl}models/${fileName}`;

  loader.load(
    modelPath,
    (gltf) => {
      const model = gltf.scene;
      model.position.set(...position);
      model.scale.set(...scale);
      model.rotation.set(...rotation);

      if (fileName === '8_bit_pc.glb') {
        computerModel = model;
      }

      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      scene.add(model);
      onModelLoaded();

    },
    undefined,
    (error) => {
      console.error(`Error loading ${modelPath}:`, error);
      onModelLoaded();

    }
  );
}

// Load Models
loadModel('drawer_desk.glb', [0.13, 0, 0], [1.3, 1, 1]);
loadModel('banker_lamp.glb', [0.8, 0.7, -0.25], [1.7, 1.7, 1.7]);
loadModel('skimmia_japonica.glb', [-0.7, 0.7, -0.3], [0.15, 0.15, 0.15],[0, Math.PI/1.5, 0]);
loadModel('chair_daisy_plywood.glb', [0, 0, 1.1], [1, 1, 1], [0, Math.PI, 0]);
loadModel('usb_flash_drive.glb', [-0.9, 0.7, 0.1], [0.02, 0.05, 0.04], [0, Math.PI / 5, 0]);
loadModel('filing_cabinet_green.glb', [-1, 0, 0.92], [1, 1, 1]);
loadModel('8_bit_pc.glb', [0, 0.7, -0.1], [3, 2, 1.5]);

// Lighting
const pointLight = new THREE.PointLight(0xffffff, 0.7);
pointLight.position.set(0.67, 1.3, -0.25);
pointLight.castShadow = true;
pointLight.shadow.mapSize.width = 512;
pointLight.shadow.mapSize.height = 512;
scene.add(pointLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const spotlight = new THREE.SpotLight(0xffffff, 1);
spotlight.position.set(1.5, 2.5, 1);
spotlight.angle = Math.PI / 6;
spotlight.penumbra = 0.2;
spotlight.decay = 2;
spotlight.distance = 5;
spotlight.castShadow = true;
spotlight.shadow.mapSize.width = 512;
spotlight.shadow.mapSize.height = 512;
scene.add(spotlight);

// Carpet setup
const baseColor = textureLoader.load(`${baseUrl}textures/T_vddldbw_1K_B.jpg`);
const normalMap = textureLoader.load(`${baseUrl}textures/T_vddldbw_1K_N.jpg`);
const ormMap = textureLoader.load(`${baseUrl}textures/T_vddldbw_1K_ORM.jpg`);

[baseColor, normalMap, ormMap].forEach(tex => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
});

const carpetGeometry = new THREE.CircleGeometry(3, 64);
const carpetMaterial = new THREE.MeshStandardMaterial({
  map: baseColor,
  normalMap: normalMap,
  aoMap: ormMap,
  roughnessMap: ormMap,
  metalnessMap: ormMap,
  side: THREE.DoubleSide,
});

const carpetMesh = new THREE.Mesh(carpetGeometry, carpetMaterial);
carpetMesh.rotation.set(-Math.PI / 2, 0, 0);
carpetMesh.receiveShadow = true;
scene.add(carpetMesh);

// Background Gradient
const canvas = document.createElement('canvas');
canvas.width = 512;
canvas.height = 512;
const context = canvas.getContext('2d');
const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
gradient.addColorStop(0, '#959595');
gradient.addColorStop(1, '#C1C1C1');
context.fillStyle = gradient;
context.fillRect(0, 0, canvas.width, canvas.height);
const backgroundTexture = new THREE.CanvasTexture(canvas);
scene.background = backgroundTexture;

// Rectangle (Nav Background)
const rectangleGeometry = new THREE.PlaneGeometry(0.878, 0.51);
const rectangleMaterial = new THREE.MeshBasicMaterial({ color: 0xAAAAAA, side: THREE.DoubleSide });
const rectangleMesh = new THREE.Mesh(rectangleGeometry, rectangleMaterial);
rectangleMesh.position.set(0.012, 1.139, -0.0705);
rectangleMesh.rotation.set(Math.PI, 0, 0);

// Post Processing
const composer = new EffectComposer(renderer);
composer.setSize(window.innerWidth / PIXEL_FACTOR, window.innerHeight / PIXEL_FACTOR);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.1, 0.1, 0.8
);
composer.addPass(bloomPass);

// Interaction
window.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth / PIXEL_FACTOR, window.innerHeight / PIXEL_FACTOR, false);
  composer.setSize(window.innerWidth / PIXEL_FACTOR, window.innerHeight / PIXEL_FACTOR);
  
  updateNavPosition();
});

// Panning Logic
let isPanning = false;
let isPanned = false;
let isReturning = false;
let panningProgress = 0;
let targetPosition = new THREE.Vector3();
let startPosition = new THREE.Vector3();
const originalPosition = new THREE.Vector3(1.4, 1.1, 1.8);
const zoomedPosition = new THREE.Vector3(0.0118, 1.14, 0.6);

window.addEventListener('click', () => {
  if (computerModel && !isPanned && !isPanning) {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(computerModel, true);
    
    if (intersects.length > 0) {
      targetPosition.copy(zoomedPosition);
      startPosition.copy(camera.position);
      isPanning = true;
      panningProgress = 0;
    }
  }
});

// Back button functionality
// Back button functionality
function goBack() {
  if (isPanned && !isReturning) {
    targetPosition.copy(originalPosition);
    startPosition.copy(camera.position);
    isReturning = true;
    isPanning = true;
    panningProgress = 0;
    
    // Hide nav and rectangle
    const nav = document.querySelector('nav');
    if(nav) nav.style.opacity = '0';
    scene.remove(rectangleMesh); // This should already remove it
    
    // Show title and subtitle
    const title = document.getElementById('Title');
    const subtitle = document.getElementById('Subtitle');
    if(title) title.style.opacity = 1;
    if(subtitle) subtitle.style.opacity = 1;
    
    // Reset cursor immediately
    document.body.style.cursor = `url('${baseUrl}assets/cursors/retrocursor.png'), auto`;
  }
}

// Add back button to DOM
const backButton = document.createElement('button');
backButton.id = 'backButton';
backButton.innerHTML = '← Back';
backButton.style.cssText = `
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 10px 20px;
  font-family: 'VT323', monospace;
  font-size: 24px;
  background-color: #333;
  color: white;
  border: 2px solid #555;
  border-radius: 5px;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s, background-color 0.2s;
  z-index: 100;
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.5);
`;
backButton.onmouseover = () => backButton.style.backgroundColor = '#555';
backButton.onmouseout = () => backButton.style.backgroundColor = '#333';
backButton.onclick = goBack;
document.body.appendChild(backButton);

function animateCameraPanning() {
  if (isPanning) {
    panningProgress += 0.015;
    if (panningProgress >= 1) {
      panningProgress = 1;
      isPanning = false;
      
      // In animateCameraPanning, where isReturning completes:
      if (isReturning) {
        // Returned to original view
        isReturning = false;
        isPanned = false;
        controls.enabled = true;
        controls.enableZoom = true;
        controls.update();
        
        // ENSURE rectangle is removed
        if (scene.children.includes(rectangleMesh)) {
          scene.remove(rectangleMesh);
        }
        
        // Hide back button
        backButton.style.opacity = '0';
        backButton.style.pointerEvents = 'none';
        
        // Reset cursor
        document.body.style.cursor = `url('${baseUrl}assets/cursors/retrocursor.png'), auto`;
      } else {
        // Zoomed into computer
        isPanned = true;
        
        controls.enabled = false;
        controls.enableZoom = true;

        setTimeout(() => {
          scene.add(rectangleMesh);
          updateNavPosition();
          const nav = document.querySelector('nav');
          if(nav) nav.style.opacity = '1';
          
          // Show back button
          backButton.style.opacity = '1';
          backButton.style.pointerEvents = 'auto';
        }, 300);

        const title = document.getElementById('Title');
        const subtitle = document.getElementById('Subtitle');
        if(title) title.style.opacity = 0;
        if(subtitle) subtitle.style.opacity = 0;
      }
    }

    camera.position.lerpVectors(startPosition, targetPosition, panningProgress);
    camera.lookAt(isReturning ? 0 : 0.0118, isReturning ? 0.6 : 1.14, 0);
  } 
  else if (!isPanned) {
    camera.position.x += Math.sin(Date.now() * 0.001) * 0.001;
    camera.position.y += Math.cos(Date.now() * 0.001) * 0.001;
  }
}

function updateNavPosition() {
  if (!isPanned) return;

  const corners = [
    new THREE.Vector3(-0.439, -0.255, 0),
    new THREE.Vector3(0.439, -0.255, 0),
    new THREE.Vector3(-0.439, 0.255, 0),
    new THREE.Vector3(0.439, 0.255, 0),
  ];

  const screenCorners = corners.map((corner) => {
    const worldPos = rectangleMesh.localToWorld(corner.clone());
    worldPos.project(camera);
    return {
      x: (worldPos.x * 0.5 + 0.5) * window.innerWidth,
      y: (1 - worldPos.y * 0.5 - 0.5) * window.innerHeight,
    };
  });

  const minX = Math.min(...screenCorners.map((c) => c.x));
  const maxX = Math.max(...screenCorners.map((c) => c.x));
  const minY = Math.min(...screenCorners.map((c) => c.y));
  const maxY = Math.max(...screenCorners.map((c) => c.y));

  const nav = document.querySelector("nav");
  if(nav) {
      nav.style.position = "absolute";
      nav.style.left = `${minX}px`;
      nav.style.top = `${minY}px`;
      nav.style.width = `${maxX - minX}px`;
      nav.style.height = `${maxY - minY}px`;
  }
}

// Main loop
function animate() {
  requestAnimationFrame(animate);

  if (!isPanned) {
    controls.update();
    
    raycaster.setFromCamera(mouse, camera);
    if (computerModel) {
        const intersects = raycaster.intersectObject(computerModel, true);
        
        const cursorUrl = (intersects.length > 0) 
            ? `url('${baseUrl}assets/cursors/retrocursorsel.png'), pointer`
            : `url('${baseUrl}assets/cursors/retrocursor.png'), auto`;
            
        document.body.style.cursor = cursorUrl;
    }
  }

  animateCameraPanning();
  composer.render();
}

animate();

function toggleStory(button) {
  const content = button.nextElementSibling;
  content.classList.toggle('expanded');
  
  if (content.classList.contains('expanded')) {
    button.textContent = 'Hide Story ▲';
  } else {
    if (button.textContent.includes('Technical')) {
      button.textContent = 'Read Technical Details ▼';
    } else if (button.textContent.includes('Project Story')) {
      button.textContent = 'Read Project Story ▼';
    } else if (button.textContent.includes('Narrative')) {
      button.textContent = 'Read Project Narrative ▼';
    } else {
      button.textContent = 'Read Full Story ▼';
    }
  }
}

// DOM UI Logic
function handleNavClick(clickedId, sectionToShowId) {
    const allSections = ['aboutme', 'experience', 'education', 'projects'];
    const allLinks = document.querySelectorAll("nav ul li a");

    allLinks.forEach((link) => {
        link.style.display = (link.id === clickedId) ? "block" : "none";
        if(link.id === clickedId) link.style.fontWeight = "bold";
    });

    allSections.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = 'none';
    });

    const target = document.getElementById(sectionToShowId);
    if(target) target.style.display = "block";
}

document.getElementById("AboutMe")?.addEventListener("click", (e) => {
    e.preventDefault();
    handleNavClick("AboutMe", "aboutme");
});

document.getElementById("Experience")?.addEventListener("click", (e) => {
    e.preventDefault();
    handleNavClick("Experience", "experience");
});

document.getElementById("Education")?.addEventListener("click", (e) => {
    e.preventDefault();
    handleNavClick("Education", "education");
});

document.getElementById("Projects")?.addEventListener("click", (e) => {
    e.preventDefault();
    handleNavClick("Projects", "projects");
});
