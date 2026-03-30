import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export default function SelectField({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  emptyText = "No options available",
  disabled = false,
  required = false,
  id,
  name,
  variant = "form",
  className = ""
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const selectedOption = useMemo(
    () => options.find((option) => String(option.value) === String(value)) || null,
    [options, value]
  );
  const inputValue = value ?? "";

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleSelect(nextValue) {
    onChange(nextValue);
    setOpen(false);
  }

  const rootClassName = [
    "select-field",
    `select-field-${variant}`,
    open ? "open" : "",
    disabled ? "disabled" : "",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClassName} ref={rootRef}>
      <select
        className="select-field-native"
        tabIndex={-1}
        aria-hidden="true"
        value={inputValue}
        onChange={() => {}}
        name={name}
        id={id}
        required={required}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        className="select-field-trigger"
        onClick={() => !disabled && setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        <span className={`select-field-trigger-text ${selectedOption ? "" : "placeholder"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className="select-field-trigger-icon" />
      </button>

      {open ? (
        <div className="select-field-popover">
          <div className="select-field-list" role="listbox">
            {options.length ? (
              options.map((option) => {
                const active = String(option.value) === String(value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`select-field-option ${active ? "active" : ""}`}
                    onClick={() => handleSelect(option.value)}
                    role="option"
                    aria-selected={active}
                  >
                    <span className="select-field-option-copy">
                      <span className="select-field-option-label">{option.label}</span>
                      {option.description ? (
                        <span className="select-field-option-description">{option.description}</span>
                      ) : null}
                    </span>
                    {active ? <Check size={14} /> : null}
                  </button>
                );
              })
            ) : (
              <div className="select-field-empty">{emptyText}</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
