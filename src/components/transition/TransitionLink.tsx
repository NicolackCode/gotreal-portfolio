'use client'

import React, { forwardRef } from 'react'
import { useTransitionContext } from '@/components/transition/TransitionContext'
import Link from 'next/link'

interface TransitionLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  children: React.ReactNode
  className?: string
}

const TransitionLink = forwardRef<HTMLAnchorElement, TransitionLinkProps>(
  ({ href, children, onClick, className, ...props }, ref) => {
    const { navigate } = useTransitionContext()

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
      if (href.startsWith('http') || href.startsWith('mailto')) {
        if (onClick) onClick(e)
        return
      }

      e.preventDefault()
      
      if (onClick) onClick(e)
      navigate(href)
    }

    return (
      <Link href={href} onClick={handleClick} className={className} ref={ref} {...props}>
        {children}
      </Link>
    )
  }
)

TransitionLink.displayName = 'TransitionLink'

export default TransitionLink
