'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { CharacterLook, TierLook } from './tiers'

// Modelo "RobotExpressive" — Tomás Laulhé (Quaternius), CC0 1.0. Ver public/models/LICENSE.md
const MODEL_URL = '/models/RobotExpressive.glb'
const TINTED_MATERIAL = 'Main'
const FRAME_MS = 1000 / 30
const MODEL_HEIGHT = 2

interface Props {
  look: CharacterLook
  /** Muda a cada ganho de XP → o personagem comemora */
  gainCount: number
  /** Muda a cada subida de nível → o personagem acena */
  levelUpCount: number
  /** Muda quando o usuário escolhe uma comemoração → o personagem a mostra */
  celebrationCount: number
  /** Chamado quando o modelo terminou de carregar e já está na tela */
  onReady: () => void
  /** Chamado se o 3D não puder ser exibido (o card volta para o 2D) */
  onError: () => void
}

interface SceneApi {
  play: (clip: string) => void
  setLook: (look: TierLook) => void
}

export default function Character3D({ look, gainCount, levelUpCount, celebrationCount, onReady, onError }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<SceneApi | null>(null)
  const lookRef = useRef(look)
  const onReadyRef = useRef(onReady)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onReadyRef.current = onReady
    onErrorRef.current = onError
  }, [onReady, onError])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
    } catch {
      onErrorRef.current()
      return
    }

    let disposed = false
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50)
    camera.position.set(0, 1.25, 5.4)
    camera.lookAt(0, 0.95, 0)

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8fa3b8, 2.4))
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.6)
    keyLight.position.set(2.5, 4, 3)
    scene.add(keyLight)

    const auraMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.45, side: THREE.DoubleSide })
    const pedestalMaterial = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.1 })
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.14, 48), pedestalMaterial)
    pedestal.position.y = -0.07
    const aura = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.28, 64), auraMaterial)
    aura.rotation.x = -Math.PI / 2
    aura.position.y = -0.13
    scene.add(pedestal, aura)

    const pivot = new THREE.Group()
    scene.add(pivot)

    const tinted: THREE.MeshStandardMaterial[] = []
    const applyLook = (look: TierLook) => {
      auraMaterial.color.set(look.aura)
      pedestalMaterial.color.set(look.aura)
      tinted.forEach(material => material.color.set(look.body))
    }
    applyLook(lookRef.current)

    let mixer: THREE.AnimationMixer | null = null
    const actions = new Map<string, THREE.AnimationAction>()
    let current: THREE.AnimationAction | null = null

    const fadeTo = (name: string, once: boolean) => {
      const next = actions.get(name)
      if (!next || next === current) return
      next.reset()
      next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity)
      next.clampWhenFinished = once
      if (current) next.crossFadeFrom(current, 0.3, false)
      next.play()
      current = next
    }

    new GLTFLoader().load(
      MODEL_URL,
      gltf => {
        if (disposed) return
        const model = gltf.scene

        // Normaliza: altura fixa, centralizado e com os pés no pedestal
        const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3())
        model.scale.setScalar(MODEL_HEIGHT / (size.y || 1))
        const box = new THREE.Box3().setFromObject(model)
        const center = box.getCenter(new THREE.Vector3())
        model.position.set(-center.x, -box.min.y, -center.z)

        model.traverse(object => {
          const material = (object as THREE.Mesh).material
          const list = Array.isArray(material) ? material : material ? [material] : []
          list.forEach(item => {
            if (item.name === TINTED_MATERIAL && item instanceof THREE.MeshStandardMaterial && !tinted.includes(item)) {
              tinted.push(item)
            }
          })
        })
        applyLook(lookRef.current)
        pivot.add(model)

        mixer = new THREE.AnimationMixer(model)
        gltf.animations.forEach(clip => actions.set(clip.name, mixer!.clipAction(clip)))
        mixer.addEventListener('finished', () => fadeTo('Idle', false))
        fadeTo('Idle', false)
        onReadyRef.current()
      },
      undefined,
      () => {
        if (!disposed) onErrorRef.current()
      }
    )

    apiRef.current = { play: clip => fadeTo(clip, true), setLook: applyLook }

    // O personagem acompanha o ponteiro de leve
    let targetRotation = 0
    const onPointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect()
      const offset = (event.clientX - (rect.left + rect.width / 2)) / window.innerWidth
      targetRotation = Math.max(-1, Math.min(1, offset * 2)) * 0.55
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })

    // Só anima quando o card está na tela e a aba está visível
    let frame = 0
    let last = 0
    let onScreen = true

    const tick = (time: number) => {
      frame = requestAnimationFrame(tick)
      const elapsed = time - last
      if (elapsed < FRAME_MS) return
      last = time
      mixer?.update(Math.min(elapsed / 1000, 0.1))
      pivot.rotation.y += (targetRotation - pivot.rotation.y) * 0.08
      auraMaterial.opacity = 0.38 + Math.sin(time / 700) * 0.12
      renderer.render(scene, camera)
    }

    const updateLoop = () => {
      const shouldRun = onScreen && !document.hidden
      if (shouldRun && !frame) {
        last = performance.now()
        frame = requestAnimationFrame(tick)
      } else if (!shouldRun && frame) {
        cancelAnimationFrame(frame)
        frame = 0
      }
    }

    const resize = () => {
      const { clientWidth, clientHeight } = host
      if (!clientWidth || !clientHeight) return
      renderer.setSize(clientWidth, clientHeight, false)
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)
    const visibilityObserver = new IntersectionObserver(entries => {
      onScreen = entries[0]?.isIntersecting ?? true
      updateLoop()
    })
    visibilityObserver.observe(host)
    document.addEventListener('visibilitychange', updateLoop)

    const onContextLost = () => onErrorRef.current()
    renderer.domElement.addEventListener('webglcontextlost', onContextLost)

    resize()
    updateLoop()

    return () => {
      disposed = true
      apiRef.current = null
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('visibilitychange', updateLoop)
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost)
      resizeObserver.disconnect()
      visibilityObserver.disconnect()
      mixer?.stopAllAction()
      scene.traverse(object => {
        const mesh = object as THREE.Mesh
        mesh.geometry?.dispose()
        const material = mesh.material
        const list = Array.isArray(material) ? material : material ? [material] : []
        list.forEach(item => item.dispose())
      })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  useEffect(() => {
    lookRef.current = look
    apiRef.current?.setLook(look)
  }, [look])

  useEffect(() => {
    if (gainCount > 0) apiRef.current?.play(lookRef.current.celebration)
  }, [gainCount])

  useEffect(() => {
    if (levelUpCount > 0) apiRef.current?.play('Wave')
  }, [levelUpCount])

  // Roda depois do efeito de `look`, então a comemoração mostrada é a que acabou de ser equipada
  useEffect(() => {
    if (celebrationCount > 0) apiRef.current?.play(lookRef.current.celebration)
  }, [celebrationCount])

  return <div ref={hostRef} className="h-full w-full" aria-hidden="true" />
}
