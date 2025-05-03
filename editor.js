/**
 * Vibeify - Editor JavaScript
 * Handles image editing functionality with canvas-based operations
 */

// Global variables
const state = {
    originalImage: null,           // Original loaded image
    currentImage: null,            // Current edited image
    canvas: null,                  // Canvas element
    ctx: null,                     // Canvas context
    editHistory: [],               // History of edits for undo
    currentHistoryIndex: -1,       // Current position in history
    zoomLevel: 1,                  // Current zoom level
    panOffset: { x: 0, y: 0 },     // Current pan position
    edits: {                       // Current edit values
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0,
        rotation: 0,
        flipped: false,
        filter: 'none'
    },
    originalWidth: null,
    originalHeight: null
};

// Initialize the editor
document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const editorWorkspace = document.getElementById('editor-workspace');
    const imageContainer = document.getElementById('image-container');
    const canvas = document.getElementById('image-canvas');
    const toolbar = document.getElementById('toolbar');

    // Store canvas reference
    state.canvas = canvas;
    state.ctx = canvas.getContext('2d');

    // File input change handler
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop handling
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('active');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('active');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('active');

        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // Initialize panels and side buttons
    initializePanels();

    // Initialize tool buttons
    document.getElementById('crop-btn').addEventListener('click', initCrop);
    document.getElementById('rotate-left-btn').addEventListener('click', () => rotateImage(-90));
    document.getElementById('rotate-right-btn').addEventListener('click', () => rotateImage(90));
    document.getElementById('flip-btn').addEventListener('click', flipImage);
    document.getElementById('download-btn').addEventListener('click', downloadImage);
    document.getElementById('reset-btn').addEventListener('click', resetImage);
    document.getElementById('undo-btn').addEventListener('click', undoEdit);

    // Initialize slider controls
    document.getElementById('brightness-slider').addEventListener('input', updateSliders);
    document.getElementById('contrast-slider').addEventListener('input', updateSliders);
    document.getElementById('saturation-slider').addEventListener('input', updateSliders);
    document.getElementById('blur-slider').addEventListener('input', updateSliders);

    // Initialize filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all filter buttons
            filterButtons.forEach(b => b.classList.remove('active'));

            // Add active class to clicked button
            btn.classList.add('active');

            // Apply the selected filter
            const filterId = btn.id.replace('filter-', '');
            applyFilter(filterId);
        });
    });

    // Canvas zoom and pan controls
    document.getElementById('zoom-in').addEventListener('click', () => changeZoom(0.1));
    document.getElementById('zoom-out').addEventListener('click', () => changeZoom(-0.1));
    document.getElementById('reset-view').addEventListener('click', resetView);

    // Add keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
});

// Initialize sidebar panels
function initializePanels() {
    // Get all side buttons and panels
    const sideButtons = document.querySelectorAll('.side-btn[data-panel]');
    const panels = document.querySelectorAll('.control-panel');
    const closePanelButtons = document.querySelectorAll('.close-panel');

    // Add click event to each side button
    sideButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const panelId = btn.getAttribute('data-panel');
            const targetPanel = document.getElementById(panelId);

            // Toggle active state on button
            const isActive = btn.classList.contains('active');

            // Remove active class from all buttons and panels
            sideButtons.forEach(b => b.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));

            // If not already active, make this button and panel active
            if (!isActive) {
                btn.classList.add('active');
                targetPanel.classList.add('active');
            }
        });
    });

    // Add close button functionality
    closePanelButtons.forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            // Find the parent panel and remove active class
            const panel = closeBtn.closest('.control-panel');
            panel.classList.remove('active');

            // Also remove active class from the corresponding side button
            const panelId = panel.id;
            const sideBtn = document.querySelector(`.side-btn[data-panel="${panelId}"]`);
            if (sideBtn) {
                sideBtn.classList.remove('active');
            }
        });
    });
}

// Handle file selection from input
function handleFileSelect(e) {
    if (e.target.files.length) {
        handleFile(e.target.files[0]);
    }
}

// Process selected file
function handleFile(file) {
    // Check if file is an image
    if (!file.type.match('image.*')) {
        alert('Please select an image file (JPEG, PNG, or WEBP).');
        return;
    }

    // Check file size (32K UHD = ~33.2 megapixels)
    if (file.size > 100 * 1024 * 1024) { // 100MB as a rough limit
        alert('File is too large. Please select a smaller image.');
        return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            // Store original image
            state.originalImage = img;

            // Reset state
            resetState();

            // Show editor workspace and hide upload area
            document.getElementById('upload-area').style.display = 'none';
            document.getElementById('editor-workspace').style.display = 'flex';

            // Render image
            renderImage();

            // Save initial state to history
            saveToHistory();
        };

        img.src = e.target.result;
    };

    reader.readAsDataURL(file);
}

// Reset editing state
function resetState() {
    state.edits = {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0,
        rotation: 0,
        flipped: false,
        filter: 'none'
    };

    state.editHistory = [];
    state.currentHistoryIndex = -1;
    state.zoomLevel = 1;
    state.panOffset = { x: 0, y: 0 };

    // Reset slider values
    document.getElementById('brightness-slider').value = 100;
    document.getElementById('contrast-slider').value = 100;
    document.getElementById('saturation-slider').value = 100;
    document.getElementById('blur-slider').value = 0;

    // Reset filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => btn.classList.remove('active'));
    document.getElementById('filter-none').classList.add('active');
}

// Render the image on canvas with current edits
function renderImage() {
    if (!state.originalImage) return;

    const canvas = state.canvas;
    const ctx = state.ctx;
    const img = state.originalImage;

    // Get container dimensions
    const containerWidth = canvas.parentElement.clientWidth;
    const containerHeight = canvas.parentElement.clientHeight;

    // Store original dimensions for processing
    state.originalWidth = img.width;
    state.originalHeight = img.height;

    // Calculate display dimensions (for rendering only)
    const imgRatio = img.width / img.height;
    let displayWidth, displayHeight;

    if (imgRatio > 1) {
        // Landscape orientation
        displayWidth = Math.min(containerWidth, img.width);
        displayHeight = displayWidth / imgRatio;
    } else {
        // Portrait orientation
        displayHeight = Math.min(containerHeight, img.height);
        displayWidth = displayHeight * imgRatio;
    }

    // Apply zoom to display dimensions
    displayWidth *= state.zoomLevel;
    displayHeight *= state.zoomLevel;

    // Set canvas dimensions to DISPLAY size (not processing size)
    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // Set display dimensions using CSS for high-DPI support
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    // Apply high-DPI scaling if device has high pixel ratio
    const dpr = window.devicePixelRatio || 1;
    if (dpr > 1) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        ctx.scale(dpr, dpr);
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();

    // Apply rotation
    if (state.edits.rotation !== 0) {
        ctx.translate(displayWidth / 2, displayHeight / 2);
        ctx.rotate((state.edits.rotation * Math.PI) / 180);
        ctx.translate(-displayWidth / 2, -displayHeight / 2);
    }

    // Apply flip
    if (state.edits.flipped) {
        ctx.translate(displayWidth, 0);
        ctx.scale(-1, 1);
    }

    // Draw image with high quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

    // Reset transformations
    ctx.restore();

    // Separately apply filters after rendering
    applyCurrentFilters();
}

// Apply slider updates
function updateSliders(e) {
    const sliderId = e.target.id;
    const value = e.target.value;

    switch (sliderId) {
        case 'brightness-slider':
            state.edits.brightness = value;
            break;
        case 'contrast-slider':
            state.edits.contrast = value;
            break;
        case 'saturation-slider':
            state.edits.saturation = value;
            break;
        case 'blur-slider':
            state.edits.blur = value;
            break;
    }

    // Use the separate filter application function
    applyCurrentFilters();

    // Add debounced save to history
    clearTimeout(state.sliderTimeout);
    state.sliderTimeout = setTimeout(() => {
        saveToHistory();
    }, 500);
}

// Rotate image
function rotateImage(degrees) {
    state.edits.rotation = (state.edits.rotation + degrees) % 360;
    renderImage();
    saveToHistory();
}

// Flip image horizontally
function flipImage() {
    state.edits.flipped = !state.edits.flipped;
    renderImage();
    saveToHistory();
}

// Apply filter
function applyFilter(filterId) {
    state.edits.filter = filterId;
    applyCurrentFilters();
    saveToHistory();
}

// Initialize crop mode
function initCrop() {
    // Crop functionality would be implemented here
    // This would involve drawing a cropbox overlay and handling user interactions
    alert('Crop feature coming soon!');
}

// Change zoom level
function changeZoom(amount) {
    state.zoomLevel = Math.max(0.1, Math.min(5, state.zoomLevel + amount));
    renderImage();

    // Make sure filters and edits are still applied after zooming
    applyCurrentFilters();
}

// Apply current filters to ensure they're maintained across actions
function applyCurrentFilters() {
    let filterString = '';
    filterString += `brightness(${state.edits.brightness}%) `;
    filterString += `contrast(${state.edits.contrast}%) `;
    filterString += `saturate(${state.edits.saturation}%) `;
    filterString += `blur(${state.edits.blur}px) `;

    // Apply preset filters
    switch (state.edits.filter) {
        case 'grayscale':
            filterString += 'grayscale(100%) ';
            break;
        case 'sepia':
            filterString += 'sepia(70%) ';
            break;
        case 'vintage':
            filterString += 'sepia(50%) contrast(130%) brightness(90%) ';
            break;
        case 'cool':
            filterString += 'hue-rotate(180deg) saturate(130%) ';
            break;
        case 'warm':
            filterString += 'hue-rotate(30deg) saturate(150%) brightness(110%) ';
            break;
    }

    state.canvas.style.filter = filterString;
}

// Reset view to original zoom and position
function resetView() {
    state.zoomLevel = 1;
    state.panOffset = { x: 0, y: 0 };
    renderImage();

    // Ensure filters are still applied after resetting view
    applyCurrentFilters();
}

// Save the current state to history
function saveToHistory() {
    // Remove any states after current position if we've gone back in history
    if (state.currentHistoryIndex < state.editHistory.length - 1) {
        state.editHistory = state.editHistory.slice(0, state.currentHistoryIndex + 1);
    }

    // Save a copy of the current edits state
    state.editHistory.push(JSON.parse(JSON.stringify(state.edits)));
    state.currentHistoryIndex = state.editHistory.length - 1;

    // Enable/disable undo button
    document.getElementById('undo-btn').disabled = state.currentHistoryIndex <= 0;
}

// Undo the last edit
function undoEdit() {
    if (state.currentHistoryIndex <= 0 || state.editHistory.length <= 1) {
        console.log('Nothing to undo');
        return;
    }

    // Go back one step in history
    state.currentHistoryIndex--;

    // Restore previous state
    const previousState = state.editHistory[state.currentHistoryIndex];
    state.edits = { ...previousState.edits };

    // Update sliders to match restored values
    document.getElementById('brightness-slider').value = state.edits.brightness;
    document.getElementById('contrast-slider').value = state.edits.contrast;
    document.getElementById('saturation-slider').value = state.edits.saturation;
    document.getElementById('blur-slider').value = state.edits.blur;

    // Update filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => btn.classList.remove('active'));
    document.getElementById(`filter-${state.edits.filter}`).classList.add('active');

    // Re-render the image
    renderImage();
}

// Reset image to original state
function resetImage() {
    if (!state.originalImage) return;

    // Reset editing state
    resetState();

    // Render the original image
    renderImage();

    // Save the reset state to history
    saveToHistory();

    // Reset all sliders to default values
    document.getElementById('brightness-slider').value = 100;
    document.getElementById('contrast-slider').value = 100;
    document.getElementById('saturation-slider').value = 100;
    document.getElementById('blur-slider').value = 0;

    // Reset filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => btn.classList.remove('active'));
    document.getElementById('filter-none').classList.add('active');

    // Close any open panels
    document.querySelectorAll('.control-panel').forEach(panel => {
        panel.classList.remove('active');
    });

    // Remove active class from side buttons
    document.querySelectorAll('.side-btn').forEach(btn => {
        btn.classList.remove('active');
    });
}

// Apply filters directly to canvas data instead of using CSS
function applyCanvasFilters(canvas, ctx) {
    // Get the image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Apply brightness, contrast, saturation
    const brightness = state.edits.brightness / 100;
    const contrast = state.edits.contrast / 100;
    const saturation = state.edits.saturation / 100;

    for (let i = 0; i < data.length; i += 4) {
        // Get RGB values
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Apply brightness
        r *= brightness;
        g *= brightness;
        b *= brightness;

        // Apply contrast (formula: (value - 128) * contrast + 128)
        r = (r - 128) * contrast + 128;
        g = (g - 128) * contrast + 128;
        b = (b - 128) * contrast + 128;

        // Apply saturation
        const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
        r = gray + saturation * (r - gray);
        g = gray + saturation * (g - gray);
        b = gray + saturation * (b - gray);

        // Apply preset filters
        if (state.edits.filter === 'grayscale') {
            const grayValue = 0.2989 * r + 0.5870 * g + 0.1140 * b;
            r = g = b = grayValue;
        } else if (state.edits.filter === 'sepia') {
            const newR = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
            const newG = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
            const newB = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
            r = newR;
            g = newG;
            b = newB;
        } else if (state.edits.filter === 'vintage') {
            // Sepia + contrast adjustment for vintage look
            const newR = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189)) * 1.3 * 0.9;
            const newG = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168)) * 1.3 * 0.9;
            const newB = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131)) * 1.3 * 0.9;
            r = newR;
            g = newG;
            b = newB;
        }

        // Clamp values
        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
    }

    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);

    // Apply blur if needed
    if (state.edits.blur > 0) {
        // We need a better blur algorithm for actual pixel data
        const blurAmount = state.edits.blur;

        // Create a temporary canvas for the blur effect
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Draw the current image to the temp canvas
        tempCtx.drawImage(canvas, 0, 0);

        // Apply a stack blur algorithm (simplified version)
        boxBlur(tempCanvas, tempCtx, blurAmount);

        // Draw the blurred image back to the original canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tempCanvas, 0, 0);
    }
}

// Box blur implementation for better blur effect
function boxBlur(canvas, ctx, radius) {
    if (radius <= 0) return;

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const width = canvas.width;
    const height = canvas.height;

    // Create temporary arrays for processing
    const tempPixels = new Uint8ClampedArray(pixels.length);

    // Copy initial pixels
    for (let i = 0; i < pixels.length; i++) {
        tempPixels[i] = pixels[i];
    }

    // Horizontal pass
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let redSum = 0, greenSum = 0, blueSum = 0, alphaSum = 0;
            let count = 0;

            // Sample horizontal neighbors
            for (let i = Math.max(0, x - radius); i <= Math.min(width - 1, x + radius); i++) {
                const idx = (y * width + i) * 4;
                redSum += tempPixels[idx];
                greenSum += tempPixels[idx + 1];
                blueSum += tempPixels[idx + 2];
                alphaSum += tempPixels[idx + 3];
                count++;
            }

            // Set average color
            const idx = (y * width + x) * 4;
            pixels[idx] = redSum / count;
            pixels[idx + 1] = greenSum / count;
            pixels[idx + 2] = blueSum / count;
            pixels[idx + 3] = alphaSum / count;
        }
    }

    // Copy for vertical pass
    for (let i = 0; i < pixels.length; i++) {
        tempPixels[i] = pixels[i];
    }

    // Vertical pass
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            let redSum = 0, greenSum = 0, blueSum = 0, alphaSum = 0;
            let count = 0;

            // Sample vertical neighbors
            for (let j = Math.max(0, y - radius); j <= Math.min(height - 1, y + radius); j++) {
                const idx = (j * width + x) * 4;
                redSum += tempPixels[idx];
                greenSum += tempPixels[idx + 1];
                blueSum += tempPixels[idx + 2];
                alphaSum += tempPixels[idx + 3];
                count++;
            }

            // Set average color
            const idx = (y * width + x) * 4;
            pixels[idx] = redSum / count;
            pixels[idx + 1] = greenSum / count;
            pixels[idx + 2] = blueSum / count;
            pixels[idx + 3] = alphaSum / count;
        }
    }

    // Put the processed image data back
    ctx.putImageData(imageData, 0, 0);
}

// Download the edited image
function downloadImage() {
    if (!state.originalImage) return;

    // Show loading message
    const loadingMessage = document.createElement('div');
    loadingMessage.style.position = 'fixed';
    loadingMessage.style.top = '50%';
    loadingMessage.style.left = '50%';
    loadingMessage.style.transform = 'translate(-50%, -50%)';
    loadingMessage.style.background = 'rgba(0, 0, 0, 0.8)';
    loadingMessage.style.color = 'white';
    loadingMessage.style.padding = '20px';
    loadingMessage.style.borderRadius = '10px';
    loadingMessage.style.zIndex = '9999';
    loadingMessage.textContent = 'Processing image...';
    document.body.appendChild(loadingMessage);

    // Use requestAnimationFrame to ensure UI remains responsive
    requestAnimationFrame(() => {
        try {
            // Preserve original dimensions with a reasonable upper limit
            const MAX_DIMENSION = 8000; // Support for very high-res images (8K)

            // Always maintain original aspect ratio
            let outputWidth = state.originalWidth;
            let outputHeight = state.originalHeight;

            // Only scale down extremely large images
            if (outputWidth > MAX_DIMENSION || outputHeight > MAX_DIMENSION) {
                const ratio = state.originalWidth / state.originalHeight;
                if (outputWidth > outputHeight) {
                    outputWidth = MAX_DIMENSION;
                    outputHeight = Math.floor(outputWidth / ratio);
                } else {
                    outputHeight = MAX_DIMENSION;
                    outputWidth = Math.floor(outputHeight * ratio);
                }
            }

            // Create a high-quality rendering canvas
            const outputCanvas = document.createElement('canvas');
            outputCanvas.width = outputWidth;
            outputCanvas.height = outputHeight;
            const outputCtx = outputCanvas.getContext('2d', { alpha: false });

            // Enable maximum quality settings
            outputCtx.imageSmoothingEnabled = true;
            outputCtx.imageSmoothingQuality = 'high';

            // Apply transformations using clean matrix operations
            outputCtx.save();

            // Center transformations
            outputCtx.translate(outputWidth / 2, outputHeight / 2);

            // Apply rotation if needed
            if (state.edits.rotation !== 0) {
                outputCtx.rotate((state.edits.rotation * Math.PI) / 180);
            }

            // Apply flip if needed
            if (state.edits.flipped) {
                outputCtx.scale(-1, 1);
            }

            // Move back to draw the image
            outputCtx.translate(-outputWidth / 2, -outputHeight / 2);

            // Draw the original image at full quality
            outputCtx.drawImage(state.originalImage, 0, 0, outputWidth, outputHeight);

            // Restore transformation context
            outputCtx.restore();

            // Apply all filters and adjustments at high quality
            applyHighQualityFilters(outputCanvas, outputCtx);

            // Determine best file format and quality based on content
            let mimeType = 'image/png';
            let quality = 1.0;

            // For photos with lots of colors, JPEG might be better
            // For images with transparency or sharp edges, PNG is better
            if (state.edits.filter !== 'none' ||
                state.edits.brightness !== 100 ||
                state.edits.contrast !== 100 ||
                state.edits.saturation !== 100) {
                // Use PNG for filtered images to preserve quality
                mimeType = 'image/png';
            }

            // Get data URL with appropriate quality
            const dataURL = outputCanvas.toDataURL(mimeType, quality);

            // Create and trigger download
            const filename = 'vibeify_edited' + (mimeType === 'image/png' ? '.png' : '.jpg');
            const link = document.createElement('a');
            link.href = dataURL;
            link.download = filename;
            link.click();
        } catch (error) {
            console.error('Error during image processing:', error);
            alert('An error occurred while processing the image. Please try again with a smaller image.');
        } finally {
            // Always remove loading message
            document.body.removeChild(loadingMessage);
        }
    });
}

// تحسين الفلاتر عالية الجودة
function applyHighQualityFilters(canvas, ctx) {
    // Get width and height
    const width = canvas.width;
    const height = canvas.height;

    // Apply blur with high quality if needed
    if (state.edits.blur > 0) {
        // Create a temporary canvas for blur
        const blurCanvas = document.createElement('canvas');
        blurCanvas.width = width;
        blurCanvas.height = height;
        const blurCtx = blurCanvas.getContext('2d');

        // Draw original image
        blurCtx.drawImage(canvas, 0, 0);

        // Apply Gaussian blur approximation
        const blurAmount = state.edits.blur;
        gaussianBlur(blurCanvas, blurCtx, blurAmount);

        // Draw blurred image back
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(blurCanvas, 0, 0);
    }

    // Apply remaining filters via direct image manipulation with higher precision
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Get filter settings
    const brightness = state.edits.brightness / 100;
    const contrast = state.edits.contrast / 100;
    const saturation = state.edits.saturation / 100;
    const filter = state.edits.filter;

    // Process all pixels for highest quality (no skipping)
    for (let i = 0; i < data.length; i += 4) {
        // Get RGB values
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Apply brightness with precision
        if (brightness !== 1) {
            r = Math.min(255, r * brightness);
            g = Math.min(255, g * brightness);
            b = Math.min(255, b * brightness);
        }

        // Apply contrast with improved formula
        if (contrast !== 1) {
            const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
            r = factor * (r - 128) + 128;
            g = factor * (g - 128) + 128;
            b = factor * (b - 128) + 128;
        }

        // Apply filters with higher quality
        if (filter === 'grayscale') {
            // Use precise luminance formula
            const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            r = g = b = gray;
        } else if (filter === 'sepia') {
            const newR = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
            const newG = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
            const newB = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
            r = newR;
            g = newG;
            b = newB;
        } else if (filter === 'vintage') {
            // Enhanced vintage look
            r = Math.min(255, r * 1.15);
            g = Math.min(255, g * 1.05);
            b = Math.min(255, b * 0.9);
        } else if (filter === 'cool') {
            r = r * 0.8;
            b = Math.min(255, b * 1.2);
        } else if (filter === 'warm') {
            r = Math.min(255, r * 1.2);
            g = Math.min(255, g * 1.1);
            b = b * 0.8;
        }

        // Apply saturation with higher precision
        if (saturation !== 1) {
            const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            r = gray + saturation * (r - gray);
            g = gray + saturation * (g - gray);
            b = gray + saturation * (b - gray);
        }

        // Clamp values
        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
    }

    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);
}

// High-quality Gaussian blur implementation
function gaussianBlur(canvas, ctx, radius) {
    if (radius <= 0) return;

    const width = canvas.width;
    const height = canvas.height;

    // Create temporary canvases for the multi-pass blur
    const tempCanvas1 = document.createElement('canvas');
    const tempCanvas2 = document.createElement('canvas');
    tempCanvas1.width = width;
    tempCanvas1.height = height;
    tempCanvas2.width = width;
    tempCanvas2.height = height;

    const tempCtx1 = tempCanvas1.getContext('2d');
    const tempCtx2 = tempCanvas2.getContext('2d');

    // Initial copy of the image
    tempCtx1.drawImage(canvas, 0, 0);

    // Calculate kernel size based on radius
    // Larger radius needs more passes for quality
    const iterations = Math.ceil(radius / 2);
    const sigma = radius / 2;

    // Multiple small passes yield better results than one large pass
    for (let i = 0; i < iterations; i++) {
        // Horizontal pass (src: tempCanvas1, dst: tempCanvas2)
        horizontalBlurPass(tempCanvas1, tempCanvas2, width, height, sigma);

        // Vertical pass (src: tempCanvas2, dst: tempCanvas1)
        verticalBlurPass(tempCanvas2, tempCanvas1, width, height, sigma);
    }

    // Draw the final blurred image back to the original canvas
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(tempCanvas1, 0, 0);
}

// Optimized horizontal blur pass
function horizontalBlurPass(srcCanvas, dstCanvas, width, height, sigma) {
    const srcCtx = srcCanvas.getContext('2d');
    const dstCtx = dstCanvas.getContext('2d');

    const srcData = srcCtx.getImageData(0, 0, width, height);
    const dstData = dstCtx.getImageData(0, 0, width, height);

    const srcPixels = srcData.data;
    const dstPixels = dstData.data;

    // Gaussian kernel radius (3 sigma covers 99.7% of the distribution)
    const kernelRadius = Math.ceil(sigma * 3);

    // Cache gaussian weights
    const weights = new Array(2 * kernelRadius + 1);
    let weightSum = 0;

    for (let i = -kernelRadius; i <= kernelRadius; i++) {
        const weight = Math.exp(-(i * i) / (2 * sigma * sigma));
        weights[i + kernelRadius] = weight;
        weightSum += weight;
    }

    // Normalize weights
    for (let i = 0; i < weights.length; i++) {
        weights[i] /= weightSum;
    }

    // Apply horizontal blur
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, a = 0;

            // Apply kernel
            for (let kx = -kernelRadius; kx <= kernelRadius; kx++) {
                const sourceX = Math.min(Math.max(x + kx, 0), width - 1);
                const weight = weights[kx + kernelRadius];

                const idx = (y * width + sourceX) * 4;
                r += srcPixels[idx] * weight;
                g += srcPixels[idx + 1] * weight;
                b += srcPixels[idx + 2] * weight;
                a += srcPixels[idx + 3] * weight;
            }

            const destIdx = (y * width + x) * 4;
            dstPixels[destIdx] = r;
            dstPixels[destIdx + 1] = g;
            dstPixels[destIdx + 2] = b;
            dstPixels[destIdx + 3] = a;
        }
    }

    // Put the processed data back
    dstCtx.putImageData(dstData, 0, 0);
}

// Optimized vertical blur pass
function verticalBlurPass(srcCanvas, dstCanvas, width, height, sigma) {
    const srcCtx = srcCanvas.getContext('2d');
    const dstCtx = dstCanvas.getContext('2d');

    const srcData = srcCtx.getImageData(0, 0, width, height);
    const dstData = dstCtx.getImageData(0, 0, width, height);

    const srcPixels = srcData.data;
    const dstPixels = dstData.data;

    // Gaussian kernel radius
    const kernelRadius = Math.ceil(sigma * 3);

    // Cache gaussian weights
    const weights = new Array(2 * kernelRadius + 1);
    let weightSum = 0;

    for (let i = -kernelRadius; i <= kernelRadius; i++) {
        const weight = Math.exp(-(i * i) / (2 * sigma * sigma));
        weights[i + kernelRadius] = weight;
        weightSum += weight;
    }

    // Normalize weights
    for (let i = 0; i < weights.length; i++) {
        weights[i] /= weightSum;
    }

    // Apply vertical blur
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            let r = 0, g = 0, b = 0, a = 0;

            // Apply kernel
            for (let ky = -kernelRadius; ky <= kernelRadius; ky++) {
                const sourceY = Math.min(Math.max(y + ky, 0), height - 1);
                const weight = weights[ky + kernelRadius];

                const idx = (sourceY * width + x) * 4;
                r += srcPixels[idx] * weight;
                g += srcPixels[idx + 1] * weight;
                b += srcPixels[idx + 2] * weight;
                a += srcPixels[idx + 3] * weight;
            }

            const destIdx = (y * width + x) * 4;
            dstPixels[destIdx] = r;
            dstPixels[destIdx + 1] = g;
            dstPixels[destIdx + 2] = b;
            dstPixels[destIdx + 3] = a;
        }
    }

    // Put the processed data back
    dstCtx.putImageData(dstData, 0, 0);
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(e) {
    // Only respond if an image is loaded
    if (!state.originalImage) return;

    // Check if Ctrl/Cmd key is pressed
    const ctrlKey = e.ctrlKey || e.metaKey;

    if (ctrlKey) {
        switch (e.key) {
            case 'z':
                e.preventDefault();
                undoEdit();
                break;
            case 's':
                e.preventDefault();
                downloadImage();
                break;
            case '0':
                e.preventDefault();
                resetView();
                break;
            case '+':
            case '=':
                e.preventDefault();
                changeZoom(0.1);
                break;
            case '-':
                e.preventDefault();
                changeZoom(-0.1);
                break;
        }
    }
} 