// modules/configHelper.js
const fs = require('fs');
const path = require('path');

// Cache config để tránh đọc file nhiều lần
let cachedConfig = null;
let lastLoadTime = 0;
const CACHE_DURATION = 5000; // 5 giây

function loadConfig() {
  const now = Date.now();
  if (cachedConfig && (now - lastLoadTime) < CACHE_DURATION) {
    return cachedConfig;
  }
  
  try {
    const configPath = path.join(__dirname, '..', 'configs.json');
    if (fs.existsSync(configPath)) {
      cachedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      lastLoadTime = now;
      console.log("✅ Đã load configs từ configs.json");
      return cachedConfig;
    } else {
      console.error('❌ Không tìm thấy configs.json tại:', configPath);
    }
  } catch (error) {
    console.error('❌ Lỗi khi load configs.json:', error.message);
  }
  return {};
}

function getGuildConfig(guildId) {
  const config = loadConfig();
  return config[guildId] || null;
}

function reloadConfig() {
  cachedConfig = null;
  lastLoadTime = 0;
  return loadConfig();
}

module.exports = { getGuildConfig, reloadConfig, loadConfig };