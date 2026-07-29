interface RadioOption<T extends string> {
  value: T;
  label: string;
}

interface PixelRadioGroupProps<T extends string> {
  legend: string;
  options: RadioOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
}

export function PixelRadioGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
}: PixelRadioGroupProps<T>) {
  return (
    <fieldset className="pixel-radio-group">
      <legend>{legend}</legend>
      <div className="pixel-radio-group__options">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={[
              'pixel-button',
              'pixel-radio-group__option',
              value === opt.value ? 'pixel-radio-group__option--selected' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-pressed={value === opt.value}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
