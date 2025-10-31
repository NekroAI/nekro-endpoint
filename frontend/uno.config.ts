import { defineConfig, presetUno, presetIcons } from "unocss";

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({
      scale: 1.2,
      warn: true,
    }),
  ],
  // UnoCSS a11y properties are not supported by MUI, so we disable them.
  // https://github.com/unocss/unocss/issues/2103
  configDeps: ["./uno.config.ts"],
  blocklist: ["sr-only"],
});
