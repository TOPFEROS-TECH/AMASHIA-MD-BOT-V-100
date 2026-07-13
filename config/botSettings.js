/**
 * Bot Settings Configuration
 * Jere paramèt bot la (non, statut, proteksyon, etc)
 */

const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = './config/botSettings.json';

// Settings par defò
const defaultSettings = {
    botName: '🤖 AMASHIA MD',
    botVersion: '1.0.0',
    enabled: true,
    antiSpam: {
        enabled: true,
        maxMessagesPerMinute: 5,
        muteTime: 300000 // 5 minutes
    },
    antiBain: {
        enabled: true,
        blockedUsers: [],
        blockedGroups: []
    },
    welcome: {
        enabled: true,
        imageUrl: 'https://via.placeholder.com/800x400?text=SUCCESS+%26+STYLE'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
};

/**
 * Charge settings yo
 * @returns {object} Settings object
 */
function loadSettings() {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Erè pou charge settings:', error);
    }
    return defaultSettings;
}

/**
 * Sove settings yo
 * @param {object} settings - Settings pou sove
 */
function saveSettings(settings) {
    try {
        settings.updatedAt = new Date().toISOString();
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
        console.log('✅ Settings saved');
        return settings;
    } catch (error) {
        console.error('Erè pou sove settings:', error);
        throw error;
    }
}

/**
 * Update bot name
 * @param {string} newName - Nouvo non bot la
 */
function updateBotName(newName) {
    const settings = loadSettings();
    settings.botName = newName;
    return saveSettings(settings);
}

/**
 * Toggle bot ON/OFF
 * @param {boolean} status - Activate oswa deactivate
 */
function toggleBot(status) {
    const settings = loadSettings();
    settings.enabled = status;
    return saveSettings(settings);
}

/**
 * Toggle anti-spam
 * @param {boolean} status - Activate oswa deactivate
 */
function toggleAntiSpam(status) {
    const settings = loadSettings();
    settings.antiSpam.enabled = status;
    return saveSettings(settings);
}

/**
 * Toggle anti-bain
 * @param {boolean} status - Activate oswa deactivate
 */
function toggleAntiBain(status) {
    const settings = loadSettings();
    settings.antiBain.enabled = status;
    return saveSettings(settings);
}

/**
 * Ajoute moun nan blocked list
 * @param {string} userId - WhatsApp user ID
 * @param {string} reason - Rezon yo bloke li
 */
function blockUser(userId, reason) {
    const settings = loadSettings();
    settings.antiBain.blockedUsers.push({
        userId,
        reason,
        blockedAt: new Date().toISOString()
    });
    return saveSettings(settings);
}

/**
 * Retire moun nan blocked list
 * @param {string} userId - WhatsApp user ID
 */
function unblockUser(userId) {
    const settings = loadSettings();
    settings.antiBain.blockedUsers = settings.antiBain.blockedUsers.filter(
        u => u.userId !== userId
    );
    return saveSettings(settings);
}

/**
 * Check si moun bloke
 * @param {string} userId - WhatsApp user ID
 */
function isUserBlocked(userId) {
    const settings = loadSettings();
    return settings.antiBain.blockedUsers.some(u => u.userId === userId);
}

/**
 * Get tou settings yo
 */
function getSettings() {
    return loadSettings();
}

/**
 * Reset settings to default
 */
function resetSettings() {
    return saveSettings(JSON.parse(JSON.stringify(defaultSettings)));
}

// Initialize settings file si li pa egziste
if (!fs.existsSync(SETTINGS_FILE)) {
    saveSettings(defaultSettings);
}

module.exports = {
    getSettings,
    loadSettings,
    saveSettings,
    updateBotName,
    toggleBot,
    toggleAntiSpam,
    toggleAntiBain,
    blockUser,
    unblockUser,
    isUserBlocked,
    resetSettings
};
