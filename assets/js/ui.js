/**
 * Link Saver - UI Renderer, Modals 
 */

const AppUI = {
    currentTab: 'weblinks',
    unlockedVaultPin: null, // Stores verified Vault PIN for active session
    idleTimer: null,
    clipboardTimer: null,

    init() {
        this.bindEvents();
        this.initIdleTimer();
        this.applyTheme(AppStorage.getTheme());
    },

    applyTheme(themeName) {
        AppStorage.setTheme(themeName);
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) themeSelect.value = themeName;
    },

    // Idle Auto-Lock Timer
    initIdleTimer() {
        const mins = AppStorage.getAutoLockMins();
        if (mins <= 0) return;

        const resetTimer = () => {
            if (this.idleTimer) clearTimeout(this.idleTimer);
            this.idleTimer = setTimeout(() => {
                const lockScreen = document.getElementById('lock-screen');
                if (lockScreen && lockScreen.classList.contains('hidden')) {
                    this.lockApp('Session auto-locked due to inactivity.');
                }
            }, mins * 60 * 1000);
        };

        ['mousemove', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
            window.addEventListener(evt, resetTimer, { passive: true });
        });
        resetTimer();
    },

    lockApp(reasonMessage) {
        this.unlockedVaultPin = null;
        const lockScreen = document.getElementById('lock-screen');
        const mainApp = document.getElementById('main-app');
        if (lockScreen && mainApp) {
            lockScreen.classList.remove('hidden');
            mainApp.classList.add('hidden');
            this.resetPinInput();
            if (reasonMessage) {
                this.showToast(reasonMessage, 'info');
            }
        }
    },

    // PIN Keypad Logic
    resetPinInput() {
        const pinInput = document.getElementById('pin-display');
        if (pinInput) pinInput.value = '';
        this.updatePinDots('');
    },

    updatePinDots(pin) {
        const dots = document.querySelectorAll('.pin-dot');
        dots.forEach((dot, idx) => {
            if (idx < pin.length) {
                dot.classList.add('filled');
            } else {
                dot.classList.remove('filled');
            }
        });
    },

    appendPinDigit(digit) {
        const pinDisplay = document.getElementById('pin-display');
        if (!pinDisplay) return;
        if (pinDisplay.value.length < 6) {
            pinDisplay.value += digit;
            this.updatePinDots(pinDisplay.value);
            if (pinDisplay.value.length === 6) {
                this.submitPrimaryPin();
            }
        }
    },

    backspacePinDigit() {
        const pinDisplay = document.getElementById('pin-display');
        if (!pinDisplay) return;
        pinDisplay.value = pinDisplay.value.slice(0, -1);
        this.updatePinDots(pinDisplay.value);
    },

    async submitPrimaryPin() {
        const pinDisplay = document.getElementById('pin-display');
        const pinValue = pinDisplay ? pinDisplay.value : '';

        if (!pinValue || pinValue.length < 4) {
            this.showToast('Please enter your full 6-digit PIN', 'warning');
            return;
        }

        const isValid = await AppStorage.verifyPrimaryPin(pinValue);
        if (isValid) {
            document.getElementById('lock-screen').classList.add('hidden');
            document.getElementById('main-app').classList.remove('hidden');
            this.resetPinInput();
            this.showToast('Welcome back to Link Saver App!', 'success');
            this.renderCurrentTab();
        } else {
            const pinContainer = document.getElementById('pin-container');
            if (pinContainer) {
                pinContainer.classList.add('shake');
                setTimeout(() => pinContainer.classList.remove('shake'), 600);
            }
            this.resetPinInput();
            this.showToast('Incorrect PIN! Default is 123456', 'error');
        }
    },

    // Tab Switching
    switchTab(tabName) {
        if (tabName === 'passwords' && !this.unlockedVaultPin) {
            // Require Vault PIN for Passwords Vault
            this.promptVaultPin(() => {
                this.currentTab = tabName;
                this.updateActiveTabUI(tabName);
                this.renderCurrentTab();
            });
            return;
        }

        this.currentTab = tabName;
        this.updateActiveTabUI(tabName);
        this.renderCurrentTab();
    },

    updateActiveTabUI(tabName) {
        const navBtns = document.querySelectorAll('.nav-tab-btn');
        navBtns.forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    },

    // Prompt for Secondary Vault PIN
    promptVaultPin(onSuccessCallback) {
        if (this.unlockedVaultPin) {
            onSuccessCallback();
            return;
        }

        const modal = document.getElementById('vault-pin-modal');
        const input = document.getElementById('vault-pin-input');
        const submitBtn = document.getElementById('btn-submit-vault-pin');
        const cancelBtn = document.getElementById('btn-cancel-vault-pin');

        if (!modal || !input) return;

        input.value = '';
        modal.classList.remove('hidden');
        input.focus();

        const handleSubmit = async () => {
            const enteredPin = input.value.trim();
            if (!enteredPin) {
                this.showToast('Enter Vault PIN (Default: 654321)', 'warning');
                return;
            }
            const isValid = await AppStorage.verifyVaultPin(enteredPin);
            if (isValid) {
                this.unlockedVaultPin = enteredPin;
                modal.classList.add('hidden');
                cleanup();
                this.showToast('Vault Unlocked', 'success');
                onSuccessCallback();
            } else {
                input.classList.add('shake');
                setTimeout(() => input.classList.remove('shake'), 500);
                input.value = '';
                this.showToast('Incorrect Vault PIN! Default is 654321', 'error');
            }
        };

        const cleanup = () => {
            submitBtn.removeEventListener('click', handleSubmit);
            cancelBtn.removeEventListener('click', handleCancel);
            input.removeEventListener('keyup', handleKeyUp);
        };

        const handleCancel = () => {
            modal.classList.add('hidden');
            cleanup();
        };

        const handleKeyUp = (e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') handleCancel();
        };

        submitBtn.addEventListener('click', handleSubmit);
        cancelBtn.addEventListener('click', handleCancel);
        input.addEventListener('keyup', handleKeyUp);
    },

    // Render Logic for Active Tab
    renderCurrentTab() {
        const searchQuery = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
        const container = document.getElementById('content-list');
        if (!container) return;

        container.innerHTML = '';

        if (this.currentTab === 'weblinks') {
            this.renderWebLinks(container, searchQuery);
        } else if (this.currentTab === 'sociallinks') {
            this.renderSocialLinks(container, searchQuery);
        } else if (this.currentTab === 'cryptowallets') {
            this.renderCryptoWallets(container, searchQuery);
        } else if (this.currentTab === 'passwords') {
            this.renderPasswords(container, searchQuery);
        }
    },

    // Render Web Links
    renderWebLinks(container, search) {
        let links = AppStorage.getWebLinks();
        if (search) {
            links = links.filter(l =>
                l.title.toLowerCase().includes(search) ||
                l.url.toLowerCase().includes(search) ||
                (l.category && l.category.toLowerCase().includes(search))
            );
        }

        if (links.length === 0) {
            container.innerHTML = this.getEmptyStateHTML('Web Links', 'globe');
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'cards-grid';

        links.forEach(item => {
            const domain = this.extractDomain(item.url);
            const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

            const card = document.createElement('div');
            card.className = 'glass-card link-card';
            card.innerHTML = `
                <div class="card-header">
                    <div class="card-title-group">
                        <img src="${faviconUrl}" class="favicon" onerror="this.src='./assets/images/logo.jpg'" alt="icon">
                        <div>
                            <h3 class="card-title">${this.escapeHTML(item.title)}</h3>
                            <span class="card-badge">${this.escapeHTML(item.category || 'General')}</span>
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="icon-btn edit-btn" onclick="AppUI.openEditWebLinkModal('${item.id}')" title="Edit">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="icon-btn delete-btn" onclick="AppUI.confirmDelete('web', '${item.id}')" title="Delete">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <a href="${this.escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer" class="link-url-text">
                        <i class="fas fa-external-link-alt margin-r"></i> ${this.escapeHTML(item.url)}
                    </a>
                    ${item.notes ? `<p class="card-notes"><i class="fas fa-sticky-note"></i> ${this.escapeHTML(item.notes)}</p>` : ''}
                </div>
                <div class="card-footer">
                    <button class="btn btn-sm btn-secondary" onclick="AppUI.copyToClipboard('${this.escapeHTML(item.url)}', 'Web link copied!')">
                        <i class="fas fa-copy"></i> Copy Link
                    </button>
                    <a href="${this.escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-primary">
                        <i class="fas fa-arrow-right"></i> Open
                    </a>
                </div>
            `;
            grid.appendChild(card);
        });

        container.appendChild(grid);
    },

    // Render Social Links
    renderSocialLinks(container, search) {
        let links = AppStorage.getSocialLinks();
        if (search) {
            links = links.filter(l =>
                l.title.toLowerCase().includes(search) ||
                l.handleOrUrl.toLowerCase().includes(search) ||
                (l.platform && l.platform.toLowerCase().includes(search))
            );
        }

        if (links.length === 0) {
            container.innerHTML = this.getEmptyStateHTML('Social Links', 'share-alt');
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'cards-grid';

        links.forEach(item => {
            const platformIcon = this.getPlatformIconClass(item.platform || item.title);

            const card = document.createElement('div');
            card.className = 'glass-card social-card';
            card.innerHTML = `
                <div class="card-header">
                    <div class="card-title-group">
                        <div class="social-icon-wrapper">
                            <i class="${platformIcon}"></i>
                        </div>
                        <div>
                            <h3 class="card-title">${this.escapeHTML(item.title)}</h3>
                            <span class="card-badge social-badge">${this.escapeHTML(item.platform || 'Social')}</span>
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="icon-btn edit-btn" onclick="AppUI.openEditSocialLinkModal('${item.id}')" title="Edit">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="icon-btn delete-btn" onclick="AppUI.confirmDelete('social', '${item.id}')" title="Delete">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="handle-display">
                        <i class="fas fa-at"></i> ${this.escapeHTML(item.handleOrUrl)}
                    </div>
                    ${item.notes ? `<p class="card-notes"><i class="fas fa-info-circle"></i> ${this.escapeHTML(item.notes)}</p>` : ''}
                </div>
                <div class="card-footer">
                    <button class="btn btn-sm btn-secondary" onclick="AppUI.copyToClipboard('${this.escapeHTML(item.handleOrUrl)}', 'Handle / URL copied!')">
                        <i class="fas fa-copy"></i> Copy Handle
                    </button>
                    ${item.handleOrUrl.startsWith('http') ? `
                        <a href="${this.escapeHTML(item.handleOrUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-primary">
                            <i class="fas fa-external-link-alt"></i> Visit
                        </a>
                    ` : ''}
                </div>
            `;
            grid.appendChild(card);
        });

        container.appendChild(grid);
    },

    // Render Crypto Wallets
    renderCryptoWallets(container, search) {
        let wallets = AppStorage.getCryptoWalletsRaw();
        if (search) {
            wallets = wallets.filter(w =>
                w.title.toLowerCase().includes(search) ||
                (w.address && w.address.toLowerCase().includes(search)) ||
                (w.network && w.network.toLowerCase().includes(search))
            );
        }

        if (wallets.length === 0) {
            container.innerHTML = this.getEmptyStateHTML('Crypto Secret Phrases', 'wallet');
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'cards-grid';

        wallets.forEach(item => {
            const card = document.createElement('div');
            card.className = 'glass-card crypto-card';
            card.innerHTML = `
                <div class="card-header">
                    <div class="card-title-group">
                        <div class="crypto-icon-wrapper">
                            <i class="fas fa-coins"></i>
                        </div>
                        <div>
                            <h3 class="card-title">${this.escapeHTML(item.title)}</h3>
                            <span class="card-badge crypto-badge">${this.escapeHTML(item.network || 'Multi-Chain')}</span>
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="icon-btn edit-btn" onclick="AppUI.openEditCryptoWalletModal('${item.id}')" title="Edit">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="icon-btn delete-btn" onclick="AppUI.confirmDelete('crypto', '${item.id}')" title="Delete">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    ${item.address ? `
                        <div class="address-box">
                            <span class="box-label">Public Address:</span>
                            <span class="box-val font-mono">${this.truncateAddress(item.address)}</span>
                            <button class="btn-mini" onclick="AppUI.copyToClipboard('${this.escapeHTML(item.address)}', 'Address copied!')">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    ` : ''}
                    <div class="secret-box">
                        <span class="box-label"><i class="fas fa-key"></i> Secret Recovery Phrase:</span>
                        <div class="secret-field" id="secret-field-${item.id}">
                            <span class="masked-text">•••• •••• •••• •••• •••• ••••</span>
                        </div>
                        <button class="btn btn-sm btn-warning margin-top-sm" onclick="AppUI.revealCryptoSecret('${item.id}')">
                            <i class="fas fa-eye" id="secret-eye-${item.id}"></i> Reveal / Copy Phrase
                        </button>
                    </div>
                    ${item.notes ? `<p class="card-notes margin-top-sm"><i class="fas fa-notes-medical"></i> ${this.escapeHTML(item.notes)}</p>` : ''}
                </div>
            `;
            grid.appendChild(card);
        });

        container.appendChild(grid);
    },

    // Render Passwords Vault
    renderPasswords(container, search) {
        let passwords = AppStorage.getPasswordsRaw();
        if (search) {
            passwords = passwords.filter(p =>
                p.title.toLowerCase().includes(search) ||
                (p.username && p.username.toLowerCase().includes(search)) ||
                (p.websiteUrl && p.websiteUrl.toLowerCase().includes(search))
            );
        }

        if (passwords.length === 0) {
            container.innerHTML = this.getEmptyStateHTML('Passwords Vault', 'user-shield');
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'cards-grid';

        passwords.forEach(item => {
            const card = document.createElement('div');
            card.className = 'glass-card password-card';
            card.innerHTML = `
                <div class="card-header">
                    <div class="card-title-group">
                        <div class="password-icon-wrapper">
                            <i class="fas fa-key"></i>
                        </div>
                        <div>
                            <h3 class="card-title">${this.escapeHTML(item.title)}</h3>
                            ${item.username ? `<span class="card-badge pass-badge">${this.escapeHTML(item.username)}</span>` : ''}
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="icon-btn edit-btn" onclick="AppUI.openEditPasswordModal('${item.id}')" title="Edit">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="icon-btn delete-btn" onclick="AppUI.confirmDelete('password', '${item.id}')" title="Delete">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    ${item.websiteUrl ? `
                        <div class="link-url-text margin-b-sm">
                            <i class="fas fa-globe"></i> ${this.escapeHTML(item.websiteUrl)}
                        </div>
                    ` : ''}
                    <div class="secret-box">
                        <span class="box-label">Password:</span>
                        <div class="secret-field" id="pass-field-${item.id}">
                            <span class="masked-text">••••••••••••</span>
                        </div>
                        <button class="btn btn-sm btn-secondary margin-top-sm" onclick="AppUI.revealPassword('${item.id}')">
                            <i class="fas fa-eye" id="pass-eye-${item.id}"></i> Show / Copy Password
                        </button>
                    </div>
                    ${item.notes ? `<p class="card-notes margin-top-sm"><i class="fas fa-sticky-note"></i> ${this.escapeHTML(item.notes)}</p>` : ''}
                </div>
            `;
            grid.appendChild(card);
        });

        container.appendChild(grid);
    },

    // Reveal Sensitive Secret (Crypto) with Vault PIN
    revealCryptoSecret(walletId) {
        this.promptVaultPin(async () => {
            const wallet = AppStorage.getCryptoWalletsRaw().find(w => w.id === walletId);
            if (!wallet || !wallet.encryptedSecret) {
                this.showToast('No secret phrase stored for this wallet', 'info');
                return;
            }

            try {
                const decryptedText = await AppStorage.decryptCryptoSecret(wallet.encryptedSecret, this.unlockedVaultPin);
                const field = document.getElementById(`secret-field-${walletId}`);
                if (field) {
                    field.innerHTML = `<span class="secret-text font-mono">${this.escapeHTML(decryptedText)}</span>`;
                }

                // Copy to clipboard with auto-clear
                this.copyToClipboard(decryptedText, 'Secret phrase copied! Auto-clearing clipboard in 30s...', true);
            } catch {
                this.showToast('Decryption failed! Invalid Vault PIN.', 'error');
            }
        });
    },

    // Reveal Sensitive Password with Vault PIN
    revealPassword(passwordId) {
        this.promptVaultPin(async () => {
            const passRecord = AppStorage.getPasswordsRaw().find(p => p.id === passwordId);
            if (!passRecord || !passRecord.encryptedPassword) {
                this.showToast('No password saved for this record', 'info');
                return;
            }

            try {
                const decryptedText = await AppStorage.decryptPassword(passRecord.encryptedPassword, this.unlockedVaultPin);
                const field = document.getElementById(`pass-field-${passwordId}`);
                if (field) {
                    field.innerHTML = `<span class="secret-text font-mono">${this.escapeHTML(decryptedText)}</span>`;
                }

                // Copy to clipboard with auto-clear
                this.copyToClipboard(decryptedText, 'Password copied! Auto-clearing in 30s...', true);
            } catch {
                this.showToast('Decryption failed! Invalid Vault PIN.', 'error');
            }
        });
    },

    // Open Modal Handlers
    openAddModal() {
        if (this.currentTab === 'weblinks') this.openEditWebLinkModal();
        else if (this.currentTab === 'sociallinks') this.openEditSocialLinkModal();
        else if (this.currentTab === 'cryptowallets') this.openEditCryptoWalletModal();
        else if (this.currentTab === 'passwords') this.openEditPasswordModal();
    },

    // Web Link Modal
    openEditWebLinkModal(id = null) {
        const modal = document.getElementById('modal-weblink');
        const titleEl = document.getElementById('modal-weblink-title');
        const form = document.getElementById('form-weblink');

        form.reset();
        document.getElementById('weblink-id').value = id || '';

        if (id) {
            titleEl.innerText = 'Edit Web Link';
            const link = AppStorage.getWebLinks().find(l => l.id === id);
            if (link) {
                document.getElementById('weblink-title').value = link.title;
                document.getElementById('weblink-url').value = link.url;
                document.getElementById('weblink-category').value = link.category || 'General';
                document.getElementById('weblink-notes').value = link.notes || '';
            }
        } else {
            titleEl.innerText = 'Add Web Link';
        }

        modal.classList.remove('hidden');
    },

    // Social Link Modal
    openEditSocialLinkModal(id = null) {
        const modal = document.getElementById('modal-sociallink');
        const titleEl = document.getElementById('modal-sociallink-title');
        const form = document.getElementById('form-sociallink');

        form.reset();
        document.getElementById('sociallink-id').value = id || '';

        if (id) {
            titleEl.innerText = 'Edit Social Link';
            const link = AppStorage.getSocialLinks().find(l => l.id === id);
            if (link) {
                document.getElementById('sociallink-title').value = link.title;
                document.getElementById('sociallink-handle').value = link.handleOrUrl;
                document.getElementById('sociallink-platform').value = link.platform || 'Twitter';
                document.getElementById('sociallink-notes').value = link.notes || '';
            }
        } else {
            titleEl.innerText = 'Add Social Link';
        }

        modal.classList.remove('hidden');
    },

    // Crypto Wallet Modal
    openEditCryptoWalletModal(id = null) {
        this.promptVaultPin(() => {
            const modal = document.getElementById('modal-cryptowallet');
            const titleEl = document.getElementById('modal-cryptowallet-title');
            const form = document.getElementById('form-cryptowallet');

            form.reset();
            document.getElementById('cryptowallet-id').value = id || '';

            if (id) {
                titleEl.innerText = 'Edit Crypto Wallet';
                const wallet = AppStorage.getCryptoWalletsRaw().find(w => w.id === id);
                if (wallet) {
                    document.getElementById('cryptowallet-title').value = wallet.title;
                    document.getElementById('cryptowallet-address').value = wallet.address || '';
                    document.getElementById('cryptowallet-network').value = wallet.network || 'Multi-Chain';
                    document.getElementById('cryptowallet-notes').value = wallet.notes || '';
                }
            } else {
                titleEl.innerText = 'Add Crypto Wallet';
            }

            modal.classList.remove('hidden');
        });
    },

    // Password Modal
    openEditPasswordModal(id = null) {
        this.promptVaultPin(() => {
            const modal = document.getElementById('modal-password');
            const titleEl = document.getElementById('modal-password-title');
            const form = document.getElementById('form-password');

            form.reset();
            document.getElementById('password-id').value = id || '';

            if (id) {
                titleEl.innerText = 'Edit Password Record';
                const pass = AppStorage.getPasswordsRaw().find(p => p.id === id);
                if (pass) {
                    document.getElementById('password-title').value = pass.title;
                    document.getElementById('password-username').value = pass.username || '';
                    document.getElementById('password-url').value = pass.websiteUrl || '';
                    document.getElementById('password-notes').value = pass.notes || '';
                }
            } else {
                titleEl.innerText = 'Add Password Record';
            }

            modal.classList.remove('hidden');
        });
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('hidden');
    },

    // Confirm Delete
    confirmDelete(type, id) {
        if (!confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
            return;
        }

        if (type === 'web') AppStorage.deleteWebLink(id);
        else if (type === 'social') AppStorage.deleteSocialLink(id);
        else if (type === 'crypto') AppStorage.deleteCryptoWallet(id);
        else if (type === 'password') AppStorage.deletePassword(id);

        this.showToast('Record deleted', 'info');
        this.renderCurrentTab();
    },

    // Copy to Clipboard Utility with auto-clear option
    copyToClipboard(text, message = 'Copied to clipboard!', autoClear = false) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast(message, 'success');
            if (autoClear) {
                if (this.clipboardTimer) clearTimeout(this.clipboardTimer);
                this.clipboardTimer = setTimeout(() => {
                    navigator.clipboard.writeText(' ');
                    this.showToast('Clipboard cleared for security', 'info');
                }, 30000);
            }
        }).catch(() => {
            this.showToast('Failed to copy', 'error');
        });
    },

    // Toast Notifications
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconClass = 'fa-info-circle';
        if (type === 'success') iconClass = 'fa-check-circle';
        if (type === 'warning') iconClass = 'fa-exclamation-triangle';
        if (type === 'error') iconClass = 'fa-times-circle';

        toast.innerHTML = `<i class="fas ${iconClass}"></i> <span>${this.escapeHTML(message)}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    },

    // Helper functions
    escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    extractDomain(url) {
        try {
            const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
            return parsed.hostname;
        } catch {
            return 'example.com';
        }
    },

    truncateAddress(addr) {
        if (!addr || addr.length <= 16) return addr;
        return addr.substr(0, 8) + '...' + addr.substr(-6);
    },

    getPlatformIconClass(platform) {
        const p = platform.toLowerCase();
        if (p.includes('twitter') || p.includes('x')) return 'fab fa-twitter';
        if (p.includes('github')) return 'fab fa-github';
        if (p.includes('linkedin')) return 'fab fa-linkedin';
        if (p.includes('youtube')) return 'fab fa-youtube';
        if (p.includes('telegram')) return 'fab fa-telegram';
        if (p.includes('discord')) return 'fab fa-discord';
        if (p.includes('instagram')) return 'fab fa-instagram';
        if (p.includes('facebook')) return 'fab fa-facebook';
        return 'fas fa-hashtag';
    },

    getEmptyStateHTML(title, icon) {
        return `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-${icon}"></i></div>
                <h3>No ${title} Stored Yet</h3>
                <p>Click the "Add New" button below or on top to save your first item securely.</p>
                <button class="btn btn-primary margin-top-md" onclick="AppUI.openAddModal()">
                    <i class="fas fa-plus"></i> Add New ${title}
                </button>
            </div>
        `;
    },

    bindEvents() {
        // Form submissions
        document.getElementById('form-weblink')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('weblink-id').value;
            const linkObj = {
                id: id || null,
                title: document.getElementById('weblink-title').value.trim(),
                url: document.getElementById('weblink-url').value.trim(),
                category: document.getElementById('weblink-category').value.trim() || 'General',
                notes: document.getElementById('weblink-notes').value.trim()
            };
            AppStorage.saveWebLink(linkObj);
            this.closeModal('modal-weblink');
            this.showToast('Web link saved!', 'success');
            this.renderCurrentTab();
        });

        document.getElementById('form-sociallink')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('sociallink-id').value;
            const socialObj = {
                id: id || null,
                title: document.getElementById('sociallink-title').value.trim(),
                handleOrUrl: document.getElementById('sociallink-handle').value.trim(),
                platform: document.getElementById('sociallink-platform').value,
                notes: document.getElementById('sociallink-notes').value.trim()
            };
            AppStorage.saveSocialLink(socialObj);
            this.closeModal('modal-sociallink');
            this.showToast('Social link saved!', 'success');
            this.renderCurrentTab();
        });

        document.getElementById('form-cryptowallet')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!this.unlockedVaultPin) {
                this.showToast('Vault PIN required to save crypto secrets', 'warning');
                return;
            }
            const id = document.getElementById('cryptowallet-id').value;
            const walletObj = {
                id: id || null,
                title: document.getElementById('cryptowallet-title').value.trim(),
                address: document.getElementById('cryptowallet-address').value.trim(),
                network: document.getElementById('cryptowallet-network').value.trim() || 'Multi-Chain',
                secretPhrase: document.getElementById('cryptowallet-secret').value.trim(),
                notes: document.getElementById('cryptowallet-notes').value.trim()
            };
            await AppStorage.saveCryptoWallet(walletObj, this.unlockedVaultPin);
            this.closeModal('modal-cryptowallet');
            this.showToast('Crypto wallet saved & encrypted!', 'success');
            this.renderCurrentTab();
        });

        document.getElementById('form-password')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!this.unlockedVaultPin) {
                this.showToast('Vault PIN required to save passwords', 'warning');
                return;
            }
            const id = document.getElementById('password-id').value;
            const passObj = {
                id: id || null,
                title: document.getElementById('password-title').value.trim(),
                username: document.getElementById('password-username').value.trim(),
                websiteUrl: document.getElementById('password-url').value.trim(),
                password: document.getElementById('password-secret').value.trim(),
                notes: document.getElementById('password-notes').value.trim()
            };
            await AppStorage.savePassword(passObj, this.unlockedVaultPin);
            this.closeModal('modal-password');
            this.showToast('Password record saved & encrypted!', 'success');
            this.renderCurrentTab();
        });

        // Search Input Event
        document.getElementById('search-input')?.addEventListener('input', () => {
            this.renderCurrentTab();
        });

        // Password Generator Button in modal
        document.getElementById('btn-gen-pass')?.addEventListener('click', () => {
            const generated = AppCrypto.generatePassword(16, true, true, true, true);
            const passInput = document.getElementById('password-secret');
            if (passInput) passInput.value = generated;
            this.showToast('Strong password generated!', 'info');
        });

        // PIN Change Forms
        document.getElementById('form-change-pin')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currPin = document.getElementById('curr-pin').value;
            const newPin = document.getElementById('new-pin').value;
            const confPin = document.getElementById('conf-pin').value;

            if (newPin !== confPin) {
                this.showToast('New PINs do not match!', 'error');
                return;
            }

            const isValid = await AppStorage.verifyPrimaryPin(currPin);
            if (!isValid) {
                this.showToast('Current PIN is incorrect!', 'error');
                return;
            }

            await AppStorage.setPrimaryPin(newPin);
            this.showToast('Primary PIN updated successfully!', 'success');
            this.closeModal('modal-settings');
        });

        document.getElementById('form-change-vault-pin')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currVaultPin = document.getElementById('curr-vault-pin').value;
            const newVaultPin = document.getElementById('new-vault-pin').value;
            const confVaultPin = document.getElementById('conf-vault-pin').value;

            if (newVaultPin !== confVaultPin) {
                this.showToast('New Vault PINs do not match!', 'error');
                return;
            }

            const isValid = await AppStorage.verifyVaultPin(currVaultPin);
            if (!isValid) {
                this.showToast('Current Vault PIN is incorrect!', 'error');
                return;
            }

            await AppStorage.setVaultPin(newVaultPin);
            this.unlockedVaultPin = newVaultPin;
            this.showToast('Vault PIN updated successfully!', 'success');
            this.closeModal('modal-settings');
        });

        // Backup Export & Import
        document.getElementById('btn-export-backup')?.addEventListener('click', () => {
            const jsonStr = AppStorage.exportBackupJSON();
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `afu_link_saver_backup_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            this.showToast('Encrypted backup file downloaded!', 'success');
        });

        document.getElementById('file-import-backup')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    AppStorage.importBackupJSON(evt.target.result);
                    this.showToast('Data imported successfully!', 'success');
                    this.renderCurrentTab();
                    this.closeModal('modal-settings');
                } catch {
                    this.showToast('Failed to import backup! Check file format.', 'error');
                }
            };
            reader.readAsText(file);
        });

        // Keyboard Shortcut for PIN Keypad
        document.addEventListener('keydown', (e) => {
            const lockScreen = document.getElementById('lock-screen');
            if (lockScreen && !lockScreen.classList.contains('hidden')) {
                if (e.key >= '0' && e.key <= '9') {
                    this.appendPinDigit(e.key);
                } else if (e.key === 'Backspace') {
                    this.backspacePinDigit();
                } else if (e.key === 'Enter') {
                    this.submitPrimaryPin();
                }
            }
        });
    }
};

window.AppUI = AppUI;
