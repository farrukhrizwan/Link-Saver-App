/**
 * Link Saver -
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Data Storage & Cryptography
    await AppStorage.init();

    // Initialize UI Engine & Events
    AppUI.init();

    console.log('AFU Link Saver initialized successfully!');
});
