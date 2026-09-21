export enum SourcesOfMoneyType {
    CASH = "CASH",
    BANK = "BANK",
    CREDIT_CARD = "CREDIT_CARD",
    E_WALLET = "E_WALLET",
    OTHER = "OTHER",
}


export interface ISourcesOfMoneyData {
    userId: string;
    name: string;
    type: SourcesOfMoneyType;
    balance: number;
    metadata: Record<string, any>;
}

export interface IFromSourcesOfMoneyData extends ISourcesOfMoneyData {
    _id: string;
}