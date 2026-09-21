import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

import type { RootState } from "@/libs/redux/store"

export type NavigationState = {
    pathname: string
}

const initialState: NavigationState = {
    pathname: "/",
}

const navigationSlice = createSlice({
    name: "navigation",
    initialState,
    reducers: {
        setPathname(state, action: PayloadAction<string>) {
            state.pathname = action.payload
        },
    },
})

export const { setPathname } = navigationSlice.actions
export const selectPathname = (state: RootState) => state.navigation.pathname

export default navigationSlice.reducer
