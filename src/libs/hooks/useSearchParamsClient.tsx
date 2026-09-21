'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

function useSearchParamsClient<T>(key: string, defaultValue: T): [T, (value: string | number | ((currentValue: T) => string | number)) => void] {
    const router = useRouter()
    const searchParams = useSearchParams()

    const currentValue = (searchParams.get(key) as T) ?? defaultValue

    const setValue = useCallback(
        (value: string | number | ((currentValue: T) => string | number)) => {
            const resolvedValue = typeof value === 'function' ? (value as (currentValue: T) => string | number)(currentValue) : value
            const newValue = String(resolvedValue)
            const baseQuery = typeof window !== 'undefined' ? window.location.search : searchParams.toString()
            const params = new URLSearchParams(baseQuery)
            params.set(key, newValue)

            if (typeof window !== 'undefined') {
                const nextQuery = params.toString()
                const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`
                window.history.replaceState(window.history.state, '', nextUrl)
            }

            router.replace(`?${params.toString()}`, { scroll: false })
        },
        [key, router, searchParams, currentValue]
    )

    return [currentValue, setValue]
}

export default useSearchParamsClient