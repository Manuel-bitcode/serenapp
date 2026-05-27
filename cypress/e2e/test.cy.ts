describe('SerenApp smoke', () => {
  it('arranca en el onboarding y navega entre los slides', () => {
    cy.visit('/');

    // Primer inicio (sin perfil): la app redirige al onboarding (RNF4).
    cy.contains('ion-content', 'Siente con tus manos');
    cy.screenshot('01-onboarding-siente', { overwrite: true });

    cy.contains('ion-button', 'Siguiente').click();
    cy.contains('ion-content', 'Captura tu sentir');
    cy.screenshot('02-onboarding-captura', { overwrite: true });

    cy.contains('ion-button', 'Siguiente').click();
    cy.contains('ion-content', 'Escribe lo que sientes');

    cy.contains('ion-button', 'Siguiente').click();
    // Paso de captura del nombre local (RF7).
    cy.contains('ion-content', '¿Cómo te llamas?');
    cy.screenshot('03-onboarding-nombre', { overwrite: true });
  });
});
