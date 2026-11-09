/**
 * La page du lien de gestion auditée par axe-core dans chacun de ses états : le trajet et le code
 * à saisir, la confirmation ouverte, puis le trajet annulé. Le contraste se vérifie dans un
 * navigateur (`test/axe.ts`). Quand le bouton d'annulation disparaît, le focus passe au trajet.
 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { pikineToDiamniadio } from '@/mocks/fixture';
import { axeFindings, runAxe } from '@/test/axe';
import { renderRoute } from '@/test/utils';

describe('management page accessibility', () => {
  it('007-AS5: the management page is clean', async () => {
    const user = userEvent.setup();
    await renderRoute({ initialEntries: [`/trajets/${pikineToDiamniadio.id}/gestion`] });
    const trip = await screen.findByRole('region', { name: 'Votre trajet' });
    expect(axeFindings(await runAxe())).toEqual([]);

    await user.type(
      within(trip).getByLabelText('Votre code de gestion'),
      pikineToDiamniadio.managementCode,
    );
    await user.click(within(trip).getByRole('button', { name: 'Annuler mon trajet' }));
    const confirmation = await screen.findByRole('alertdialog', { name: 'Annuler votre trajet ?' });
    expect(axeFindings(await runAxe())).toEqual([]);

    await user.click(within(confirmation).getByRole('button', { name: 'Oui, annuler' }));
    await within(trip).findByText('Votre trajet est annulé');

    // Le bouton « Annuler mon trajet » a disparu : le focus passe au trajet, lu en premier.
    expect(screen.getByRole('heading', { name: 'Votre trajet' })).toHaveFocus();
    expect(axeFindings(await runAxe())).toEqual([]);
  });
});
