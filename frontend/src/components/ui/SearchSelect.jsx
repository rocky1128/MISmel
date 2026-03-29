import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export default function SearchSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  emptyText = "No options found",
  disabled = false,
  required = false,
  id,
  name
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedOption = useMemo(
    () => options.find((option) => String(option.value) === String(value)) || null,
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) =>
      `${option.label} ${option.searchText || ""}`.toLowerCase().includes(normalizedQuery)
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    } else {
      setQuery("");
    }
  }, [open]);

  function handleSelect(nextValue) {
    onChange(nextValue);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className={`search-select ${open ? "open" : ""} ${disabled ? "disabled" : ""}`} ref={rootRef}>
      <input type="hidden" value={value || ""} name={name} id={id} required={required} />
      <button
        type="button"
        className="search-select-trigger"
        onClick={() => !disabled && setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        <span className={`search-select-trigger-text ${selectedOption ? "" : "placeholder"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className="search-select-trigger-icon" />
      </button>

      {open ? (
        <div className="search-select-popover">
          <div className="search-select-search">
            <Search size={14} />
            <input
              ref={searchInputRef}
              className="search-select-search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
            />
          </div>

          <div className="search-select-list" role="listbox">
            {filteredOptions.length ? (
              filteredOptions.map((option) => {
                const active = String(option.value) === String(value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`search-select-option ${active ? "active" : ""}`}
                    onClick={() => handleSelect(option.value)}
                    role="option"
                    aria-selected={active}
                  >
                    <span className="search-select-option-label">{option.label}</span>
                    {active ? <Check size={14} /> : null}
                  </button>
                );
              })
            ) : (
              <div className="search-select-empty">{emptyText}</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
