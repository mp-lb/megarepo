import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import type { FormEvent, KeyboardEvent, RefObject } from "react";

type MarkdownSearchPanelProps = {
  activeMatchNumber: number;
  inputRef: RefObject<HTMLInputElement | null>;
  matchCount: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onQueryChange: (query: string) => void;
  query: string;
};

export const MarkdownSearchPanel = ({
  activeMatchNumber,
  inputRef,
  matchCount,
  onClose,
  onPrevious,
  onNext,
  onQueryChange,
  query,
}: MarkdownSearchPanelProps) => {
  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onNext();
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === "Enter" && event.shiftKey) {
      event.preventDefault();
      onPrevious();
    }
  };

  const matchStatus =
    query.trim().length === 0
      ? "No query"
      : matchCount === 0
        ? "No matches"
        : `${activeMatchNumber} of ${matchCount}`;

  return (
    <form
      aria-label="Search document"
      className="mp-lb-mdkit-search-panel"
      onSubmit={submitSearch}
    >
      <Search aria-hidden="true" className="mp-lb-mdkit-search-icon" />
      <input
        ref={inputRef}
        aria-label="Search document"
        className="mp-lb-mdkit-search-input"
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={handleSearchKeyDown}
        placeholder="Search"
        type="search"
        value={query}
      />
      <span className="mp-lb-mdkit-search-status">{matchStatus}</span>
      <button
        aria-label="Previous match"
        className="mp-lb-mdkit-search-button"
        disabled={matchCount === 0}
        onClick={onPrevious}
        title="Previous match"
        type="button"
      >
        <ChevronUp aria-hidden="true" />
      </button>
      <button
        aria-label="Next match"
        className="mp-lb-mdkit-search-button"
        disabled={matchCount === 0}
        title="Next match"
        type="submit"
      >
        <ChevronDown aria-hidden="true" />
      </button>
      <button
        aria-label="Close search"
        className="mp-lb-mdkit-search-button"
        onClick={onClose}
        title="Close search"
        type="button"
      >
        <X aria-hidden="true" />
      </button>
    </form>
  );
};
