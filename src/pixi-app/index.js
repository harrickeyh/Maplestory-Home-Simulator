/* components */
import {
  Application,
  Container,
  AnimatedSprite,
  Sprite,
  Rectangle,
  Graphics,
  Point,
} from 'pixi.js-legacy'
import { Viewport } from 'pixi-viewport'
import PixiLoaderManager from './pixi-loader-manager'
import MapObject from './map-object'
import MapBack from './map-back'
import Minimap from './minimap'
import Furniture from './furniture'

/* utils */
import isClient from '@utils/is-client'
import {
  add,
  assoc,
  clone,
  evolve,
  filter,
  flatten,
  keys,
  map,
  path,
  pick,
  pickBy,
  pipe,
  prop,
  tap,
  times,
  toPairs,
  uniq,
  values,
} from 'ramda'
import { entries } from '@utils/ramda'
import { GRID_WIDTH } from './constant'

/* mapping */
import MapTheme from '@mapping/map-theme'
import MapObjectMapping from '@mapping/map-object'
import Maps from '@mapping/map'

const getMapObjects = pipe(
  // filter non obj or null obj
  pickBy((val, key) => !Number.isNaN(+key) && val && val.obj),
  toPairs,
  // flatten obj
  map(([layer, data]) =>
    pipe(prop('obj'), values, map(assoc('layer', layer)))(data)
  ),
  values,
  flatten
)

const HF_HEIGHT = 180
const fakeTheme = 's1'
const defaultTheme = '0'

class PixiAPP {
  constructor(canvasRef) {
    this.canvas = {
      width: window.innerWidth,
      height: window.innerHeight - HF_HEIGHT,
    }
    this.app = new Application({
      width: this.canvas.width,
      height: this.canvas.height,
      transparent: true,
      view: canvasRef,
      antialias: true,
    })
    this.showGrid = true
    this.app.layers = {}

    this.viewZoom = 1
  }
  /**
   * @param {string} selectId
   */
  changeHomeMap(selectId) {
    this.selectedMapTheme = MapTheme[selectId]
    if (this.mapId === this.selectedMapTheme.templateMapID) return

    this.clearMap()
    this.mapId = this.selectedMapTheme.templateMapID
    this.mapData = Maps[this.mapId]
    this.defaultTheme = '0'

    /* initial map infomation */
    this.edge = pipe(
      pick(['VRTop', 'VRRight', 'VRBottom', 'VRLeft']),
      ({ VRTop: top, VRRight: right, VRBottom: bottom, VRLeft: left }) => ({
        top,
        right,
        bottom,
        left,
      }),
      map(Number)
    )(this.mapData.info)
    this.center = {
      x: +this.mapData.miniMap.centerX || Math.abs(this.edge.left),
      y: +this.mapData.miniMap.centerY || Math.abs(this.edge.top),
    }
    this.world = {
      width:
        +this.mapData.miniMap.width ||
        Math.abs(this.edge.right) + Math.abs(this.edge.left),
      height:
        +this.mapData.miniMap.height ||
        Math.abs(this.edge.top) + Math.abs(this.edge.bottom),
    }

    this.viewport = new Viewport({
      screenWidth: this.canvas.width,
      screenHeight: this.canvas.height,
      worldWidth: this.world.width,
      worldHeight: this.world.height,
      interaction: this.app.renderer.plugins.interaction,
      divWheel: this.app.view,
    })
    const maxZoomWidthScale = this.world.width / this.canvas.width
    const maxZoomHeightScale = this.world.height / this.canvas.height
    const maxZoomScale = Math.max(maxZoomWidthScale, maxZoomHeightScale)
    // limit zoom range
    this.viewport
      .clampZoom({
        maxWidth: this.canvas.width * maxZoomScale,
      })
      .clamp({
        left: this.edge.left,
        top: this.edge.top,
        right: this.edge.right,
        bottom: this.edge.bottom,
        direction: 'all',
      })
      .moveCenter(this.center)
      .drag()
      .pinch()
      .wheel()
      .setZoom(Math.min(maxZoomScale, this.viewZoom))
      .on('moved', this.setVisibleRect)
      .on('zoomed-end', (event) => {
        this.viewZoom = event.lastViewport.scaleX
      })

    this.setVisibleRect()

    // binding destory event
    this.app.renderer.runners['destroy'].add({
      destroy: this.viewport.destroy.bind(this.viewport),
    })
    this.app.stage.addChild(this.viewport)

    /* start render */
    this.renderMap()
  }
  setVisibleRect = () => {
    this.visibleRect = this.viewport.getVisibleBounds()
    this.$minimap && this.$minimap.update()
  }
  createLayer(index) {
    if (this.app.layers[index]) return
    const layer = new Container()
    layer.sortableChildren = true
    layer.zIndex = +index
    this.app.layers[index] = layer
    this.$map.addChild(this.app.layers[index])
  }
  toggleGrid() {
    this.showGrid = !this.showGrid
    this.renderGrid()
  }
  clearMap() {
    // clear task
    this.app.loaderManager && this.app.loaderManager.reset()
    // create new loader
    this.app.loaderManager = new PixiLoaderManager(this.app)
    this.viewport && this.app.stage.removeChild(this.viewport)
    this.$minimap && this.app.stage.removeChild(this.$minimap)
    this.$gridLayer = null
    this.app.layers = {}
  }
  renderMap() {
    this.$map = new Container()
    this.$map.position.set(this.center.x, this.center.y)
    this.$map.sortableChildren = true
    this.viewport.addChild(this.$map)

    this.renderMask()
    this.renderBack()
    this.renderObject()
    this.renderGrid()

    this.$minimap = new Minimap(this)
    this.$minimap.renderMinimap(300)
    this.app.stage.addChild(this.$minimap)

    /* test furniture */
    const test = new Furniture(this, { id: '02672024' })
  }
  applyHomeTheme(themes) {
    entries(([key, value]) => {
      const themeType = +value === 0 ? value : `s${value}`
      this.changeHomeTheme(key, themeType)
    }, themes)
  }
  changeHomeTheme(objectType, theme) {
    if (!this.homeObject[objectType]) return
    const objects = values(this.homeObject[objectType])
    objects.forEach((object) => object.changeTheme(theme))
  }
  renderObject() {
    const allHomeObject = getMapObjects(this.mapData).map(
      (objectData) => new MapObject(this.app, objectData)
    )
    this.homeObject = allHomeObject.reduce((homeObjects, objects) => {
      const objectType = objects.objectType
      if (!homeObjects[objectType]) {
        homeObjects[objectType] = {}
      }
      homeObjects[objectType][objects.objectIndex] = objects
      return homeObjects
    }, {})
    allHomeObject.forEach((obj) => {
      !this.app.layers[obj.layer] && this.createLayer(obj.layer)
      obj.render()
    })
  }
  renderBack() {
    const backLayer = new Container()
    const frontLayer = new Container()
    backLayer.sortableChildren = true
    backLayer.zIndex = -1
    frontLayer.sortableChildren = true
    frontLayer.zIndex = 9999
    this.app.layers.back = backLayer
    this.app.layers.front = frontLayer
    this.$map.addChild(this.app.layers.back, this.app.layers.front)
    const allMapBack = Object.values(this.mapData.back).map(
      (backData, index) => new MapBack(this, backData, index)
    )
    allMapBack.forEach((back) => back.render())
  }
  renderGrid() {
    if (this.$gridLayer) {
      this.$gridLayer.alpha = +this.showGrid
    } else {
      this.$gridLayer = new Container()
      this.$gridLayer.zIndex = 999
      this.$map.addChild(this.$gridLayer)
      this.gridPlaced = {}
      this.gridPoints = {}

      /* house grid */
      entries(([key, grids]) => {
        const wellKey = `${key}-well`
        this.gridPlaced[wellKey] = []
        this.gridPlaced[key] = []
        this.gridPoints[key] = {}
        const gridLine = new Graphics()
        gridLine.lineStyle(2, 0x333333, 0.5)
        gridLine.zIndex = 990
        const row = +grids.row
        const col = +grids.col
        const startX = +grids.left
        const startY = +grids.top
        const endX = startX + col * GRID_WIDTH
        const endY = startY + row * GRID_WIDTH
        gridLine.moveTo(startX, startY)
        gridLine.lineTo(endX, startY)
        gridLine.moveTo(startX, startY)
        gridLine.lineTo(startX, endY)
        times((index) => {
          this.gridPlaced[wellKey].push([])
          this.gridPlaced[key].push([])
          const currentX = startX + (index + 1) * GRID_WIDTH
          gridLine.moveTo(currentX, startY)
          gridLine.lineTo(currentX, endY)
        }, col)
        times((index) => {
          const currentY = startY + (index + 1) * GRID_WIDTH
          gridLine.moveTo(startX, currentY)
          gridLine.lineTo(endX, currentY)
          times((x) => {
            this.gridPlaced[wellKey][x][index] = 0
            this.gridPlaced[key][x][index] = 0
            this.gridPoints[key][`${x},${index}`] = new Point(
              startX + x * GRID_WIDTH,
              startY + index * GRID_WIDTH
            )
          }, col)
        }, row)
        this.$gridLayer.addChild(gridLine)

        /* set disabled */
        grids.disabled &&
          keys(grids.disabled).forEach((position) => {
            const [x, y] = position.split(',').map(Number)
            this.gridPlaced[wellKey][x][y] = 1
            this.gridPlaced[key][x][y] = 1
            gridLine.beginFill(0xff0000, 0.3)
            gridLine.drawRect(
              startX + x * GRID_WIDTH,
              startY + y * GRID_WIDTH,
              GRID_WIDTH,
              GRID_WIDTH
            )
            gridLine.endFill()
          })
      }, this.mapData.housingGrid)
    }
  }
  renderMask() {
    const mask = new Graphics()
    mask.beginFill(0xffffff)
    mask.moveTo(this.edge.left, this.edge.top)
    mask.lineTo(this.edge.right, this.edge.top)
    mask.lineTo(this.edge.right, this.edge.bottom)
    mask.lineTo(this.edge.left, this.edge.bottom)
    mask.lineTo(this.edge.left, this.edge.top)
    mask.endFill()
    this.$map.addChild(mask)
    this.$map.mask = mask
  }

  destory() {
    this.app.stop()
    this.app.destroy()
  }
}

export default PixiAPP
