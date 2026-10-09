import { useEffect, useRef, useState } from "react";
import { InputNumber } from "antd";
import { useDebounce } from "@/libs/hooks/useDebounce";
import { cn } from "@/libs/shadcn/utils";

interface DebouncedNumberInputProps {
	value?: string | number | null;
	onChange?: (value: string | number | null) => void;
	min?: number;
	delay?: number;
	className?: string;
	[key: string]: any;
}


const normalizeValue = (v: string | number | null | undefined) =>
	v === undefined || v === null || v === "" ? "" : String(v);

const DebouncedNumberInput: React.FC<DebouncedNumberInputProps> = ({
	value,
	onChange,
	min = 0,
	delay = 500,
	className,
	...props
}) => {
	const [localValue, setLocalValue] = useState(String(value ?? ""));
	const debouncedValue = useDebounce(localValue, delay);
	// Last value this input pushed to the form; its echo back through `value`
	// must not overwrite keystrokes typed after the debounce fired.
	const lastEmittedRef = useRef<string | null>(null);

	const emit = (next: string) => {
		lastEmittedRef.current = next;
		onChange?.(next);
	};

	useEffect(() => {
		if (value === undefined || value === null) return;
		if (String(value) === lastEmittedRef.current) return;
		setLocalValue(String(value));
	}, [value]);

	useEffect(() => {
		if (!onChange) return;

		// Treat undefined/null/"" as the same empty value so mount (value still
		// undefined) does not call onChange("") and trigger Form validation early.
		if (normalizeValue(debouncedValue) === normalizeValue(value)) return;

		emit(debouncedValue || "");
	}, [debouncedValue]);

	const flushToForm = () => {
		if (!onChange) return;
		const next = String(localValue) || "";
		if (next === normalizeValue(value)) return;
		emit(next);
	};

	const { onBlur: onBlurProp, ...restProps } = props;

	return (
		<InputNumber<string>
			stringMode
			controls={false}
			min={String(min)}
			className={cn("[&_.ant-input-number-input]:pr-10!", className)}
			value={String(localValue) || ""}
			{...restProps}
			style={{ width: "100%" }}
			formatter={(value) => {
				if (value === undefined || value === null || value === "") return ""
				const raw = String(value)
				const hasTrailingDecimal = raw.endsWith(".")
				const [intPart, decPart] = raw.split(".")
				const formattedInt = new Intl.NumberFormat("vi-VN").format(Number(intPart || 0))
				if (decPart !== undefined) {
					return `${formattedInt},${decPart}`
				}
				if (hasTrailingDecimal) {
					return `${formattedInt},`
				}
				return formattedInt
			}}
			parser={(value) => {
				if (!value) return ""
				const normalized = value.replace(/\./g, "").replace(",", ".")
				const [intPart, ...decParts] = normalized.split(".")
				const decimals = decParts.join("").replace(/\D/g, "").slice(0, 2)
				const digits = (intPart || "").replace(/\D/g, "")
				if (normalized.includes(".")) {
					return decimals.length > 0 ? `${digits}.${decimals}` : `${digits}.`
				}
				return digits
			}}
			onKeyDown={(event) => {
				const allowedKeys = [
					"Backspace",
					"Delete",
					"Tab",
					"ArrowLeft",
					"ArrowRight",
					"Home",
					"End",
				]
				if (allowedKeys.includes(event.key) || event.ctrlKey || event.metaKey) {
					return
				}
				if (event.key === ",") {
					const current = (event.target as HTMLInputElement).value || ""
					if (current.includes(",")) {
						event.preventDefault()
					}
					return
				}
				if (!/^\d$/.test(event.key)) {
					event.preventDefault()
				}
			}}
			// Keystrokes only update local state; the form is updated after
			// `delay` (or on blur) to avoid re-rendering the whole form per key.
			onChange={(val) => setLocalValue(val ?? "")}
			onBlur={(e) => {
				flushToForm();
				onBlurProp?.(e);
			}}
		/>
	);
};

export default DebouncedNumberInput;