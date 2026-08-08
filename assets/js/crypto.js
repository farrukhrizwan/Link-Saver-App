/**
 * Link Saver - Web Crypto & Security Layer
 * Uses native Web Crypto API (AES-GCM 256-bit with PBKDF2 key derivation)
 * 100% Client-Side zero-knowledge privacy.
 */

const AppCrypto = {
    // Convert array buffer to base64 string
    bufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    },

    // Convert base64 string to array buffer
    base64ToBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    },

    // SHA-256 PIN Hash for quick PIN check
    async hashPin(pin) {
        const encoder = new TextEncoder();
        const data = encoder.encode(pin + "_afu_salt_v1");
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return this.bufferToBase64(hashBuffer);
    },

    // Derive AES-GCM key from PIN using PBKDF2
    async deriveKey(pin, saltBuffer) {
        const encoder = new TextEncoder();
        const pinBuffer = encoder.encode(pin);

        const baseKey = await crypto.subtle.importKey(
            'raw',
            pinBuffer,
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: saltBuffer,
                iterations: 100000,
                hash: 'SHA-256'
            },
            baseKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    },

    // Encrypt sensitive JSON payload with PIN
    async encryptData(data, pin) {
        try {
            const encoder = new TextEncoder();
            const stringData = typeof data === 'string' ? data : JSON.stringify(data);
            const encodedData = encoder.encode(stringData);

            // Generate 16-byte random salt & 12-byte random IV
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const iv = crypto.getRandomValues(new Uint8Array(12));

            const key = await this.deriveKey(pin, salt);

            const ciphertextBuffer = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encodedData
            );

            const payload = {
                salt: this.bufferToBase64(salt),
                iv: this.bufferToBase64(iv),
                cipher: this.bufferToBase64(ciphertextBuffer)
            };

            return JSON.stringify(payload);
        } catch (err) {
            console.error('Encryption error:', err);
            throw new Error('Failed to encrypt data.');
        }
    },

    // Decrypt ciphertext using PIN
    async decryptData(encryptedPayloadString, pin) {
        try {
            const payload = JSON.parse(encryptedPayloadString);
            if (!payload.salt || !payload.iv || !payload.cipher) {
                throw new Error('Invalid cipher payload format');
            }

            const salt = new Uint8Array(this.base64ToBuffer(payload.salt));
            const iv = new Uint8Array(this.base64ToBuffer(payload.iv));
            const cipherBuffer = this.base64ToBuffer(payload.cipher);

            const key = await this.deriveKey(pin, salt);

            const decryptedBuffer = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                cipherBuffer
            );

            const decoder = new TextDecoder();
            const decryptedText = decoder.decode(decryptedBuffer);

            try {
                return JSON.parse(decryptedText);
            } catch {
                return decryptedText;
            }
        } catch (err) {
            console.error('Decryption error:', err);
            throw new Error('Invalid PIN or corrupted data.');
        }
    },

    // Strong Password Generator
    generatePassword(length = 16, includeUpper = true, includeLower = true, includeNumbers = true, includeSymbols = true) {
        let charset = '';
        if (includeUpper) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (includeLower) charset += 'abcdefghijklmnopqrstuvwxyz';
        if (includeNumbers) charset += '0123456789';
        if (includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

        if (!charset) charset = 'abcdefghijklmnopqrstuvwxyz0123456789';

        const randomValues = new Uint32Array(length);
        crypto.getRandomValues(randomValues);

        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset[randomValues[i] % charset.length];
        }
        return password;
    }
};

window.AppCrypto = AppCrypto;
