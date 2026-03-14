module.exports = function (api) {
  api.cache(true);
  const isProduction = api.env("production") || process.env.NODE_ENV === "production";
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "nativewind/babel",
      "react-native-reanimated/plugin", // 개발 빌드 사용 시 활성화
      // SEC-M2: 프로덕션 빌드에서 console.* 제거 (console.error는 유지)
      ...(isProduction ? [["transform-remove-console", { exclude: ["error"] }]] : []),
    ],
  };
};
