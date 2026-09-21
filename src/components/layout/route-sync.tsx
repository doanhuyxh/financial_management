"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

import { useAppDispatch } from "@/libs/redux/redux"
import { setPathname } from "@/libs/redux/navigationSlice"

export function RouteSync() {
    const dispatch = useAppDispatch()
    const pathname = usePathname()

    useEffect(() => {
        dispatch(setPathname(pathname))
    }, [dispatch, pathname])

    return null
}
