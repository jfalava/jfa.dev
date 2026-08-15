import { preferenceCookies, writePreference } from "@jfa.dev/common/preferences";
import { Button, DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from "@jfa.dev/common/ui";
import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronDown } from "lucide-react";

/**
 * Props for the LanguageToggle component.
 */
interface LanguageToggleProps {
  /** Current language code */
  currentLang: "en" | "es";
}

/**
 * Component for toggling between English and Spanish languages.
 * Updates URL search parameters to reflect language change.
 *
 * @param props - Component props
 * @returns Language toggle buttons
 */
export function LanguageToggle({ currentLang }: LanguageToggleProps) {
  const navigate = useNavigate();

  /**
   * Handles language change by updating URL search parameters.
   *
   * @param lang - The language code to switch to
   */
  const handleLanguageChange = (lang: "en" | "es") => {
    writePreference(preferenceCookies.language, lang);
    void navigate({
      to: "/",
      search: (prev) => ({
        ...prev,
        lang,
        q: prev.q,
      }),
      replace: true,
    });
  };

  return (
    <DropdownMenuTrigger>
      <Button
        variant="outline"
        size="default"
        className="min-w-17 justify-between px-2.5 text-primary hover:bg-primary/10 hover:text-primary"
      >
        <span>{currentLang.toUpperCase()}</span>
        <ChevronDown className="size-3.5" />
      </Button>
      <DropdownMenu placement="bottom end">
        <DropdownMenuItem onAction={() => handleLanguageChange("en")}>
          <span>English (EN)</span>
          {currentLang === "en" && <Check className="ml-auto size-3.5" />}
        </DropdownMenuItem>
        <DropdownMenuItem onAction={() => handleLanguageChange("es")}>
          <span>Español (ES)</span>
          {currentLang === "es" && <Check className="ml-auto size-3.5" />}
        </DropdownMenuItem>
      </DropdownMenu>
    </DropdownMenuTrigger>
  );
}
