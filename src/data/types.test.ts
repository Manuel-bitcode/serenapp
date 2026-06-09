import {
  EMOTIONS,
  WRITING_PROMPTS,
  TOUCH_VARIANTS,
  emotionByTag,
  touchVariantLabel,
  type EmotionTag,
} from './types';

describe('catálogos de datos', () => {
  it('ofrece al menos 6 etiquetas emocionales', () => {
    expect(EMOTIONS.length).toBeGreaterThanOrEqual(6);
  });

  it('las etiquetas tienen tag únicos y label/emoji presentes', () => {
    const tags = EMOTIONS.map((e) => e.tag);
    expect(new Set(tags).size).toBe(tags.length);
    EMOTIONS.forEach((e) => {
      expect(e.label).toBeTruthy();
      expect(e.emoji).toBeTruthy();
    });
  });

  it('el banco tiene al menos 5 preguntas rotativas', () => {
    expect(WRITING_PROMPTS.length).toBeGreaterThanOrEqual(5);
  });

  it('variantes táctiles (burbujas/partículas), todas con etiqueta', () => {
    expect(TOUCH_VARIANTS).toEqual(['bubbles', 'particles']);
    TOUCH_VARIANTS.forEach((v) => expect(touchVariantLabel[v]).toBeTruthy());
  });

  it('emotionByTag resuelve una etiqueta válida y cae a un fallback', () => {
    expect(emotionByTag('calma').label).toBe('Calma');
    expect(emotionByTag('inexistente' as EmotionTag).tag).toBeDefined();
  });
});
