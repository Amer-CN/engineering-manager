import React, { useState, useEffect, useRef } from 'react'
import { useMotionValue, useSpring } from 'framer-motion'

interface CountUpProps {
  value: number
  duration?: number
  suffix?: string
  prefix?: string
  decimals?: number
}

const CountUp: React.FC<CountUpProps> = ({ value, duration = 0.5, suffix = '', prefix = '', decimals = 0 }) => {
  const motionVal = useMotionValue(0)
  const springVal = useSpring(motionVal, { stiffness: 250, damping: 35 })
  const [display, setDisplay] = useState('0')
  const prevValue = useRef(0)

  useEffect(() => {
    motionVal.set(value)
    prevValue.current = value
  }, [value])

  useEffect(() => {
    const unsub = springVal.on('change', (latest) => {
      setDisplay(prefix + Number(latest).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suffix)
    })
    return () => unsub()
  }, [springVal, prefix, suffix, decimals])

  return <span>{display}</span>
}

export default CountUp
