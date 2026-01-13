'use client'

import type { RootState } from '@react-three/fiber'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { MutableRefObject, ReactElement } from 'react'
import { Suspense, useMemo, useRef, useState } from 'react'
import type { Mesh } from 'three'
import { DoubleSide, ShaderMaterial, Vector2 } from 'three'

type AbstractAnimatedBackgroundProps = {
  className?: string
}

type MarbleUniforms = {
  uTime: { value: number }
  uPointer: { value: Vector2 }
  uBaseShift: { value: number }
  uAccentShift: { value: number }
  uFlashIntensity: { value: number }
}

type BubbleSpec = {
  size: number
  left: string
  top: string
  delay: string
  duration: string
  opacity: number
}

const BUBBLE_SPECS: BubbleSpec[] = [
  { size: 32, left: '12%', top: '18%', delay: '0s', duration: '8s', opacity: 0.55 },
  { size: 20, left: '28%', top: '72%', delay: '2s', duration: '7s', opacity: 0.4 },
  { size: 26, left: '46%', top: '36%', delay: '1s', duration: '6.5s', opacity: 0.48 },
  { size: 18, left: '64%', top: '58%', delay: '3s', duration: '7.4s', opacity: 0.35 },
  { size: 24, left: '78%', top: '28%', delay: '1.8s', duration: '8.5s', opacity: 0.5 },
  { size: 16, left: '86%', top: '62%', delay: '4.1s', duration: '6.8s', opacity: 0.38 },
  { size: 28, left: '32%', top: '52%', delay: '2.6s', duration: '7.2s', opacity: 0.44 },
  { size: 14, left: '58%', top: '22%', delay: '0.8s', duration: '6.2s', opacity: 0.32 },
]

const MARBLE_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const MARBLE_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uBaseShift;
  uniform float uAccentShift;
  uniform float uFlashIntensity;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  float fbm(vec2 p) {
    float total = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      total += noise(p) * amplitude;
      p *= 2.0;
      amplitude *= 0.5;
    }
    return total;
  }

  vec3 palette(float t, float timeShift) {
    float cycle = sin(timeShift * 0.08) * 0.5 + 0.5;
    
    vec3 blue = vec3(0.345, 0.486, 0.968);
    vec3 purple = vec3(0.639, 0.451, 0.937);
    vec3 pink = vec3(0.925, 0.337, 0.745);
    vec3 teal = vec3(0.2, 0.8, 0.7);
    vec3 orange = vec3(0.95, 0.6, 0.25);
    vec3 whiteHighlight = vec3(0.98, 0.96, 0.99);
    
    vec3 primaryA = mix(blue, teal, cycle);
    vec3 primaryB = mix(purple, orange, cycle);
    vec3 accentA = mix(pink, vec3(0.4, 0.9, 0.6), cycle);
    vec3 accentB = mix(whiteHighlight, vec3(1.0, 0.9, 0.7), cycle);
    
    vec3 base = mix(primaryA, primaryB, smoothstep(0.2, 0.8, t));
    vec3 accent = mix(accentA, accentB, smoothstep(0.5, 1.0, t));
    return mix(base, accent, 0.45 + 0.35 * sin(t * 3.14159));
  }

  void main() {
    vec2 uv = vUv * 2.6 - 1.3;
    vec2 flowUv = uv;
    flowUv.x += uPointer.x * 0.18;
    flowUv.y += uPointer.y * 0.12;

    float t = uTime * 0.12;
    float basePattern = fbm(flowUv * 2.6 + t);
    float swirl = fbm(vec2(flowUv.y + basePattern * 0.6 + t * 0.5, flowUv.x + t));
    float marble = sin((flowUv.x + swirl * 1.6) * 6.0 + basePattern * 2.4 + t * 2.4);
    float accent = fbm(flowUv * 4.2 + uBaseShift + t * 1.2);
    float highlight = smoothstep(0.55, 0.9, fbm(flowUv * 6.0 + uAccentShift + t * 0.8));

    float finalPattern = (marble * 0.35 + basePattern * 0.4 + accent * 0.25);
    finalPattern = 0.5 + 0.5 * finalPattern;
    vec3 color = palette(finalPattern, uTime);

    float depth = smoothstep(0.0, 0.6, basePattern) * 0.4;
    float sheen = highlight * 0.6;

    color += vec3(0.08, 0.06, 0.12) * depth;
    color += vec3(0.25, 0.28, 0.35) * sheen;

    color += vec3(0.82, 0.86, 1.0) * uFlashIntensity * 0.15;

    gl_FragColor = vec4(color, 0.95 + uFlashIntensity * 0.012);
  }
`

function combineClassNames(baseClassName: string, extraClassName?: string): string {
  if (!extraClassName) {
    return baseClassName
  }

  return `${baseClassName} ${extraClassName}`
}

function useMarbleMaterial(): MutableRefObject<ShaderMaterial | null> {
  const materialRef = useRef<ShaderMaterial | null>(null)

  const uniforms: MarbleUniforms = {
    uTime: { value: 0 },
    uPointer: { value: new Vector2(0, 0) },
    uBaseShift: { value: Math.random() * 10 },
    uAccentShift: { value: Math.random() * 20 },
    uFlashIntensity: { value: 0 },
  }

  function handleFrame(state: RootState, delta: number): void {
    if (!materialRef.current) {
      return
    }

    uniforms.uTime.value += delta
    uniforms.uPointer.value.set(state.pointer.x, state.pointer.y)
    const { uniforms: activeUniforms } = materialRef.current
    if (activeUniforms.uTime) {
      activeUniforms.uTime.value = uniforms.uTime.value
    }
    if (activeUniforms.uPointer) {
      activeUniforms.uPointer.value.copy(uniforms.uPointer.value)
    }
    if (activeUniforms.uFlashIntensity) {
      activeUniforms.uFlashIntensity.value = uniforms.uFlashIntensity.value
    }
  }

  useFrame(handleFrame)

  if (materialRef.current === null) {
    materialRef.current = new ShaderMaterial({
      vertexShader: MARBLE_VERTEX_SHADER,
      fragmentShader: MARBLE_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      uniforms: {
        uTime: uniforms.uTime,
        uPointer: uniforms.uPointer,
        uBaseShift: uniforms.uBaseShift,
        uAccentShift: uniforms.uAccentShift,
        uFlashIntensity: uniforms.uFlashIntensity,
      },
    })
    materialRef.current.needsUpdate = true
  }

  return materialRef
}

function MarblePlane({
  lightningValue,
}: {
  lightningValue: MutableRefObject<number>
}): ReactElement {
  const materialRef = useMarbleMaterial()
  const meshRef = useRef<Mesh | null>(null)

  function handleFrame(state: RootState, delta: number): void {
    if (!meshRef.current) {
      return
    }

    if (materialRef.current?.uniforms.uFlashIntensity) {
      materialRef.current.uniforms.uFlashIntensity.value = lightningValue.current
    }

    meshRef.current.rotation.z += delta * 0.02
    meshRef.current.position.x = state.pointer.x * 0.08
    meshRef.current.position.y = state.pointer.y * 0.04
    const scalePulse = 1.04 + Math.sin(state.clock.elapsedTime * 0.45) * 0.02
    meshRef.current.scale.set(scalePulse, scalePulse, scalePulse)
  }

  useFrame(handleFrame)

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <planeGeometry args={[4.4, 3.2, 256, 256]} />
      <primitive object={materialRef.current as ShaderMaterial} attach="material" />
    </mesh>
  )
}

function FlowHalo({ lightningValue }: { lightningValue: MutableRefObject<number> }): ReactElement {
  const materialRef = useRef<ShaderMaterial | null>(null)
  const meshRef = useRef<Mesh | null>(null)

  if (materialRef.current === null) {
    const radialShader = new ShaderMaterial({
      vertexShader: MARBLE_VERTEX_SHADER,
      fragmentShader: /* glsl */ `
        precision mediump float;
        varying vec2 vUv;
        uniform float uTime;
        uniform float uFlash;
        void main() {
          vec2 uv = vUv - 0.5;
          float radius = length(uv);
          float angle = atan(uv.y, uv.x);
          float glow = smoothstep(0.45, 0.05, radius);
          float ripple = sin(angle * 6.0 + uTime * 1.5) * 0.12;
          float highlight = smoothstep(0.25 + ripple, 0.12, radius);
          vec3 inner = vec3(0.32, 0.45, 0.98);
          vec3 outer = vec3(0.93, 0.48, 0.78);
          vec3 color = mix(outer, inner, glow);
          color += highlight * 0.28 + vec3(0.82, 0.88, 1.0) * uFlash * 0.22;
          gl_FragColor = vec4(color, glow * (0.48 + uFlash * 0.12));
        }
      `,
      uniforms: { uTime: { value: 0 }, uFlash: { value: 0 } },
      transparent: true,
      depthWrite: false,
    })
    materialRef.current = radialShader
  }

  function handleFrame(state: RootState, delta: number): void {
    if (!materialRef.current || !meshRef.current) {
      return
    }

    if (materialRef.current.uniforms.uTime) {
      materialRef.current.uniforms.uTime.value += delta
    }
    if (materialRef.current.uniforms.uFlash) {
      materialRef.current.uniforms.uFlash.value = lightningValue.current
    }
    meshRef.current.rotation.z += delta * 0.08
    meshRef.current.position.x = state.pointer.x * 0.05
    meshRef.current.position.y = state.pointer.y * 0.03
  }

  useFrame(handleFrame)

  return (
    <mesh ref={meshRef} position={[0, 0, -0.4]}>
      <planeGeometry args={[5.4, 3.8, 2, 2]} />
      <primitive object={materialRef.current as ShaderMaterial} attach="material" />
    </mesh>
  )
}

function MarbleScene({
  lightningValue,
}: {
  lightningValue: MutableRefObject<number>
}): ReactElement {
  return (
    <group>
      <MarblePlane lightningValue={lightningValue} />
      <FlowHalo lightningValue={lightningValue} />
    </group>
  )
}

function BubbleOverlay(): ReactElement {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {BUBBLE_SPECS.map(function renderBubble(spec, index) {
        return (
          <span
            key={`bubble-${index}`}
            className="marble-bubble"
            style={{
              width: `${spec.size}px`,
              height: `${spec.size}px`,
              left: spec.left,
              top: spec.top,
              animationDelay: spec.delay,
              animationDuration: spec.duration,
              opacity: spec.opacity,
            }}
          />
        )
      })}
    </div>
  )
}

function AbstractLightningController({
  lightningValue,
  onFlashChange,
}: {
  lightningValue: MutableRefObject<number>
  onFlashChange: (value: number) => void
}): null {
  const schedulerRef = useMemo(
    () => ({
      accumulator: 0,
      nextStrike: 4 + Math.random() * 6,
      flashStrength: 0,
      flashPhase: 0,
      flashFrequency: 12 + Math.random() * 4,
    }),
    []
  )
  const lastFlashRef = useRef(0)
  const { performance } = useThree()

  useFrame(function updateLightning(_, delta) {
    const scheduler = schedulerRef
    scheduler.accumulator += delta
    if (scheduler.accumulator >= scheduler.nextStrike) {
      scheduler.accumulator = 0
      scheduler.nextStrike = 4 + Math.random() * 7
      scheduler.flashStrength = 0.28 + Math.random() * 0.12
      scheduler.flashPhase = 0
      scheduler.flashFrequency = 12 + Math.random() * 5
    }

    if (scheduler.flashStrength > 0) {
      scheduler.flashPhase += delta * scheduler.flashFrequency
      const oscillation = (Math.sin(scheduler.flashPhase) + 1) * 0.5
      lightningValue.current = scheduler.flashStrength * oscillation ** 1.8
      scheduler.flashStrength = Math.max(0, scheduler.flashStrength - delta * 0.18)
    } else {
      lightningValue.current = Math.max(0, lightningValue.current - delta * 0.08)
      scheduler.flashPhase = 0
    }

    const normalized = lightningValue.current
    const eased = normalized ** 1.6
    if (
      Math.abs(eased - lastFlashRef.current) > 0.01 ||
      (eased === 0 && lastFlashRef.current !== 0)
    ) {
      lastFlashRef.current = eased
      onFlashChange(eased)
    }

    if (normalized > 0.25) {
      performance.regress()
    }
  })

  return null
}

export function AbstractAnimatedBackground({
  className,
}: AbstractAnimatedBackgroundProps): ReactElement {
  const baseClassName = 'absolute inset-0 overflow-hidden'
  const rootClassName = combineClassNames(baseClassName, className)
  const lightningValue = useRef<number>(0)
  const [lightningOpacity, setLightningOpacity] = useState(0)

  return (
    <div className={rootClassName}>
      <div className="marble-base-gradient" />
      <div className="marble-secondary-gradient" />
      <div className="marble-overlay-gradient" />
      <Suspense fallback={null}>
        <Canvas
          className="marble-canvas"
          dpr={[1, 1.8]}
          gl={{ antialias: true, alpha: true }}
          camera={{ position: [0, 0, 2.5], fov: 45 }}
        >
          <MarbleScene lightningValue={lightningValue} />
          <AbstractLightningController
            lightningValue={lightningValue}
            onFlashChange={setLightningOpacity}
          />
        </Canvas>
      </Suspense>
      <div className="marble-swirl" />
      <BubbleOverlay />
      <div className="marble-highlight" />
      <div className="marble-glass" />
      <div className="marble-lightning-flash" style={{ opacity: lightningOpacity }} />
    </div>
  )
}
