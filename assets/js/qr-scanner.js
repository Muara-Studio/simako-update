/**
 * Enhanced QR Scanner Component
 * Improved camera precision and cross-device support
 * Usage: Include this file and call QRScanner.init(containerId, options)
 */

class QRScanner {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = {
            onScan: null,
            onError: null,
            onManualSearch: null,
            ajaxUrl: null,
            ...options
        };
        
        this.video = null;
        this.canvas = null;
        this.context = null;
        this.stream = null;
        this.scanning = false;
        this.currentFacingMode = 'environment';
        this.devices = [];
        this.currentDeviceIndex = 0;
        this.isMobile = this.detectMobile();
        
        this.init();
    }
    
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    async getCameraDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(device => device.kind === 'videoinput');
        } catch (error) {
            console.error('Error getting camera devices:', error);
            return [];
        }
    }
    
    init() {
        this.createModal();
        this.bindEvents();
    }
    
    createModal() {
        const modalHtml = `
            <div class="modal fade" id="qrScannerModal" tabindex="-1" aria-labelledby="qrScannerModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="qrScannerModalLabel">
                                <i class="feather-camera me-2"></i>
                                QR Scanner Koleksi
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="text-center mb-4">
                                <p class="text-muted">Arahkan kamera ke QR code koleksi untuk mencari data koleksi</p>
                            </div>
                            
                            <!-- Camera Container -->
                            <div class="camera-container text-center mb-4">
                                <div id="camera-preview" class="border rounded p-3" style="min-height: 300px; background: #f8f9fa;">
                                    <div id="camera-placeholder" class="d-flex align-items-center justify-content-center" style="height: 300px;">
                                        <div class="text-center">
                                            <i class="feather-camera fs-1 text-muted mb-3"></i>
                                            <p class="text-muted">Memulai kamera...</p>
                                            <div class="spinner-border text-primary" role="status">
                                                <span class="visually-hidden">Loading...</span>
                                            </div>
                                            <button id="start-camera" class="btn btn-primary mt-3" style="display: none;">
                                                <i class="feather-play me-2"></i>
                                                Mulai Kamera Manual
                                            </button>
                                        </div>
                                    </div>
                                    <video id="video" style="display: none; width: 100%; max-width: 500px; height: auto; max-height: 400px;" autoplay playsinline muted></video>
                                    <canvas id="canvas" style="display: none;"></canvas>
                                    <div id="scanner-overlay" class="scanner-overlay" style="display: none;">
                                        <div class="scanner-frame">
                                            <div class="corner top-left"></div>
                                            <div class="corner top-right"></div>
                                            <div class="corner bottom-left"></div>
                                            <div class="corner bottom-right"></div>
                                            <div class="scan-line"></div>
                                        </div>
                                    </div>
                                    <div id="camera-info" class="mt-2" style="display: none;">
                                        <small class="text-muted">
                                            <i class="feather-info me-1"></i>
                                            <span id="device-name">Kamera</span>
                                        </small>
                                    </div>
                                </div>
                            </div>

                            <!-- Scanner Controls -->
                            <div class="scanner-controls mb-4">
                                <div class="d-flex justify-content-center align-items-center gap-3">
                                    <button id="scan-button" class="btn btn-success btn-lg px-4" style="display: none;">
                                        <i class="feather-search me-2"></i>
                                        SCAN QR CODE
                                    </button>
                                    <button id="stop-camera" class="btn btn-danger btn-lg px-4" style="display: none;">
                                        <i class="feather-stop-circle me-2"></i>
                                        STOP KAMERA
                                    </button>
                                    <button id="switch-camera" class="btn btn-info btn-lg px-4" style="display: none;">
                                        <i class="feather-refresh-cw me-2"></i>
                                        GANTI KAMERA
                                    </button>
                                </div>
                            </div>

                            <!-- Manual Input -->
                            <div class="manual-input border-top pt-4">
                                <h6 class="mb-3">Atau masukkan ID koleksi secara manual:</h6>
                                <div class="input-group">
                                    <input type="number" id="manual-id" class="form-control" placeholder="Masukkan ID koleksi...">
                                    <button id="search-manual" class="btn btn-primary">
                                        <i class="feather-search me-2"></i>
                                        CARI
                                    </button>
                                </div>
                            </div>

                            <!-- Results -->
                            <div id="scan-results" class="mt-4" style="display: none;">
                                <div class="alert alert-info">
                                    <h6 class="alert-heading">
                                        <i class="feather-info me-2"></i>
                                        Hasil Scan
                                    </h6>
                                    <div id="result-content"></div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">TUTUP</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to body if it doesn't exist
        if (!document.getElementById('qrScannerModal')) {
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }
        
        // Add enhanced styles if they don't exist
        if (!document.getElementById('qr-scanner-styles')) {
            const styles = `
                <style id="qr-scanner-styles">
                .camera-container {
                    position: relative;
                }

                #camera-preview {
                    background: linear-gradient(45deg, #f8f9fa 25%, transparent 25%), 
                                linear-gradient(-45deg, #f8f9fa 25%, transparent 25%), 
                                linear-gradient(45deg, transparent 75%, #f8f9fa 75%), 
                                linear-gradient(-45deg, transparent 75%, #f8f9fa 75%);
                    background-size: 20px 20px;
                    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
                }

                #video {
                    border-radius: 8px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    object-fit: cover;
                    object-position: center;
                }

                .scanner-overlay {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 250px;
                    height: 250px;
                    pointer-events: none;
                    z-index: 10;
                }

                .camera-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 300px;
                }

                #camera-preview {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    max-width: 500px;
                }

                .scanner-frame {
                    position: relative;
                    width: 100%;
                    height: 100%;
                }

                .corner {
                    position: absolute;
                    width: 30px;
                    height: 30px;
                    border: 3px solid #007bff;
                }

                .corner.top-left {
                    top: -3px;
                    left: -3px;
                    border-right: none;
                    border-bottom: none;
                }

                .corner.top-right {
                    top: -3px;
                    right: -3px;
                    border-left: none;
                    border-bottom: none;
                }

                .corner.bottom-left {
                    bottom: -3px;
                    left: -3px;
                    border-right: none;
                    border-top: none;
                }

                .corner.bottom-right {
                    bottom: -3px;
                    right: -3px;
                    border-left: none;
                    border-top: none;
                }

                .scan-line {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, #007bff, transparent);
                    animation: scan 2s linear infinite;
                }

                @keyframes scan {
                    0% { top: 0; }
                    100% { top: 100%; }
                }

                .manual-input {
                    background: #f8f9fa;
                    border-radius: 8px;
                    padding: 20px;
                }

                #scan-results {
                    animation: slideIn 0.3s ease-out;
                }

                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .camera-info {
                    background: rgba(0, 0, 0, 0.7);
                    color: white;
                    padding: 5px 10px;
                    border-radius: 4px;
                    font-size: 12px;
                }

                /* Mobile optimizations */
                @media (max-width: 768px) {
                    .scanner-overlay {
                        width: 200px;
                        height: 200px;
                    }
                    
                    .corner {
                        width: 25px;
                        height: 25px;
                    }
                }

                /* Webcam centering improvements */
                .camera-container {
                    position: relative;
                    overflow: hidden;
                }

                #camera-preview {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 300px;
                    background: #f8f9fa;
                }

                #video {
                    display: block !important;
                    margin: auto;
                    max-width: 100%;
                    max-height: 400px;
                    width: auto;
                    height: auto;
                }
                </style>
            `;
            document.head.insertAdjacentHTML('beforeend', styles);
        }
    }
    
    bindEvents() {
        // Initialize QR scanner when modal is shown
        $('#qrScannerModal').on('shown.bs.modal', async () => {
            this.video = document.getElementById('video');
            this.canvas = document.getElementById('canvas');
            this.context = this.canvas.getContext('2d', { willReadFrequently: true });
            
            // Get available camera devices
            this.devices = await this.getCameraDevices();
            
            // Start camera button (now optional since camera starts automatically)
            $('#start-camera').off('click').on('click', () => this.startCamera());
            
            // Scan button
            $('#scan-button').off('click').on('click', () => this.startScanning());
            
            // Stop camera button
            $('#stop-camera').off('click').on('click', () => this.stopCamera());
            
            // Switch camera button
            $('#switch-camera').off('click').on('click', () => this.switchCamera());
            
            // Manual search button
            $('#search-manual').off('click').on('click', () => this.searchManual());
            
            // Manual input enter key
            $('#manual-id').off('keypress').on('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchManual();
                }
            });
            
            // Auto-start camera when modal is fully shown
            setTimeout(() => {
                this.startCamera();
            }, 300);
        });

        // Clean up when modal is hidden
        $('#qrScannerModal').on('hidden.bs.modal', () => {
            if (this.stream) {
                this.stopCamera();
            }
            
            // Clean up canvas context to free memory
            if (this.context) {
                this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.context = null;
            }
        });
    }
    
    open() {
        $('#qrScannerModal').modal('show');
        // Auto-start camera when modal opens
        setTimeout(() => {
            this.startCamera();
        }, 500); // Small delay to ensure modal is fully shown
    }
    
    async startCamera() {
        try {
            // Enhanced camera constraints for better precision
            const constraints = {
                video: {
                    facingMode: this.currentFacingMode,
                    width: { 
                        ideal: this.isMobile ? 1280 : 1920,
                        min: 640,
                        max: 1920
                    },
                    height: { 
                        ideal: this.isMobile ? 720 : 1080,
                        min: 480,
                        max: 1080
                    },
                    aspectRatio: { ideal: 16/9 },
                    frameRate: { ideal: 30, min: 15 }
                }
            };
            
            // If we have specific devices, use the current one
            if (this.devices.length > 0 && this.currentDeviceIndex < this.devices.length) {
                constraints.video.deviceId = { exact: this.devices[this.currentDeviceIndex].deviceId };
                delete constraints.video.facingMode; // Remove facingMode when using specific device
            }
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            this.video.srcObject = this.stream;
            this.video.style.display = 'block';
            
            $('#camera-placeholder').hide();
            $('#start-camera').hide();
            $('#scan-button').show();
            $('#stop-camera').show();
            $('#switch-camera').show();
            $('#scanner-overlay').show();
            $('#camera-info').show();
            
            // Update device info
            if (this.devices.length > 0 && this.currentDeviceIndex < this.devices.length) {
                $('#device-name').text(this.devices[this.currentDeviceIndex].label || 'Kamera ' + (this.currentDeviceIndex + 1));
            }
            
                        // Wait for video to load
            this.video.addEventListener('loadedmetadata', () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                
                // Center the video element
                this.centerVideo();
                
                // Auto-start scanning after camera loads
                setTimeout(() => {
                    this.startScanning();
                }, 1500); // Wait 1.5 seconds for camera to stabilize
            });
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            let message = 'Tidak dapat mengakses kamera.';
            
            if (error.name === 'NotAllowedError') {
                message = 'Izin kamera ditolak. Silakan berikan izin kamera dan coba lagi.';
            } else if (error.name === 'NotFoundError') {
                message = 'Tidak ada kamera yang tersedia pada perangkat ini.';
            } else if (error.name === 'NotSupportedError') {
                message = 'Browser ini tidak mendukung akses kamera. Gunakan input manual.';
            } else if (error.name === 'OverconstrainedError') {
                message = 'Kamera tidak mendukung resolusi yang diminta. Mencoba resolusi yang lebih rendah...';
                // Try with lower resolution
                await this.startCameraWithFallback();
                return;
            }
            
            this.showAlert(message, 'danger');
            
            // Show manual start button if camera fails
            $('#start-camera').show();
            
            if (this.options.onError) {
                this.options.onError(error);
            }
        }
    }
    
    async startCameraWithFallback() {
        try {
            const fallbackConstraints = {
                video: {
                    facingMode: this.currentFacingMode,
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            };
            
            this.stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
            this.video.srcObject = this.stream;
            this.video.style.display = 'block';
            
            $('#camera-placeholder').hide();
            $('#start-camera').hide();
            $('#scan-button').show();
            $('#stop-camera').show();
            $('#switch-camera').show();
            $('#scanner-overlay').show();
            $('#camera-info').show();
            
            this.video.addEventListener('loadedmetadata', () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                console.log('Fallback camera resolution:', this.video.videoWidth, 'x', this.video.videoHeight);
            });
            
        } catch (error) {
            console.error('Fallback camera also failed:', error);
            this.showAlert('Tidak dapat mengakses kamera dengan resolusi apapun.', 'danger');
            // Show manual start button
            $('#start-camera').show();
        }
    }
    
    startScanning() {
        if (!this.stream) {
            this.showAlert('Kamera belum dimulai', 'warning');
            return;
        }
        
        // Prevent multiple simultaneous scans
        if (this.scanning) {
            return;
        }
        
        this.scanning = true;
        $('#scan-button').prop('disabled', true).html('<i class="feather-loader me-2"></i>Scanning...');
        
        this.scanFrame();
    }
    
    scanFrame() {
        if (!this.scanning) {
            return;
        }
        
        try {
            // Check if video is ready
            if (!this.video || this.video.readyState !== 4) {
                // Video not ready, try again in a moment
                if (this.scanning) {
                    requestAnimationFrame(() => this.scanFrame());
                }
                return;
            }
            
            // Draw video frame to canvas
            this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            
            // Get image data for QR detection
            const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
            
            // Try to detect QR code
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });
            
            if (code) {
                // QR code found - stop scanning immediately
                this.processQRCode(code.data);
                return;
            }
            
            // Continue scanning with requestAnimationFrame for better performance
            if (this.scanning) {
                requestAnimationFrame(() => this.scanFrame());
            }
            
        } catch (error) {
            console.error('Error scanning:', error);
            this.showAlert('Terjadi kesalahan saat scanning. Silakan coba lagi.', 'danger');
            this.stopScanning();
        }
    }
    
    processQRCode(qrData) {
        this.stopScanning();
        
        // Extract ID from QR data
        let id = null;
        
        // Try to extract ID from URL pattern
        const urlMatch = qrData.match(/detail\.(\d+)\//);
        if (urlMatch) {
            id = urlMatch[1];
        } else {
            // Try to extract just the number if it's a direct ID
            const idMatch = qrData.match(/^(\d+)$/);
            if (idMatch) {
                id = idMatch[1];
            }
        }
        
        if (id) {
            // Show success message briefly
            this.showAlert(`ID ditemukan: ${id}`, 'success');
            
            // Close modal after 1 second
            setTimeout(() => {
                this.destroy();
                
                // Call the onScan callback if provided
                if (this.options.onScan) {
                    this.options.onScan(id, qrData);
                }
            }, 1000);
        } else {
            this.showAlert('QR Code tidak valid. Pastikan QR code berisi ID yang benar. Klik tombol SCAN untuk mencoba lagi.', 'warning');
            this.stopScanning(); // Stop scanning, require manual restart
        }
    }
    
    searchManual() {
        const manualId = $('#manual-id').val().trim();
        if (!manualId) {
            this.showAlert('Masukkan ID', 'warning');
            return;
        }
        
        if (this.options.onManualSearch) {
            this.options.onManualSearch(manualId);
        } else {
            this.showAlert(`ID manual: ${manualId}`, 'info');
        }
    }
    
    stopScanning() {
        this.scanning = false;
        $('#scan-button').prop('disabled', false).html('<i class="feather-search me-2"></i>SCAN QR CODE');
    }
    
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        $('#video').hide();
        $('#camera-placeholder').show();
        $('#start-camera').show();
        $('#scan-button').hide();
        $('#stop-camera').hide();
        $('#switch-camera').hide();
        $('#scanner-overlay').hide();
        $('#camera-info').hide();
        
        this.stopScanning();
    }
    
    switchCamera() {
        if (this.stream) {
            this.stopCamera();
            
            if (this.devices.length > 1) {
                // Switch between available devices
                this.currentDeviceIndex = (this.currentDeviceIndex + 1) % this.devices.length;
            } else {
                // Switch between front/back camera
                this.currentFacingMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';
            }
            
            setTimeout(() => this.startCamera(), 500);
        }
    }
    
    showAlert(message, type) {
        const resultsDiv = $('#scan-results');
        const contentDiv = $('#result-content');
        
        contentDiv.html(`
            <div class="alert alert-${type} mb-0">
                ${message}
            </div>
        `);
        
        resultsDiv.show();
        
        // Auto-hide after 5 seconds for success/info messages, but not for success when scanning
        if (type === 'info') {
            setTimeout(() => {
                resultsDiv.hide();
            }, 5000);
        }
        // Success messages will be handled by the processQRCode function
    }
    
    centerVideo() {
        // Center the video element within its container
        const video = this.video;
        const container = document.getElementById('camera-preview');
        
        if (video && container) {
            const containerRect = container.getBoundingClientRect();
            const videoRect = video.getBoundingClientRect();
            
            // Calculate center position
            const centerX = (containerRect.width - videoRect.width) / 2;
            const centerY = (containerRect.height - videoRect.height) / 2;
            
            // Apply centering styles
            video.style.position = 'relative';
            video.style.left = Math.max(0, centerX) + 'px';
            video.style.top = Math.max(0, centerY) + 'px';
        }
    }
    
    destroy() {
        this.stopCamera();
        
        // Clean up canvas context to free memory
        if (this.context) {
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.context = null;
        }
        
        $('#qrScannerModal').modal('hide');
    }
}

// Global QR Scanner instance
window.QRScanner = QRScanner;
