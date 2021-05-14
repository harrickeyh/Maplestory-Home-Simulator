import { memo } from 'react'

/* store */
import { useStore } from '@store'
import { UPDATE_ZOOM_VALUE } from '@store/meta'

/* component */
import { Slider } from 'antd'

const sliderContainerStyle = {
  position: 'absolute',
  bottom: 0,
  right: 40,
  width: '30%',
}

const ZoomSlider = ({ setZoom }) => {
  const [{ value, min, max }, dispatch] = useStore('meta.zoom')
  const marks = {
    [min]: '',
    1: '',
    [max]: '',
  }
  const handleChange = (value) => {
    setZoom(value)
    dispatch({ type: UPDATE_ZOOM_VALUE, payload: value })
  }
  return (
    <div style={sliderContainerStyle}>
      <Slider
        min={min}
        max={max}
        marks={marks}
        step={0.01}
        value={value}
        onChange={handleChange}
        tooltipVisible={false}
      />
    </div>
  )
}

export default memo(ZoomSlider)
