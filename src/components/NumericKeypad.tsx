interface NumericKeypadProps {
  disabled?: boolean;
  submitDisabled?: boolean;
  onInput: (value: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onSubmit: () => void;
}

function BackspaceIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M12 7H26C27.1 7 28 7.9 28 9V23C28 24.1 27.1 25 26 25H12L4 16L12 7Z"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M15 12L22 19M22 12L15 19"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function NumericKeypad({
  disabled = false,
  submitDisabled = false,
  onInput,
  onBackspace,
  onClear,
  onSubmit,
}: NumericKeypadProps) {
  return (
    <div className="numeric-keypad" aria-label="数字键盘">
      <div className="numeric-keypad-grid">
        <button className="keypad-button" type="button" disabled={disabled} onClick={() => onInput('1')}>
          1
        </button>
        <button className="keypad-button" type="button" disabled={disabled} onClick={() => onInput('2')}>
          2
        </button>
        <button className="keypad-button" type="button" disabled={disabled} onClick={() => onInput('3')}>
          3
        </button>
        <button
          className="keypad-button backspace"
          type="button"
          disabled={disabled}
          onClick={onBackspace}
          aria-label="删除最后一个字符"
        >
          <BackspaceIcon />
        </button>

        <button className="keypad-button" type="button" disabled={disabled} onClick={() => onInput('4')}>
          4
        </button>
        <button className="keypad-button" type="button" disabled={disabled} onClick={() => onInput('5')}>
          5
        </button>
        <button className="keypad-button" type="button" disabled={disabled} onClick={() => onInput('6')}>
          6
        </button>
        <button className="keypad-button action" type="button" disabled={disabled} onClick={onClear}>
          清空
        </button>

        <button className="keypad-button" type="button" disabled={disabled} onClick={() => onInput('7')}>
          7
        </button>
        <button className="keypad-button" type="button" disabled={disabled} onClick={() => onInput('8')}>
          8
        </button>
        <button className="keypad-button" type="button" disabled={disabled} onClick={() => onInput('9')}>
          9
        </button>
        <button className="keypad-button action" type="button" disabled={disabled} onClick={() => onInput('%')}>
          %
        </button>

        <button className="keypad-button" type="button" disabled={disabled} onClick={() => onInput('.')}>
          .
        </button>
        <button className="keypad-button" type="button" disabled={disabled} onClick={() => onInput('0')}>
          0
        </button>
        <button className="keypad-button submit" type="button" disabled={submitDisabled} onClick={onSubmit}>
          确定
        </button>
      </div>
    </div>
  );
}
