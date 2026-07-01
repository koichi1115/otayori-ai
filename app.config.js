const appJson = require('./app.json');

const config = { ...appJson.expo };
config.extra = {
  ...config.extra,
  claudeApiKey: process.env.CLAUDE_API_KEY || '',
};

module.exports = { expo: config };
