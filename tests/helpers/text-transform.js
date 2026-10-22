// Mirrors the build-time `.hbs` text loader for jest.
module.exports = {
  process(sourceText) {
    return {
      code: `module.exports = { __esModule: true, default: ${JSON.stringify(sourceText)} };`,
    };
  },
};
