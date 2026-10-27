import type { ImageSourcePropType } from 'react-native'
import type { RankTier } from '@lpp/shared'
import iron from '../../assets/ranked-emblem/emblem-iron.png'
import bronze from '../../assets/ranked-emblem/emblem-bronze.png'
import silver from '../../assets/ranked-emblem/emblem-silver.png'
import gold from '../../assets/ranked-emblem/emblem-gold.png'
import platinum from '../../assets/ranked-emblem/emblem-platinum.png'
import emerald from '../../assets/ranked-emblem/emblem-emerald.png'
import diamond from '../../assets/ranked-emblem/emblem-diamond.png'
import master from '../../assets/ranked-emblem/emblem-master.png'
import unranked from '../../assets/ranked-emblem/emblem-unraked.png'

/** Riot's ranked emblems (the same PNGs the owner used in RiftLens), one per ladder step. */
export const RANK_EMBLEM: Record<RankTier, ImageSourcePropType> = {
  Iron: iron,
  Bronze: bronze,
  Silver: silver,
  Gold: gold,
  Platinum: platinum,
  Emerald: emerald,
  Diamond: diamond,
  'Master+': master,
}

/** Shown while the account has no Solo/Duo entry yet. */
export const UNRANKED_EMBLEM: ImageSourcePropType = unranked
