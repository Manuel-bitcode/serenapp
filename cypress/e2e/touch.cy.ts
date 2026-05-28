/* Verificación visual de las 4 experiencias de "Siente" (RF1).
 * Se fuerza cada variante con ?v= y se captura una pantalla.
 */
const VARIANTS = ['bubbles', 'sand', 'particles', 'constellation'] as const;

describe('Siente — experiencias táctiles', () => {
  VARIANTS.forEach((v) => {
    it(`renderiza: ${v}`, () => {
      cy.visit(`/touch?v=${v}`);
      cy.get('canvas.touch-canvas').should('be.visible');
      // matter.js (burbujas) se importa de forma diferida: dar tiempo a pintar.
      cy.wait(1800);
      // Un gesto de arrastre para que arena/constelación muestren contenido.
      cy.get('canvas.touch-canvas')
        .trigger('pointerdown', 180, 360, { pointerId: 1, buttons: 1, pointerType: 'touch' })
        .trigger('pointermove', 220, 420, { pointerId: 1, buttons: 1, pointerType: 'touch' })
        .trigger('pointermove', 280, 480, { pointerId: 1, buttons: 1, pointerType: 'touch' })
        .trigger('pointermove', 320, 520, { pointerId: 1, buttons: 1, pointerType: 'touch' })
        .trigger('pointerup', 320, 520, { pointerId: 1, pointerType: 'touch' });
      cy.wait(700);
      cy.screenshot(`touch-${v}`, { overwrite: true });
    });
  });
});
