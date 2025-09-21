import { type FC, type PropsWithChildren } from 'react'

type ToolMessageContainerProps = PropsWithChildren<{
  state: 'waiting' | 'success' | 'error'
  title: string
  details?: React.ReactNode
}>

export const ToolMessageContainer: FC<ToolMessageContainerProps> = ({ children, state, title, details }) => {
  const stateConfig = {
    waiting: {
      containerClass: 'border-yellow-200 bg-yellow-50',
      iconClass: 'h-4 w-4 animate-spin rounded-full border-b-2 border-yellow-500',
      titleClass: 'text-yellow-700',
      detailsClass: 'text-yellow-600',
    },
    success: {
      containerClass: 'border-green-200 bg-green-50',
      iconClass: 'h-4 w-4 rounded-full bg-green-500',
      titleClass: 'text-green-700',
      detailsClass: 'text-green-600',
    },
    error: {
      containerClass: 'border-red-200 bg-red-50',
      iconClass: 'h-4 w-4 rounded-full bg-red-500',
      titleClass: 'text-red-700',
      detailsClass: 'text-red-600',
    },
  }

  const config = stateConfig[state]

  return (
    <div className={`my-3 rounded-lg border p-4 ${config.containerClass}`}>
      <div className="flex items-center gap-2">
        <div className={config.iconClass}></div>
        <span className={`text-sm font-medium ${config.titleClass}`}>
          {state === 'success' ? '✓ ' : state === 'error' ? '✗ ' : ''}
          {title}
        </span>
      </div>
      {children}
      {details && (
        <details className={`text-xs ${config.detailsClass}`}>
          <summary className="cursor-pointer hover:opacity-80">View details</summary>
          <div className="mt-1">{details}</div>
        </details>
      )}
    </div>
  )
}
