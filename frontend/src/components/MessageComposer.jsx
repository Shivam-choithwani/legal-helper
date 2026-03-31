import { useState } from 'react';

export function MessageComposer({ onSend, disabled }) {
	const [value, setValue] = useState('');

	const submit = e => {
		e.preventDefault();
		if (!value.trim()) return;
		onSend(value.trim());
		setValue('');
	};

	const handleKeyDown = e => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			submit(e);
		}
	};

	return (
		<form className="w-full px-6 py-4" onSubmit={submit}>
			<div className="max-w-4xl mx-auto flex gap-3 items-end">
				{/* Input Field */}
				<div className="flex-1 flex items-center gap-2 bg-white border border-neutral-200 rounded-md px-4 py-3 shadow-sm focus-within:shadow-base focus-within:border-primary transition-all duration-200">
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						className="text-neutral-400 flex-shrink-0"
					>
						<circle cx="11" cy="11" r="8" />
						<path d="m21 21-4.35-4.35" />
					</svg>
					<textarea
						value={value}
						onChange={e => setValue(e.target.value)}
						onKeyDown={handleKeyDown}
						disabled={disabled}
						placeholder="Ask a legal question... (Shift + Enter for new line)"
						className="flex-1 bg-transparent outline-none resize-none text-body placeholder-neutral-500 disabled:opacity-50 disabled:cursor-not-allowed font-body"
						rows="1"
					/>
				</div>

				{/* Send Button */}
				<button
					type="submit"
					disabled={disabled || !value.trim()}
					className="btn-primary flex items-center justify-center gap-2 flex-shrink-0 rounded-md px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="currentColor"
						stroke="currentColor"
						strokeWidth="2"
					>
						<path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.16151496 C3.34915502,0.9 2.40734225,1.00636533 1.77946707,1.4776575 C0.994623095,2.10604706 0.837654326,3.0486314 1.15159189,3.99701575 L3.03521743,10.4380088 C3.03521743,10.5950699 3.19218622,10.7521673 3.50612381,10.7521673 L16.6915026,11.5376542 C16.6915026,11.5376542 17.1624089,11.5376542 17.1624089,12.0089463 C17.1624089,12.4744748 16.6915026,12.4744748 16.6915026,12.4744748 Z" />
					</svg>
					<span className="hidden sm:inline text-sm font-semibold">
						Send
					</span>
				</button>
			</div>

			{/* Help Text */}
			<p className="text-caption text-neutral-500 mt-2 pl-9">
				Press Enter to send, Shift + Enter for new line
			</p>
		</form>
	);
}
