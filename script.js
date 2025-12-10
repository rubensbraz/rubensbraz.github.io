/**
 * RUBENS OS - VAPORWAVE EDITION V1.0
 * Main System Logic.
 * This file handles the boot sequence, window management, application logic,
 * and global event listeners.
 * * @author Rubens Braz
 */

// --- GLOBAL SCOPE ---

/**
 * Global variable to hold the YouTube Player instance.
 * Must be global so the YouTube Iframe API can interact with it.
 * @type {YT.Player|null}
 */
let youtubePlayer = null;

/**
 * Global flag to track if YouTube API is fully loaded.
 * @type {boolean}
 */
let isYoutubeReady = false;

/**
 * Callback function required by YouTube Iframe API.
 * This function is called automatically when the API script is loaded.
 */
function onYouTubeIframeAPIReady() {
    isYoutubeReady = true;
    console.log("[System] YouTube API Ready");
}

// --- SYSTEM LOADER ---

/**
 * Handles the initial system boot process and configuration loading.
 */
class SystemLoader {
    /**
     * @param {WindowManager} windowManager - The instance of the window manager.
     */
    constructor(windowManager) {
        this.windowManager = windowManager;
        this.configPath = 'config.json';
    }

    /**
     * Initiates the boot sequence: fetches config and renders UI.
     * @returns {Promise<void>}
     */
    async boot() {
        try {
            const response = await fetch(this.configPath);
            if (!response.ok) throw new Error("Config file not found");
            const config = await response.json();

            this.renderDesktop(config);
            this.setupMenuActions(config);
        } catch (error) {
            console.error("[System Error] Could not load config.json:", error);
            // Even if config fails, basic apps should work, so we don't halt execution
        }
    }

    /**
     * Renders dynamic desktop icons based on configuration.
     * @param {Object} config - The JSON configuration object.
     */
    renderDesktop(config) {
        const grid = document.getElementById('icon-grid');

        // Render User Profile / Readme
        if (config.user) {
            this.createIcon(grid, 'fa-solid fa-file-lines', 'README.txt', () => {
                this.windowManager.openWindow('README.txt', this.generateProfileHtml(config.user));
            });
        }

        // Render Folders
        if (config.folders) {
            this.createIcon(grid, 'fa-solid fa-folder-open', 'Projects', () => {
                this.windowManager.openWindow('A:\\Projects', this.generateFolderHtml(config.folders.projects));
            });
            this.createIcon(grid, 'fa-solid fa-globe', 'Links', () => {
                this.windowManager.openWindow('C:\\Internet', this.generateFolderHtml(config.folders.links));
            });
        }
    }

    /**
     * Helper to create a DOM element for a desktop icon.
     * @param {HTMLElement} container - The container to append the icon to.
     * @param {string} iconClass - FontAwesome class string.
     * @param {string} label - Text label for the icon.
     * @param {Function} onClick - Click handler.
     */
    createIcon(container, iconClass, label, onClick) {
        const div = document.createElement('div');
        div.className = 'desktop-icon';
        div.innerHTML = `
            <div class="icon-img"><i class="${iconClass}"></i></div>
            <span class="icon-label">${label}</span>
        `;
        div.addEventListener('click', onClick);
        // Prepend ensures dynamic icons appear before or mixed with hardcoded ones
        container.insertBefore(div, container.firstChild);
    }

    /**
     * Generates HTML content for the user profile window.
     * @param {Object} user - User data object.
     * @returns {string} HTML string.
     */
    generateProfileHtml(user) {
        return `
            <div style="text-align: center;">
                <h2 style="color: purple;">${user.name}</h2>
                <p><strong>${user.role}</strong></p>
                <hr style="margin: 10px 0; border: 1px dashed gray;">
                <p>Welcome to my interactive portfolio.</p>
                <br>
                <p><i class="fa-solid fa-envelope"></i> ${user.email}</p>
            </div>
        `;
    }

    /**
     * Generates HTML grid for folder items.
     * @param {Array} items - Array of link objects.
     * @returns {string} HTML string.
     */
    generateFolderHtml(items) {
        if (!items || items.length === 0) return '<p>Empty Folder</p>';

        let html = '<div class="folder-grid">';
        items.forEach(item => {
            html += `
                <a href="${item.url}" target="_blank" class="folder-item">
                    <i class="fa-solid ${item.icon}"></i>
                    <span>${item.name}</span>
                </a>
            `;
        });
        html += '</div>';
        return html;
    }

    /**
     * Binds event listeners to the navigation bar menu items.
     * @param {Object} config - Configuration object.
     */
    setupMenuActions(config) {
        // Reboot Logic
        document.getElementById('action-reboot').addEventListener('click', () => location.reload());

        // GitHub Link
        const githubUrl = config?.user?.github || '#';
        document.getElementById('action-repo').addEventListener('click', () => {
            window.open(githubUrl, '_blank');
        });

        // CRT Toggle
        document.getElementById('action-crt').addEventListener('click', () => {
            document.getElementById('crt-layer').classList.toggle('crt-off');
        });

        // Fullscreen Toggle
        document.getElementById('action-fullscreen').addEventListener('click', () => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen();
            else document.exitFullscreen();
        });

        // About Dialog
        document.getElementById('action-about').addEventListener('click', () => {
            alert("RubensOS v1.0 \nHandcrafted with code, coffee, and retro vibes.\nPeek under the hood: Go to File > Source Code.");
        });
    }
}

// --- WINDOW MANAGER ---

/**
 * Manages the lifecycle, positioning, and z-index of application windows.
 */
class WindowManager {
    constructor() {
        this.container = document.getElementById('window-area');
        this.zIndex = 100; // Base z-index for windows
        this.setupHardcodedApps();
    }

    /**
     * Binds HTML data-app attributes to their respective Application Classes.
     */
    setupHardcodedApps() {
        this.bindApp('calculator', 'tpl-calculator', 'Calculator', (win) => new CalculatorApp(win));
        this.bindApp('calendar', 'tpl-calendar', 'Calendar', (win) => new CalendarApp(win));
        this.bindApp('music', 'tpl-music', 'WinAmp Player', (win) => new WinampApp(win));
        this.bindApp('paint', 'tpl-paint', 'Pixel Paint', (win) => new PaintApp(win));
    }

    /**
     * Helper to attach click listeners to desktop icons.
     * @param {string} appId - The data-app attribute value.
     * @param {string} templateId - The ID of the HTML <template>.
     * @param {string} title - The window title.
     * @param {Function} appClassCallback - Factory function to instantiate the App class.
     */
    bindApp(appId, templateId, title, appClassCallback) {
        const icon = document.querySelector(`[data-app="${appId}"]`);
        if (icon) {
            icon.addEventListener('click', () => {
                const template = document.getElementById(templateId);
                if (template) {
                    const win = this.openWindow(title, template.innerHTML);
                    appClassCallback(win);
                }
            });
        }
    }

    /**
     * Creates and appends a new window to the DOM.
     * @param {string} title - Window title.
     * @param {string} contentHtml - Inner HTML content.
     * @returns {HTMLElement} The created window element.
     */
    openWindow(title, contentHtml) {
        this.zIndex++;
        const win = document.createElement('div');
        win.className = 'window active';
        win.style.zIndex = this.zIndex;

        // Random positioning logic to prevent perfect stacking
        const randX = Math.floor(Math.random() * 50) + 50; // 50px offset
        const randY = Math.floor(Math.random() * 50) + 50;
        win.style.left = randX + 'px';
        win.style.top = randY + 'px';

        win.innerHTML = `
            <div class="title-bar">
                <span>${title}</span>
                <button class="btn-close" title="Close">X</button>
            </div>
            <div class="window-content">${contentHtml}</div>
        `;

        // Close Button Handler
        win.querySelector('.btn-close').addEventListener('click', () => {
            // Dispatch a custom event so apps can clean up resources (intervals, audio)
            const event = new CustomEvent('window-closed', { detail: { win } });
            win.dispatchEvent(event);
            win.remove();
        });

        // Bring to front on click
        win.addEventListener('mousedown', () => {
            this.zIndex++;
            win.style.zIndex = this.zIndex;
        });

        this.makeDraggable(win);
        this.container.appendChild(win);
        return win;
    }

    /**
     * Adds drag-and-drop functionality to a window element.
     * @param {HTMLElement} el - The window element.
     */
    makeDraggable(el) {
        const header = el.querySelector('.title-bar');
        let isDragging = false, startX, startY, initialLeft, initialTop;

        const onMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            el.style.left = `${initialLeft + dx}px`;
            el.style.top = `${initialTop + dy}px`;
        };

        const onUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };

        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = el.offsetLeft;
            initialTop = el.offsetTop;
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    }
}

// --- APP: WINAMP (HYBRID: YOUTUBE + MP3 BACKUP) ---

/**
 * Controls the Music Player logic.
 * * Implements a robust fallback system.
 * * Logic: Tries YouTube API first. If it encounters Error 150 (Embed Block) or connection issues,
 * * it automatically switches to HTML5 Audio using a direct MP3 stream from Archive.org.
 */
class WinampApp {
    /**
     * Initializes the Winamp application.
     * @param {HTMLElement} windowEl - The DOM element of the window containing the app.
     */
    constructor(windowEl) {
        this.windowEl = windowEl;
        this.isPlaying = false;
        this.visualizerInterval = null;
        this.bars = windowEl.querySelectorAll('.bar');

        // Player State
        this.useAudioFallback = false; // Flag: true if using native <audio>
        this.audioElement = null;      // Reference to the native audio object

        // YouTube Playlist (Vaporwave Mixes)
        this.playlist = [
            { id: 'zlXXynZtE9w', title: 'S I M P S O N W A V E 1995' },
            { id: 'URCA3fU3q-s', title: 'Vaporwave Radio' },
            { id: 'mgj81r6F33M', title: 'I\'m lonely - Mix' }
        ];
        this.currentTrackIndex = 0;

        // Backup MP3
        // Source: Internet Archive - Macintosh Plus
        this.backupMp3 = "https://ia803104.us.archive.org/20/items/MACINTOSHPLUS-FLORALSHOPPE_complete/01%20%E3%83%96%E3%83%BC%E3%83%88.mp3?cnt=0";

        // Initialize Player and UI
        this.setupPlayer();
        this.setupControls();

        // Event Listener: Cleanup resources when the window is closed
        windowEl.addEventListener('window-closed', () => {
            this.stopVisualizer();

            // Destroy YouTube instance
            if (youtubePlayer && typeof youtubePlayer.destroy === 'function') {
                try { youtubePlayer.destroy(); } catch (e) { console.warn(e); }
                youtubePlayer = null;
            }

            // Destroy Native Audio instance
            if (this.audioElement) {
                this.audioElement.pause();
                this.audioElement = null;
            }
        });
    }

    /**
     * Determines which player engine to initialize (YouTube or Native).
     */
    setupPlayer() {
        if (this.useAudioFallback) {
            this.initNativeAudio();
        } else {
            this.initYouTube();
        }
    }

    // --- MODE 1: YOUTUBE ---

    /**
     * Initializes the YouTube Iframe API Player.
     * recurses via setTimeout if the API is not yet loaded.
     */
    initYouTube() {
        // Wait for global API ready flag
        if (!isYoutubeReady) {
            this.updateTitle("Connecting to Satellite...");
            setTimeout(() => this.initYouTube(), 1000);
            return;
        }

        // Cleanup existing instance before creating a new one
        if (youtubePlayer && typeof youtubePlayer.destroy === 'function') {
            try { youtubePlayer.destroy(); } catch (e) { }
        }

        const currentTrack = this.playlist[this.currentTrackIndex];
        this.updateTitle(`Loading YT: ${currentTrack.title}...`);

        // Instantiate Player
        youtubePlayer = new YT.Player(this.windowEl.querySelector('#youtube-player-hidden'), {
            height: '200',
            width: '200',
            videoId: currentTrack.id,
            playerVars: {
                'playsinline': 1,
                'controls': 0,
                'origin': window.location.origin, // Important for localhost testing
                'enablejsapi': 1,
                'rel': 0
            },
            events: {
                'onReady': (event) => {
                    console.log(`[Winamp] YouTube Ready: ${currentTrack.title}`);
                    // Attempt autoplay (might be blocked by browser policy)
                    event.target.playVideo();
                    this.isPlaying = true;
                    this.startVisualizer();
                    this.updateTitle(currentTrack.title);
                },
                'onStateChange': (event) => {
                    if (event.data === YT.PlayerState.PLAYING) {
                        this.isPlaying = true;
                        this.startVisualizer();
                    } else {
                        this.isPlaying = false;
                        this.stopVisualizer();
                    }
                },
                'onError': (event) => {
                    console.warn(`[Winamp] YouTube Error ${event.data}. Switching to Backup MP3...`);
                    // On critical error (like 150), switch to fallback immediately
                    this.activateFallbackMode();
                }
            }
        });
    }

    // --- MODE 2: NATIVE AUDIO (FALLBACK) ---

    /**
     * Switches the player state to Fallback Mode.
     * Destroys YouTube player and initializes Native Audio.
     */
    activateFallbackMode() {
        this.useAudioFallback = true;

        // Destroy the failed YouTube player
        if (youtubePlayer && typeof youtubePlayer.destroy === 'function') {
            try { youtubePlayer.destroy(); } catch (e) { }
        }

        // Start Native Audio
        this.initNativeAudio();
    }

    /**
     * Initializes the HTML5 Audio object with the backup MP3.
     */
    initNativeAudio() {
        if (this.audioElement) return; // Prevent duplicate instances

        console.log("[Winamp] Initializing Native Audio (Fallback Mode)");
        this.updateTitle("Loading: Macintosh Plus (MP3 Mode)...");

        // Create Audio object in memory
        this.audioElement = new Audio(this.backupMp3);
        this.audioElement.volume = 0.5;
        this.audioElement.loop = true;

        // Attempt to play
        const playPromise = this.audioElement.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                this.isPlaying = true;
                this.startVisualizer();
                this.updateTitle("Macintosh Plus - Floral Shoppe (MP3)");
            }).catch(error => {
                console.error("[Winamp] Autoplay blocked:", error);
                this.updateTitle("Click PLAY to start (Autoplay blocked)");
                this.isPlaying = false;
            });
        }
    }

    // --- UI & CONTROLS ---

    /**
     * Updates the scrolling marquee title.
     * @param {string} text - The text to display.
     */
    updateTitle(text) {
        this.windowEl.querySelector('.music-display').innerHTML = `<marquee scrollamount="4">${text}</marquee>`;
    }

    /**
     * Binds click events to the player controls (Play, Pause, Stop, Volume).
     * Handles logic for both YouTube and Native Audio modes.
     */
    setupControls() {
        const btnPlay = this.windowEl.querySelector('#btn-play');
        const btnPause = this.windowEl.querySelector('#btn-pause');
        const btnStop = this.windowEl.querySelector('#btn-stop');
        const volSlider = this.windowEl.querySelector('#vol-slider');

        // Play Button
        btnPlay.addEventListener('click', () => {
            if (this.useAudioFallback && this.audioElement) {
                this.audioElement.play();
                this.isPlaying = true;
                this.startVisualizer();
                this.updateTitle("Macintosh Plus - Floral Shoppe (MP3)");
            } else if (youtubePlayer && youtubePlayer.playVideo) {
                youtubePlayer.playVideo();
            }
        });

        // Pause Button
        btnPause.addEventListener('click', () => {
            if (this.useAudioFallback && this.audioElement) {
                this.audioElement.pause();
                this.isPlaying = false;
                this.stopVisualizer();
            } else if (youtubePlayer && youtubePlayer.pauseVideo) {
                youtubePlayer.pauseVideo();
            }
        });

        // Stop Button
        btnStop.addEventListener('click', () => {
            if (this.useAudioFallback && this.audioElement) {
                this.audioElement.pause();
                this.audioElement.currentTime = 0; // Reset track
                this.isPlaying = false;
                this.stopVisualizer();
            } else if (youtubePlayer && youtubePlayer.stopVideo) {
                youtubePlayer.stopVideo();
                this.stopVisualizer();
            }
        });

        // Volume Slider
        volSlider.addEventListener('input', (e) => {
            const vol = e.target.value / 100; // Normalize 0-100 to 0-1

            if (this.useAudioFallback && this.audioElement) {
                this.audioElement.volume = vol;
            } else if (youtubePlayer && youtubePlayer.setVolume) {
                youtubePlayer.setVolume(e.target.value);
            }
        });
    }

    // --- VISUALIZER ---

    /**
     * Starts the fake spectrum visualizer animation.
     */
    startVisualizer() {
        if (this.visualizerInterval) clearInterval(this.visualizerInterval);

        this.visualizerInterval = setInterval(() => {
            this.bars.forEach(bar => {
                // Random height between 10% and 100%
                const height = Math.floor(Math.random() * 90) + 10 + '%';
                bar.style.height = height;
            });
        }, 100);
    }

    /**
     * Stops the visualizer animation and resets bars to resting state.
     */
    stopVisualizer() {
        clearInterval(this.visualizerInterval);
        this.bars.forEach(bar => {
            bar.style.height = '5%'; // Resting state
        });
    }
}

// --- APP: PAINT ---

/**
 * A robust Canvas-based drawing application.
 * Supports brushes, eraser, saving, and color selection.
 */
class PaintApp {
    /**
     * @param {HTMLElement} windowEl - The DOM element of the window.
     */
    constructor(windowEl) {
        this.canvas = windowEl.querySelector('#paint-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;

        // Default Settings
        this.color = '#000';
        this.lineWidth = 3;
        this.tool = 'brush';

        // Canvas Configuration for smooth lines
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        // Initialize canvas with white background (crucial for saving as JPG/PNG without transparency)
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.setupEvents(windowEl);
    }

    /**
     * Binds all Paint UI events.
     * @param {HTMLElement} win - The window element.
     */
    setupEvents(win) {
        // Color Selection Logic
        const swatches = win.querySelectorAll('.color-swatch');
        swatches.forEach(swatch => {
            swatch.addEventListener('click', (e) => {
                // UI update
                swatches.forEach(s => s.classList.remove('active'));
                e.target.classList.add('active');

                // Logic update
                this.color = e.target.dataset.color;
                this.setTool('brush', win); // Auto-switch back to brush if user picks color
            });
        });

        // Tool Selection
        const btnBrush = win.querySelector('#btn-brush');
        const btnEraser = win.querySelector('#btn-eraser');

        btnBrush.addEventListener('click', () => this.setTool('brush', win));
        btnEraser.addEventListener('click', () => this.setTool('eraser', win));

        // Clear Canvas
        win.querySelector('#btn-clear-paint').addEventListener('click', () => {
            // Confirm before clearing? Maybe later. For now, just clear.
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        });

        // Save Image
        win.querySelector('#btn-save-paint').addEventListener('click', () => {
            const link = document.createElement('a');
            link.download = 'vaporwave-art.png';
            link.href = this.canvas.toDataURL(); // Converts canvas to Base64 image
            link.click();
        });

        // Brush Size Slider
        win.querySelector('#brush-size').addEventListener('input', (e) => {
            this.lineWidth = e.target.value;
        });

        // Mouse Event Listeners for Drawing
        this.canvas.addEventListener('mousedown', (e) => this.startDraw(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDraw());
        this.canvas.addEventListener('mouseleave', () => this.stopDraw());
    }

    /**
     * Switches between Brush and Eraser modes.
     * @param {string} toolName - 'brush' or 'eraser'.
     * @param {HTMLElement} win - Window element for UI updates.
     */
    setTool(toolName, win) {
        this.tool = toolName;

        const btnBrush = win.querySelector('#btn-brush');
        const btnEraser = win.querySelector('#btn-eraser');

        // Toggle UI Active classes
        if (toolName === 'eraser') {
            btnEraser.classList.add('tool-active');
            btnBrush.classList.remove('tool-active');
        } else {
            btnBrush.classList.add('tool-active');
            btnEraser.classList.remove('tool-active');
        }
    }

    /**
     * Calculates mouse position relative to the canvas.
     * @param {MouseEvent} e 
     * @returns {Object} {x, y}
     */
    getPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    /**
     * Begins a drawing path.
     * @param {MouseEvent} e 
     */
    startDraw(e) {
        this.isDrawing = true;
        this.ctx.lineWidth = this.lineWidth;

        if (this.tool === 'eraser') {
            this.ctx.strokeStyle = '#ffffff'; // White paint acts as eraser
        } else {
            this.ctx.strokeStyle = this.color;
        }

        this.ctx.beginPath();
        const pos = this.getPos(e);
        this.ctx.moveTo(pos.x, pos.y);
    }

    /**
     * Continues the drawing path.
     * @param {MouseEvent} e 
     */
    draw(e) {
        if (!this.isDrawing) return;
        const pos = this.getPos(e);
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
    }

    /**
     * Ends the drawing path.
     */
    stopDraw() {
        this.isDrawing = false;
        this.ctx.closePath();
    }
}

// --- OTHER APPS ---

class CalculatorApp {
    constructor(windowEl) {
        this.display = windowEl.querySelector('.calc-display');
        this.setupEvents(windowEl);
    }
    setupEvents(win) {
        win.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                const val = btn.innerText;
                if (val === 'C') this.display.value = '';
                else if (val === '←') this.display.value = this.display.value.slice(0, -1);
                else if (val === '=') {
                    try {
                        // Note: eval is dangerous in prod, but okay for a static retro OS demo
                        this.display.value = eval(this.display.value);
                    } catch {
                        this.display.value = 'ERR';
                    }
                } else this.display.value += val;
            });
        });
    }
}

class CalendarApp {
    constructor(windowEl) {
        const date = new Date();
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        windowEl.querySelector('#cal-month').innerText = `${months[date.getMonth()]} ${date.getFullYear()}`;

        const grid = windowEl.querySelector('#cal-days');
        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

        for (let i = 1; i <= daysInMonth; i++) {
            const div = document.createElement('div');
            div.className = 'cal-day';
            div.innerText = i;
            if (i === date.getDate()) div.classList.add('cal-today');
            grid.appendChild(div);
        }
    }
}

// --- MATRIX RAIN EFFECT (EASTER EGG) ---

/**
 * Renders the Matrix Digital Rain effect on a background canvas.
 */
class MatrixEffect {
    constructor() {
        this.canvas = document.getElementById('matrix-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.active = false;
        this.interval = null;
        this.resize();

        // Ensure canvas fits window on resize
        window.addEventListener('resize', () => this.resize());
    }

    /**
     * Adjusts canvas size and column count based on viewport.
     */
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.columns = Math.floor(this.canvas.width / 20); // 20px font size
        this.drops = Array(this.columns).fill(1);
    }

    /**
     * Activates the animation loop.
     */
    start() {
        if (this.active) return;
        this.active = true;
        document.body.classList.add('matrix-active');
        this.interval = setInterval(() => this.draw(), 50);
    }

    /**
     * The main animation frame function.
     * Draws a translucent black rectangle to create trails, then draws green characters.
     */
    draw() {
        // Translucent black background for trail effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#0F0'; // Matrix Green
        this.ctx.font = '15px monospace';

        for (let i = 0; i < this.drops.length; i++) {
            // Random Katakana Character
            const text = String.fromCharCode(0x30A0 + Math.random() * 96);
            this.ctx.fillText(text, i * 20, this.drops[i] * 20);

            // Reset drop to top randomly after it passes screen height
            if (this.drops[i] * 20 > this.canvas.height && Math.random() > 0.975) {
                this.drops[i] = 0;
            }
            this.drops[i]++;
        }
    }
}

// --- INITIALIZATION & UTILS ---

/**
 * Starts the taskbar clock.
 */
function startClock() {
    setInterval(() => {
        const now = new Date();
        document.getElementById('clock').innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, 1000);
}

// --- KONAMI CODE LISTENER ---
// Sequence: Up, Up, Down, Down, Left, Right, Left, Right, B, A
const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiIndex = 0;
let matrixApp = null;

document.addEventListener('keydown', (e) => {
    if (e.key === konamiCode[konamiIndex]) {
        konamiIndex++;
        if (konamiIndex === konamiCode.length) {
            // Trigger Easter Egg
            if (!matrixApp) matrixApp = new MatrixEffect();
            matrixApp.start();
            alert("SYSTEM HACKED! WELCOME TO THE REAL WORLD.");
            konamiIndex = 0;
        }
    } else {
        konamiIndex = 0;
    }
});

// --- BOOTSTRAP ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Simulate BIOS Boot Delay
    setTimeout(() => {
        const bootScreen = document.getElementById('boot-screen');
        if (bootScreen) bootScreen.style.display = 'none';
    }, 1300);

    // 2. Initialize OS Core
    const windowManager = new WindowManager();
    const systemLoader = new SystemLoader(windowManager);

    systemLoader.boot();
    startClock();
});