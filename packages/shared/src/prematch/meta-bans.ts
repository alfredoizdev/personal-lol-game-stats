/**
 * Meta ban list (option 1, owner 2026-10-23): a curated list per role kept in
 * the repo and updated by hand each patch. Shown with its `updatedOn` date so
 * the player knows how fresh it is. Not Riot data; not the player's own data.
 * Champion ids are Data Dragon keys.
 */
import type { Role } from '../match-v5'

export type MetaBan = { championId: number; championName: string }

export const META_BANS: { updatedOn: string; byRole: Record<Role, MetaBan[]> } = {
  updatedOn: '2026-10-23',
  byRole: {
    TOP: [
      { championId: 122, championName: 'Darius' },
      { championId: 86, championName: 'Garen' },
      { championId: 82, championName: 'Mordekaiser' },
      { championId: 164, championName: 'Camille' },
      { championId: 24, championName: 'Jax' },
    ],
    JUNGLE: [
      { championId: 64, championName: 'Lee Sin' },
      { championId: 121, championName: "Kha'Zix" },
      { championId: 234, championName: 'Viego' },
      { championId: 104, championName: 'Graves' },
      { championId: 56, championName: 'Nocturne' },
    ],
    MIDDLE: [
      { championId: 157, championName: 'Yasuo' },
      { championId: 238, championName: 'Zed' },
      { championId: 103, championName: 'Ahri' },
      { championId: 55, championName: 'Katarina' },
      { championId: 517, championName: 'Sylas' },
    ],
    BOTTOM: [
      { championId: 222, championName: 'Jinx' },
      { championId: 145, championName: "Kai'Sa" },
      { championId: 51, championName: 'Caitlyn' },
      { championId: 81, championName: 'Ezreal' },
      { championId: 119, championName: 'Draven' },
    ],
    UTILITY: [
      { championId: 412, championName: 'Thresh' },
      { championId: 53, championName: 'Blitzcrank' },
      { championId: 117, championName: 'Lulu' },
      { championId: 111, championName: 'Nautilus' },
      { championId: 555, championName: 'Pyke' },
    ],
  },
}

export function metaBansFor(role: Role): MetaBan[] {
  return META_BANS.byRole[role]
}
