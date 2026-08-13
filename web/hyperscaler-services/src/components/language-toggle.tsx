import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="default" className="min-w-17 justify-between px-2.5" />
        }
      >
        <span>{currentLang.toUpperCase()}</span>
        <ChevronDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleLanguageChange("en")}>
          <span>English (EN)</span>
          {currentLang === "en" && <Check className="ml-auto size-3.5" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleLanguageChange("es")}>
          <span>Español (ES)</span>
          {currentLang === "es" && <Check className="ml-auto size-3.5" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
