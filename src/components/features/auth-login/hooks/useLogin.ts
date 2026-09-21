import { authLogin, type AuthLoginRequest } from "@/libs/networkApi/auth.api"
import { useMutation } from "@tanstack/react-query"

export const useLogin = () => {
    return useMutation({
        mutationFn: (request: AuthLoginRequest) => authLogin(request),
    });
}