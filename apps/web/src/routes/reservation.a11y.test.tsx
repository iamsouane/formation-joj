/**
 * La page de la réservation auditée par axe-core dans ses deux états : le code à saisir, puis le
 * billet. Le contraste se vérifie dans un navigateur (`test/axe.ts`). Quand le formulaire laisse
 * place au billet, le focus le suit : sans cela, il retomberait au début de la page.
 */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axeFindings, runAxe } from '@/test/axe';
import { renderRoute } from '@/test/utils';

describe('booking page accessibility', () => {
  it('007-AS1: the code form and the ticket are clean', async () => {
    const user = userEvent.setup();
    await renderRoute({ initialEntries: ['/reservation'] });
    expect(axeFindings(await runAxe())).toEqual([]);

    // « fatou-booking » : la réservation que la fausse API garde d'origine.
    await user.type(screen.getByLabelText('Votre code de réservation'), 'fatou-booking');
    await user.click(screen.getByRole('button', { name: 'Voir ma réservation' }));
    await screen.findByRole('region', { name: 'Votre billet' });

    // Le bouton « Voir ma réservation » a disparu : le focus passe au billet, lu en premier.
    expect(screen.getByRole('heading', { name: 'Votre billet' })).toHaveFocus();
    expect(axeFindings(await runAxe())).toEqual([]);
  });
});
