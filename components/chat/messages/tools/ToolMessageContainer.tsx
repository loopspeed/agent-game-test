import { CheckCircle, CheckIcon, Loader2, XCircle } from 'lucide-react'
import { type FC, type PropsWithChildren, type ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'

type Status = 'waiting' | 'success' | 'error'

type ToolMessageContainerProps = PropsWithChildren<{
  status: Status
  title: ReactNode
  details?: ReactNode
}>

const CLASSNAMES: Record<
  Status,
  {
    container: string
    title: string
    details: string
  }
> = {
  waiting: {
    container: 'border-yellow-200 bg-yellow-50',
    title: 'text-yellow-700',
    details: 'text-yellow-600',
  },
  success: {
    container: 'border-green-200 bg-green-50',
    title: 'text-green-700',
    details: 'text-green-600',
  },
  error: {
    container: 'border-red-200 bg-red-50',
    title: 'text-red-700',
    details: 'text-red-600',
  },
}

const ICONS: Record<Status, ReactNode> = {
  waiting: <Loader2 className="size-5 animate-spin text-yellow-500" />,
  success: <CheckIcon className="size-5 text-green-500" />,
  error: <XCircle className="size-5 text-red-500" />,
}

// TODO: this needs work..

export const ToolMessageContainer: FC<ToolMessageContainerProps> = ({ children, status: state, title, details }) => {
  const { container: containerClass, title: titleClass, details: detailsClass } = CLASSNAMES[state]
  const icon = ICONS[state]

  return (
    <div className={twMerge(`my-3 rounded-lg border p-4`, containerClass)}>
      <div className="flex items-center gap-2">
        {icon}
        <span className={`text-sm font-medium ${titleClass}`}>{title}</span>
      </div>
      {children}
      {!!details && (
        <details className={`text-xs ${detailsClass}`}>
          <summary className="cursor-pointer hover:opacity-80">View details</summary>
          <div className="mt-1">{details}</div>
        </details>
      )}
    </div>
  )
}
