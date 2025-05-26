module.exports = {
  testEnvironment: "node",
  moduleFileExtensions: ["js", "json", "node"],
  transform: {},
  moduleNameMapper: {
    "^redis$": "<rootDir>/__mocks__/redis.js",
  },
};
