"use client";

import { useEffect } from "react";
import { Form, Input, Modal, Select } from "antd";
import { useSourcesOfMoneyContext } from "@/components/features/sources-of-money/context";
import {
    SOURCES_OF_MONEY_TYPE_LABELS,
    SourcesOfMoneyType,
    type IFromSourcesOfMoneyData,
} from "@/libs/interfaces/sourcesOfMoneyData";
import DebouncedNumberInput from "@/components/common/input/DebouncedNumberInput";

type FormValues = {
    name: string;
    type: SourcesOfMoneyType;
    balance?: number;
    creditLimit?: number;
    currentDebt?: number;
    statementDate?: number;
    dueDate?: number;
};

const typeOptions = Object.values(SourcesOfMoneyType).map((type) => ({
    value: type,
    label: SOURCES_OF_MONEY_TYPE_LABELS[type],
}));

export default function SourcesOfMoneyFormModal() {
    const { modalOpen, editingItem, isSubmitting, closeModal, handleSubmit } =
        useSourcesOfMoneyContext();

    const [form] = Form.useForm<FormValues>();
    const selectedType = Form.useWatch("type", form);
    const isEdit = Boolean(editingItem?._id);
    const isCreditCard = selectedType === SourcesOfMoneyType.CREDIT_CARD;

    useEffect(() => {
        if (!modalOpen) return;

        if (editingItem) {
            form.setFieldsValue({
                name: editingItem.name,
                type: editingItem.type,
                balance: editingItem.balance,
                creditLimit: editingItem.creditDetails?.creditLimit,
                currentDebt: editingItem.creditDetails?.currentDebt,
                statementDate: editingItem.creditDetails?.statementDate,
                dueDate: editingItem.creditDetails?.dueDate,
            });
        } else {
            form.resetFields();
            form.setFieldsValue({
                type: SourcesOfMoneyType.CASH,
                balance: 0,
                creditLimit: 0,
                currentDebt: 0,
            });
        }
    }, [modalOpen, editingItem, form]);

    const handleOk = async () => {
        const values = await form.validateFields();
        const payload: IFromSourcesOfMoneyData = {
            name: values.name.trim(),
            type: values.type,
        };

        if (values.type === SourcesOfMoneyType.CREDIT_CARD) {
            payload.creditDetails = {
                creditLimit: values.creditLimit ?? 0,
                currentDebt: values.currentDebt ?? 0,
                statementDate: values.statementDate,
                dueDate: values.dueDate,
            };
            payload.balance = 0;
        } else {
            payload.balance = values.balance ?? 0;
        }

        await handleSubmit(payload);
    };

    return (
        <Modal
            title={isEdit ? "Sửa nguồn tiền" : "Thêm nguồn tiền"}
            open={modalOpen}
            onCancel={closeModal}
            onOk={handleOk}
            confirmLoading={isSubmitting}
            destroyOnHidden
            okText={isEdit ? "Cập nhật" : "Tạo mới"}
            cancelText="Hủy"
            width={520}
        >
            <Form form={form} layout="vertical" className="mt-4">
                <Form.Item
                    name="name"
                    label="Tên nguồn tiền"
                    rules={[
                        { required: true, message: "Tên nguồn tiền là bắt buộc" },
                        { max: 100, message: "Tên tối đa 100 ký tự" },
                    ]}
                >
                    <Input placeholder="Ví dụ: Ví MoMo, Vietcombank..." maxLength={100} />
                </Form.Item>

                <Form.Item
                    name="type"
                    label="Loại"
                    rules={[{ required: true, message: "Loại là bắt buộc" }]}
                >
                    <Select options={typeOptions} placeholder="Chọn loại" />
                </Form.Item>

                {!isCreditCard ? (
                    <Form.Item
                        name="balance"
                        label="Số dư hiện có"
                        rules={[
                            { required: true, message: "Số dư là bắt buộc" },
                            {
                                type: "number",
                                min: 0,
                                message: "Số dư phải >= 0",
                            },
                        ]}
                    >
                        <DebouncedNumberInput
                            className="w-full!"
                            min={0}
                            step={1000}
                            placeholder="0"
                        />
                    </Form.Item>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        <Form.Item
                            name="creditLimit"
                            label="Hạn mức tín dụng"
                            rules={[
                                { required: true, message: "Hạn mức là bắt buộc" },
                                {
                                    type: "number",
                                    min: 0,
                                    message: "Hạn mức phải >= 0",
                                },
                            ]}
                        >
                            <DebouncedNumberInput className="w-full!" min={0} step={1000} />
                        </Form.Item>

                        <Form.Item
                            name="currentDebt"
                            label="Dư nợ hiện tại"
                            rules={[
                                { required: true, message: "Dư nợ là bắt buộc" },
                                {
                                    type: "number",
                                    min: 0,
                                    message: "Dư nợ phải >= 0",
                                },
                            ]}
                        >
                            <DebouncedNumberInput className="w-full!" min={0} step={1000} />
                        </Form.Item>

                        <div className="grid grid-cols-2 gap-3 w-full!">
                            <Form.Item
                                name="statementDate"
                                label="Ngày sao kê"
                                rules={[
                                    {
                                        type: "number",
                                        min: 1,
                                        max: 31,
                                        message: "Từ 1 đến 31",
                                    },
                                ]}
                            >
                                <DebouncedNumberInput className="w-full" min={1} max={31} placeholder="1-31" />
                            </Form.Item>
                            <Form.Item
                                name="dueDate"
                                label="Ngày đến hạn"
                                rules={[
                                    {
                                        type: "number",
                                        min: 1,
                                        max: 31,
                                        message: "Từ 1 đến 31",
                                    },
                                ]}
                            >
                                <DebouncedNumberInput className="w-full" min={1} max={31} placeholder="1-31" />
                            </Form.Item>
                        </div>
                    </div>
                )}
            </Form>
        </Modal>
    );
}
