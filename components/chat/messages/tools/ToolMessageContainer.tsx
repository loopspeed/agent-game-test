import { CheckIcon, Loader2, XCircle } from 'lucide-react'
import { type FC, type PropsWithChildren, type ReactNode } from 'react'
import { twJoin, twMerge } from 'tailwind-merge'

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
  waiting: <Loader2 className="size-5 shrink-0 animate-spin text-yellow-500" />,
  success: <CheckIcon className="size-5 shrink-0 text-green-500" />,
  error: <XCircle className="size-5 shrink-0 text-red-500" />,
}

export const ToolMessageContainer: FC<ToolMessageContainerProps> = ({ children, status: state, title, details }) => {
  const { container: containerClass, title: titleClass, details: detailsClass } = CLASSNAMES[state]
  const icon = ICONS[state]

  return (
    <div className={twMerge('my-2 space-y-2 rounded-lg border p-3', containerClass)}>
      <div className="flex items-center gap-2">
        {icon}
        <span className={twJoin('text-sm font-medium', titleClass)}>{title}</span>
      </div>
      {!!children && <div className="text-sm text-black">{children}</div>}
      {!!details && (
        <details className={twJoin('text-sm', detailsClass)}>
          <summary className="cursor-pointer select-none hover:opacity-80">View details</summary>
          <div className="mt-1">{details}</div>
        </details>
      )}
    </div>
  )
}
