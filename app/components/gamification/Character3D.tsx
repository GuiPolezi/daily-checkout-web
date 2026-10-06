'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RIGS, type CharacterDefinition, type RigDefinition } from '@/src/lib/gamification/characters'
import type { CharacterLook, TierLook } from './tiers'

// Modelos: RobotExpressive (Quaternius/Don McCurdy, CC0) e Kenney Mini Characters (CC0). Ver public/models/LICENSE.md
const FRAME_MS = 1000 / 30
const MODEL_HEIGHT = 2
/** Duração do giro de 360° usado pelas comemorações marcadas em `spinOn` do rig */
const SPIN_MS = 900
// Repouso um pouco mais calmo que o clipe original; comemorações tocam na velocidade normal
const IDLE_SPEED = 0.85

interface Props {
  /** Personagem escolhido; trocar o id carrega outro modelo no mesmo palco */
  character: CharacterDefinition
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
  celebrate: (key: string) => void
  levelUp: () => void
  setLook: (look: TierLook) => void
  setCharacter: (character: CharacterDefinition) => void
}

const materialsOf = (mesh: THREE.Mesh): THREE.Material[] =>
  Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []

function disposeObject(object: THREE.Object3D) {
  object.traverse(child => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.geometry?.dispose()
    materialsOf(mesh).forEach(material => {
      ;(material as THREE.MeshStandardMaterial).map?.dispose()
      material.dispose()
    })
  })
}

export default function Character3D({ character, look, gainCount, levelUpCount, celebrationCount, onReady, onError }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<SceneApi | null>(null)
  const lookRef = useRef(look)
  const characterRef = useRef(character)
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

    // ── Modelo em cena (trocado quando o personagem muda) ──
    let model: THREE.Object3D | null = null
    let rig: RigDefinition = RIGS[characterRef.current.rig]
    let loadedId: string | null = null
    let loadToken = 0
    let mixer: THREE.AnimationMixer | null = null
    const actions = new Map<string, THREE.AnimationAction>()
    let current: THREE.AnimationAction | null = null
    const tinted: THREE.MeshStandardMaterial[] = []

    const applyLook = (look: TierLook) => {
      auraMaterial.color.set(look.aura)
      pedestalMaterial.color.set(look.aura)
      tinted.forEach(material => material.color.set(look.body))
    }
    applyLook(lookRef.current)

    const fadeTo = (name: string, once: boolean, repetitions = 1) => {
      const next = actions.get(name)
      if (!next || next === current) return
      next.reset()
      next.setEffectiveTimeScale(once ? 1 : IDLE_SPEED)
      if (once) next.setLoop(repetitions > 1 ? THREE.LoopRepeat : THREE.LoopOnce, repetitions)
      else next.setLoop(THREE.LoopRepeat, Infinity)
      next.clampWhenFinished = once
      if (current) next.crossFadeFrom(current, 0.3, false)
      next.play()
      current = next
    }

    const unloadModel = () => {
      if (!model) return
      mixer?.stopAllAction()
      mixer = null
      actions.clear()
      current = null
      tinted.length = 0
      pivot.remove(model)
      disposeObject(model)
      model = null
    }

    const loadCharacter = (def: CharacterDefinition) => {
      if (loadedId === def.id) return
      loadedId = def.id
      const token = ++loadToken
      new GLTFLoader().load(
        def.model,
        gltf => {
          if (disposed || token !== loadToken) {
            disposeObject(gltf.scene)
            return
          }
          // O modelo anterior fica na tela até o novo chegar
          unloadModel()
          rig = RIGS[def.rig]
          const next = gltf.scene

          // Normaliza: altura fixa, centralizado e com os pés no pedestal
          const size = new THREE.Box3().setFromObject(next).getSize(new THREE.Vector3())
          next.scale.setScalar(MODEL_HEIGHT / (size.y || 1))
          const box = new THREE.Box3().setFromObject(next)
          const center = box.getCenter(new THREE.Vector3())
          next.position.set(-center.x, -box.min.y, -center.z)

          // Materiais que recebem a cor do corpo são clonados por malha: assim pintar a roupa
          // não pinta o que compartilha o mesmo material (ex.: o rosto dos Mini Characters)
          const tint = rig.tint
          next.traverse(object => {
            const mesh = object as THREE.Mesh
            if (!mesh.isMesh) return
            const matches = (material: THREE.Material) =>
              'material' in tint ? material.name === tint.material : mesh.name === tint.mesh
            const replaced = materialsOf(mesh).map(material => {
              if (!matches(material) || !(material instanceof THREE.MeshStandardMaterial)) return material
              const clone = material.clone()
              tinted.push(clone)
              return clone
            })
            mesh.material = Array.isArray(mesh.material) ? replaced : replaced[0]
          })
          applyLook(lookRef.current)

          model = next
          pivot.add(next)
          mixer = new THREE.AnimationMixer(next)
          gltf.animations.forEach(clip => actions.set(clip.name, mixer!.clipAction(clip)))
          mixer.addEventListener('finished', () => fadeTo(rig.idle, false))
          fadeTo(rig.idle, false)
          onReadyRef.current()
        },
        undefined,
        () => {
          if (!disposed && token === loadToken) onErrorRef.current()
        }
      )
    }

    // Comemorações: o item guarda uma chave (ThumbsUp, Jump…); cada rig diz qual clipe toca
    let spinStart = -1
    const celebrate = (key: string) => {
      fadeTo(rig.celebrations[key] ?? rig.idle, true, rig.repetitions)
      if (rig.spinOn.includes(key)) spinStart = performance.now()
    }

    apiRef.current = {
      celebrate,
      levelUp: () => fadeTo(rig.levelUp, true, rig.repetitions),
      setLook: applyLook,
      setCharacter: loadCharacter,
    }
    loadCharacter(characterRef.current)

    // O personagem acompanha o ponteiro de leve
    let targetRotation = 0
    let baseRotation = 0
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
      baseRotation += (targetRotation - baseRotation) * 0.08
      let spin = 0
      if (spinStart >= 0) {
        const progress = Math.min(1, (time - spinStart) / SPIN_MS)
        spin = (1 - Math.pow(1 - progress, 3)) * Math.PI * 2
        if (progress >= 1) spinStart = -1
      }
      pivot.rotation.y = baseRotation + spin
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
      unloadModel()
      pedestal.geometry.dispose()
      pedestalMaterial.dispose()
      aura.geometry.dispose()
      auraMaterial.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  useEffect(() => {
    lookRef.current = look
    apiRef.current?.setLook(look)
  }, [look])

  useEffect(() => {
    characterRef.current = character
    apiRef.current?.setCharacter(character)
  }, [character])

  useEffect(() => {
    if (gainCount > 0) apiRef.current?.celebrate(lookRef.current.celebration)
  }, [gainCount])

  useEffect(() => {
    if (levelUpCount > 0) apiRef.current?.levelUp()
  }, [levelUpCount])

  // Roda depois do efeito de `look`, então a comemoração mostrada é a que acabou de ser equipada
  useEffect(() => {
    if (celebrationCount > 0) apiRef.current?.celebrate(lookRef.current.celebration)
  }, [celebrationCount])

  return <div ref={hostRef} className="h-full w-full" aria-hidden="true" />
}
