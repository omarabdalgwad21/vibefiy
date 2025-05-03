/**
 * Vibeify - Main JavaScript
 * Handles common UI functionality across the application
 */

// DOM Elements
const splash = document.getElementById('splash');
const fileInput = document.getElementById('file-input');
const imageGrid = document.getElementById('image-grid');
const toolbar = document.getElementById('toolbar');
const brightnessSlider = document.getElementById('brightness');
const contrastSlider = document.getElementById('contrast');
const saturationSlider = document.getElementById('saturation');
const blurSlider = document.getElementById('blur');
const rotateBtn = document.getElementById('rotate');
const flipBtn = document.getElementById('flip');
const cropBtn = document.getElementById('crop');
const filterBtn = document.getElementById('filter');
const textBtn = document.getElementById('text');
const stickerBtn = document.getElementById('sticker');
const downloadBtn = document.getElementById('download');
const resetBtn = document.getElementById('reset');

// State
let currentImage = null;
let imageHistory = [];
let currentHistoryIndex = -1;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Remove splash screen after 2 seconds
    setTimeout(() => {
        if (splash) {
            splash.classList.add('hidden');
            setTimeout(() => {
                splash.style.display = 'none';
            }, 500);
        }
    }, 2000);

    // Handle header scroll effects
    const header = document.getElementById('main-header') || document.getElementById('editor-header');
    let lastScrollY = window.scrollY;

    if (header) {
        window.addEventListener('scroll', () => {
            // Add scrolled class when page is scrolled down
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }

            // Hide header when scrolling down, show when scrolling up
            if (window.scrollY > lastScrollY && window.scrollY > 200) {
                header.classList.add('hidden');
            } else {
                header.classList.remove('hidden');
            }

            lastScrollY = window.scrollY;
        });
    }

    // Enhanced shimmer effect - follow mouse movement
    const shimmerBg = document.querySelector('.shimmer-bg');
    if (shimmerBg) {
        document.addEventListener('mousemove', (e) => {
            const x = e.clientX / window.innerWidth;
            const y = e.clientY / window.innerHeight;

            shimmerBg.style.background = `
                radial-gradient(
                    circle at ${x * 100}% ${y * 100}%, 
                    rgba(255, 255, 255, 0.1) 0%, 
                    transparent 50%
                ),
                linear-gradient(
                    90deg,
                    transparent 0%,
                    rgba(255, 255, 255, 0.05) 20%,
                    rgba(255, 255, 255, 0.1) 30%,
                    rgba(255, 255, 255, 0.2) 40%,
                    rgba(255, 255, 255, 0.1) 50%,
                    rgba(255, 255, 255, 0.05) 60%,
                    transparent 80%
                )
            `;
            shimmerBg.style.backgroundSize = '200% 100%';
            shimmerBg.style.animation = 'metallic-shimmer 8s linear infinite';
        });
    }

    // Feature item animations
    const featureItems = document.querySelectorAll('.feature-item');

    if (featureItems.length > 0) {
        // Create intersection observer for feature items
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');

                    // Track mouse position for hover effect
                    entry.target.addEventListener('mousemove', (e) => {
                        const rect = entry.target.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;

                        entry.target.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
                        entry.target.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);
                    });

                    // Unobserve after animation
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.2,
            rootMargin: '0px 0px -10% 0px'
        });

        // Observe all feature items
        featureItems.forEach((item, index) => {
            // Add staggered delay
            item.style.transitionDelay = `${index * 0.1}s`;
            observer.observe(item);
        });
    }

    // Initialize event listeners
    initializeEventListeners();
});

// Event Listeners
function initializeEventListeners() {
    // File input change
    fileInput.addEventListener('change', handleFileSelect);

    // Toolbar buttons
    rotateBtn.addEventListener('click', rotateImage);
    flipBtn.addEventListener('click', flipImage);
    cropBtn.addEventListener('click', startCrop);
    filterBtn.addEventListener('click', toggleFilters);
    textBtn.addEventListener('click', addText);
    stickerBtn.addEventListener('click', addSticker);
    downloadBtn.addEventListener('click', downloadImage);
    resetBtn.addEventListener('click', resetImage);

    // Sliders
    brightnessSlider.addEventListener('input', updateImage);
    contrastSlider.addEventListener('input', updateImage);
    saturationSlider.addEventListener('input', updateImage);
    blurSlider.addEventListener('input', updateImage);
}

// File Handling
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            // Reset state
            resetState();

            // Create image wrapper
            const wrapper = document.createElement('div');
            wrapper.className = 'image-wrapper';

            // Create image element
            const imgElement = document.createElement('img');
            imgElement.src = e.target.result;
            imgElement.alt = file.name;

            // Create image name element
            const nameElement = document.createElement('div');
            nameElement.className = 'image-name';
            nameElement.textContent = file.name;

            // Append elements
            wrapper.appendChild(imgElement);
            wrapper.appendChild(nameElement);

            // Clear and update grid
            imageGrid.innerHTML = '';
            imageGrid.appendChild(wrapper);

            // Update current image
            currentImage = imgElement;

            // Save initial state
            saveToHistory();

            // Show toolbar
            toolbar.style.display = 'flex';
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Image Manipulation
function updateImage() {
    if (!currentImage) return;

    const brightness = brightnessSlider.value;
    const contrast = contrastSlider.value;
    const saturation = saturationSlider.value;
    const blur = blurSlider.value;

    currentImage.style.filter = `
    brightness(${brightness}%)
    contrast(${contrast}%)
    saturate(${saturation}%)
    blur(${blur}px)
  `;

    saveToHistory();
}

function rotateImage() {
    if (!currentImage) return;

    const currentRotation = getCurrentRotation();
    currentImage.style.transform = `rotate(${currentRotation + 90}deg)`;
    saveToHistory();
}

function flipImage() {
    if (!currentImage) return;

    const currentScale = getCurrentScale();
    currentImage.style.transform = `scaleX(${currentScale.x * -1})`;
    saveToHistory();
}

function getCurrentRotation() {
    if (!currentImage) return 0;

    const transform = currentImage.style.transform;
    const match = transform.match(/rotate\((\d+)deg\)/);
    return match ? parseInt(match[1]) : 0;
}

function getCurrentScale() {
    if (!currentImage) return { x: 1, y: 1 };

    const transform = currentImage.style.transform;
    const xMatch = transform.match(/scaleX\(([-\d.]+)\)/);
    const yMatch = transform.match(/scaleY\(([-\d.]+)\)/);

    return {
        x: xMatch ? parseFloat(xMatch[1]) : 1,
        y: yMatch ? parseFloat(yMatch[1]) : 1
    };
}

// History Management
function saveToHistory() {
    if (!currentImage) return;

    // Remove any future states if we're not at the end
    if (currentHistoryIndex < imageHistory.length - 1) {
        imageHistory = imageHistory.slice(0, currentHistoryIndex + 1);
    }

    // Save current state
    const state = {
        src: currentImage.src,
        filter: currentImage.style.filter,
        transform: currentImage.style.transform
    };

    imageHistory.push(state);
    currentHistoryIndex = imageHistory.length - 1;
}

function resetState() {
    imageHistory = [];
    currentHistoryIndex = -1;
    brightnessSlider.value = 100;
    contrastSlider.value = 100;
    saturationSlider.value = 100;
    blurSlider.value = 0;
}

function resetImage() {
    if (!currentImage || currentHistoryIndex < 0) return;

    const initialState = imageHistory[0];
    currentImage.src = initialState.src;
    currentImage.style.filter = initialState.filter;
    currentImage.style.transform = initialState.transform;

    resetState();
    saveToHistory();
}

// Advanced Features (Placeholder implementations)
function startCrop() {
    // Implement cropping functionality
    alert('Cropping feature coming soon!');
}

function toggleFilters() {
    // Implement filter presets
    alert('Filter presets coming soon!');
}

function addText() {
    // Implement text overlay
    alert('Text overlay feature coming soon!');
}

function addSticker() {
    // Implement sticker overlay
    alert('Sticker feature coming soon!');
}

// Download
function downloadImage() {
    if (!currentImage) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size to match image
    canvas.width = currentImage.naturalWidth;
    canvas.height = currentImage.naturalHeight;

    // Apply current transformations
    ctx.filter = currentImage.style.filter;

    // Draw image
    ctx.drawImage(currentImage, 0, 0);

    // Create download link
    const link = document.createElement('a');
    link.download = 'edited-image.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// Accessibility
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
            case 'z':
                e.preventDefault();
                if (e.shiftKey) {
                    // Redo
                    if (currentHistoryIndex < imageHistory.length - 1) {
                        currentHistoryIndex++;
                        applyHistoryState();
                    }
                } else {
                    // Undo
                    if (currentHistoryIndex > 0) {
                        currentHistoryIndex--;
                        applyHistoryState();
                    }
                }
                break;
            case 's':
                e.preventDefault();
                downloadImage();
                break;
        }
    }
});

function applyHistoryState() {
    if (!currentImage || currentHistoryIndex < 0) return;

    const state = imageHistory[currentHistoryIndex];
    currentImage.src = state.src;
    currentImage.style.filter = state.filter;
    currentImage.style.transform = state.transform;
} 