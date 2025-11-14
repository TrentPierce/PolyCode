const { app } = require('electron');
const fs = require('fs');
const path = require('path');

/**
 * Settings Manager - Handles persistent application settings
 */
class SettingsManager {
  constructor() {
    this.settingsPath = path.join(app.getPath('userData'), 'settings.json');
    this.defaultSettings = {
      lmstudioUrl: 'http://localhost:1234',
      autoConnect: true,
      timeout: 120000,
      selectedModels: [] // Array of model IDs to use
    };
    this.settings = this.loadSettings();
  }

  /**
   * Load settings from disk or return defaults
   */
  loadSettings() {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf8');
        const loaded = JSON.parse(data);
        // Merge with defaults to ensure all settings exist
        return { ...this.defaultSettings, ...loaded };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    return { ...this.defaultSettings };
  }

  /**
   * Save settings to disk
   */
  saveSettings(newSettings) {
    try {
      this.settings = { ...this.settings, ...newSettings };
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf8');
      return { success: true };
    } catch (error) {
      console.error('Failed to save settings:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get a specific setting
   */
  getSetting(key) {
    return this.settings[key] ?? this.defaultSettings[key];
  }

  /**
   * Get all settings
   */
  getAllSettings() {
    return { ...this.settings };
  }

  /**
   * Reset settings to defaults
   */
  resetSettings() {
    this.settings = { ...this.defaultSettings };
    return this.saveSettings({});
  }
}

module.exports = { SettingsManager };

