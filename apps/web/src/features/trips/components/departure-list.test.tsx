/**
 * La liste des départs d'un site, montée par la route `/` sur la fausse API : un trajet complet
 * est marqué comme tel et ne se réserve pas ; un trajet qui a des places se réserve.
 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderRoute } from '@/test/utils';

async function departuresOf(site: 'dakar' | 'diamniadio', label: string) {
  await renderRoute({ initialEntries: [`/?site=${site}`] });
  return screen.findByRole('list', { name: `Départs vers ${label}` });
}

describe('DepartureList', () => {
  it('005-AS3: marks a full trip and offers no booking', async () => {
    const list = await departuresOf('dakar', 'Dakar');

    const full = within(list).getByRole('listitem');
    expect(within(full).getByRole('heading', { name: 'Yoff → Dakar' })).toBeInTheDocument();
    expect(full).toHaveTextContent('Complet');
    expect(full).not.toHaveTextContent('0 places restantes');
    expect(within(full).queryByRole('button', { name: /Réserver/ })).not.toBeInTheDocument();
  });

  it('005-AS3: offers to book a trip that still has seats', async () => {
    const list = await departuresOf('diamniadio', 'Diamniadio');

    const [pikine] = within(list).getAllByRole('listitem');
    expect(pikine).not.toHaveTextContent('Complet');
    expect(
      within(pikine!).getByRole('button', { name: 'Réserver une place depuis Pikine' }),
    ).toBeEnabled();
  });

  it('005-AS3: turns Réserver into Annuler while the form is open', async () => {
    const user = userEvent.setup();
    const list = await departuresOf('diamniadio', 'Diamniadio');
    const [pikine] = within(list).getAllByRole('listitem');
    if (!pikine) throw new Error('no departure');

    const book = within(pikine).getByRole('button', { name: 'Réserver une place depuis Pikine' });
    expect(book).toHaveAttribute('aria-expanded', 'false');
    await user.click(book);

    const cancel = within(pikine).getByRole('button', {
      name: 'Annuler : ne pas réserver depuis Pikine',
    });
    expect(cancel).toHaveTextContent('Annuler');
    expect(cancel).toHaveAttribute('aria-expanded', 'true');
    expect(
      within(pikine).getByRole('form', { name: 'Réserver depuis Pikine' }),
    ).toBeInTheDocument();

    await user.click(cancel);
    expect(within(pikine).queryByRole('form')).not.toBeInTheDocument();
    expect(
      within(pikine).getByRole('button', { name: 'Réserver une place depuis Pikine' }),
    ).toHaveTextContent('Réserver');
  });
});
