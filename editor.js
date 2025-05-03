// Editor functionality for Vibeify
document.addEventListener('DOMContentLoaded', function () {
    // Elements
    const uploadContainer = document.getElementById('upload-container');
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const canvas = document.getElementById('editor-canvas');
    const ctx = canvas.getContext('2d');
    const imageContainer = document.querySelector('.image-container');
    const editorWorkspace = document.querySelector('.editor-workspace');
    const sideToolbar = document.querySelector('.side-toolbar');
    const uploadNewBtn = document.getElementById('upload-new-btn');

    // Tool panel functionality
    const sideButtons = document.querySelectorAll('.side-btn');
    const toolPanels = document.querySelectorAll('.tool-panel');

    // Check if we're on mobile
    const isMobile = window.innerWidth <= 768;

    // Hide the toolbar and panels initially
    sideToolbar.style.display = 'none';
    toolPanels.forEach(panel => {
        panel.style.display = 'none';
    });

    // Initialize the editor
    initializeEditor();

    // Add window resize listener
    window.addEventListener('resize', function () {
        const newIsMobile = window.innerWidth <= 768;
        if (newIsMobile !== isMobile) {
            // Refresh page if switching between mobile and desktop
            location.reload();
        }
    });

    function initializeEditor() {
        // Show upload container by default
        uploadContainer.classList.remove('hidden');

        // Set up drag and drop for upload area
        setupFileUpload();

        // Set up tool panels
        setupToolPanels();

        // Set up image controls
        setupImageControls();

        // Set up upload new button
        setupUploadNewButton();
    }

    // Setup upload new button
    function setupUploadNewButton() {
        if (uploadNewBtn) {
            uploadNewBtn.addEventListener('click', function () {
                // Show upload container again
                uploadContainer.classList.remove('hidden');

                // Hide any open panels
                toolPanels.forEach(panel => {
                    panel.classList.remove('active');
                    panel.style.display = 'none';
                });

                // Remove active state from buttons
                sideButtons.forEach(btn => {
                    btn.classList.remove('active');
                });
            });
        }
    }

    // File upload handling
    function setupFileUpload() {
        // Click on upload area to trigger file input
        uploadArea.addEventListener('click', function () {
            fileInput.click();
        });

        // File input change event
        fileInput.addEventListener('change', function (e) {
            if (this.files && this.files[0]) {
                loadImage(this.files[0]);
            }
        });

        // Drag and drop events
        uploadArea.addEventListener('dragover', function (e) {
            e.preventDefault();
            this.classList.add('active');
        });

        uploadArea.addEventListener('dragleave', function () {
            this.classList.remove('active');
        });

        uploadArea.addEventListener('drop', function (e) {
            e.preventDefault();
            this.classList.remove('active');

            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                loadImage(e.dataTransfer.files[0]);
            }
        });
    }

    // Load image into canvas with better quality
    function loadImage(file) {
        if (!file.type.match('image.*')) {
            alert('Please select an image file');
            return;
        }

        const reader = new FileReader();

        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                // Preserve original dimensions but check if it fits the screen
                const maxWidth = window.innerWidth * 0.9;
                const maxHeight = window.innerHeight * 0.7;

                // Store original image dimensions for high quality export
                window.originalWidth = img.width;
                window.originalHeight = img.height;
                window.originalImage = img; // Store the original image

                let newWidth = img.width;
                let newHeight = img.height;

                // Calculate aspect ratio
                const aspectRatio = img.width / img.height;

                // Scale down if image is too large for display
                if (newWidth > maxWidth) {
                    newWidth = maxWidth;
                    newHeight = newWidth / aspectRatio;
                }

                if (newHeight > maxHeight) {
                    newHeight = maxHeight;
                    newWidth = newHeight * aspectRatio;
                }

                // Set canvas dimensions for editing
                canvas.width = newWidth;
                canvas.height = newHeight;

                // Use high quality rendering
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Clear and draw image with high quality
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, newWidth, newHeight);

                // Hide upload container and show editor workspace
                uploadContainer.classList.add('hidden');

                // Show the sidebar after image is loaded
                sideToolbar.style.display = 'flex';

                // Store original image data for reset functionality
                window.originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                // Ensure image container has no margin issues
                imageContainer.style.margin = '0 auto';

                // Reset all filters and transforms when loading a new image
                resetAllEffects();

                // Add image info to console
                console.log(`Image loaded: ${img.width}x${img.height} pixels, aspect ratio: ${aspectRatio.toFixed(2)}`);
            };

            img.src = e.target.result;
        };

        reader.readAsDataURL(file);
    }

    // Reset all effects and transforms
    function resetAllEffects() {
        // Reset all sliders
        document.querySelectorAll('input[type="range"]').forEach(slider => {
            if (slider.id.includes('brightness')) slider.value = 100;
            if (slider.id.includes('contrast')) slider.value = 100;
            if (slider.id.includes('saturation')) slider.value = 100;
            if (slider.id.includes('blur')) slider.value = 0;

            // Update value displays
            const valueDisplay = slider.parentElement.querySelector('.value-display');
            if (valueDisplay) {
                valueDisplay.textContent = slider.value;
            }
        });

        // Reset transforms
        rotation = 0;
        flipped = false;
        updateTransform();

        // Reset filters
        canvas.style.filter = '';
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === 'none') {
                btn.classList.add('active');
            }
        });
    }

    // Function to show a specific tool panel
    function showToolPanel(panelId) {
        // Hide all panels first
        toolPanels.forEach(panel => {
            panel.classList.remove('active');
            panel.style.display = 'none';
        });

        // Show the selected panel
        const targetPanel = document.getElementById(panelId);
        if (targetPanel) {
            targetPanel.classList.add('active');
            targetPanel.style.display = 'flex';
        }

        // Mark the button as active
        sideButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.panel === panelId) {
                btn.classList.add('active');
            }
        });
    }

    // Setup tool panels
    function setupToolPanels() {
        // Add click event listeners to side buttons
        sideButtons.forEach(btn => {
            if (btn.dataset.panel) {
                btn.addEventListener('click', function () {
                    const panelId = this.dataset.panel;

                    // If clicking the same button again, toggle the panel
                    if (this.classList.contains('active')) {
                        this.classList.remove('active');
                        toolPanels.forEach(panel => {
                            panel.classList.remove('active');
                            panel.style.display = 'none';
                        });
                    } else {
                        showToolPanel(panelId);
                    }
                });
            }
        });

        // Save button functionality
        const saveButton = document.querySelector('.side-btn.primary-side-btn');
        if (saveButton) {
            saveButton.addEventListener('click', function () {
                saveImage();
            });
        }

        // Reset button functionality
        const resetButton = document.querySelector('.side-btn:nth-of-type(7)');
        if (resetButton) {
            resetButton.addEventListener('click', function () {
                resetImage();
            });
        }

        // Undo button functionality
        const undoButton = document.querySelector('.side-btn:nth-of-type(8)');
        if (undoButton) {
            undoButton.addEventListener('click', function () {
                // Undo functionality would be implemented here
                alert('Undo functionality coming soon');
            });
        }

        // Close panels when clicking on the image or background
        document.addEventListener('click', function (e) {
            // Close panels if clicking directly on the background or image workspace
            if (e.target === document.body || e.target.closest('.image-container')) {
                sideButtons.forEach(btn => btn.classList.remove('active'));
                toolPanels.forEach(panel => {
                    panel.classList.remove('active');
                    panel.style.display = 'none';
                });
            }
        });
    }

    // Image manipulation functions

    // Save the current image with high quality
    function saveImage() {
        // Create a temporary high-resolution canvas for export
        const exportCanvas = document.createElement('canvas');
        const exportCtx = exportCanvas.getContext('2d');

        // Determine if we should use original size or current size
        let exportWidth, exportHeight;

        // If we have the original image, use original dimensions for highest quality
        if (window.originalImage) {
            exportWidth = window.originalWidth;
            exportHeight = window.originalHeight;

            exportCanvas.width = exportWidth;
            exportCanvas.height = exportHeight;

            // Enable high quality rendering
            exportCtx.imageSmoothingEnabled = true;
            exportCtx.imageSmoothingQuality = 'high';

            // Draw the original image
            exportCtx.drawImage(window.originalImage, 0, 0, exportWidth, exportHeight);

            // Apply current filters and transformations to the high-res version
            if (canvas.style.filter) {
                exportCtx.filter = canvas.style.filter;
                exportCtx.drawImage(window.originalImage, 0, 0, exportWidth, exportHeight);
            }

            // Apply transforms if any
            if (rotation !== 0 || flipped) {
                exportCtx.save();
                exportCtx.translate(exportWidth / 2, exportHeight / 2);
                exportCtx.rotate(rotation * Math.PI / 180);
                exportCtx.scale(flipped ? -1 : 1, 1);
                exportCtx.drawImage(window.originalImage, -exportWidth / 2, -exportHeight / 2, exportWidth, exportHeight);
                exportCtx.restore();
            }
        } else {
            // Use current canvas as fallback
            exportWidth = canvas.width;
            exportHeight = canvas.height;
            exportCanvas.width = exportWidth;
            exportCanvas.height = exportHeight;
            exportCtx.drawImage(canvas, 0, 0);
        }

        // Create download link with highest quality
        const link = document.createElement('a');
        link.download = 'vibeify-edit.png';

        // Use highest quality export
        link.href = exportCanvas.toDataURL('image/png', 1.0);
        link.click();
    }

    // Reset image to original
    function resetImage() {
        if (window.originalImageData) {
            ctx.putImageData(window.originalImageData, 0, 0);
            resetAllEffects();
        }
    }

    // Setup image controls
    function setupImageControls() {
        // Handle sliders and UI controls
        const sliders = document.querySelectorAll('input[type="range"]');
        sliders.forEach(slider => {
            // Initialize value displays
            const valueDisplay = slider.parentElement.querySelector('.value-display');
            if (valueDisplay) {
                valueDisplay.textContent = slider.value;
            }

            slider.addEventListener('input', function () {
                // Update any relevant values or preview
                if (valueDisplay) {
                    valueDisplay.textContent = this.value;
                }

                // Apply filter/adjustment in real-time
                applyImageAdjustments();
            });
        });

        // Handle filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', function () {
                filterButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                // Apply the selected filter
                const filterName = this.dataset.filter;
                applyFilter(filterName);
            });
        });

        // Handle transform buttons
        document.getElementById('rotate-left')?.addEventListener('click', function () {
            rotateImage(-90);
        });

        document.getElementById('rotate-right')?.addEventListener('click', function () {
            rotateImage(90);
        });

        document.getElementById('flip')?.addEventListener('click', function () {
            flipImage();
        });

        document.getElementById('crop')?.addEventListener('click', function () {
            alert('Crop functionality coming soon');
        });

        // Zoom controls
        const zoomInBtn = document.querySelector('.control-btn[title="Zoom In"]');
        const zoomOutBtn = document.querySelector('.control-btn[title="Zoom Out"]');
        const resetZoomBtn = document.querySelector('.control-btn[title="Reset"]');

        let zoom = 1;

        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', function () {
                zoom *= 1.1;
                applyZoom();
            });
        }

        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', function () {
                zoom *= 0.9;
                applyZoom();
            });
        }

        if (resetZoomBtn) {
            resetZoomBtn.addEventListener('click', function () {
                zoom = 1;
                applyZoom();
            });
        }

        function applyZoom() {
            canvas.style.transform = `scale(${zoom})`;
        }
    }

    // Apply image adjustments with more advanced options
    function applyImageAdjustments() {
        if (!canvas) return;

        // Get all adjustment values
        const brightness = document.getElementById('brightness-slider')?.value || 100;
        const contrast = document.getElementById('contrast-slider')?.value || 100;
        const saturation = document.getElementById('saturation-slider')?.value || 100;
        const blur = document.getElementById('blur-slider')?.value || 0;

        // Get advanced adjustment values if they exist
        const hue = document.getElementById('hue-slider')?.value || 0;
        const opacity = document.getElementById('opacity-slider')?.value || 100;
        const sepia = document.getElementById('sepia-slider')?.value || 0;
        const sharpen = document.getElementById('sharpen-slider')?.value || 0;

        // Create CSS filter string
        let filterString = `
            brightness(${brightness}%) 
            contrast(${contrast}%) 
            saturate(${saturation}%) 
            blur(${blur}px)
        `;

        // Add advanced filters if sliders exist
        if (document.getElementById('hue-slider')) {
            filterString += ` hue-rotate(${hue}deg)`;
        }

        if (document.getElementById('opacity-slider')) {
            filterString += ` opacity(${opacity}%)`;
        }

        if (document.getElementById('sepia-slider')) {
            filterString += ` sepia(${sepia}%)`;
        }

        // Apply the filters to canvas
        canvas.style.filter = filterString;

        // If sharpen is applied, we might need special handling
        // (CSS doesn't have a sharpen filter, this would need to be implemented with WebGL or a custom shader)
    }

    // Apply a named filter with more options
    function applyFilter(filterName) {
        if (!canvas) return;

        // Reset adjustments sliders to default
        document.querySelectorAll('input[type="range"]').forEach(slider => {
            if (slider.id.includes('brightness')) slider.value = 100;
            if (slider.id.includes('contrast')) slider.value = 100;
            if (slider.id.includes('saturation')) slider.value = 100;
            if (slider.id.includes('blur')) slider.value = 0;
            if (slider.id.includes('hue')) slider.value = 0;
            if (slider.id.includes('opacity')) slider.value = 100;
            if (slider.id.includes('sepia')) slider.value = 0;
            if (slider.id.includes('sharpen')) slider.value = 0;

            // Update value displays
            const valueDisplay = slider.parentElement.querySelector('.value-display');
            if (valueDisplay) {
                valueDisplay.textContent = slider.value;
            }
        });

        // Reset canvas filter
        canvas.style.filter = '';

        // Apply the selected filter with more options
        switch (filterName) {
            case 'none':
                // No filter
                break;
            case 'grayscale':
                canvas.style.filter = 'grayscale(100%)';
                break;
            case 'sepia':
                canvas.style.filter = 'sepia(100%)';
                break;
            case 'vintage':
                canvas.style.filter = 'sepia(50%) contrast(85%) brightness(90%) saturate(85%)';
                break;
            case 'cool':
                canvas.style.filter = 'saturate(85%) hue-rotate(180deg) contrast(110%)';
                break;
            case 'warm':
                canvas.style.filter = 'saturate(120%) sepia(30%) contrast(110%) brightness(105%)';
                break;
            case 'dramatic':
                canvas.style.filter = 'contrast(150%) brightness(90%) saturate(110%)';
                break;
            case 'noir':
                canvas.style.filter = 'grayscale(100%) contrast(140%) brightness(80%)';
                break;
            case 'fade':
                canvas.style.filter = 'saturate(60%) brightness(105%) contrast(90%)';
                break;
            case 'chrome':
                canvas.style.filter = 'contrast(120%) saturate(110%) brightness(110%)';
                break;
        }
    }

    // Image transformation variables and functions
    let rotation = 0;
    let flipped = false;

    function rotateImage(degrees) {
        rotation = (rotation + degrees) % 360;
        updateTransform();
    }

    function flipImage() {
        flipped = !flipped;
        updateTransform();
    }

    function updateTransform() {
        canvas.style.transform = `rotate(${rotation}deg) scaleX(${flipped ? -1 : 1})`;
    }
}); 