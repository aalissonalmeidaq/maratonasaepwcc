import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Ícones do PWA rasterizados a partir do símbolo oficial (sem redesenho).
// Regenerar com: npx pwa-assets-generator
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#FFFFFF' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#FFFFFF' } },
  },
  images: ['public/favicon.svg'],
});
