describe('SerenApp smoke', () => {
  it('arranca en el onboarding en el primer inicio', () => {
    cy.visit('/');
    // En el primer inicio (sin perfil) la app redirige al onboarding.
    cy.contains('ion-content', 'Siente con tus manos');
  });
});
