import { useEffect, createRef, useRef, memo } from 'react'

/* store */
import { useStore } from '@store'
import { INIT_APP_REF } from '@store/app'
import { CLEAR_ACTIVE_FURNITURE } from '@store/active-furniture'
import {
  HOUSE_INITIAL,
  HOUSE_UPDATE_FURNITURE,
  HOUSE_UPDATE_FURNITURE_INDEX,
  HOUSE_DELETE_FURNITURE,
} from '@store/house'
import {
  ENTER_EDIT,
  EXIT_EDIT,
  UPDATE_ZOOM_RANGE,
  UPDATE_ZOOM_VALUE,
} from '@store/meta'

/* components */
import PixiAPP from '../../pixi-app'

/* uitls */
import { pickAll } from 'ramda'
import HomeModule from '@modules/home'

const canvasRef = createRef()
const appRef = createRef()

const ESC_KEY_CODE = 27
const DELETE_KEY_CODE = 46

let _isInit = false

const Home = ({ zoom }) => {
  const [currentIndex, dispatch] = useStore('house.current')
  const [edit] = useStore('meta.edit')
  const [currentHomeData] = useStore(`house.houses.${currentIndex}`)
  const [activeFurnitureID] = useStore('active-furniture')
  const [sideIsOpen] = useStore('meta.side.open')
  const handleEsc = () => {
    if (appRef.current?.activeFurniture) {
      appRef.current.activeFurniture.cancelDrag()
    } else {
      dispatch({ type: EXIT_EDIT })
    }
  }
  const handleDelete = () => appRef.current?.activeFurniture?.handleDelete()
  const onKeydown = ({ keyCode }) => {
    switch (keyCode) {
      case ESC_KEY_CODE:
        handleEsc()
        break
      case DELETE_KEY_CODE:
        handleDelete()
        break
    }
  }
  const onCancelFurniture = () => {
    dispatch({ type: CLEAR_ACTIVE_FURNITURE })
  }
  const onUpdateFurniture = (furniture) => {
    dispatch({
      type: HOUSE_UPDATE_FURNITURE,
      payload: pickAll(['id', 'furnitureID', 'position', 'flip'], furniture),
    })
  }
  const onUpdateFurnitureZindex = (payload) => {
    dispatch({
      type: HOUSE_UPDATE_FURNITURE_INDEX,
      payload: payload,
    })
  }
  const onDeleteFurniture = (furniture) => {
    dispatch({ type: HOUSE_DELETE_FURNITURE, payload: furniture.id })
  }
  const onZoom = (zoom) => {
    dispatch({ type: UPDATE_ZOOM_VALUE, payload: zoom })
  }
  const onZoomRange = (min, max) => {
    dispatch({ type: UPDATE_ZOOM_RANGE, payload: { min, max } })
  }
  useEffect(() => {
    if (canvasRef.current) {
      appRef.current = new PixiAPP(canvasRef.current)
      dispatch({ type: INIT_APP_REF, payload: appRef })
      appRef.current.event.addListener('furnitureUpdate', onUpdateFurniture)
      appRef.current.event.addListener('furnitureDelete', onDeleteFurniture)
      appRef.current.event.addListener(
        'furnitureCancelPlace',
        onCancelFurniture
      )
      appRef.current.event.addListener('zoom', onZoom)
      appRef.current.event.addListener('zoomRange', onZoomRange)
      appRef.current.event.addListener('zIndexUpdate', onUpdateFurnitureZindex)
      window.addEventListener('keydown', onKeydown)
    }
    return () => {
      appRef.current && appRef.current.destroy()
      window.removeEventListener('keydown', onKeydown)
    }
  }, [])
  useEffect(() => {
    const app = appRef.current
    if (app) {
      let _data = currentHomeData
      const _localData = window.localStorage.getItem('HOUSE_SIMULATOR_houses')
      const localData =
        _localData && JSON.parse(_localData)[0]
          ? JSON.parse(_localData)
          : [new HomeModule('017')]
      if (!_isInit && localData && localData[0]) {
        dispatch({ type: HOUSE_INITIAL, payload: localData })
        _data = localData[0]
      }
      if (_data) {
        app.changeHomeMap(_data.selectId)
        app.applyHomeTheme(_data.theme)
        !_isInit && app.initialFurniture(_data.furnitures)

        _isInit = true
      }
    }
  }, [appRef.current, currentHomeData])

  useEffect(() => {
    const app = appRef.current
    if (app) {
      app.isEdit = edit
    }
  }, [appRef.current, edit])
  useEffect(() => {
    const app = appRef.current
    if (app) {
      app.zoom = zoom
    }
  }, [appRef.current, zoom])
  useEffect(() => {
    const app = appRef.current
    if (app && activeFurnitureID) {
      dispatch({ type: ENTER_EDIT })
      app.placeNewFurniture(activeFurnitureID)
    }
  }, [appRef.current, activeFurnitureID])
  useEffect(() => {
    const app = appRef.current
    if (app) {
      const sideWidth = Math.min(window.innerWidth - 30, 300)
      app.updateAPPWidth(window.innerWidth - (sideIsOpen ? sideWidth : 0))
    }
  }, [appRef.current, sideIsOpen])

  return (
    <canvas
      ref={canvasRef}
      style={{ userSelect: 'none', backgroundColor: '#000' }}
    />
  )
}

export default memo(Home)
