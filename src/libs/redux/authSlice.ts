import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

import type { RootState } from "@/libs/redux/store"

export type AuthUser = {
    id: string
    name: string
    email: string
    avatar: string
    role: string
}

export type AuthState = {
    user: AuthUser | null
    isAuthenticated: boolean
    accessToken: string | null
    source: "demo" | "real"
    lastUpdatedAt: string
}

const demoUser: AuthUser = {
    id: "demo-user-001",
    name: "Đoàn Quang Huy",
    email: "doanhuyxh@gmail.com",
    avatar: "/avatars/shadcn.jpg",
    role: "admin",
}

const initialState: AuthState = {
    user: demoUser,
    isAuthenticated: true,
    accessToken: "demo-access-token",
    source: "demo",
    lastUpdatedAt: new Date().toISOString(),
}

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setDemoAuth(state) {
            state.user = demoUser
            state.isAuthenticated = true
            state.accessToken = "demo-access-token"
            state.source = "demo"
            state.lastUpdatedAt = new Date().toISOString()
        },
        clearAuth(state) {
            state.user = demoUser
            state.isAuthenticated = false
            state.accessToken = null
            state.source = "demo"
            state.lastUpdatedAt = new Date().toISOString()
        },
        updateAuthUser(state, action: PayloadAction<Partial<AuthUser>>) {
            if (!state.user) {
                return
            }
            state.user = {
                ...state.user,
                ...action.payload,
            }
            state.lastUpdatedAt = new Date().toISOString()
        },
    },
})

export const { setDemoAuth, clearAuth, updateAuthUser } = authSlice.actions
export const selectAuth = (state: RootState) => state.auth
export const selectAuthUser = (state: RootState) => state.auth.user

export default authSlice.reducer