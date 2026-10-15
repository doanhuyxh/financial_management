import { configureStore } from "@reduxjs/toolkit";

import authReducer from "@/libs/redux/authSlice";
import navigationReducer from "@/libs/redux/navigationSlice";

export const makeStore = () =>
    configureStore({
        reducer: {
            auth: authReducer,
            navigation: navigationReducer,
        },
    });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
