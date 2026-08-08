/**
 * AFU Link Saver - PWA Helper
 * Service Worker Registration & Installation Prompt Handler
 */

let deferredInstallPrompt = null;

const AppPWA = {
    init() {
        this.registerServiceWorker();
        this.listenInstallPrompt();
    },

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then(registration => {
                        console.log('AFU Link Saver Service Worker registered:', registration.scope);
                        
                        // Check for updates
                        registration.onupdatefound = () => {
                            const installingWorker = registration.installing;
                            installingWorker.onstatechange = () => {
                                if (installingWorker.state === 'installed') {
                                    if (navigator.serviceWorker.controller) {
                                        console.log('New app version available! Refreshing cache...');
                                        if (window.AppUI && AppUI.showToast) {
                                            AppUI.showToast('App update available! Refresh to load new version.', 'info');
                                        }
                                    }
                                }
                            };
                        };
                    })
                    .catch(err => {
                        console.error('Service Worker registration failed:', err);
                    });
            });
        }
    },

    listenInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            deferredInstallPrompt = e;

            // Show install button in UI if available
            const installBtn = document.getElementById('btn-pwa-install');
            if (installBtn) {
                installBtn.style.display = 'inline-flex';
                installBtn.addEventListener('click', () => this.promptInstall());
            }
        });

        window.addEventListener('appinstalled', () => {
            console.log('AFU Link Saver was successfully installed!');
            deferredInstallPrompt = null;
            const installBtn = document.getElementById('btn-pwa-install');
            if (installBtn) installBtn.style.display = 'none';
            if (window.AppUI && AppUI.showToast) {
                AppUI.showToast('AFU Link Saver installed successfully!', 'success');
            }
        });
    },

    async promptInstall() {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        console.log(`User response to install prompt: ${outcome}`);
        deferredInstallPrompt = null;
        const installBtn = document.getElementById('btn-pwa-install');
        if (installBtn) installBtn.style.display = 'none';
    }
};

window.AppPWA = AppPWA;
AppPWA.init();
