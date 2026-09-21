export enum SourcesOfMoneyType {
    CASH = "cash",
    BANK = "bank",
    CREDIT_CARD = "credit_card",
    INVESTMENT = "investment",
    OTHER = "other",
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