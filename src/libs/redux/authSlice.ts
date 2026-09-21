import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { RootState } from "@/libs/redux/store";
import { authMe, type AuthLoginData, type AuthMeData } from "@/libs/networkApi/auth.api";

export type AuthUser = {
    userId: string;
    email: string | null;
    phoneNumber: string | null;
    fullName: string | null;
    avatarUrl: string | null;
};

export type AuthStatus = "idle" | "loading" | "succeeded" | "failed";

export type AuthState = {
    user: AuthUser | null;
    isAuthenticated: boolean;
    status: AuthStatus;
    error: string | null;
    lastUpdatedAt: string | null;
};

const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    status: "idle",
    error: null,
    lastUpdatedAt: null,
};

function mapMeToUser(data: AuthMeData): AuthUser {
    return {
        userId: data.userId,
        email: data.email ?? null,
        phoneNumber: data.phoneNumber ?? null,
        fullName: data.fullName ?? null,
        avatarUrl: data.avatarUrl ?? null,
    };
}

function mapLoginToUser(data: AuthLoginData): AuthUser {
    return {
        userId: data.userId,
        email: data.email ?? null,
        phoneNumber: null,
        fullName: data.fullName ?? null,
        avatarUrl: null,
    };
}

export const fetchAuthMe = createAsyncThunk<
    AuthUser,
    void,
    { rejectValue: string }
>("auth/fetchMe", async (_, { rejectWithValue }) => {
    try {
        const response = await authMe();
        if (!response?.status || !response.data) {
            return rejectWithValue(response?.message || "Không lấy được thông tin người dùng");
        }
        return mapMeToUser(response.data);
    } catch (error: unknown) {
        const message =
            error && typeof error === "object" && "message" in error
                ? String((error as { message?: string }).message)
                : "Không lấy được thông tin người dùng";
        return rejectWithValue(message);
    }
});

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setAuthFromLogin(state, action: PayloadAction<AuthLoginData>) {
            state.user = mapLoginToUser(action.payload);
            state.isAuthenticated = true;
            state.status = "succeeded";
            state.error = null;
            state.lastUpdatedAt = new Date().toISOString();
        },
        setAuthUser(state, action: PayloadAction<AuthUser>) {
            state.user = action.payload;
            state.isAuthenticated = true;
            state.status = "succeeded";
            state.error = null;
            state.lastUpdatedAt = new Date().toISOString();
        },
        updateAuthUser(state, action: PayloadAction<Partial<AuthUser>>) {
            if (!state.user) return;
            state.user = {
                ...state.user,
                ...action.payload,
            };
            state.lastUpdatedAt = new Date().toISOString();
        },
        clearAuth(state) {
            state.user = null;
            state.isAuthenticated = false;
            state.status = "idle";
            state.error = null;
            state.lastUpdatedAt = new Date().toISOString();
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAuthMe.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(fetchAuthMe.fulfilled, (state, action) => {
                state.user = action.payload;
                state.isAuthenticated = true;
                state.status = "succeeded";
                state.error = null;
                state.lastUpdatedAt = new Date().toISOString();
            })
            .addCase(fetchAuthMe.rejected, (state, action) => {
                state.user = null;
                state.isAuthenticated = false;
                state.status = "failed";
                state.error = action.payload ?? "Không lấy được thông tin người dùng";
                state.lastUpdatedAt = new Date().toISOString();
            });
    },
});

export const { setAuthFromLogin, setAuthUser, updateAuthUser, clearAuth } = authSlice.actions;
export const selectAuth = (state: RootState) => state.auth;
export const selectAuthUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;

export default authSlice.reducer;
