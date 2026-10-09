'use client'
import { useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

function useSearchParamsClient<T>(key: string, defaultValue: T): [T, (value: string | number | ((currentValue: T) => string | number)) => void] {
    const searchParams = useSearchParams()

    const currentValue = (searchParams.get(key) as T) ?? defaultValue

    const setValue = useCallback(
        (value: string | number | ((currentValue: T) => string | number)) => {
            const resolvedValue = typeof value === 'function' ? (value as (currentValue: T) => string | number)(currentValue) : value
            const params = new URLSearchParams(window.location.search)
            params.set(key, String(resolvedValue))

            const nextQuery = params.toString()
            const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`
            // Native history API syncs `useSearchParams` without a server round-trip
            // (router.replace would re-render the dynamic layouts on the server).
            window.history.replaceState(window.history.state, '', nextUrl)
        },
        [key, currentValue]
    )

    return [currentValue, setValue]
}

export default useSearchParamsClient
