'use client'
import { useThree } from '@react-three/fiber'
import { type FC, useEffect } from 'react'

const CameraLogger: FC = () => {
  const { camera } = useThree()
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('camera pos:', camera.position)
  }, [camera])
  return null
}

export default CameraLogger
