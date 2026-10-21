import axios from "axios";

//Mensagens fixas

const MSG_NETWORK = "Não foi possível conectar ao servidor. Verifique sua conexão.";
const MSG_VALIDATION = "Verifique os dados informados.";
const MSG_UNEXPECTED = "Ocorreu um erro inesperado. Tente novamente.";


export function getApiErrorMessage(error:unknown): string {
    if (!axios.isAxiosError<{ detail?: unknown }> (error)){
        return MSG_UNEXPECTED;
    }

    if(!error.response){
        return MSG_NETWORK;
    }

    const { status, data } = error.response;

    if (status === 422) {
        return MSG_VALIDATION;
    }

    const detail = data?.detail;

    if ((status === 401 || status === 409) && typeof detail === "string") {
        return detail;
    }

    return MSG_UNEXPECTED;

}