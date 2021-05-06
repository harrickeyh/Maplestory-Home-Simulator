import { withTranslation } from '@i18n'

/* store */
import { useDispatch } from '@store'
import { CHANGE_ACTIVE_FURNITURE } from '@store/active-furniture'

/* components */
import DetailPopover from './detail-popover'

import styles from './item.scss'

const Item = ({ t, id }) => {
  const dispatch = useDispatch()
  const handleClick = () => {
    dispatch({ type: CHANGE_ACTIVE_FURNITURE, payload: id })
  }
  return (
    <div className={styles['item']}>
      <DetailPopover id={id} />
      <img
        src={`/furniture/Item-Consume-0267.img-${id}-info-icon.png`}
        onClick={handleClick}
        alt=""
      />
    </div>
  )
}

Item.getInitialProps = async () => ({
  namespacesRequired: ['index'],
})

export default withTranslation('index')(Item)
