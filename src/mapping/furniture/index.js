import { omit } from 'ramda'
import Furnitures from './0267.img.json'

const NeedFilter = [
  '02671001',
  '02671002',
  '02671020',
  '02671021',
  '02671022',
  '02671023',
  '02671024',
  '02671025',
  '02671026',
  '02671027',
  '02671028',
  '02671029',
  '02671030',
  '02671031',
  '02671032',
  '02671033',
  '02671034',
  '02671035',
  '02671036',
  '02671037',
  '02671091',
  '02672002',
  '02672003',
  '02672012',
  '02672013',
  '02672014',
  '02672015',
  '02672016',
  '02672019',
  '02672020',
  '02672021',
  '02672025',
  '02672026',
  '02672027',
  '02672057',
]

export const filteredFurniture = omit(NeedFilter, Furnitures)

export default Furnitures
