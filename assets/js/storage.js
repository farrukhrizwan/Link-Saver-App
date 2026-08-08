/**
 * AFU Link Saver - Data Storage & Repository Layer
 * Manages LocalStorage, PIN validation, data encryption wrappers, export & import.
 * 100% Client-Side Local Storage.
 */

const STORAGE_KEYS = {
    PRIMARY_PIN_HASH: 'afu_pin_hash',
    VAULT_PIN_HASH: 'afu_vault_pin_hash',
    WEB_LINKS: 'afu_weblinks',
    SOCIAL_LINKS: 'afu_sociallinks',
    CRYPTO_WALLETS: 'afu_cryptowallets',
    PASSWORDS: 'afu_passwords',
    THEME: 'afu_theme',
    AUTOLOCK_MINS: 'afu_autolock_mins'
};

const DEFAULT_PRIMARY_PIN = '123456';
const DEFAULT_VAULT_PIN = '654321';

const AppStorage = {
    // Initialize default PINs and initial demo/sample data if first run
    async init() {
        if (!localStorage.getItem(STORAGE_KEYS.PRIMARY_PIN_HASH)) {
            const defaultHash = await AppCrypto.hashPin(DEFAULT_PRIMARY_PIN);
            localStorage.setItem(STORAGE_KEYS.PRIMARY_PIN_HASH, defaultHash);
        }

        if (!localStorage.getItem(STORAGE_KEYS.VAULT_PIN_HASH)) {
            const defaultVaultHash = await AppCrypto.hashPin(DEFAULT_VAULT_PIN);
            localStorage.setItem(STORAGE_KEYS.VAULT_PIN_HASH, defaultVaultHash);
        }

        if (!localStorage.getItem(STORAGE_KEYS.THEME)) {
            localStorage.setItem(STORAGE_KEYS.THEME, 'obsidian');
        }

        if (!localStorage.getItem(STORAGE_KEYS.AUTOLOCK_MINS)) {
            localStorage.setItem(STORAGE_KEYS.AUTOLOCK_MINS, '5');
        }

        // Initialize empty arrays if missing
        if (!localStorage.getItem(STORAGE_KEYS.WEB_LINKS)) {
            const sampleWeb = [
                {
                    id: 'web_sample_1',
                    title: 'AFU Webs Official',
                    url: 'https://www.afuwebs.dpdns.org/home',
                    category: 'Development',
                    notes: 'Official website of AFU Webs',
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'web_sample_2',
                    title: 'Portfolio',
                    url: 'https://farrukhrizwan.qzz.io/',
                    category: 'Portfolio',
                    notes: 'Free Lancer',
                    createdAt: new Date().toISOString()
                }
            ];
            localStorage.setItem(STORAGE_KEYS.WEB_LINKS, JSON.stringify(sampleWeb));
        }

        if (!localStorage.getItem(STORAGE_KEYS.SOCIAL_LINKS)) {
            const sampleSocial = [
                {
                    id: 'social_sample_1',
                    title: 'Twitter / X',
                    handleOrUrl: 'https://x.com',
                    platform: 'Twitter',
                    notes: 'Social media profile',
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'social_sample_2',
                    title: 'GitHub',
                    handleOrUrl: 'https://github.com',
                    platform: 'GitHub',
                    notes: 'Code repository profile',
                    createdAt: new Date().toISOString()
                }
            ];
            localStorage.setItem(STORAGE_KEYS.SOCIAL_LINKS, JSON.stringify(sampleSocial));
        }

        if (!localStorage.getItem(STORAGE_KEYS.CRYPTO_WALLETS)) {
            localStorage.setItem(STORAGE_KEYS.CRYPTO_WALLETS, JSON.stringify([]));
        }

        if (!localStorage.getItem(STORAGE_KEYS.PASSWORDS)) {
            localStorage.setItem(STORAGE_KEYS.PASSWORDS, JSON.stringify([]));
        }
    },

    // Check Primary PIN
    async verifyPrimaryPin(pinInput) {
        const storedHash = localStorage.getItem(STORAGE_KEYS.PRIMARY_PIN_HASH);
        const inputHash = await AppCrypto.hashPin(pinInput);
        return storedHash === inputHash;
    },

    // Check Vault PIN
    async verifyVaultPin(pinInput) {
        const storedHash = localStorage.getItem(STORAGE_KEYS.VAULT_PIN_HASH);
        const inputHash = await AppCrypto.hashPin(pinInput);
        return storedHash === inputHash;
    },

    // Change Primary PIN
    async setPrimaryPin(newPin) {
        const newHash = await AppCrypto.hashPin(newPin);
        localStorage.setItem(STORAGE_KEYS.PRIMARY_PIN_HASH, newHash);
    },

    // Change Vault PIN
    async setVaultPin(newPin) {
        const newHash = await AppCrypto.hashPin(newPin);
        localStorage.setItem(STORAGE_KEYS.VAULT_PIN_HASH, newHash);
    },

    // Web Links CRUD
    getWebLinks() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.WEB_LINKS) || '[]');
        } catch {
            return [];
        }
    },
    saveWebLink(linkObj) {
        const links = this.getWebLinks();
        if (linkObj.id) {
            const index = links.findIndex(l => l.id === linkObj.id);
            if (index !== -1) {
                links[index] = { ...links[index], ...linkObj, updatedAt: new Date().toISOString() };
            } else {
                links.push(linkObj);
            }
        } else {
            linkObj.id = 'web_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            linkObj.createdAt = new Date().toISOString();
            links.unshift(linkObj);
        }
        localStorage.setItem(STORAGE_KEYS.WEB_LINKS, JSON.stringify(links));
        return linkObj;
    },
    deleteWebLink(id) {
        let links = this.getWebLinks();
        links = links.filter(l => l.id !== id);
        localStorage.setItem(STORAGE_KEYS.WEB_LINKS, JSON.stringify(links));
    },

    // Social Links CRUD
    getSocialLinks() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.SOCIAL_LINKS) || '[]');
        } catch {
            return [];
        }
    },
    saveSocialLink(socialObj) {
        const links = this.getSocialLinks();
        if (socialObj.id) {
            const index = links.findIndex(l => l.id === socialObj.id);
            if (index !== -1) {
                links[index] = { ...links[index], ...socialObj, updatedAt: new Date().toISOString() };
            } else {
                links.push(socialObj);
            }
        } else {
            socialObj.id = 'soc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            socialObj.createdAt = new Date().toISOString();
            links.unshift(socialObj);
        }
        localStorage.setItem(STORAGE_KEYS.SOCIAL_LINKS, JSON.stringify(links));
        return socialObj;
    },
    deleteSocialLink(id) {
        let links = this.getSocialLinks();
        links = links.filter(l => l.id !== id);
        localStorage.setItem(STORAGE_KEYS.SOCIAL_LINKS, JSON.stringify(links));
    },

    // Crypto Wallets (Encrypted)
    getCryptoWalletsRaw() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.CRYPTO_WALLETS) || '[]');
        } catch {
            return [];
        }
    },
    async saveCryptoWallet(walletObj, vaultPin) {
        const rawWallets = this.getCryptoWalletsRaw();
        let encryptedSecret = '';
        if (walletObj.secretPhrase) {
            encryptedSecret = await AppCrypto.encryptData(walletObj.secretPhrase, vaultPin);
        }

        const recordToStore = {
            id: walletObj.id || ('crypto_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
            title: walletObj.title,
            address: walletObj.address || '',
            network: walletObj.network || 'Multi-Chain',
            encryptedSecret: encryptedSecret || walletObj.encryptedSecret || '',
            notes: walletObj.notes || '',
            createdAt: walletObj.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (walletObj.id) {
            const idx = rawWallets.findIndex(w => w.id === walletObj.id);
            if (idx !== -1) rawWallets[idx] = recordToStore;
            else rawWallets.push(recordToStore);
        } else {
            rawWallets.unshift(recordToStore);
        }

        localStorage.setItem(STORAGE_KEYS.CRYPTO_WALLETS, JSON.stringify(rawWallets));
        return recordToStore;
    },
    async decryptCryptoSecret(encryptedSecret, vaultPin) {
        if (!encryptedSecret) return '';
        return await AppCrypto.decryptData(encryptedSecret, vaultPin);
    },
    deleteCryptoWallet(id) {
        let raw = this.getCryptoWalletsRaw();
        raw = raw.filter(w => w.id !== id);
        localStorage.setItem(STORAGE_KEYS.CRYPTO_WALLETS, JSON.stringify(raw));
    },

    // Passwords Vault (Encrypted)
    getPasswordsRaw() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.PASSWORDS) || '[]');
        } catch {
            return [];
        }
    },
    async savePassword(passObj, vaultPin) {
        const rawPasswords = this.getPasswordsRaw();
        let encryptedPass = '';
        if (passObj.password) {
            encryptedPass = await AppCrypto.encryptData(passObj.password, vaultPin);
        }

        const recordToStore = {
            id: passObj.id || ('pass_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
            title: passObj.title,
            username: passObj.username || '',
            websiteUrl: passObj.websiteUrl || '',
            encryptedPassword: encryptedPass || passObj.encryptedPassword || '',
            notes: passObj.notes || '',
            createdAt: passObj.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (passObj.id) {
            const idx = rawPasswords.findIndex(p => p.id === passObj.id);
            if (idx !== -1) rawPasswords[idx] = recordToStore;
            else rawPasswords.push(recordToStore);
        } else {
            rawPasswords.unshift(recordToStore);
        }

        localStorage.setItem(STORAGE_KEYS.PASSWORDS, JSON.stringify(rawPasswords));
        return recordToStore;
    },
    async decryptPassword(encryptedPassword, vaultPin) {
        if (!encryptedPassword) return '';
        return await AppCrypto.decryptData(encryptedPassword, vaultPin);
    },
    deletePassword(id) {
        let raw = this.getPasswordsRaw();
        raw = raw.filter(p => p.id !== id);
        localStorage.setItem(STORAGE_KEYS.PASSWORDS, JSON.stringify(raw));
    },

    // Settings & Theme
    getTheme() {
        return localStorage.getItem(STORAGE_KEYS.THEME) || 'obsidian';
    },
    setTheme(themeName) {
        localStorage.setItem(STORAGE_KEYS.THEME, themeName);
        document.documentElement.setAttribute('data-theme', themeName);
    },
    getAutoLockMins() {
        return parseInt(localStorage.getItem(STORAGE_KEYS.AUTOLOCK_MINS) || '5', 10);
    },
    setAutoLockMins(mins) {
        localStorage.setItem(STORAGE_KEYS.AUTOLOCK_MINS, mins.toString());
    },

    // Export Encrypted Data Backup
    exportBackupJSON() {
        const backupData = {
            app: 'AFU Link Saver',
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            primaryPinHash: localStorage.getItem(STORAGE_KEYS.PRIMARY_PIN_HASH),
            vaultPinHash: localStorage.getItem(STORAGE_KEYS.VAULT_PIN_HASH),
            webLinks: this.getWebLinks(),
            socialLinks: this.getSocialLinks(),
            cryptoWallets: this.getCryptoWalletsRaw(),
            passwords: this.getPasswordsRaw()
        };
        return JSON.stringify(backupData, null, 2);
    },

    // Import Data Backup
    importBackupJSON(jsonString) {
        try {
            const backupObj = JSON.parse(jsonString);
            if (backupObj.app !== 'AFU Link Saver' || !backupObj.webLinks) {
                throw new Error('Invalid backup file format');
            }

            if (backupObj.primaryPinHash) localStorage.setItem(STORAGE_KEYS.PRIMARY_PIN_HASH, backupObj.primaryPinHash);
            if (backupObj.vaultPinHash) localStorage.setItem(STORAGE_KEYS.VAULT_PIN_HASH, backupObj.vaultPinHash);
            if (Array.isArray(backupObj.webLinks)) localStorage.setItem(STORAGE_KEYS.WEB_LINKS, JSON.stringify(backupObj.webLinks));
            if (Array.isArray(backupObj.socialLinks)) localStorage.setItem(STORAGE_KEYS.SOCIAL_LINKS, JSON.stringify(backupObj.socialLinks));
            if (Array.isArray(backupObj.cryptoWallets)) localStorage.setItem(STORAGE_KEYS.CRYPTO_WALLETS, JSON.stringify(backupObj.cryptoWallets));
            if (Array.isArray(backupObj.passwords)) localStorage.setItem(STORAGE_KEYS.PASSWORDS, JSON.stringify(backupObj.passwords));

            return true;
        } catch (err) {
            console.error('Import failed:', err);
            throw err;
        }
    }
};

window.AppStorage = AppStorage;
