import { configureStore } from "@reduxjs/toolkit"

import authReducer from "@/libs/redux/authSlice"
import navigationReducer from "@/libs/redux/navigationSlice"

export const store = configureStore({
    reducer: {
        auth: authReducer,
        navigation: navigationReducer,
    },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch